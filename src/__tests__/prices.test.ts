import { describe, it, expect } from "vitest";
import { handleCalculateProfit } from "../tools/prices.js";

describe("calculate_profit", () => {
  it("computes tax, profit, and ROI correctly", async () => {
    // buy 100, sell 110: tax = floor(110 * 0.01) = 1, profit = 9
    const res = await handleCalculateProfit({
      item_name: "Test item",
      buy_price: 100,
      sell_price: 110,
      quantity: 1,
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.ge_tax_per_item).toBe(1);
    expect(data.profit_per_item).toBe(9);
    expect(data.total_profit).toBe(9);
    expect(data.roi_percent).toBe("9.00%");
  });

  it("scales correctly with quantity", async () => {
    const res = await handleCalculateProfit({
      item_name: "Nature rune",
      buy_price: 200,
      sell_price: 250,
      quantity: 1000,
    });
    const data = JSON.parse(res.content[0].text);
    // tax = floor(250 * 0.01) = 2, profit_per = 250-200-2 = 48
    expect(data.ge_tax_per_item).toBe(2);
    expect(data.profit_per_item).toBe(48);
    expect(data.total_profit).toBe(48_000);
  });

  it("handles a loss (negative profit)", async () => {
    const res = await handleCalculateProfit({
      item_name: "Bad flip",
      buy_price: 1000,
      sell_price: 900,
      quantity: 1,
    });
    const data = JSON.parse(res.content[0].text);
    // tax = 9, profit = 900 - 1000 - 9 = -109
    expect(data.profit_per_item).toBe(-109);
    expect(data.total_profit).toBe(-109);
  });

  it("GE tax is floored (not rounded)", async () => {
    // sell_price = 199: tax = floor(199 * 0.01) = floor(1.99) = 1
    const res = await handleCalculateProfit({
      item_name: "Floor tax check",
      buy_price: 100,
      sell_price: 199,
      quantity: 1,
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.ge_tax_per_item).toBe(1);
  });

  it("includes item name in result", async () => {
    const res = await handleCalculateProfit({
      item_name: "Dragon bones",
      buy_price: 2000,
      sell_price: 2500,
      quantity: 10,
    });
    const data = JSON.parse(res.content[0].text);
    expect(data.item).toBe("Dragon bones");
  });
});
