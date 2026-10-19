export type LoyaltyActionType = "EARNED" | "REDEEMED";

export interface LoyaltyProgram {
  id: string;
  business_id: string;
  service_id: string | null;
  required_stamps: number;
  reward_description: string;
  is_active: boolean;
  created_at: string;
}

export interface LoyaltyTier {
  id: string;
  program_id: string;
  stamps: number;
  discount_percent: number; // 100 = gratis
  description: string;
}

export type LoyaltyTierInput = Pick<LoyaltyTier, "stamps" | "discount_percent"> & { description?: string };

export interface LoyaltyReward {
  id: string;
  card_id: string;
  discount_percent: number;
  description: string;
  status: "available" | "redeemed";
  created_at: string;
  redeemed_at: string | null;
}

export interface Client {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email: string | null;
  auth_user_id: string | null;
}

export interface ClientLoyaltyCard {
  id: string;
  client_id: string;
  business_id: string;
  program_id: string;
  current_stamps: number;
  rewards_available: number; // nº de recompensas sin canjear (caché de loyalty_rewards)
  total_rewards_earned: number;
  updated_at: string;
}

export interface LoyaltyHistoryEntry {
  id: string;
  business_id: string;
  client_id: string;
  card_id: string;
  booking_id: string | null;
  stamps_awarded: number;
  action_type: LoyaltyActionType;
  created_at: string;
}

// Resultado de la función SQL complete_appointment()
export interface CompleteAppointmentResult {
  applies: boolean;
  stamp_awarded: boolean;
  rewards_unlocked: { id: string; discount_percent: number; description: string }[];
  redeemed_discount_percent: number | null;
  current_stamps: number | null;
  required_stamps: number | null;
  rewards_available: number | null;
}

export type CompleteAppointmentResponse =
  | { ok: true; result: CompleteAppointmentResult }
  | { ok: false; error: string };
