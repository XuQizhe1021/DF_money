export interface ApiResponse<T> {
  code: string;
  message: string;
  data: T;
  details?: Record<string, unknown>;
}

export interface AmmoLatestItem {
  id: string;
  name: string;
  grade: string | null;
  caliber: string | null;
  price: number;
  recorded_at: string;
}

export interface AmmoLatestData {
  items: AmmoLatestItem[];
  count: number;
}

export interface HistoryItem {
  ammo_id: string;
  price: number;
  recorded_at: string;
  source: string;
}

export interface HistoryData {
  ammo_id: string;
  days: number;
  items: HistoryItem[];
}

export interface ChangeRankingItem {
  ammo_id: string;
  name: string;
  first_price: number;
  last_price: number;
  pct: number;
}

export interface ChangeRankingData {
  days: number;
  limit: number;
  gainers: ChangeRankingItem[];
  losers: ChangeRankingItem[];
}

export interface AnalysisResult {
  price_position: string;
  action: string;
  risk_level: string;
  risk_tips: string[];
  reason: string;
  reason_markdown?: string;
}

export interface AnalysisData {
  ammo_id: string;
  days: number;
  source: string;
  result: AnalysisResult;
}

export interface AnalysisConfigData {
  enabled: boolean;
  provider: string;
  base_url: string;
  model: string;
  api_key: string;
  timeout_seconds: number;
  max_calls_per_hour: number;
  cache_ttl_seconds: number;
  daily_signal_enabled: boolean;
  daily_signal_hour: number;
}

export interface DailySignalActionItem {
  ammo_id: string;
  name: string;
  action: "建议加仓" | "建议售出" | "观望";
  risk_level: "低" | "中" | "高";
  reason: string;
}

export interface DailySignalEventData {
  id: number;
  title: string;
  level: "低" | "中" | "高";
  message_markdown: string;
  suggested_actions: DailySignalActionItem[];
  is_confirmed: boolean;
  created_at: string;
  confirmed_at?: string | null;
}

export interface DataSourceConfigData {
  api_base_url: string;
  api_ammo_endpoint: string;
  openid: string;
  access_token: string;
  fetch_interval_hours: number;
  has_openid: boolean;
  has_access_token: boolean;
}

export interface HoldingItem {
  id: number;
  ammo_id: string;
  ammo_name: string;
  purchase_price: number;
  purchased_at: string;
  status: "holding" | "sold";
  threshold_pct: number | null;
  sold_at: string | null;
  updated_at: string;
  latest_price: number | null;
  latest_recorded_at?: string;
  pnl_value: number | null;
  pnl_ratio: number | null;
}

export interface HoldingListData {
  items: HoldingItem[];
  count: number;
}

export interface AlertConfigData {
  default_threshold_pct: number;
  cooldown_minutes: number;
  console_enabled: boolean;
}

export interface AlertEventItem {
  id: number;
  holding_id: number;
  ammo_id: string;
  current_price: number;
  threshold_pct: number;
  message: string;
  dedupe_key: string;
  is_read: number;
  created_at: string;
}

export interface AlertEventsData {
  items: AlertEventItem[];
  count: number;
}
