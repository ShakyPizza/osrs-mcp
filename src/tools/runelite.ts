import { z } from "zod";
import { getRuneLiteStats, getRuneLiteInventory, getRuneLiteEquipment } from "../lib/runelite-client.js";

export const getStatsSchema = z.object({});

export async function handleGetStats(_args: z.infer<typeof getStatsSchema>) {
  try {
    const data = await getRuneLiteStats();
    return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const getInventorySchema = z.object({});

export async function handleGetInventory(_args: z.infer<typeof getInventorySchema>) {
  try {
    const data = await getRuneLiteInventory();
    return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const getEquipmentSchema = z.object({});

export async function handleGetEquipment(_args: z.infer<typeof getEquipmentSchema>) {
  try {
    const data = await getRuneLiteEquipment();
    return { content: [{ type: "text" as const, text: JSON.stringify(data) }] };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}
