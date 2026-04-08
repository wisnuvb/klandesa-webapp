export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "LEAVE";
export type CheckInMethod = "QR" | "GPS";
export type SubscriptionTier =
  | "FREE"
  | "TIER_6_10"
  | "TIER_11_20"
  | "TIER_21_30"
  | "TIER_31_50"
  | "CUSTOM";
export type PaymentMethod = "QRIS" | "VA" | "EWALLET";

export interface AttendanceRow {
  id: number;
  user_id: number;
  user_name: string;
  user_photo: string | null;
  position: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: AttendanceStatus;
  check_in_method: CheckInMethod | null;
  location_lat: number | null;
  location_lng: number | null;
  notes: string | null;
}

export interface AttendanceStats {
  totalStaff: number;
  present: number;
  late: number;
  absent: number;
  staffLimit: number;
  isOverLimit: boolean;
  hiddenCount: number;
}

export interface AttendanceTodayResponse {
  rows: AttendanceRow[];
  stats: AttendanceStats;
  plan: {
    tier: SubscriptionTier;
    subscriptionPlan: string | null;
    subscriptionStatus: string | null;
  };
}

export interface AttendanceHistoryRow {
  id: string;
  user_id: number;
  user_name: string;
  user_photo: string | null;
  position: string;
  attendance_date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: AttendanceStatus;
  check_in_method: CheckInMethod | null;
  shift_name: string | null;
  notes: string | null;
}

export interface AttendanceHistoryResponse {
  rows: AttendanceHistoryRow[];
  total: number;
  page: number;
  pageSize: number;
  range: { from: string; to: string; clamped: boolean; maxDays: number };
  plan: { tier: SubscriptionTier };
}
