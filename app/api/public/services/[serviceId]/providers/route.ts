// app/api/public/services/[serviceId]/providers/route.ts
// ============================================
// Get providers for a service - now filters by shop availability
// ============================================
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';

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

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: string;
  photo?: string | null;
  is_visible: boolean;
}

interface TeamMemberServiceProvider {
  id: string;
  team_member_id: string;
  service_id: string;
  is_available: boolean;
  price: number;
  duration: number;
  team_member?: TeamMember | null;
}

interface BaseProvider {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  role: string;
  photo?: string | null;
  email?: string;
  phone?: string | null;
  price: number;
  duration: number;
  rating: number;
  review_count: number;
}

interface ProviderWithVariants extends BaseProvider {
  variant_pricing: VariantPricing[];
}

interface VariantPricing {
  variant_id: string;
  variant_name: string;
  price: number;
  duration: number;
  is_default: boolean;
}

interface AnyProfessionalOption {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  role: string;
  photo: null;
  price: number;
  duration: number;
  is_any: boolean;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ serviceId: string }> }
) {
  try {
    // Await params first
    const { serviceId } = await params;
    const supabase = createServerClient();

    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shop_id');
    const includeVariants = searchParams.get('include_variants') === 'true';
    const selectedDate = searchParams.get('date'); // Optional: filter by specific date

    if (!shopId) {
      return NextResponse.json(
        { error: 'Shop ID is required' },
        { status: 400 }
      );
    }

    // Get the service details first
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select(
        `
        *,
        category:service_categories(*),
        variants:service_variants(*)
      `
      )
      .eq('id', serviceId)
      .eq('is_active', true)
      .single();

    if (serviceError || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const typedService = service as Service;

    // Get all team members who offer this service
    const { data: providers, error: providersError } = await supabase
      .from('team_member_services')
      .select(
        `
        *,
        team_member:team_members!inner(
          id,
          first_name,
          last_name,
          email,
          phone,
          role,
          photo,
          is_visible
        )
      `
      )
      .eq('service_id', serviceId)
      .eq('is_available', true);

    if (providersError) {
      return NextResponse.json(
        { error: providersError.message },
        { status: 400 }
      );
    }

    const typedProviders = providers as TeamMemberServiceProvider[];

    // Filter providers to only include those who work at this shop
    // We need to check if they have any availability slots at this shop
    const filteredProviders: TeamMemberServiceProvider[] = [];

    for (const provider of typedProviders) {
      if (!provider.team_member || !provider.team_member.is_visible) {
        continue;
      }

      // Check if this team member has any availability at this shop
      let query = supabase
        .from('availability_slots')
        .select('id')
        .eq('team_member_id', provider.team_member_id)
        .eq('shop_id', shopId)
        .eq('is_available', true)
        .limit(1);

      // If a specific date is provided, check availability for that date
      if (selectedDate) {
        query = query.eq('date', selectedDate);
      } else {
        // Check for any future availability
        const today = new Date().toISOString().split('T')[0];
        query = query.gte('date', today);
      }

      const { data: availabilityCheck } = await query;

      // Only include this provider if they have availability at this shop
      if (availabilityCheck && availabilityCheck.length > 0) {
        filteredProviders.push(provider);
      }
    }

    // Format the response
    const formattedProviders: (BaseProvider | ProviderWithVariants)[] =
      filteredProviders
        ?.map((provider: TeamMemberServiceProvider) => {
          const teamMember = provider.team_member!; // We know it exists from filter above

          const baseProvider: BaseProvider = {
            id: teamMember.id,
            name: `${teamMember.first_name} ${teamMember.last_name}`,
            first_name: teamMember.first_name,
            last_name: teamMember.last_name,
            role: teamMember.role,
            photo: teamMember.photo || undefined,
            email: teamMember.email,
            phone: teamMember.phone || undefined,
            price: provider.price,
            duration: provider.duration,
            // Add rating if you have a ratings system
            rating: 4.9, // Placeholder - implement actual ratings
            review_count: Math.floor(Math.random() * 100) + 10, // Placeholder
          };

          // If service has variants, calculate prices for each variant
          if (
            includeVariants &&
            typedService.has_variants &&
            typedService.variants
          ) {
            const variantPricing: VariantPricing[] = typedService.variants.map(
              (variant: ServiceVariant) => ({
                variant_id: variant.id,
                variant_name: variant.name,
                price: provider.price + variant.price_modifier,
                duration: provider.duration + variant.duration_modifier,
                is_default: variant.is_default,
              })
            );

            const providerWithVariants: ProviderWithVariants = {
              ...baseProvider,
              variant_pricing: variantPricing,
            };

            return providerWithVariants;
          }

          return baseProvider;
        })
        ?.sort((a, b) => a.price - b.price) || []; // Sort by price (lowest first)

    // Find the minimum price among all providers
    const minPrice =
      formattedProviders.length > 0
        ? Math.min(...formattedProviders.map((p) => p.price))
        : typedService.base_price;

    // Only add "Any Professional" if there are providers available at this shop
    const allProviders: (
      | AnyProfessionalOption
      | BaseProvider
      | ProviderWithVariants
    )[] = [];

    if (formattedProviders.length > 0) {
      const anyProfessionalOption: AnyProfessionalOption = {
        id: 'any',
        name: 'Any professional',
        first_name: 'Any',
        last_name: 'professional',
        role: 'for maximum availability',
        photo: null,
        price: minPrice,
        duration: typedService.base_duration,
        is_any: true,
      };
      allProviders.push(anyProfessionalOption);
    }

    allProviders.push(...formattedProviders);

    return NextResponse.json({
      data: {
        service: {
          id: typedService.id,
          name: typedService.name,
          description: typedService.description,
          category: typedService.category,
          base_duration: typedService.base_duration,
          base_price: typedService.base_price,
          has_variants: typedService.has_variants,
          variants: typedService.variants,
        },
        providers: allProviders,
        total_providers: formattedProviders.length,
        min_price: minPrice,
        shop_id: shopId,
      },
    });
  } catch (error) {
    console.error('Error fetching service providers:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
