import { z } from "zod";
import { findRuneLiteWindow, captureWindow } from "../lib/screenshot-capture.js";

// Shared in-memory cache for the latest capture (avoids redundant screenshots within a session)
let lastCapture: { image_base64: string; timestamp: string; window_id: number } | null = null;

export const findOsrsWindowSchema = z.object({});

export async function handleFindOsrsWindow() {
  try {
    const result = await findRuneLiteWindow();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(result) }],
    };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const captureScreenSchema = z.object({
  force_refresh: z.boolean().optional().default(false).describe("Force a new capture even if a recent one exists (default: false reuses cached screenshot)"),
});

export async function handleCaptureScreen(args: z.infer<typeof captureScreenSchema>) {
  try {
    // Return cached capture if available and force_refresh is not requested
    if (!args.force_refresh && lastCapture) {
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({
              success: true,
              timestamp: lastCapture.timestamp,
              window_id: lastCapture.window_id,
              image_size_bytes: Math.round((lastCapture.image_base64.length * 3) / 4),
              cached: true,
            }),
          },
        ],
      };
    }

    const window = await findRuneLiteWindow();

    if (!window.found) {
      return {
        content: [
          {
            type: "text" as const,
            text: "RuneLite client not found. Please ensure RuneLite is running.",
          },
        ],
        isError: true,
      };
    }

    const capture = await captureWindow(window.window_id);
    lastCapture = capture;

    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify({
            success: true,
            timestamp: capture.timestamp,
            window_id: capture.window_id,
            image_size_bytes: Math.round((capture.image_base64.length * 3) / 4),
          }),
        },
      ],
    };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export function getLastCapture() {
  return lastCapture;
}

export async function getOrCaptureScreen(): Promise<{ image_base64: string; window_id: number }> {
  if (!lastCapture) {
    const window = await findRuneLiteWindow();
    if (!window.found) throw new Error("RuneLite client not found. Please ensure RuneLite is running.");
    const capture = await captureWindow(window.window_id);
    lastCapture = capture;
  }
  return lastCapture;
}
