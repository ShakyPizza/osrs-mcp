import { describe, it, expect } from "vitest";
import { handleInventorySlotCoords, handleGetTabCoords, handleGetClickableRegions, classifyLayout } from "../tools/interaction.js";

describe("classifyLayout", () => {
  it("classifies 765×503 as fixed", () => {
    expect(classifyLayout(765, 503)).toBe("fixed");
  });

  it("classifies 1530×1006 (Retina 2×) as fixed", () => {
    expect(classifyLayout(1530, 1006)).toBe("fixed");
  });

  it("classifies 765×600 as resizable — same width, wrong height", () => {
    // Regression: old code only checked width and would have returned "fixed" here.
    expect(classifyLayout(765, 600)).toBe("resizable");
  });

  it("classifies 1530×900 as resizable — Retina width, wrong height", () => {
    expect(classifyLayout(1530, 900)).toBe("resizable");
  });

  it("classifies arbitrary resizable dimensions correctly", () => {
    expect(classifyLayout(1920, 1080)).toBe("resizable");
    expect(classifyLayout(1280, 720)).toBe("resizable");
    expect(classifyLayout(800, 600)).toBe("resizable");
  });
});

// All explicit-layout tests use layout: "fixed" or "resizable" so no screenshot is needed.

describe("inventory_slot_coords (fixed layout)", () => {
  it("slot 0 → top-left of grid", async () => {
    const res = await handleInventorySlotCoords({ slot: 0, layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.col).toBe(0);
    expect(data.row).toBe(0);
    expect(data.x).toBe(581); // 560 + 0*42 + 21
    expect(data.y).toBe(231); // 213 + 0*36 + 18
  });

  it("slot 1 → second column, first row", async () => {
    const res = await handleInventorySlotCoords({ slot: 1, layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.col).toBe(1);
    expect(data.row).toBe(0);
    expect(data.x).toBe(623); // 560 + 1*42 + 21
    expect(data.y).toBe(231);
  });

  it("slot 4 → first column, second row (row wraps at 4)", async () => {
    const res = await handleInventorySlotCoords({ slot: 4, layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.col).toBe(0);
    expect(data.row).toBe(1);
    expect(data.y).toBe(267); // 213 + 1*36 + 18
  });

  it("slot 27 → bottom-right of grid", async () => {
    const res = await handleInventorySlotCoords({ slot: 27, layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.col).toBe(3);
    expect(data.row).toBe(6);
    expect(data.x).toBe(707); // 560 + 3*42 + 21
    expect(data.y).toBe(447); // 213 + 6*36 + 18
  });

  it("reports layout in response", async () => {
    const res = await handleInventorySlotCoords({ slot: 0, layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.layout).toBe("fixed");
    expect(data.approximate).toBeUndefined();
  });

  it("resizable layout marks result as approximate", async () => {
    const res = await handleInventorySlotCoords({ slot: 0, layout: "resizable" });
    const data = JSON.parse(res.content[0].text);
    expect(data.approximate).toBe(true);
  });
});

describe("get_tab_coords (fixed layout)", () => {
  // Fixed: sidebarX=516, tab spacing=35, top row y=168, bottom row y=466
  // x = 516 + 18 + index * 35

  it("prayer tab (index 5 of top row)", async () => {
    const res = await handleGetTabCoords({ tab: "prayer", layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.x).toBe(709); // 516 + 18 + 5*35
    expect(data.y).toBe(168);
    expect(data.tab).toBe("prayer");
  });

  it("combat_options tab (index 0 of top row)", async () => {
    const res = await handleGetTabCoords({ tab: "combat_options", layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.x).toBe(534); // 516 + 18 + 0*35
    expect(data.y).toBe(168);
  });

  it("magic tab (index 6, last in top row)", async () => {
    const res = await handleGetTabCoords({ tab: "magic", layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.x).toBe(744); // 516 + 18 + 6*35
    expect(data.y).toBe(168);
  });

  it("logout tab (index 3 of bottom row)", async () => {
    const res = await handleGetTabCoords({ tab: "logout", layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.x).toBe(639); // 516 + 18 + 3*35
    expect(data.y).toBe(466);
  });

  it("music tab (index 6, last in bottom row)", async () => {
    const res = await handleGetTabCoords({ tab: "music", layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.x).toBe(744); // 516 + 18 + 6*35
    expect(data.y).toBe(466);
  });
});

describe("get_clickable_regions (resizable layout)", () => {
  // Regression: explicit layout:"resizable" previously returned fixed coords (scale=1 bug).
  // Resizable panels are edge-anchored, not scaled from fixed coords.
  it("minimap anchors to right edge of window", async () => {
    const res = await handleGetClickableRegions({ layout: "resizable" });
    const data = JSON.parse(res.content[0].text);
    // For default 1920×1080: minimap x = 1920 - 161 = 1759, not 571 (fixed value)
    expect(data.minimap.x).toBe(1759);
    expect(data.minimap.x).not.toBe(571); // would be 571 if the bug were present
  });

  it("chat_box anchors to bottom of window", async () => {
    const res = await handleGetClickableRegions({ layout: "resizable" });
    const data = JSON.parse(res.content[0].text);
    // For 1920×1080: chat y = 1080 - 165 = 915, not 338 (fixed value)
    expect(data.chat_box.y).toBe(915);
    expect(data.chat_box.y).not.toBe(338);
  });

  it("inventory_panel anchors to bottom-right", async () => {
    const res = await handleGetClickableRegions({ layout: "resizable" });
    const data = JSON.parse(res.content[0].text);
    // x = 1920 - 249 = 1671, y = 1080 - 298 = 782
    expect(data.inventory_panel.x).toBe(1671);
    expect(data.inventory_panel.y).toBe(782);
  });

  it("marks result as approximate", async () => {
    const res = await handleGetClickableRegions({ layout: "resizable" });
    const data = JSON.parse(res.content[0].text);
    expect(data.approximate).toBe(true);
  });
});

describe("get_clickable_regions (fixed layout)", () => {
  it("returns all expected regions", async () => {
    const res = await handleGetClickableRegions({ layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.minimap).toBeDefined();
    expect(data.inventory_panel).toBeDefined();
    expect(data.prayer_panel).toBeDefined();
    expect(data.chat_box).toBeDefined();
    expect(data.compass).toBeDefined();
  });

  it("minimap is in the top-right area", async () => {
    const res = await handleGetClickableRegions({ layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.minimap.x).toBeGreaterThan(500);
    expect(data.minimap.y).toBeLessThan(50);
    expect(data.minimap.width).toBeGreaterThan(100);
  });

  it("chat_box starts at left edge", async () => {
    const res = await handleGetClickableRegions({ layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.chat_box.x).toBe(0);
  });

  it("fixed layout has no approximate flag", async () => {
    const res = await handleGetClickableRegions({ layout: "fixed" });
    const data = JSON.parse(res.content[0].text);
    expect(data.approximate).toBeUndefined();
  });
});
