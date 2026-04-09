export interface ItemMapping {
  id: number;
  name: string;
  examine: string;
  members: boolean;
  value: number;
  lowalch: number;
  highalch: number;
  limit?: number;
  icon?: string;
}

export interface GEPrice {
  name: string;
  id: number;
  high: number;
  low: number;
  high_time: number; // unix timestamp
  low_time: number;
}

export interface PriceHistoryPoint {
  timestamp: number;
  avg_high_price: number | null;
  avg_low_price: number | null;
  high_price_volume: number;
  low_price_volume: number;
}

export interface PriceHistory {
  item_id: number;
  timestep: string;
  data: PriceHistoryPoint[];
}
