export type Users = {
  id: string;
  wallet_address: string;
  clicks: number;
  score: number;
  max_clicks: number;
  last_active: string; // ISO timestamp
  created_at: string; // ISO timestamp
};
