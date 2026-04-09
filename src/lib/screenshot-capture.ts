import { exec as execCb } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { CaptureResult } from "../types/game-state.js";

const exec = promisify(execCb);

// Searches for a RuneLite window using CGWindowListCopyWindowInfo (via Swift)
// and returns the CGWindowID needed for `screencapture -l`.
async function findRuneLiteCGWindowId(): Promise<number | null> {
  // System Events' `id of window` returns an accessibility element ID, not a CGWindowID.
  // We use Swift + CGWindowListCopyWindowInfo to get the real window number.
  const swiftScript = `
import Cocoa
let list = CGWindowListCopyWindowInfo(.optionOnScreenOnly, kCGNullWindowID) as! [[String: Any]]
for w in list {
    let owner = (w[kCGWindowOwnerName as String] as? String ?? "").lowercased()
    let title = (w[kCGWindowName as String] as? String ?? "").lowercased()
    if owner.contains("runelite") || title.contains("runelite") ||
       (owner.contains("java") && title.contains("runelite")) {
        if let wid = w[kCGWindowNumber as String] as? Int { print(wid); exit(0) }
    }
}
exit(1)
`.trim();

  try {
    const { stdout } = await exec(`swift - <<'SWIFT_EOF'\n${swiftScript}\nSWIFT_EOF`);
    const wid = parseInt(stdout.trim(), 10);
    if (wid > 0) return wid;
  } catch {
    // Swift approach failed, fall through
  }

  return null;
}

export async function findRuneLiteWindow(): Promise<{
  found: boolean;
  window_id?: number;
  window_title?: string;
  method?: string;
}> {
  const wid = await findRuneLiteCGWindowId();
  if (wid !== null) {
    return { found: true, window_id: wid, window_title: "RuneLite", method: "cg_window_id" };
  }

  // Check if the process is at least running
  try {
    const { stdout } = await exec(`pgrep -f RuneLite`);
    if (stdout.trim()) {
      return {
        found: true,
        window_title: "RuneLite (process found, window ID unavailable)",
        method: "process_fallback",
      };
    }
  } catch {
    // not running
  }

  return { found: false };
}

export async function captureWindow(windowId?: number): Promise<CaptureResult> {
  const tmpPath = join(tmpdir(), `osrs-capture-${Date.now()}.png`);

  try {
    if (windowId) {
      // Capture specific window
      await exec(`screencapture -l ${windowId} -x "${tmpPath}"`);
    } else {
      // Fallback: full screen (captures display 1)
      await exec(`screencapture -x "${tmpPath}"`);
    }

    const buffer = await readFile(tmpPath);
    return {
      image_base64: buffer.toString("base64"),
      timestamp: new Date().toISOString(),
      window_id: windowId ?? 0,
    };
  } finally {
    // Always clean up temp file
    try {
      await unlink(tmpPath);
    } catch {
      // ignore cleanup errors
    }
  }
}
