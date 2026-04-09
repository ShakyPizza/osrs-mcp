import { z } from "zod";
import { getMapping, resolveItemId, getLatestPrice, getPriceHistory } from "../lib/prices-client.js";

export const gePriceSchema = z.object({
  item_name: z.string().optional().describe("Item name to look up (use this or item_id)"),
  item_id: z.number().int().optional().describe("Item ID — faster than name lookup (use this or item_name)"),
});

export async function handleGePrice(args: z.infer<typeof gePriceSchema>) {
  try {
    if (!args.item_name && !args.item_id) {
      return {
        content: [{ type: "text" as const, text: "Either item_name or item_id must be provided" }],
        isError: true,
      };
    }

    const resolved = await resolveItemId(args.item_id ?? args.item_name!);
    if (!resolved) {
      return {
        content: [{ type: "text" as const, text: `Item not found: ${args.item_name ?? args.item_id}` }],
        isError: true,
      };
    }

    const price = await getLatestPrice(resolved.id);
    return { content: [{ type: "text" as const, text: JSON.stringify(price) }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const gePriceHistorySchema = z.object({
  item_name: z.string().optional().describe("Item name to look up (use this or item_id)"),
  item_id: z.number().int().optional().describe("Item ID — faster than name lookup (use this or item_name)"),
  timestep: z.enum(["5m", "1h", "6h", "24h"]).optional().default("1h").describe("Time interval for price history data points"),
});

export async function handleGePriceHistory(args: z.infer<typeof gePriceHistorySchema>) {
  try {
    if (!args.item_name && !args.item_id) {
      return {
        content: [{ type: "text" as const, text: "Either item_name or item_id must be provided" }],
        isError: true,
      };
    }

    const resolved = await resolveItemId(args.item_id ?? args.item_name!);
    if (!resolved) {
      return {
        content: [{ type: "text" as const, text: `Item not found: ${args.item_name ?? args.item_id}` }],
        isError: true,
      };
    }

    const history = await getPriceHistory(resolved.id, args.timestep);
    return { content: [{ type: "text" as const, text: JSON.stringify(history) }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const geMappingSchema = z.object({
  filter: z.string().optional().describe("Filter items by name substring (case-insensitive)"),
  limit: z.number().int().min(1).max(200).optional().default(50).describe("Maximum number of items to return (1-200)"),
});

export async function handleGeMapping(args: z.infer<typeof geMappingSchema>) {
  try {
    let items = await getMapping();

    if (args.filter) {
      const lower = args.filter.toLowerCase();
      items = items.filter((i) => i.name.toLowerCase().includes(lower));
    }

    items = items.slice(0, args.limit);
    return { content: [{ type: "text" as const, text: JSON.stringify(items) }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const calculateProfitSchema = z.object({
  item_name: z.string().describe("Item name"),
  buy_price: z.number().int().describe("Price you buy at"),
  sell_price: z.number().int().describe("Price you sell at"),
  quantity: z.number().int().min(1).describe("Number of items"),
});

export async function handleCalculateProfit(args: z.infer<typeof calculateProfitSchema>) {
  try {
    const ge_tax = Math.floor(args.sell_price * 0.01); // 1% GE tax
    const profit_per_item = args.sell_price - args.buy_price - ge_tax;
    const total_profit = profit_per_item * args.quantity;
    const total_invested = args.buy_price * args.quantity;
    const roi_percent = total_invested > 0 ? ((total_profit / total_invested) * 100).toFixed(2) : "0";

    const result = {
      item: args.item_name,
      buy_price: args.buy_price,
      sell_price: args.sell_price,
      ge_tax_per_item: ge_tax,
      profit_per_item,
      quantity: args.quantity,
      total_profit,
      roi_percent: `${roi_percent}%`,
    };

    return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}
