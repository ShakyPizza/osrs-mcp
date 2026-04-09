import { z } from "zod";

// OSRS XP table (level -> total XP required)
const XP_TABLE: number[] = [0];
for (let level = 1; level < 99; level++) {
  const prev = XP_TABLE[level - 1]!;
  const pts = Math.floor(level + 300 * Math.pow(2, level / 7));
  XP_TABLE.push(prev + Math.floor(pts / 4));
}

function levelToXp(level: number): number {
  if (level < 1) return 0;
  if (level >= 99) return 13_034_431;
  return XP_TABLE[level - 1] ?? 0;
}

function xpToLevel(xp: number): number {
  for (let level = 98; level >= 1; level--) {
    if (xp >= (XP_TABLE[level - 1] ?? 0)) return level;
  }
  return 1;
}

export const skillXpInfoSchema = z.object({
  level: z.number().int().min(1).max(99).optional().describe("Target level (returns XP required)"),
  current_xp: z.number().int().min(0).optional().describe("Current XP (returns current level and XP to next)"),
});

export async function handleSkillXpInfo(args: z.infer<typeof skillXpInfoSchema>) {
  if (!args.level && args.current_xp === undefined) {
    throw new Error("Either level or current_xp must be provided");
  }

  let result: Record<string, unknown>;

  if (args.current_xp !== undefined) {
    const current_level = xpToLevel(args.current_xp);
    const next_level_xp = levelToXp(current_level + 1);
    const xp_to_next = next_level_xp - args.current_xp;
    result = {
      current_xp: args.current_xp,
      current_level,
      next_level: current_level + 1,
      xp_to_next_level: current_level < 99 ? xp_to_next : 0,
      next_level_xp_required: current_level < 99 ? next_level_xp : null,
    };
  } else {
    const level = args.level!;
    const xp_required = levelToXp(level);
    result = {
      level,
      xp_required,
      xp_from_1: xp_required,
    };
  }

  return { content: [{ type: "text" as const, text: JSON.stringify(result) }] };
}
