#!/usr/bin/env node
import 'dotenv/config';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { findOsrsWindowSchema, handleFindOsrsWindow, captureScreenSchema, handleCaptureScreen } from "./tools/screenshot.js";
import { analyzeScreenSchema, handleAnalyzeScreen, analyzeInventorySchema, handleAnalyzeInventory, readChatSchema, handleReadChat, readStatsSchema, handleReadStats, readMinimapSchema, handleReadMinimap, getGameStateSchema, handleGetGameState, detectDialogSchema, handleDetectDialog, detectCombatStateSchema, handleDetectCombatState, detectLootSchema, handleDetectLoot } from "./tools/vision.js";
import { wikiSearchSchema, handleWikiSearch, wikiPageSchema, handleWikiPage, wikiItemInfoSchema, handleWikiItemInfo, wikiNpcInfoSchema, handleWikiNpcInfo, wikiQuestInfoSchema, handleWikiQuestInfo } from "./tools/wiki.js";
import { gePriceSchema, handleGePrice, gePriceHistorySchema, handleGePriceHistory, geMappingSchema, handleGeMapping, calculateProfitSchema, handleCalculateProfit } from "./tools/prices.js";
import { skillXpInfoSchema, handleSkillXpInfo, calcItemsToLevelSchema, handleCalcItemsToLevel } from "./tools/utils.js";
import { getStatsSchema, handleGetStats, getInventorySchema, handleGetInventory, getEquipmentSchema, handleGetEquipment } from "./tools/runelite.js";
import { detectLayoutSchema, handleDetectLayout, getTabCoordsSchema, handleGetTabCoords, inventorySlotCoordsSchema, handleInventorySlotCoords, getClickableRegionsSchema, handleGetClickableRegions, findNpcOnScreenSchema, handleFindNpcOnScreen, findObjectOnScreenSchema, handleFindObjectOnScreen } from "./tools/interaction.js";

const server = new McpServer({
  name: "osrs-mcp",
  version: "0.1.0",
});

// --- Screenshot tools ---
server.tool("find_osrs_window", "Check if RuneLite is running and get its window ID", findOsrsWindowSchema.shape, handleFindOsrsWindow);
server.tool("capture_screen", "Capture a screenshot of the OSRS/RuneLite client window", captureScreenSchema.shape, handleCaptureScreen);

// --- RuneLite HTTP API tools (requires HTTP Server plugin on port 8080) ---
server.tool("get_stats", "Get all skill levels and XP via RuneLite HTTP Server plugin (/stats). More reliable than vision.", getStatsSchema.shape, handleGetStats);
server.tool("get_inventory", "Get inventory items (id, quantity, slot 0-27) via RuneLite HTTP Server plugin (/inv). More reliable than vision.", getInventorySchema.shape, handleGetInventory);
server.tool("get_equipment", "Get currently equipped items via RuneLite HTTP Server plugin (/equip). More reliable than vision.", getEquipmentSchema.shape, handleGetEquipment);

// --- Vision / screen analysis tools ---
server.tool("analyze_screen", "Analyze a screenshot of the OSRS client using Claude vision. Can focus on inventory, stats, chat, minimap, bank, shop, NPCs, or give a full analysis", analyzeScreenSchema.shape, handleAnalyzeScreen);
server.tool("analyze_inventory", "Read all items in the player inventory (28 slots)", analyzeInventorySchema.shape, handleAnalyzeInventory);
server.tool("read_chat", "Extract all visible chat messages from the chat box", readChatSchema.shape, handleReadChat);
server.tool("read_stats", "Read HP, Prayer, Run energy, and Special attack values from the status bars", readStatsSchema.shape, handleReadStats);
server.tool("read_minimap", "Analyze the minimap for compass bearing and nearby entities", readMinimapSchema.shape, handleReadMinimap);
server.tool("get_game_state", "Get a comprehensive analysis of the current game state (all elements in one call)", getGameStateSchema.shape, handleGetGameState);
server.tool("detect_dialog", "Read any NPC dialog box, option menu, or level-up popup currently on screen", detectDialogSchema.shape, handleDetectDialog);
server.tool("detect_combat_state", "Read combat indicators: XP drops, enemy HP bar, poison/venom status, overhead prayers", detectCombatStateSchema.shape, handleDetectCombatState);
server.tool("detect_loot", "Identify ground items visible on the floor after a kill", detectLootSchema.shape, handleDetectLoot);

// --- OSRS Wiki tools ---
server.tool("wiki_search", "Search the OSRS wiki for pages", wikiSearchSchema.shape, handleWikiSearch);
server.tool("wiki_page", "Get the summary/intro of an OSRS wiki page", wikiPageSchema.shape, handleWikiPage);
server.tool("wiki_item_info", "Get detailed information about an OSRS item from the wiki", wikiItemInfoSchema.shape, handleWikiItemInfo);
server.tool("wiki_npc_info", "Get information about an NPC from the OSRS wiki", wikiNpcInfoSchema.shape, handleWikiNpcInfo);
server.tool("wiki_quest_info", "Get information about a quest from the OSRS wiki", wikiQuestInfoSchema.shape, handleWikiQuestInfo);

// --- Grand Exchange / price tools ---
server.tool("ge_price", "Get the current Grand Exchange price for an item", gePriceSchema.shape, handleGePrice);
server.tool("ge_price_history", "Get GE price history for an item over time", gePriceHistorySchema.shape, handleGePriceHistory);
server.tool("ge_mapping", "Get the full item name-to-ID mapping, optionally filtered by name", geMappingSchema.shape, handleGeMapping);
server.tool("calculate_profit", "Calculate GE flip profit after 1% tax given buy/sell prices and quantity", calculateProfitSchema.shape, handleCalculateProfit);

// --- Interaction / coordinate tools ---
server.tool("detect_layout", "Detect whether RuneLite is in fixed (765×503) or resizable mode by reading screenshot pixel dimensions", detectLayoutSchema.shape, handleDetectLayout);
server.tool("get_tab_coords", "Get pixel coordinates to click a sidebar tab (prayer, inventory, skills, combat_options, magic, etc.). Auto-detects layout.", getTabCoordsSchema.shape, handleGetTabCoords);
server.tool("inventory_slot_coords", "Get pixel center coordinates for an inventory slot (0-27). Auto-detects layout.", inventorySlotCoordsSchema.shape, handleInventorySlotCoords);
server.tool("get_clickable_regions", "Get bounding boxes for key UI elements: minimap, inventory, chat, compass. Auto-detects layout.", getClickableRegionsSchema.shape, handleGetClickableRegions);
server.tool("find_npc_on_screen", "Locate a named NPC in the current screenshot and return its screen coordinates", findNpcOnScreenSchema.shape, handleFindNpcOnScreen);
server.tool("find_object_on_screen", "Locate a named interactable object (tree, chest, bank, etc.) and return its screen coordinates", findObjectOnScreenSchema.shape, handleFindObjectOnScreen);

// --- Utility tools ---
server.tool("skill_xp_info", "Get XP required for a level, or current level from XP", skillXpInfoSchema.shape, handleSkillXpInfo);
server.tool("calc_items_to_level", "Calculate how many items/actions are needed to reach a target skill level given XP per action", calcItemsToLevelSchema.shape, handleCalcItemsToLevel);

const transport = new StdioServerTransport();
await server.connect(transport);

// Keep process alive
process.on("SIGINT", () => process.exit(0));
