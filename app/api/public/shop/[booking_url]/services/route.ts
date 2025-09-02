// app/api/public/shop/[booking_url]/services/route.ts
// ============================================
// Get all services available at a specific shop
// This is the entry point for the booking flow
// ============================================
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();

// Define types
interface ServiceCategory {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  is_active: boolean;
}

interface ServiceVariant {
  id: string;
  service_id: string;
  name: string;
  duration_modifier: number;
  price_modifier: number;
  is_default: boolean;
}

interface Service {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  base_duration: number;
  base_price: number;
  has_variants: boolean;
  is_active: boolean;
  category?: ServiceCategory | null;
  variants?: ServiceVariant[] | null;
}

interface TeamMemberService {
  service_id: string;
  price: number;
  team_member?: {
    id: string;
    is_visible: boolean;
  } | null;
}

// Raw response type from Supabase
interface TeamMemberServiceRaw {
  service_id: string;
  price: number;
  team_member?:
    | {
        id: string;
        is_visible: boolean;
      }
    | Array<{
        id: string;
        is_visible: boolean;
      }>
    | null;
}

interface EnhancedService extends Service {
  min_price: number;
  provider_count: number;
  is_available: boolean;
}

interface Shop {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  image?: string | null;
  booking_url: string;
  is_active: boolean;
}

interface ServiceStats {
  min_price: number;
  provider_count: number;
}

interface Category {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  services: CategoryService[];
}

interface CategoryService {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  min_price: number;
  base_price: number;
  has_variants: boolean;
  variants?: ServiceVariant[] | null;
  provider_count: number;
  is_available: boolean;
}

export async function GET(
  req: Request,
  { params }: { params: { booking_url: string } }
) {
  try {
    // Get shop details
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('booking_url', params.booking_url)
      .eq('is_active', true)
      .single();

    if (shopError || !shop) {
      return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
    }

    const typedShop = shop as Shop;

    // Get all active services with categories
    const { data: services, error: servicesError } = await supabase
      .from('services')
      .select(
        `
        *,
        category:service_categories(*),
        variants:service_variants(*)
      `
      )
      .eq('is_active', true)
      .order('category_id')
      .order('name');

    if (servicesError) {
      return NextResponse.json(
        { error: servicesError.message },
        { status: 400 }
      );
    }

    const typedServices = services as Service[];

    // Filter services where category is active
    const activeServices = typedServices?.filter(
      (service) => service.category?.is_active !== false
    );

    // Get team member services to find minimum prices and availability
    const { data: teamServices } = await supabase
      .from('team_member_services')
      .select(
        `
        service_id, 
        price,
        team_member:team_members!inner(
          id,
          is_visible
        )
      `
      )
      .eq('is_available', true);

    // Handle the Supabase response - team_member comes as array or object
    const typedTeamServices: TeamMemberService[] =
      (teamServices as TeamMemberServiceRaw[] | null)?.map((item) => {
        // Handle case where team_member might be an array (Supabase quirk)
        const teamMember = item.team_member
          ? Array.isArray(item.team_member)
            ? item.team_member[0]
            : item.team_member
          : null;

        return {
          service_id: item.service_id,
          price: item.price,
          team_member: teamMember
            ? {
                id: teamMember.id,
                is_visible: teamMember.is_visible,
              }
            : null,
        };
      }) || [];

    // Calculate minimum price and provider count for each service
    const serviceStats = typedTeamServices.reduce((acc, item) => {
      // Check if team member exists and is visible
      if (!item.team_member || !item.team_member.is_visible) return acc;

      if (!acc[item.service_id]) {
        acc[item.service_id] = {
          min_price: item.price,
          provider_count: 1,
        };
      } else {
        acc[item.service_id].min_price = Math.min(
          acc[item.service_id].min_price,
          item.price
        );
        acc[item.service_id].provider_count++;
      }
      return acc;
    }, {} as Record<string, ServiceStats>);

    // Enhance services with pricing and availability info
    const enhancedServices: EnhancedService[] =
      activeServices?.map((service) => ({
        ...service,
        min_price: serviceStats?.[service.id]?.min_price || service.base_price,
        provider_count: serviceStats?.[service.id]?.provider_count || 0,
        is_available: (serviceStats?.[service.id]?.provider_count || 0) > 0,
      })) || [];

    // Group by category for display
    const categories: Category[] = [];
    const categoryMap = new Map<string, Category>();

    enhancedServices.forEach((service) => {
      const categoryId = service.category?.id || 'uncategorized';
      const categoryName = service.category?.name || 'Other';

      if (!categoryMap.has(categoryId)) {
        const category: Category = {
          id: categoryId,
          name: categoryName,
          color: service.category?.color || '#6B7280',
          description: service.category?.description,
          services: [],
        };
        categoryMap.set(categoryId, category);
        categories.push(category);
      }

      const categoryService: CategoryService = {
        id: service.id,
        name: service.name,
        description: service.description,
        duration: service.base_duration,
        min_price: service.min_price,
        base_price: service.base_price,
        has_variants: service.has_variants,
        variants: service.variants,
        provider_count: service.provider_count,
        is_available: service.is_available,
      };

      categoryMap.get(categoryId)!.services.push(categoryService);
    });

    // Add "Featured" category with popular services
    const featuredServices = enhancedServices
      .filter((s) => s.is_available)
      .sort((a, b) => b.provider_count - a.provider_count)
      .slice(0, 5)
      .map(
        (service): CategoryService => ({
          id: service.id,
          name: service.name,
          description: service.description,
          duration: service.base_duration,
          min_price: service.min_price,
          base_price: service.base_price,
          has_variants: service.has_variants,
          variants: service.variants,
          provider_count: service.provider_count,
          is_available: service.is_available,
        })
      );

    if (featuredServices.length > 0) {
      categories.unshift({
        id: 'featured',
        name: 'Featured',
        color: '#000000',
        description: null,
        services: featuredServices,
      });
    }

    return NextResponse.json({
      data: {
        shop: {
          id: typedShop.id,
          name: typedShop.name,
          address: typedShop.address,
          phone: typedShop.phone,
          image: typedShop.image,
          booking_url: typedShop.booking_url,
        },
        categories,
        total_services: enhancedServices.length,
      },
    });
  } catch (error) {
    console.error('Error fetching shop services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
