// app/api/public/services/route.ts
// ============================================
// Modified to support shop-specific services with minimum pricing
// ============================================
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

const supabase = createServerClient();

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

interface ServiceWithPricing extends Service {
  min_price: number;
  has_providers: boolean;
}

interface TeamPrice {
  service_id: string;
  price: number;
}

interface Shop {
  id: string;
}

interface CategoryGroup {
  category: ServiceCategory | null;
  services: ServiceWithPricing[];
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shop_id');
    const booking_url = searchParams.get('booking_url');

    // First, get shop ID if booking_url is provided
    let actualShopId = shopId;
    if (booking_url && !shopId) {
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('booking_url', booking_url)
        .eq('is_active', true)
        .single();

      if (shop) {
        const typedShop = shop as Shop;
        actualShopId = typedShop.id;
      }
    }

    // Get all active services with categories and variants
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
      .order('name');

    if (servicesError) {
      return NextResponse.json(
        { error: servicesError.message },
        { status: 400 }
      );
    }

    const typedServices = services as Service[];

    // Get minimum prices from team_member_services for each service
    // This helps show "from $X" pricing
    const { data: teamPrices } = await supabase
      .from('team_member_services')
      .select('service_id, price')
      .eq('is_available', true);

    const typedTeamPrices = teamPrices as TeamPrice[] | null;

    // Calculate minimum price for each service
    const minPrices = typedTeamPrices?.reduce((acc, item) => {
      if (!acc[item.service_id] || item.price < acc[item.service_id]) {
        acc[item.service_id] = item.price;
      }
      return acc;
    }, {} as Record<string, number>);

    // Add minimum price to each service
    const servicesWithPricing: ServiceWithPricing[] =
      typedServices?.map((service) => ({
        ...service,
        min_price: minPrices?.[service.id] || service.base_price,
        has_providers: minPrices?.[service.id] ? true : false,
      })) || [];

    // Group by category for easier display
    const servicesByCategory = servicesWithPricing.reduce((acc, service) => {
      const categoryName = service.category?.name || 'Uncategorized';
      if (!acc[categoryName]) {
        acc[categoryName] = {
          category: service.category || null,
          services: [],
        };
      }
      acc[categoryName].services.push(service);
      return acc;
    }, {} as Record<string, CategoryGroup>);

    return NextResponse.json({
      data: {
        services: servicesWithPricing,
        categories: Object.values(servicesByCategory),
        shop_id: actualShopId,
      },
    });
  } catch (error) {
    console.error('Error fetching public services:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
