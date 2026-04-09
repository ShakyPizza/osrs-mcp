import { z } from "zod";
import {
  wikiSearch,
  wikiPageSummary,
  wikiItemInfo,
  wikiNpcInfo,
  wikiQuestInfo,
} from "../lib/wiki-client.js";

export const wikiSearchSchema = z.object({
  query: z.string().describe("Search query for the OSRS wiki"),
  limit: z.number().int().min(1).max(10).optional().default(5),
});

export async function handleWikiSearch(args: z.infer<typeof wikiSearchSchema>) {
  const results = await wikiSearch(args.query, args.limit);
  return { content: [{ type: "text" as const, text: JSON.stringify(results) }] };
}

export const wikiPageSchema = z.object({
  title: z.string().describe("Exact wiki page title"),
});

export async function handleWikiPage(args: z.infer<typeof wikiPageSchema>) {
  const info = await wikiPageSummary(args.title);
  return { content: [{ type: "text" as const, text: JSON.stringify(info) }] };
}

export const wikiItemInfoSchema = z.object({
  item_name: z.string().describe("Name of the OSRS item"),
});

export async function handleWikiItemInfo(args: z.infer<typeof wikiItemInfoSchema>) {
  const info = await wikiItemInfo(args.item_name);
  return { content: [{ type: "text" as const, text: JSON.stringify(info) }] };
}

export const wikiNpcInfoSchema = z.object({
  npc_name: z.string().describe("Name of the NPC"),
});

export async function handleWikiNpcInfo(args: z.infer<typeof wikiNpcInfoSchema>) {
  const info = await wikiNpcInfo(args.npc_name);
  return { content: [{ type: "text" as const, text: JSON.stringify(info) }] };
}

export const wikiQuestInfoSchema = z.object({
  quest_name: z.string().describe("Name of the quest"),
});

export async function handleWikiQuestInfo(args: z.infer<typeof wikiQuestInfoSchema>) {
  const info = await wikiQuestInfo(args.quest_name);
  return { content: [{ type: "text" as const, text: JSON.stringify(info) }] };
}
