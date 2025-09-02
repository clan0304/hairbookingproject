// app/api/public/services/[serviceId]/providers/route.ts
// ============================================
// Get all team members who provide a specific service with their custom pricing
// Used in booking flow: After selecting a service, show available providers
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
  { params }: { params: { serviceId: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const shopId = searchParams.get('shop_id');
    const includeVariants = searchParams.get('include_variants') === 'true';

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
      .eq('id', params.serviceId)
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
      .eq('service_id', params.serviceId)
      .eq('is_available', true);

    if (providersError) {
      return NextResponse.json(
        { error: providersError.message },
        { status: 400 }
      );
    }

    const typedProviders = providers as TeamMemberServiceProvider[];

    // Format the response
    const formattedProviders: (BaseProvider | ProviderWithVariants)[] =
      typedProviders
        ?.filter((p: TeamMemberServiceProvider) => {
          // Ensure team member exists and is visible
          return p.team_member && p.team_member.is_visible;
        })
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

    // Add "Any Professional" option at the beginning
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

    const allProviders = [anyProfessionalOption, ...formattedProviders];

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
