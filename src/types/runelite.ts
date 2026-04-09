export interface RuneLiteSkillData {
  boosted: number;
  base: number;
  xp: number;
}

export interface RuneLiteStats {
  [skill: string]: RuneLiteSkillData;
}

export interface RuneLiteInventoryItem {
  id: number;
  quantity: number;
  slot: number;
}

export interface RuneLiteInventory {
  items: RuneLiteInventoryItem[];
}

export interface RuneLiteEquipmentItem {
  id: number;
  quantity: number;
  slot: string;
}

export interface RuneLiteEquipment {
  items: RuneLiteEquipmentItem[];
}
