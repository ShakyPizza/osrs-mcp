import { z } from "zod";
import { analyzeGameScreen } from "../lib/vision-client.js";
import { freshCapture } from "./vision.js";
import { getOrCaptureScreen } from "./screenshot.js";

const FRESH_SCREENSHOT_DESCRIPTION =
  "Take a new screenshot before analyzing (default: true). Set to false to reuse the most recent cached screenshot.";

// ─── Layout detection ────────────────────────────────────────────────────────

// Reads width/height from the PNG IHDR chunk in a base64-encoded PNG.
// PNG layout: 8-byte signature | 4-byte length | 4-byte "IHDR" | 4-byte width | 4-byte height
// Only the first 24 bytes are needed — no full decode required.
function getPngDimensions(base64: string): { width: number; height: number } {
  const bytes = Buffer.from(base64.substring(0, 32), "base64");
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

// Fixed client is exactly 765 × 503 (or 2× on Retina: 1530 × 1006).
// Everything else is resizable.
function classifyLayout(width: number): "fixed" | "resizable" {
  return width === 765 || width === 1530 ? "fixed" : "resizable";
}

async function resolveLayout(preferCached = true): Promise<{
  layout: "fixed" | "resizable";
  width: number;
  height: number;
}> {
  const capture = preferCached ? await getOrCaptureScreen() : await freshCapture();
  const { width, height } = getPngDimensions(capture.image_base64);
  return { layout: classifyLayout(width), width, height };
}

// ─── Layout constants ────────────────────────────────────────────────────────

const SLOT_WIDTH = 42;
const SLOT_HEIGHT = 36;

// Fixed mode (765 × 503): inventory grid top-left corner
const FIXED_INV_ORIGIN_X = 560;
const FIXED_INV_ORIGIN_Y = 213;

// Fixed mode (765 × 503): right sidebar starts at x = 516
const FIXED_SIDEBAR_X = 516;
const FIXED_TAB_TOP_Y = 168;    // y-center of top tab row
const FIXED_TAB_BOTTOM_Y = 466; // y-center of bottom tab row
const TAB_SPACING = 35;         // px between tab centers
const SIDEBAR_WIDTH = 249;      // fixed, same in resizable

// Tabs: 7 per row, 2 rows, order matches OSRS sidebar left→right
const TOP_TABS = ["combat_options", "skills", "quests", "inventory", "equipment", "prayer", "magic"] as const;
const BOTTOM_TABS = ["clan_chat", "friends", "account_management", "logout", "settings", "emotes", "music"] as const;
const ALL_TABS = [...TOP_TABS, ...BOTTOM_TABS] as const;
type TabName = typeof ALL_TABS[number];

function tabCoords(
  tab: TabName,
  width: number,
  height: number,
): { x: number; y: number } {
  const sidebarX = width === 765 || width === 1530
    ? FIXED_SIDEBAR_X * (width / 765)   // scale for Retina
    : width - SIDEBAR_WIDTH;

  const topY = width === 765 ? FIXED_TAB_TOP_Y
    : width === 1530 ? FIXED_TAB_TOP_Y * 2
    : FIXED_TAB_TOP_Y;                  // top row is always near top of panel

  const bottomY = width === 765 ? FIXED_TAB_BOTTOM_Y
    : width === 1530 ? FIXED_TAB_BOTTOM_Y * 2
    : height - 37;                      // resizable: bottom row is 37px from screen bottom

  const topIdx = TOP_TABS.indexOf(tab as typeof TOP_TABS[number]);
  if (topIdx !== -1) {
    return { x: Math.round(sidebarX + 18 + topIdx * TAB_SPACING), y: topY };
  }

  const botIdx = BOTTOM_TABS.indexOf(tab as typeof BOTTOM_TABS[number]);
  return { x: Math.round(sidebarX + 18 + botIdx * TAB_SPACING), y: bottomY };
}

// ─── detect_layout ────────────────────────────────────────────────────────────

export const detectLayoutSchema = z.object({
  fresh_screenshot: z.boolean().optional().default(false)
    .describe("Force a fresh screenshot (default: false — uses cached screenshot if available)."),
});

export async function handleDetectLayout(args: z.infer<typeof detectLayoutSchema>) {
  try {
    const { layout, width, height } = await resolveLayout(!args.fresh_screenshot);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({ layout, width, height }),
      }],
    };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

// ─── get_tab_coords ───────────────────────────────────────────────────────────

export const getTabCoordsSchema = z.object({
  tab: z.enum(ALL_TABS).describe(
    "Tab to locate. Top row: combat_options, skills, quests, inventory, equipment, prayer, magic. " +
    "Bottom row: clan_chat, friends, account_management, logout, settings, emotes, music."
  ),
  layout: z.enum(["auto", "fixed", "resizable"]).optional().default("auto")
    .describe("'auto' detects from the current screenshot (default). 'fixed' = 765×503. 'resizable' = calculated from screen dimensions."),
});

export async function handleGetTabCoords(args: z.infer<typeof getTabCoordsSchema>) {
  try {
    let width: number;
    let height: number;
    let layout: "fixed" | "resizable";

    if (args.layout === "auto") {
      ({ layout, width, height } = await resolveLayout(true));
    } else {
      layout = args.layout;
      // For explicit fixed/resizable, use known dimensions without capturing
      width = layout === "fixed" ? 765 : 1920;
      height = layout === "fixed" ? 503 : 1080;
    }

    const { x, y } = tabCoords(args.tab, width, height);
    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          tab: args.tab,
          x,
          y,
          layout,
          width,
          height,
          ...(layout === "resizable" ? { approximate: true } : {}),
        }),
      }],
    };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

