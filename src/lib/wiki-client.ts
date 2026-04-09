import type { WikiSearchResult, WikiPageInfo, WikiItemInfo, WikiNpcInfo, WikiQuestInfo } from "../types/wiki.js";

const WIKI_API = "https://oldschool.runescape.wiki/api.php";
const WIKI_BASE = "https://oldschool.runescape.wiki/w/";
const USER_AGENT = "osrs-mcp/1.0 (personal-use; github.com/orri/osrs-mcp)";

async function wikiGet(params: Record<string, string>): Promise<unknown> {
  const url = new URL(WIKI_API);
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v);
  }

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": USER_AGENT },
  });
  if (!res.ok) throw new Error(`Wiki API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function wikiSearch(query: string, limit = 5): Promise<WikiSearchResult[]> {
  const data = (await wikiGet({
    action: "opensearch",
    search: query,
    limit: String(limit),
    redirects: "resolve",
  })) as [string, string[], string[], string[]];

  const titles = data[1] ?? [];
  const urls = data[3] ?? [];
  return titles.map((title, i) => ({ title, url: urls[i] ?? `${WIKI_BASE}${encodeURIComponent(title)}` }));
}

export async function wikiPageSummary(title: string): Promise<WikiPageInfo> {
  const data = (await wikiGet({
    action: "parse",
    page: title,
    prop: "text",
    section: "0",
    disablelimitreport: "1",
  })) as { parse?: { title: string; text: string } };

  if (!data.parse) throw new Error(`Page not found: ${title}`);

  // Strip HTML tags for a plain text summary
  const html = data.parse.text;
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);

  return {
    title: data.parse.title,
    summary: text,
    url: `${WIKI_BASE}${encodeURIComponent(data.parse.title)}`,
  };
}

async function getPageWikitext(title: string): Promise<string> {
  const data = (await wikiGet({
    action: "query",
    titles: title,
    prop: "revisions",
    rvprop: "content",
    rvslots: "main",
  })) as { query?: { pages?: Record<string, { revisions?: Array<{ slots?: { main?: { content?: string } } }> }> } };

  const pages = data.query?.pages ?? {};
  const page = Object.values(pages)[0];
  return page?.revisions?.[0]?.slots?.main?.content ?? "";
}

function parseInfoboxField(wikitext: string, field: string): string | undefined {
  const regex = new RegExp(`\\|\\s*${field}\\s*=\\s*([^|}\n]+)`, "i");
  const match = wikitext.match(regex);
  return match?.[1]?.trim();
}

export async function wikiItemInfo(itemName: string): Promise<WikiItemInfo> {
  const results = await wikiSearch(itemName, 1);
  if (!results.length) throw new Error(`Item not found: ${itemName}`);

  const title = results[0].title;
  const wikitext = await getPageWikitext(title);

  const examine = parseInfoboxField(wikitext, "examine");
  const membersRaw = parseInfoboxField(wikitext, "members");
  const highAlchRaw = parseInfoboxField(wikitext, "high alch");
  const lowAlchRaw = parseInfoboxField(wikitext, "low alch");
  const weightRaw = parseInfoboxField(wikitext, "weight");
  const limitRaw = parseInfoboxField(wikitext, "exchange") || parseInfoboxField(wikitext, "buy limit");

  return {
    name: title,
    examine,
    members: membersRaw ? membersRaw.toLowerCase() === "yes" : undefined,
    high_alch: highAlchRaw ? parseInt(highAlchRaw.replace(/,/g, ""), 10) : undefined,
    low_alch: lowAlchRaw ? parseInt(lowAlchRaw.replace(/,/g, ""), 10) : undefined,
    weight: weightRaw ? parseFloat(weightRaw) : undefined,
    buy_limit: limitRaw ? parseInt(limitRaw.replace(/,/g, ""), 10) : undefined,
    tradeable: wikitext.toLowerCase().includes("tradeable"),
    stackable: wikitext.toLowerCase().includes("stackable"),
    wiki_url: `${WIKI_BASE}${encodeURIComponent(title)}`,
  };
}

export async function wikiNpcInfo(npcName: string): Promise<WikiNpcInfo> {
  const results = await wikiSearch(npcName, 1);
  if (!results.length) throw new Error(`NPC not found: ${npcName}`);

  const title = results[0].title;
  const wikitext = await getPageWikitext(title);

  const combatRaw = parseInfoboxField(wikitext, "combat level");
  const hpRaw = parseInfoboxField(wikitext, "hitpoints");
  const aggressiveRaw = parseInfoboxField(wikitext, "aggressive");
  const poisonousRaw = parseInfoboxField(wikitext, "poisonous");
  const examine = parseInfoboxField(wikitext, "examine");

  const attackStylesRaw = parseInfoboxField(wikitext, "attack style");
  const attackStyles = attackStylesRaw
    ? attackStylesRaw.split(/[,/]/).map((s) => s.trim()).filter(Boolean)
    : undefined;

  return {
    name: title,
    combat_level: combatRaw ? parseInt(combatRaw, 10) : undefined,
    hitpoints: hpRaw ? parseInt(hpRaw, 10) : undefined,
    attack_styles: attackStyles,
    aggressive: aggressiveRaw ? aggressiveRaw.toLowerCase() === "yes" : undefined,
    poisonous: poisonousRaw ? poisonousRaw.toLowerCase() === "yes" : undefined,
    examine,
    wiki_url: `${WIKI_BASE}${encodeURIComponent(title)}`,
  };
}

export async function wikiQuestInfo(questName: string): Promise<WikiQuestInfo> {
  const results = await wikiSearch(questName, 1);
  if (!results.length) throw new Error(`Quest not found: ${questName}`);

  const title = results[0].title;
  const wikitext = await getPageWikitext(title);

  const difficulty = parseInfoboxField(wikitext, "difficulty");
  const length = parseInfoboxField(wikitext, "length");
  const membersRaw = parseInfoboxField(wikitext, "members");

  return {
    name: title,
    difficulty,
    length,
    members: membersRaw ? membersRaw.toLowerCase() === "yes" : undefined,
    wiki_url: `${WIKI_BASE}${encodeURIComponent(title)}`,
  };
}
