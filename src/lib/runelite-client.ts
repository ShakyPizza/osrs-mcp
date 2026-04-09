import type { RuneLiteStats, RuneLiteInventory, RuneLiteEquipment } from "../types/runelite.js";

const RUNELITE_BASE = "http://localhost:8080";

async function runeliteGet<T>(path: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${RUNELITE_BASE}${path}`, {
      signal: AbortSignal.timeout(2000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") {
      throw new Error(
        "RuneLite HTTP Server plugin is not responding. Ensure RuneLite is running with the HTTP Server plugin enabled on port 8080."
      );
    }
    throw new Error(
      `Could not connect to RuneLite HTTP Server plugin at ${RUNELITE_BASE}. Is RuneLite running with the HTTP Server plugin enabled?`
    );
  }

  if (!res.ok) {
    throw new Error(`RuneLite API error: ${res.status} ${res.statusText} (path: ${path})`);
  }

  return res.json() as Promise<T>;
}

export async function getRuneLiteStats(): Promise<RuneLiteStats> {
  return runeliteGet<RuneLiteStats>("/stats");
}

export async function getRuneLiteInventory(): Promise<RuneLiteInventory> {
  return runeliteGet<RuneLiteInventory>("/inv");
}

export async function getRuneLiteEquipment(): Promise<RuneLiteEquipment> {
  return runeliteGet<RuneLiteEquipment>("/equip");
}
