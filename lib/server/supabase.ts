import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { AuthUser } from "@/lib/core/auth";
import type { PaidReport } from "@/lib/core/billing/paid-report";

type ProfileWrite = AuthUser & { readonly updated_at: string };
type ReportRow = {
  readonly id: string;
  readonly user_id: string;
  readonly content: PaidReport;
  readonly created_at: string;
};
type LedgerRow = {
  readonly id: number;
  readonly user_id: string;
  readonly delta: number;
  readonly reason: "purchase" | "coupon" | "report" | "refund";
  readonly ref: string;
  readonly created_at: string;
};
type Database = {
  public: {
    Views: Record<string, never>;
    Tables: {
      profiles: {
        Row: ProfileWrite & { readonly created_at: string };
        Insert: ProfileWrite;
        Update: Partial<ProfileWrite>;
        Relationships: [];
      };
      reports: {
        Row: ReportRow;
        Insert: Omit<ReportRow, "id" | "created_at">;
        Update: Partial<ReportRow>;
        Relationships: [];
      };
      credit_ledger: {
        Row: LedgerRow;
        Insert: Omit<LedgerRow, "id" | "created_at">;
        Update: Partial<LedgerRow>;
        Relationships: [];
      };
    };
    Functions: {
      credit_balance: { Args: { p_user: string }; Returns: number };
      grant_credits: {
        Args: { p_user: string; p_delta: number; p_reason: string; p_ref: string };
        Returns: boolean;
      };
      redeem_coupon: { Args: { p_user: string; p_code: string }; Returns: number };
      save_report: { Args: { p_user: string; p_content: PaidReport }; Returns: string };
      revoke_purchase: {
        Args: { p_user: string; p_transaction: string; p_ref: string };
        Returns: boolean;
      };
    };
  };
};

class SupabaseConfigurationError extends Error {
  constructor() {
    super("Supabase server configuration is missing.");
    this.name = "SupabaseConfigurationError";
  }
}
let client: SupabaseClient<Database> | undefined;

export function supabaseAdmin(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) throw new SupabaseConfigurationError();
  client ??= createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
