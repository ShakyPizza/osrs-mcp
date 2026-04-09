# osrs-mcp

MCP server for Old School RuneScape. Gives an AI agent eyes and knowledge for OSRS by combining:

- **Screen vision** — captures the RuneLite window and uses Claude to analyze game state
- **OSRS Wiki** — item, NPC, quest, and page lookups
- **Grand Exchange prices** — real-time prices, history, and profit calculator

## Setup

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

npm install
npm run build
```

### macOS Window Capture

The screenshot tool uses `screencapture -l <windowID>` to capture just the RuneLite window.

**Option 1 (recommended):** Install `GetWindowID`:
```bash
brew install thirtythreeforty/personal/getwindowid
```

**Option 2:** The server tries AppleScript via `osascript` first — this works on most macOS versions without extra installs.

**Fallback:** If window ID detection fails, it captures the full screen. OSRS analysis still works as long as RuneLite is visible.

## Claude Desktop Config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "osrs": {
      "command": "node",
      "args": ["/path/to/osrs-mcp/dist/index.js"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

Or with `tsx` for development (no build step):

```json
{
  "mcpServers": {
    "osrs": {
      "command": "npx",
      "args": ["tsx", "/path/to/osrs-mcp/src/index.ts"],
      "env": {
        "ANTHROPIC_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Tools

### Screen / Vision
| Tool | Description |
|------|-------------|
| `find_osrs_window` | Check if RuneLite is running, get window ID |
| `capture_screen` | Take a screenshot of the RuneLite client |
| `analyze_screen` | Analyze the screen with Claude vision (focus: inventory/stats/chat/minimap/full/bank/shop/npc) |
| `analyze_inventory` | List all items in the 28-slot inventory |
| `read_chat` | Extract all visible chat messages |
| `read_stats` | Read HP, Prayer, Run energy, Special attack values |
| `read_minimap` | Analyze minimap for bearing and nearby entities |
| `get_game_state` | Full composite game state analysis in one call |

### OSRS Wiki
| Tool | Description |
|------|-------------|
| `wiki_search` | Search the OSRS wiki |
| `wiki_page` | Get the intro/summary of a wiki page |
| `wiki_item_info` | Item details (alch values, members, weight, etc.) |
| `wiki_npc_info` | NPC details (combat level, HP, attack styles) |
| `wiki_quest_info` | Quest details (difficulty, length, members) |

### Grand Exchange
| Tool | Description |
|------|-------------|
| `ge_price` | Current GE price by item name or ID |
| `ge_price_history` | Price chart data (5m/1h/6h/24h timestep) |
| `ge_mapping` | Full item name→ID mapping, filterable |
| `calculate_profit` | GE flip profit calculator (applies 1% tax) |

### Utilities
| Tool | Description |
|------|-------------|
| `skill_xp_info` | XP required for a level, or level from current XP |

## Development

```bash
# Run with inspector (test tools interactively)
npm run inspect

# Dev mode (no build needed)
npm run dev
```

## Related

- [wiki-osrs-mcp](https://github.com/isaachansen/wiki-osrs-mcp) — Remote MCP server with basic wiki search/summary/price tools (this project adds vision, richer wiki data, and runs locally)
- [OSRS Wiki API](https://oldschool.runescape.wiki/w/Api)
- [prices.runescape.wiki API](https://prices.runescape.wiki/osrs/api/v1)
