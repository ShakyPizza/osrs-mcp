import { describe, it, expect, vi, afterEach } from "vitest";
import { getRuneLiteStats, getRuneLiteInventory, getRuneLiteEquipment } from "../lib/runelite-client.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockFetch(response: unknown) {
  vi.stubGlobal("fetch", async () => ({
    ok: true,
    json: async () => response,
  }));
}

function mockFetchError(name: string, message: string) {
  vi.stubGlobal("fetch", async () => {
    const err = new Error(message);
    err.name = name;
    throw err;
  });
}

function mockFetchStatus(status: number, statusText: string) {
  vi.stubGlobal("fetch", async () => ({
    ok: false,
    status,
    statusText,
  }));
}

describe("runelite-client", () => {
  describe("getRuneLiteStats", () => {
    it("returns parsed stats on success", async () => {
      const mockStats = {
        attack: { boosted: 70, base: 70, xp: 737_627 },
        strength: { boosted: 80, base: 80, xp: 2_034_000 },
      };
      mockFetch(mockStats);
      const result = await getRuneLiteStats();
      expect(result).toEqual(mockStats);
    });

    it("throws descriptive error on timeout (TimeoutError)", async () => {
      mockFetchError("TimeoutError", "signal timed out");
      await expect(getRuneLiteStats()).rejects.toThrow("not responding");
    });

    it("throws descriptive error on connection refused", async () => {
      mockFetchError("TypeError", "fetch failed");
      await expect(getRuneLiteStats()).rejects.toThrow("Could not connect");
    });

    it("throws on non-ok HTTP status", async () => {
      mockFetchStatus(404, "Not Found");
      await expect(getRuneLiteStats()).rejects.toThrow("404");
    });
  });

  describe("getRuneLiteInventory", () => {
    it("returns inventory items on success", async () => {
      const mockInv = {
        items: [
          { id: 1755, quantity: 1, slot: 0 },  // Chisel
          { id: -1, quantity: 0, slot: 1 },      // Empty slot
        ],
      };
      mockFetch(mockInv);
      const result = await getRuneLiteInventory();
      expect(result.items).toHaveLength(2);
      expect(result.items[0].id).toBe(1755);
    });
  });

  describe("getRuneLiteEquipment", () => {
    it("returns equipment on success", async () => {
      const mockEquip = {
        items: [
          { id: 4151, quantity: 1, slot: "weapon" }, // Whip
          { id: 3751, quantity: 1, slot: "head" },    // Torag's helm
        ],
      };
      mockFetch(mockEquip);
      const result = await getRuneLiteEquipment();
      expect(result.items[0].slot).toBe("weapon");
      expect(result.items[0].id).toBe(4151);
    });
  });
});
