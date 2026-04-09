# osrs-mcp

MCP server for Old School RuneScape. Gives an AI agent eyes, knowledge, and click-targeting for OSRS by combining:

- **Screen vision** — captures the RuneLite window and uses Claude or a local vision LLM to analyze game state
- **RuneLite HTTP API** — reads exact skill levels, inventory, and equipment directly from the game client (no vision needed)
- **Click coordinates** — resolves pixel positions for inventory slots, sidebar tabs, and UI regions so a computer-use agent can click accurately
- **OSRS Wiki** — item, NPC, quest, and page lookups
- **Grand Exchange prices** — real-time prices, history, and profit calculator
- **Skill training tools** — XP calculations and items-to-level planning

Designed to work alongside the `computer-use` MCP for autonomous gameplay: `osrs-mcp` reads state and resolves where to click; `computer-use` performs the clicks.

---

## Setup

```bash
cp .env.example .env
# Edit .env — set ANTHROPIC_API_KEY and optionally VISION_PROVIDER

npm install
npm run build
```

### Vision provider

The vision tools support two backends, configured via `.env`:

**Option A — Anthropic API (default)**
```env
ANTHROPIC_API_KEY=your-api-key-here
```

**Option B — Local AI via LM Studio** (or any Anthropic-compatible server)

Your local model must be vision/multimodal capable (e.g. `qwen2-vl-7b-instruct`, `gemma-4`, `llava`). Text-only models cannot analyze screenshots.

```env
VISION_PROVIDER=local
LOCAL_AI_BASE_URL=http://localhost:1234
LOCAL_AI_API_KEY=lmstudio
LOCAL_AI_DETAIL_MODEL=your-vision-model-name
LOCAL_AI_FAST_MODEL=your-vision-model-name
LOCAL_AI_THINKING=0   # set to 1 if your model supports reasoning
```

### RuneLite HTTP Server plugin

The `get_stats`, `get_inventory`, and `get_equipment` tools read live game data directly from RuneLite without using vision. To enable them:

1. Open RuneLite → Plugin Hub → search **HTTP Server** → install and enable it
2. The plugin exposes `http://localhost:8080/stats`, `/inv`, and `/equip`
3. No extra configuration needed — the MCP connects on startup

These tools are more reliable and faster than their vision equivalents. Use them when you need ground-truth data (skill XP, exact item IDs, equipment slots).

### macOS window capture

The screenshot tools use `screencapture -l <CGWindowID>` to capture just the RuneLite window. Window ID detection uses Swift + `CGWindowListCopyWindowInfo` — no extra tools required.

**Fallback:** If window ID detection fails, the full screen is captured. Vision analysis still works as long as RuneLite is visible.

---

