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

// Service-related types
// ============================================
export interface ServiceCategory {
  id: string;
  name: string;
  description?: string | null;
  color: string; // Hex color for calendar display
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  base_duration: number; // in minutes
  base_price: number;
  has_variants: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Relations
  category?: ServiceCategory;
  variants?: ServiceVariant[];
}

export interface ServiceVariant {
  id: string;
  service_id: string;
  name: string;
  duration_modifier: number; // additional minutes (can be negative)
  price_modifier: number; // additional price (can be negative)
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamMemberService {
  id: string;
  team_member_id: string;
  service_id: string;
  is_available: boolean;
  price: number; // Actual price this team member charges
  duration: number; // Actual duration for this team member (in minutes)
  created_at: string;
  updated_at: string;
  // Relations
  team_member?: TeamMember;
  service?: Service;
}

// ============================================
// Helper types for UI
// ============================================
export interface ServiceWithDetails extends Service {
  category: ServiceCategory;
  variants: ServiceVariant[];
  team_members?: TeamMemberService[];
}

export interface TeamMemberServiceWithDetails extends TeamMemberService {
  service: ServiceWithDetails;
}

export interface CategoryWithServices extends ServiceCategory {
  services: ServiceWithDetails[];
}
