export interface InventoryItem {
  slot: number; // 1-28
  name: string;
  quantity: number;
}

export interface ChatMessage {
  type: "Game" | "Public" | "Private" | "Clan" | "Trade" | "Unknown";
  sender?: string;
  text: string;
}

export interface StatusBars {
  hp_current: number;
  hp_max: number;
  prayer_current: number;
  prayer_max: number;
  run_energy: number; // 0-100
  special_attack: number; // 0-100
}

export interface MinimapInfo {
  compass_bearing: string;
  nearby_players: number;
  nearby_npcs: number;
  notes: string;
}

export interface GameState {
  location_hint: string;
  status: StatusBars;
  inventory_count: number;
  inventory_summary: string;
  chat_summary: string;
  active_activity: string;
  nearby_npcs: string[];
  notes: string;
}

export interface CaptureResult {
  image_base64: string;
  timestamp: string;
  window_id: number;
}
