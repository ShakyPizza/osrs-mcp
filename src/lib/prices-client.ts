import { TTLCache } from "./cache.js";
import type { ItemMapping, GEPrice, PriceHistory } from "../types/prices.js";

const PRICES_API = "https://prices.runescape.wiki/api/v1/osrs";
const USER_AGENT = "osrs-mcp/1.0 (personal-use)";

const mappingCache = new TTLCache<ItemMapping[]>(60 * 60 * 1000); // 1 hour
const MAPPING_KEY = "global";

async function pricesGet<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${PRICES_API}/${endpoint}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  }
  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Prices API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export async function getMapping(): Promise<ItemMapping[]> {
  const cached = mappingCache.get(MAPPING_KEY);
  if (cached) return cached;

  const data = await pricesGet<ItemMapping[]>("mapping");
  mappingCache.set(MAPPING_KEY, data);
  return data;
}

export async function resolveItemId(nameOrId: string | number): Promise<{ id: number; name: string } | null> {
  if (typeof nameOrId === "number") {
    const mapping = await getMapping();
    const item = mapping.find((m) => m.id === nameOrId);
    return item ? { id: item.id, name: item.name } : null;
  }

  const mapping = await getMapping();
  const lower = nameOrId.toLowerCase();
  const item = mapping.find((m) => m.name.toLowerCase() === lower)
    ?? mapping.find((m) => m.name.toLowerCase().includes(lower));
  return item ? { id: item.id, name: item.name } : null;
}

export async function getLatestPrice(itemId: number): Promise<GEPrice> {
  const mapping = await getMapping();
  const item = mapping.find((m) => m.id === itemId);

  const data = await pricesGet<{ data: Record<string, { high: number; highTime: number; low: number; lowTime: number }> }>(
    "latest",
    { id: String(itemId) }
  );

  const priceData = data.data[String(itemId)];
  if (!priceData) throw new Error(`No price data for item ID ${itemId}`);

  return {
    name: item?.name ?? `Item ${itemId}`,
    id: itemId,
    high: priceData.high,
    low: priceData.low,
    high_time: priceData.highTime,
    low_time: priceData.lowTime,
  };
}

export async function getPriceHistory(
  itemId: number,
  timestep: "5m" | "1h" | "6h" | "24h" = "1h"
): Promise<PriceHistory> {
  const data = await pricesGet<{
    data: Array<{
      timestamp: number;
      avgHighPrice: number | null;
      avgLowPrice: number | null;
      highPriceVolume: number;
      lowPriceVolume: number;
    }>;
  }>("timeseries", { timestep, id: String(itemId) });

  return {
    item_id: itemId,
    timestep,
    data: (data.data ?? []).map((d) => ({
      timestamp: d.timestamp,
      avg_high_price: d.avgHighPrice,
      avg_low_price: d.avgLowPrice,
      high_price_volume: d.highPriceVolume,
      low_price_volume: d.lowPriceVolume,
    })),
  };
}
