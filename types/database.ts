// types/database.ts
export type UserRole = 'admin' | 'client';

export interface User {
  id: string;
  clerk_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  photo?: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  user_id?: string | null;
  clerk_id?: string | null;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  photo?: string | null;
  is_authenticated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  image?: string | null;
  booking_url: string;
  is_active: boolean;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: string;
  photo?: string | null;
  is_visible?: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

export interface AvailabilitySlot {
  id: string;
  team_member_id: string;
  shop_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  // Join fields (optional, from view)
  team_member_name?: string;
  shop_name?: string;
}