// ─── inventory_slot_coords ──────────────────────────────────────────────────

export const inventorySlotCoordsSchema = z.object({
  slot: z.number().int().min(0).max(27)
    .describe("Inventory slot index (0 = top-left, 27 = bottom-right, row-major order)."),
  layout: z.enum(["auto", "fixed", "resizable"]).optional().default("auto")
    .describe("'auto' detects from current screenshot (default). 'fixed' = 765×503. 'resizable' = approximate for your screen size."),
});

export async function handleInventorySlotCoords(args: z.infer<typeof inventorySlotCoordsSchema>) {
  try {
    let originX: number;
    let originY: number;
    let resolvedLayout: "fixed" | "resizable";
    let approximate = false;

    if (args.layout === "auto") {
      const detected = await resolveLayout(true);
      resolvedLayout = detected.layout;
      if (resolvedLayout === "fixed") {
        const scale = detected.width / 765;
        originX = Math.round(FIXED_INV_ORIGIN_X * scale);
        originY = Math.round(FIXED_INV_ORIGIN_Y * scale);
      } else {
        // Resizable: inventory panel is 190px wide, anchored to right edge
        originX = detected.width - SIDEBAR_WIDTH + 44;
        originY = Math.round(detected.height * 0.645);
        approximate = true;
      }
    } else {
      resolvedLayout = args.layout;
      if (resolvedLayout === "fixed") {
        originX = FIXED_INV_ORIGIN_X;
        originY = FIXED_INV_ORIGIN_Y;
      } else {
        originX = 1920 - SIDEBAR_WIDTH + 44;
        originY = Math.round(1080 * 0.645);
        approximate = true;
      }
    }

    const col = args.slot % 4;
    const row = Math.floor(args.slot / 4);
    const x = originX + col * SLOT_WIDTH + Math.floor(SLOT_WIDTH / 2);
    const y = originY + row * SLOT_HEIGHT + Math.floor(SLOT_HEIGHT / 2);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          slot: args.slot,
          col,
          row,
          x,
          y,
          layout: resolvedLayout,
          ...(approximate ? { approximate: true } : {}),
        }),
      }],
    };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

// ─── get_clickable_regions ──────────────────────────────────────────────────

const FIXED_REGIONS = {
  minimap:         { x: 571, y:   4, width: 156, height: 156 },
  inventory_panel: { x: 548, y: 205, width: 190, height: 262 },
  prayer_panel:    { x: 548, y: 205, width: 190, height: 262 },
  stats_panel:     { x: 548, y: 205, width: 190, height: 262 },
  chat_box:        { x:   0, y: 338, width: 519, height: 165 },
  compass:         { x: 548, y:   4, width:  34, height:  34 },
};

export const getClickableRegionsSchema = z.object({
  layout: z.enum(["auto", "fixed", "resizable"]).optional().default("auto")
    .describe("'auto' detects from current screenshot (default). 'fixed' = precise 765×503 values. 'resizable' = approximate."),
});

export async function handleGetClickableRegions(args: z.infer<typeof getClickableRegionsSchema>) {
  try {
    let resolvedLayout: "fixed" | "resizable";
    let scale = 1;
    let approximate = false;

    if (args.layout === "auto") {
      const detected = await resolveLayout(true);
      resolvedLayout = detected.layout;
      scale = detected.width / 765;
      approximate = resolvedLayout === "resizable";
    } else {
      resolvedLayout = args.layout;
      approximate = resolvedLayout === "resizable";
    }

    const regions = Object.fromEntries(
      Object.entries(FIXED_REGIONS).map(([key, r]) => [
        key,
        {
          x: Math.round(r.x * scale),
          y: Math.round(r.y * scale),
          width: Math.round(r.width * scale),
          height: Math.round(r.height * scale),
        },
      ])
    );

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          layout: resolvedLayout,
          ...(approximate ? { approximate: true } : {}),
          ...regions,
        }),
      }],
    };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

// ─── find_npc_on_screen ────────────────────────────────────────────────────

export const findNpcOnScreenSchema = z.object({
  npc_name: z.string().describe("Name of the NPC to locate (e.g. 'Banker', 'Goblin', 'Cow')."),
  fresh_screenshot: z.boolean().optional().default(true).describe(FRESH_SCREENSHOT_DESCRIPTION),
});

export async function handleFindNpcOnScreen(args: z.infer<typeof findNpcOnScreenSchema>) {
  try {
    const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
    const result = await analyzeGameScreen(
      capture.image_base64,
      "full",
      `Find the NPC named "${args.npc_name}" in the game viewport. ` +
      `If found, give its pixel coordinates as screen_x and screen_y (center of its name tag or sprite). ` +
      `Return ONLY valid JSON: {"found": false, "screen_x": null, "screen_y": null, "confidence": "low|medium|high"}`
    );
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

// ─── find_object_on_screen ────────────────────────────────────────────────

export const findObjectOnScreenSchema = z.object({
  object_name: z.string().describe("Name or description of the interactable object to find (e.g. 'bank chest', 'oak tree', 'cooking range', 'ladder')."),
  fresh_screenshot: z.boolean().optional().default(true).describe(FRESH_SCREENSHOT_DESCRIPTION),
});

export async function handleFindObjectOnScreen(args: z.infer<typeof findObjectOnScreenSchema>) {
  try {
    const capture = args.fresh_screenshot ? await freshCapture() : await getOrCaptureScreen();
    const result = await analyzeGameScreen(
      capture.image_base64,
      "full",
      `Find the interactable object described as "${args.object_name}" in the game viewport. ` +
      `Return ONLY valid JSON: {"found": false, "screen_x": null, "screen_y": null, "confidence": "low|medium|high"}`
    );
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}
