import { z } from "zod";
import { analyzeGameScreen, fastAnalyzeScreen } from "../lib/vision-client.js";
import { getOrCaptureScreen, getLastCapture } from "./screenshot.js";
import { findRuneLiteWindow, captureWindow } from "../lib/screenshot-capture.js";

async function freshCapture() {
  const window = await findRuneLiteWindow();
  if (!window.found) throw new Error("RuneLite client not found.");
  return captureWindow(window.window_id);
}

export const analyzeScreenSchema = z.object({
  focus: z
    .enum(["inventory", "minimap", "chat", "stats", "full", "bank", "shop", "npc"])
    .optional()
    .default("full")
    .describe("Which part of the screen to focus on"),
  question: z.string().optional().describe("Optional specific question about what you see"),
  fresh_screenshot: z.boolean().optional().default(true).describe("Take a new screenshot before analyzing"),
});

export async function handleAnalyzeScreen(args: z.infer<typeof analyzeScreenSchema>) {
  const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
  const result = await analyzeGameScreen(capture.image_base64, args.focus, args.question);
  return { content: [{ type: "text" as const, text: result }] };
}

export const analyzeInventorySchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true),
});

export async function handleAnalyzeInventory(args: z.infer<typeof analyzeInventorySchema>) {
  const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
  const result = await analyzeGameScreen(capture.image_base64, "inventory");
  return { content: [{ type: "text" as const, text: result }] };
}

export const readChatSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true),
});

export async function handleReadChat(args: z.infer<typeof readChatSchema>) {
  const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
  const result = await fastAnalyzeScreen(
    capture.image_base64,
    'Extract all visible chat messages. Return ONLY valid JSON: {"messages": [{"type": "Game|Public|Private|Clan|Trade", "sender": null, "text": "..."}]}'
  );
  return { content: [{ type: "text" as const, text: result }] };
}

export const readStatsSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true),
});

export async function handleReadStats(args: z.infer<typeof readStatsSchema>) {
  const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
  const result = await fastAnalyzeScreen(
    capture.image_base64,
    'Extract: HP current/max, Prayer current/max, Run energy %, Special attack %. Return ONLY valid JSON: {"hp_current": 0, "hp_max": 0, "prayer_current": 0, "prayer_max": 0, "run_energy": 0, "special_attack": 0}'
  );
  return { content: [{ type: "text" as const, text: result }] };
}

export const readMinimapSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true),
});

export async function handleReadMinimap(args: z.infer<typeof readMinimapSchema>) {
  const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
  const result = await fastAnalyzeScreen(
    capture.image_base64,
    'Analyze the minimap. Return ONLY valid JSON: {"compass_bearing": "N", "nearby_players": 0, "nearby_npcs": 0, "notes": "..."}'
  );
  return { content: [{ type: "text" as const, text: result }] };
}

export const getGameStateSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true),
});

export async function handleGetGameState(args: z.infer<typeof getGameStateSchema>) {
  const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
  const result = await analyzeGameScreen(capture.image_base64, "full");
  return { content: [{ type: "text" as const, text: result }] };
}
