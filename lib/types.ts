export type Users = {
  id: string;
  wallet_address: string;
  score: number;
  daily_clicks: number; // DEFAULT 100, her gece 100 (sabit)
  daily_clicks_available: number; // DEFAULT 100, her gece 0
  purchased_clicks: number;
  purchased_clicks_used: number;
  referrer_wallet_address: string | null;
  referral_bonus_score: number;
  last_active_at: string;
  created_at: string;
};
