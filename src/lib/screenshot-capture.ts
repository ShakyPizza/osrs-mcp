import { exec as execCb } from "child_process";
import { promisify } from "util";
import { readFile, unlink } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import type { CaptureResult } from "../types/game-state.js";

const exec = promisify(execCb);

// Searches for a RuneLite window using AppleScript and returns its CGWindowID.
// RuneLite is a Java process; its window title contains "RuneLite".
async function findRuneLiteCGWindowId(): Promise<number | null> {
  // Try AppleScript + System Events first
  const script = `
    tell application "System Events"
      set procs to every process whose background only is false
      repeat with proc in procs
        if name of proc contains "RuneLite" then
          return unix id of proc
        end if
        if name of proc contains "java" then
          try
            set wins to every window of proc
            repeat with w in wins
              if title of w contains "RuneLite" then
                return unix id of proc
              end if
            end repeat
          end try
        end if
      end repeat
      return -1
    end tell
  `;

  try {
    const { stdout } = await exec(`osascript -e '${script.replace(/'/g, "\\'")}'`);
    const pid = parseInt(stdout.trim(), 10);
    if (pid > 0) {
      // Use screencapture with PID-based lookup via CGWindowListCopyWindowInfo
      const cgIdScript = `
        tell application "System Events"
          set allWins to {}
          try
            set proc to first process whose unix id is ${pid}
            set wins to every window of proc
            if (count of wins) > 0 then
              return id of first item of wins
            end if
          end try
          return -1
        end tell
      `;
      const { stdout: winOut } = await exec(`osascript -e '${cgIdScript.replace(/'/g, "\\'")}'`);
      const wid = parseInt(winOut.trim(), 10);
      if (wid > 0) return wid;
    }
  } catch {
    // AppleScript approach failed, fall through
  }

  // Fallback: try GetWindowID (brew install thirtythreeforty/personal/getwindowid)
  try {
    const { stdout } = await exec(`GetWindowID "RuneLite" "RuneLite" 2>/dev/null`);
    const wid = parseInt(stdout.trim(), 10);
    if (wid > 0) return wid;
  } catch {
    // Not installed
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
        method: "fullscreen_fallback",
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
