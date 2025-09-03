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

export type BookingStatus = 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export interface Booking {
  id: string;
  booking_number: string;
  client_id: string;
  team_member_id: string;
  shop_id: string;
  service_id: string;
  variant_id?: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  duration: number;
  price: number;
  status: BookingStatus;
  booking_note?: string | null;
  created_at: string;
  updated_at: string;
  cancelled_at?: string | null;
  cancelled_reason?: string | null;
  completed_at?: string | null;
  no_show_at?: string | null;
}

export interface BookingWithLocalTimes extends Booking {
  starts_at_local: string;
  ends_at_local: string;
  booking_date_local: string;
  start_time_local: string;
  end_time_local: string;
  shop_timezone: string;
  client_first_name: string;
  client_last_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  team_member_first_name: string;
  team_member_last_name: string;
  service_name: string;
  category_color: string;
  variant_name?: string | null;
}

// Booking flow types - Updated for authenticated users
export interface BookingFlowState {
  shopId: string;
  shopName: string;
  shopAddress: string;
  serviceId: string | null;
  serviceName: string | null;
  servicePrice: number | null;
  serviceDuration: number | null;
  categoryColor: string | null;
  variantId: string | null;
  variantName: string | null;
  teamMemberId: string | null;
  teamMemberName: string | null;
  teamMemberPrice: number | null;
  selectedDate: Date | null;
  selectedTime: string | null;
  // Client details (auto-filled from clients table)
  clientId?: string; // Added: Client ID from database
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}