## Claude Desktop / Claude Code config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "osrs": {
      "command": "node",
      "args": ["/absolute/path/to/osrs-mcp/dist/index.js"]
    }
  }
}
```

The server reads `.env` from the project root for `ANTHROPIC_API_KEY` / `VISION_PROVIDER`. You can also inline env vars in the config:

```json
{
  "mcpServers": {
    "osrs": {
      "command": "node",
      "args": ["/absolute/path/to/osrs-mcp/dist/index.js"],
      "env": { "ANTHROPIC_API_KEY": "sk-..." }
    }
  }
}
```

Or with `tsx` for development (no build step needed):

```json
{
  "mcpServers": {
    "osrs": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/osrs-mcp/src/index.ts"]
    }
  }
}
```

---

## Tools

### RuneLite HTTP API
*Requires the HTTP Server plugin running on port 8080. Faster and more reliable than vision for these reads.*

| Tool | Description |
|------|-------------|
| `get_stats` | All skill levels (base + boosted) and XP from `/stats` |
| `get_inventory` | Inventory items — item ID, quantity, slot 0-27 — from `/inv` |
| `get_equipment` | Equipped items by slot name (weapon, head, body…) from `/equip` |

### Screen capture
| Tool | Description |
|------|-------------|
| `find_osrs_window` | Check if RuneLite is running and get its window ID |
| `capture_screen` | Take a screenshot of the RuneLite window |

### Vision analysis
*Uses Claude vision (Opus for detail, Haiku for fast reads). Falls back to local model if `VISION_PROVIDER=local`.*

| Tool | Description |
|------|-------------|
| `analyze_screen` | Analyze the screen with vision (focus: `inventory` / `stats` / `chat` / `minimap` / `full` / `bank` / `shop` / `npc`) |
| `analyze_inventory` | List all items in the 28-slot inventory |
| `read_chat` | Extract all visible chat messages |
| `read_stats` | Read HP, Prayer, Run energy, Special attack from status bars |
| `read_minimap` | Read compass bearing and nearby entity counts |
| `get_game_state` | Full composite game state in one call |
| `detect_dialog` | Read NPC dialog, option menus, or level-up popups |
| `detect_combat_state` | Read combat indicators: XP drops, enemy HP bar, poison/venom, overhead prayers |
| `detect_loot` | Identify ground items visible after a kill |

### Click coordinates
*Returns pixel positions for use with `computer-use` MCP clicks. Layout is auto-detected from screenshot dimensions by default.*

| Tool | Description |
|------|-------------|
| `detect_layout` | Detect whether RuneLite is in fixed (765×503) or resizable mode |
| `get_tab_coords` | Pixel coordinates to click a sidebar tab (`prayer`, `inventory`, `skills`, `magic`, `combat_options`, etc.) |
| `inventory_slot_coords` | Pixel center of an inventory slot 0–27 |
| `get_clickable_regions` | Bounding boxes for major UI panels: minimap, inventory, chat box, compass |
| `find_npc_on_screen` | Locate a named NPC in the current screenshot, returns `{screen_x, screen_y, confidence}` |
| `find_object_on_screen` | Locate an interactable object (bank chest, tree, ladder…), returns `{screen_x, screen_y, confidence}` |

**Layout detection:** fixed mode is identified by the exact dimensions `765×503` (or `1530×1006` on Retina). All other sizes are treated as resizable. Resizable coordinates are edge-anchored (inventory to bottom-right, chat to bottom-left) and computed from the actual captured dimensions.

**Tab names (top row):** `combat_options` · `skills` · `quests` · `inventory` · `equipment` · `prayer` · `magic`  
**Tab names (bottom row):** `clan_chat` · `friends` · `account_management` · `logout` · `settings` · `emotes` · `music`

### OSRS Wiki
| Tool | Description |
|------|-------------|
| `wiki_search` | Search the OSRS wiki |
| `wiki_page` | Get the intro/summary of a wiki page |
| `wiki_item_info` | Item details (alch values, members, weight, GE limit, etc.) |
| `wiki_npc_info` | NPC details (combat level, HP, attack styles, aggressive/poisonous) |
| `wiki_quest_info` | Quest details (difficulty, length, members, requirements, rewards) |

### Grand Exchange
| Tool | Description |
|------|-------------|
| `ge_price` | Current GE price by item name or ID |
| `ge_price_history` | Price chart data (timestep: `5m` / `1h` / `6h` / `24h`) |
| `ge_mapping` | Full item name→ID mapping, filterable by name substring |
| `calculate_profit` | Flip profit calculator — applies 1% GE tax, returns per-item and total profit + ROI |

### Utilities
| Tool | Description |
|------|-------------|
| `skill_xp_info` | XP required for a target level, or current level from an XP value |
| `calc_items_to_level` | How many actions/items to reach a target level given XP per action |

---

## Autonomous play example

Combining `osrs-mcp` with the `computer-use` MCP allows an AI agent to loop autonomously. A basic combat loop looks like:

```
1. get_stats                        → confirm HP / prayer levels
2. detect_combat_state              → are we in combat? any loot?
3. find_npc_on_screen {npc: "Cow"} → get screen coords of next target
4. computer-use: left_click(x, y)   → attack
5. detect_loot                      → bones/hide on ground?
6. find_object_on_screen {object: "Cowhide"} → locate loot
7. computer-use: left_click(x, y)   → pick up
8. get_inventory                    → check if full (28 slots)
9. → if full: get_tab_coords {tab: "inventory"} → bank run
```

---

## Development

```bash
npm run dev       # Run directly via tsx (no build needed)
npm run build     # Compile TypeScript → dist/
npm run inspect   # Interactive tool tester via MCP Inspector
npm test          # Run test suite (vitest)
npm run test:watch  # Watch mode
```

---

## Related

- [RuneLite HTTP Server plugin](https://github.com/runelite/runelite/wiki/Running-the-Runelite-HTTP-API-Service)
- [OSRS Wiki API](https://oldschool.runescape.wiki/w/Api)
- [prices.runescape.wiki API](https://prices.runescape.wiki/osrs/api/v1)
- [MCP Inspector](https://modelcontextprotocol.io/docs/tools/inspector)
