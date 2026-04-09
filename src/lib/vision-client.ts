import Anthropic from "@anthropic-ai/sdk";

const isLocal = process.env.VISION_PROVIDER === "local";

const client = isLocal
  ? new Anthropic({
      baseURL: process.env.LOCAL_AI_BASE_URL ?? "http://localhost:1234",
      apiKey: process.env.LOCAL_AI_API_KEY ?? "lmstudio",
    })
  : new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

const OSRS_VISION_SYSTEM = `You are an expert Old School RuneScape (OSRS) game state analyzer. You analyze screenshots of the OSRS game client (typically RuneLite) and extract structured information.

OSRS UI Layout (standard client):
- Main game viewport: center area showing the 3D game world
- Inventory: bottom-right panel, 4 columns x 7 rows = 28 slots (numbered 1-28 left-to-right, top-to-bottom)
- Minimap: top-right corner, circular, shows compass bearing and nearby entities as colored dots
  - White dots = other players, Yellow dots = NPCs, Red dot = yourself
- Chat box: bottom of screen, tabs (All, Game, Public, Private, Clan, Trade)
- Status orbs/bars (right side of screen, icons at bottom right):
  - Red heart = Hitpoints (current/max shown)
  - Blue shield = Prayer (current/max shown)
  - Yellow boot = Run energy (0-100%)
  - White sword = Special attack charge (0-100%)
- Bank interface: large grid of items when bank is open (blue background)
- Shop interface: item grid when talking to a shopkeeper
- Combat/XP drops: numbers floating near your character when gaining XP
- NPC/Player names: shown above their heads in the game world

When analyzing, be precise about:
- Item names (use your OSRS knowledge to identify sprites accurately)
- Stack sizes shown on item sprites (small numbers at bottom-left of sprite)
- Exact HP/Prayer/Run/Spec values from the bars/orbs
- NPC names shown above their heads
- Chat messages verbatim when legible
- Level-up messages, quest completions, and other game events

Always respond with valid JSON when asked for structured data.`;

type FocusArea = "inventory" | "minimap" | "chat" | "stats" | "full" | "bank" | "shop" | "npc";

const FOCUS_PROMPTS: Record<FocusArea, string> = {
  inventory:
    'List every item visible in the 28-slot inventory. Use slot numbers 1-28 (left-to-right, top-to-bottom). Empty slots can be omitted. Return ONLY valid JSON: {"items": [{"slot": 1, "name": "...", "quantity": 1}]}',

  stats:
    'Extract the four status values. Return ONLY valid JSON: {"hp_current": 0, "hp_max": 0, "prayer_current": 0, "prayer_max": 0, "run_energy": 0, "special_attack": 0}',

  chat:
    'Extract all visible chat messages. Return ONLY valid JSON: {"messages": [{"type": "Game|Public|Private|Clan|Trade", "sender": "name or null", "text": "..."}]}',

  minimap:
    'Analyze the minimap. Return ONLY valid JSON: {"compass_bearing": "N/S/E/W/NE/etc", "nearby_players": 0, "nearby_npcs": 0, "notes": "..."}',

  full:
    'Provide a complete game state analysis. Return ONLY valid JSON: {"location_hint": "...", "hp_current": 0, "hp_max": 0, "prayer_current": 0, "prayer_max": 0, "run_energy": 0, "special_attack": 0, "inventory_count": 0, "inventory_summary": "...", "chat_summary": "...", "active_activity": "...", "nearby_npcs": ["..."], "notes": "..."}',

  bank:
    'List all visible items in the bank interface with their quantities. Return ONLY valid JSON: {"items": [{"name": "...", "quantity": 0}], "tab": "current tab name if visible"}',

  shop:
    'List all items visible in the shop interface with their prices. Return ONLY valid JSON: {"shop_name": "...", "items": [{"name": "...", "price": 0, "stock": 0}]}',

  npc:
    'Identify any NPCs visible in the game world, including their names and combat levels if shown. Return ONLY valid JSON: {"npcs": [{"name": "...", "combat_level": null, "position": "..."}]}',
};

export async function analyzeGameScreen(
  imageBase64: string,
  focus: FocusArea = "full",
  question?: string
): Promise<string> {
  const userPrompt = question ?? FOCUS_PROMPTS[focus];

  const thinkingParam = isLocal
    ? process.env.LOCAL_AI_THINKING === "1"
      ? { thinking: { type: "enabled" as const, budget_tokens: 2048 } }
      : {}
    : {};

  const response = await client.messages.create({
    model: isLocal ? (process.env.LOCAL_AI_DETAIL_MODEL ?? "gemma-4-26b-a4b") : "claude-opus-4-6",
    max_tokens: 4096,
    ...thinkingParam,
    system: OSRS_VISION_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/png",
              data: imageBase64,
            },
          },
          {
            type: "text",
            text: userPrompt,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from vision model");
  }
  return textBlock.text;
}

// Fast analysis using Haiku for simple single-value reads
export async function fastAnalyzeScreen(imageBase64: string, prompt: string): Promise<string> {
  const response = await client.messages.create({
    model: isLocal ? (process.env.LOCAL_AI_FAST_MODEL ?? "gemma-4-26b-a4b") : "claude-haiku-4-5",
    max_tokens: 1024,
    system: OSRS_VISION_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/png", data: imageBase64 },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response");
  return textBlock.text;
}
