import { z } from "zod";
import { analyzeGameScreen, fastAnalyzeScreen } from "../lib/vision-client.js";
import { getOrCaptureScreen } from "./screenshot.js";
import { findRuneLiteWindow, captureWindow } from "../lib/screenshot-capture.js";

export async function freshCapture() {
  const window = await findRuneLiteWindow();
  if (!window.found) throw new Error("RuneLite client not found.");
  return captureWindow(window.window_id);
}

const FRESH_SCREENSHOT_DESCRIPTION = "Take a new screenshot before analyzing (default: true). Set to false to reuse the most recent cached screenshot.";

export const analyzeScreenSchema = z.object({
  focus: z
    .enum(["inventory", "minimap", "chat", "stats", "full", "bank", "shop", "npc"])
    .optional()
    .default("full")
    .describe("Which part of the screen to focus on"),
  question: z.string().optional().describe("Optional specific question about what you see"),
  fresh_screenshot: z.boolean().optional().default(true).describe(FRESH_SCREENSHOT_DESCRIPTION),
});

export async function handleAnalyzeScreen(args: z.infer<typeof analyzeScreenSchema>) {
  try {
    const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
    const result = await analyzeGameScreen(capture.image_base64, args.focus, args.question);
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const analyzeInventorySchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true).describe(FRESH_SCREENSHOT_DESCRIPTION),
});

export async function handleAnalyzeInventory(args: z.infer<typeof analyzeInventorySchema>) {
  try {
    const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
    const result = await analyzeGameScreen(capture.image_base64, "inventory");
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const readChatSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true).describe(FRESH_SCREENSHOT_DESCRIPTION),
});

export async function handleReadChat(args: z.infer<typeof readChatSchema>) {
  try {
    const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
    const result = await fastAnalyzeScreen(
      capture.image_base64,
      'Extract all visible chat messages. Return ONLY valid JSON: {"messages": [{"type": "Game|Public|Private|Clan|Trade", "sender": null, "text": "..."}]}'
    );
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const readStatsSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true).describe(FRESH_SCREENSHOT_DESCRIPTION),
});

export async function handleReadStats(args: z.infer<typeof readStatsSchema>) {
  try {
    const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
    const result = await fastAnalyzeScreen(
      capture.image_base64,
      'Extract: HP current/max, Prayer current/max, Run energy %, Special attack %. Return ONLY valid JSON: {"hp_current": 0, "hp_max": 0, "prayer_current": 0, "prayer_max": 0, "run_energy": 0, "special_attack": 0}'
    );
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const readMinimapSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true).describe(FRESH_SCREENSHOT_DESCRIPTION),
});

export async function handleReadMinimap(args: z.infer<typeof readMinimapSchema>) {
  try {
    const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
    const result = await fastAnalyzeScreen(
      capture.image_base64,
      'Analyze the minimap. Return ONLY valid JSON: {"compass_bearing": "N", "nearby_players": 0, "nearby_npcs": 0, "notes": "..."}'
    );
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const getGameStateSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true).describe(FRESH_SCREENSHOT_DESCRIPTION),
});

export async function handleGetGameState(args: z.infer<typeof getGameStateSchema>) {
  try {
    const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
    const result = await analyzeGameScreen(capture.image_base64, "full");
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const detectDialogSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true).describe(FRESH_SCREENSHOT_DESCRIPTION),
});

export async function handleDetectDialog(args: z.infer<typeof detectDialogSchema>) {
  try {
    const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
    const result = await fastAnalyzeScreen(
      capture.image_base64,
      'Read any dialog box, NPC conversation, option menu, or level-up popup visible on screen. ' +
      'Return ONLY valid JSON: {"type": "npc_dialog|option_menu|level_up|none", "npc_name": null, "message": null, "options": []}'
    );
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const detectCombatStateSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true).describe(FRESH_SCREENSHOT_DESCRIPTION),
});

export async function handleDetectCombatState(args: z.infer<typeof detectCombatStateSchema>) {
  try {
    const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
    const result = await fastAnalyzeScreen(
      capture.image_base64,
      'Analyze combat indicators: XP drops floating on screen, enemy HP bar above their head, ' +
      'poison/venom status icon, and active overhead prayers on your character. ' +
      'Return ONLY valid JSON: {"in_combat": false, "enemy_name": null, "enemy_hp_percent": null, ' +
      '"poison_status": "none|poisoned|venomed", "xp_drops": [], "overhead_prayer": null} ' +
      'where xp_drops is an array of {"skill": "Attack", "amount": 12}'
    );
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const detectLootSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(true).describe(FRESH_SCREENSHOT_DESCRIPTION),
});

export async function handleDetectLoot(args: z.infer<typeof detectLootSchema>) {
  try {
    const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
    const result = await analyzeGameScreen(
      capture.image_base64,
      "full",
      'Identify all ground items visible in the game world (loot on the ground after a kill). ' +
      'Return ONLY valid JSON: {"items": [{"name": "Bones", "quantity": 1, "noted": false}]}. ' +
      'If no ground items are visible return {"items": []}.'
    );
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}
