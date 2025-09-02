// components/booking/TeamMemberSelection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, Users, Check } from 'lucide-react';
import type { BookingFlowState } from '@/types/database';

interface TeamMemberSelectionProps {
  shopId: string;
  serviceId: string;
  bookingState: BookingFlowState;
  onUpdate: (state: BookingFlowState) => void;
}

// Define the provider type from API response
interface ProviderFromAPI {
  id: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string | null;
  role?: string;
  photo?: string | null;
  price: number;
  duration?: number;
  rating?: number;
  review_count?: number;
  is_any?: boolean;
}

interface ProvidersResponse {
  data: {
    service: {
      id: string;
      name: string;
      description?: string | null;
      category?: {
        id: string;
        name: string;
        color: string;
      } | null;
      base_duration: number;
      base_price: number;
      has_variants: boolean;
      variants?: Array<{
        id: string;
        name: string;
        duration_modifier: number;
        price_modifier: number;
        is_default: boolean;
      }> | null;
    };
    providers: ProviderFromAPI[];
    total_providers: number;
    min_price: number;
    shop_id: string;
  };
}

interface TeamMemberWithPrice {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: string;
  photo?: string | null;
  price: number;
  rating?: number;
  is_any?: boolean;
}

export function TeamMemberSelection({
  shopId,
  serviceId,
  bookingState,
  onUpdate,
}: TeamMemberSelectionProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize fetchTeamMembers with useCallback
  const fetchTeamMembers = useCallback(async () => {
    if (!serviceId || !shopId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/public/services/${serviceId}/providers?shop_id=${shopId}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch team members');
      }

      const responseData: ProvidersResponse = await response.json();

      if (responseData?.data?.providers) {
        // Map the providers to our TeamMemberWithPrice interface
        const mappedProviders: TeamMemberWithPrice[] =
          responseData.data.providers.map(
            (provider: ProviderFromAPI): TeamMemberWithPrice => {
              // Handle "any professional" option
              if (provider.id === 'any' || provider.is_any) {
                return {
                  id: 'any',
                  first_name: 'Any',
                  last_name: 'professional',
                  email: '',
                  phone: null,
                  role: 'for maximum availability',
                  photo: null,
                  price: provider.price,
                  rating: undefined,
                  is_any: true,
                };
              }

              // Parse name if first_name and last_name are not provided
              let firstName = provider.first_name || '';
              let lastName = provider.last_name || '';

              if (!firstName && provider.name) {
                const nameParts = provider.name.split(' ');
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
              }

              return {
                id: provider.id,
                first_name: firstName || 'Unknown',
                last_name: lastName || '',
                email: provider.email || '',
                phone: provider.phone || null,
                role: provider.role || 'Professional',
                photo: provider.photo || null,
                price: provider.price || 0,
                rating: provider.rating,
                is_any: false,
              };
            }
          );

        setTeamMembers(mappedProviders);
      } else {
        setTeamMembers([]);
      }
    } catch (err) {
      console.error('Error fetching team members:', err);
      setError('Failed to load team members. Please try again.');
      setTeamMembers([]);
    } finally {
      setLoading(false);
    }
  }, [serviceId, shopId]);

  useEffect(() => {
    fetchTeamMembers();
  }, [fetchTeamMembers]);

  const handleSelect = (member: TeamMemberWithPrice) => {
    if (member.id === 'any' || member.is_any) {
      onUpdate({
        ...bookingState,
        teamMemberId: 'any',
        teamMemberName: 'Any professional',
        teamMemberPrice: member.price,
      });
    } else {
      onUpdate({
        ...bookingState,
        teamMemberId: member.id,
        teamMemberName: `${member.first_name} ${member.last_name}`.trim(),
        teamMemberPrice: member.price,
      });
    }
  };

  const handleRetry = () => {
    fetchTeamMembers();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Select professional</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={`skeleton-member-${i}`}
              className="h-48 bg-gray-100 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Select professional</h2>
        <Card className="p-6 text-center">
          <p className="text-red-500 mb-2">{error}</p>
          <button
            onClick={handleRetry}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Try again
          </button>
        </Card>
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Select professional</h2>
        <Card className="p-6 text-center">
          <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            No professionals available for this service.
          </p>
          <p className="text-sm text-gray-400 mt-1">
            Please select a different service or try again later.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Select professional</h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {teamMembers.map((member: TeamMemberWithPrice) => {
          const isSelected = bookingState.teamMemberId === member.id;
          const isAny = member.id === 'any' || member.is_any === true;

          return (
            <Card
              key={`team-member-${member.id}`}
              onClick={() => handleSelect(member)}
              className={`p-4 cursor-pointer transition-all text-center relative ${
                isSelected
                  ? 'ring-2 ring-purple-600 bg-purple-50'
                  : 'hover:shadow-lg'
              }`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center">
                  <Check className="text-white" size={14} />
                </div>
              )}

              <div className="flex flex-col items-center">
                {isAny ? (
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-3">
                    <Users className="text-gray-500" size={32} />
                  </div>
                ) : (
                  <Avatar className="w-20 h-20 mb-3">
                    <AvatarImage
                      src={member.photo || undefined}
                      alt={`${member.first_name} ${member.last_name}`}
                    />
                    <AvatarFallback className="bg-purple-100 text-purple-600 text-lg font-semibold">
                      {member.first_name[0]?.toUpperCase() || 'U'}
                      {member.last_name[0]?.toUpperCase() || ''}
                    </AvatarFallback>
                  </Avatar>
                )}

                <h3 className="font-semibold text-gray-900">
                  {isAny ? 'Any professional' : member.first_name}
                </h3>

                {isAny ? (
                  <p className="text-xs text-gray-500 mt-1">
                    for maximum availability
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">{member.role}</p>
                    {member.rating && member.rating > 0 && (
                      <div className="flex items-center mt-2">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm ml-1">
                          {member.rating.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                <p className="font-semibold mt-3">
                  from ${member.price.toFixed(2)}
                </p>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
