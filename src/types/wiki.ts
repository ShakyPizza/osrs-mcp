export interface WikiSearchResult {
  title: string;
  url: string;
}

export interface WikiPageInfo {
  title: string;
  summary: string;
  url: string;
}

export interface WikiItemInfo {
  name: string;
  examine?: string;
  members?: boolean;
  high_alch?: number;
  low_alch?: number;
  weight?: number;
  buy_limit?: number;
  tradeable?: boolean;
  stackable?: boolean;
  wiki_url: string;
}

export interface WikiNpcInfo {
  name: string;
  combat_level?: number;
  hitpoints?: number;
  attack_styles?: string[];
  aggressive?: boolean;
  poisonous?: boolean;
  examine?: string;
  wiki_url: string;
}

export interface WikiQuestInfo {
  name: string;
  difficulty?: string;
  length?: string;
  members?: boolean;
  requirements?: string[];
  rewards?: string[];
  wiki_url: string;
}
