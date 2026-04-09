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
  level: z.number().int().min(1).max(99).optional().describe("Target level (returns total XP required to reach it)"),
  current_xp: z.number().int().min(0).optional().describe("Current XP amount (returns current level and XP needed for next level)"),
});

export async function handleSkillXpInfo(args: z.infer<typeof skillXpInfoSchema>) {
  try {
    if (!args.level && args.current_xp === undefined) {
      return {
        content: [{ type: "text" as const, text: "Either level or current_xp must be provided" }],
        isError: true,
      };
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
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}

export const calcItemsToLevelSchema = z.object({
  skill: z.string().describe("Skill name (e.g. 'Woodcutting'). Used for labeling the result."),
  current_level: z.number().int().min(1).max(98).optional().describe("Current level. Provide this OR current_xp."),
  current_xp: z.number().int().min(0).optional().describe("Current XP. Provide this OR current_level."),
  target_level: z.number().int().min(2).max(99).describe("Target level to reach."),
  xp_per_item: z.number().positive().describe("XP granted per item/action (e.g. 87.5 for cutting magic logs)."),
});

export async function handleCalcItemsToLevel(args: z.infer<typeof calcItemsToLevelSchema>) {
  try {
    const hasCurrent = args.current_level !== undefined || args.current_xp !== undefined;
    if (!hasCurrent) {
      return {
        content: [{ type: "text" as const, text: "Provide either current_level or current_xp." }],
        isError: true,
      };
    }

    const current_xp_val = args.current_xp !== undefined ? args.current_xp : levelToXp(args.current_level!);
    const current_level_val = xpToLevel(current_xp_val);

    if (args.target_level <= current_level_val) {
      return {
        content: [{ type: "text" as const, text: `target_level (${args.target_level}) must be higher than current level (${current_level_val}).` }],
        isError: true,
      };
    }

    const target_xp = levelToXp(args.target_level);
    const xp_needed = target_xp - current_xp_val;
    const items_needed = Math.ceil(xp_needed / args.xp_per_item);

    return {
      content: [{
        type: "text" as const,
        text: JSON.stringify({
          skill: args.skill,
          current_level: current_level_val,
          current_xp: current_xp_val,
          target_level: args.target_level,
          target_xp,
          xp_needed,
          xp_per_item: args.xp_per_item,
          items_needed,
        }),
      }],
    };
  } catch (err) {
    return {
      content: [{ type: "text" as const, text: err instanceof Error ? err.message : String(err) }],
      isError: true,
    };
  }
}
