// components/booking/ServiceSelection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Check, Plus, Clock } from 'lucide-react';
import type { BookingFlowState, ServiceVariant } from '@/types/database';

interface ServiceSelectionProps {
  shopId: string;
  bookingState: BookingFlowState;
  onUpdate: (state: BookingFlowState) => void;
}

// Define proper types for the API response
interface ServiceCategory {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  services: ServiceItem[];
}

interface ServiceItem {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  min_price: number;
  base_price: number;
  base_duration: number;
  has_variants: boolean;
  variants?: ServiceVariant[] | null;
  provider_count: number;
  is_available: boolean;
}

interface ShopServicesResponse {
  shop: {
    id: string;
    name: string;
    address: string;
    phone?: string | null;
    image?: string | null;
    booking_url: string;
  };
  categories: ServiceCategory[];
  total_services: number;
}

export function ServiceSelection({
  shopId,
  bookingState,
  onUpdate,
}: ServiceSelectionProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('featured');
  const [loading, setLoading] = useState(true);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(
    new Set()
  );

  // Use useCallback to memoize the function and avoid dependency issues
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/public/shop/${shopId}/services`);

      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }

      const data: { data: ShopServicesResponse } = await response.json();

      if (data?.data?.categories) {
        setCategories(data.data.categories);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [shopId]); // shopId is a dependency of fetchServices

  useEffect(() => {
    fetchServices();
  }, [fetchServices]); // Now we include fetchServices as a dependency

  const handleServiceSelect = (service: ServiceItem, categoryColor: string) => {
    onUpdate({
      ...bookingState,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.base_price,
      serviceDuration: service.base_duration || service.duration,
      categoryColor: categoryColor || '#6B7280',
      variantId: null,
      variantName: null,
    });
  };

  const handleVariantSelect = (
    service: ServiceItem,
    variant: ServiceVariant,
    categoryColor: string
  ) => {
    onUpdate({
      ...bookingState,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.base_price + (variant.price_modifier || 0),
      serviceDuration:
        (service.base_duration || service.duration) +
        (variant.duration_modifier || 0),
      categoryColor: categoryColor || '#6B7280',
      variantId: variant.id,
      variantName: variant.name,
    });
  };

  const toggleExpanded = (serviceId: string) => {
    setExpandedServices((prev) => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(serviceId)) {
        newExpanded.delete(serviceId);
      } else {
        newExpanded.add(serviceId);
      }
      return newExpanded;
    });
  };

  // Get filtered services based on selected category
  const getFilteredServices = (): ServiceItem[] => {
    if (selectedCategory === 'featured') {
      // Get featured services from the "featured" category or first 5 services
      const featuredCategory = categories.find((cat) => cat.id === 'featured');
      if (featuredCategory) {
        return featuredCategory.services;
      }
      // Fallback: get first 5 available services from all categories
      const allServices: ServiceItem[] = [];
      categories.forEach((cat) => {
        cat.services.forEach((service) => {
          if (service.is_available && allServices.length < 5) {
            allServices.push(service);
          }
        });
      });
      return allServices;
    }

    // Find services in the selected category
    const category = categories.find((cat) => cat.name === selectedCategory);
    return category?.services || [];
  };

  const filteredServices = getFilteredServices();

  // Get the category color for a service
  const getCategoryColor = (categoryName: string): string => {
    const category = categories.find((cat) => cat.name === categoryName);
    return category?.color || '#6B7280';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-10 w-24 bg-gray-100 rounded-full animate-pulse"
            />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No services available at this location.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Services</h2>

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => setSelectedCategory('featured')}
          className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
            selectedCategory === 'featured'
              ? 'bg-gray-900 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Featured
        </button>
        {categories
          .filter((cat) => cat.id !== 'featured' && cat.services.length > 0)
          .map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.name)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === category.name
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {category.name}
            </button>
          ))}
      </div>

      {/* Services List */}
      <div className="space-y-3">
        {filteredServices.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">No services in this category.</p>
          </Card>
        ) : (
          filteredServices.map((service) => {
            const isSelected =
              bookingState.serviceId === service.id && !bookingState.variantId;
            const isExpanded = expandedServices.has(service.id);
            const categoryColor = getCategoryColor(
              selectedCategory === 'featured' ? 'Hair Cut' : selectedCategory
            );

            return (
              <Card
                key={service.id}
                className={`p-4 cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-purple-600 bg-purple-50'
                    : 'hover:shadow-md'
                }`}
              >
                <div
                  onClick={() =>
                    !service.has_variants &&
                    handleServiceSelect(service, categoryColor)
                  }
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">
                        {service.name}
                      </h3>
                      {service.description && (
                        <p className="text-sm text-gray-600 mt-1">
                          {service.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 mt-2">
                        <span className="text-sm text-gray-500 flex items-center">
                          <Clock size={14} className="mr-1" />
                          {service.duration || service.base_duration} mins
                        </span>
                        <span className="font-semibold">
                          from ${service.min_price || service.base_price}
                        </span>
                      </div>
                      {service.provider_count > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {service.provider_count} professional
                          {service.provider_count > 1 ? 's' : ''} available
                        </p>
                      )}
                    </div>

                    <div className="ml-4">
                      {service.has_variants ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpanded(service.id);
                          }}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <Plus
                            className={`transition-transform ${
                              isExpanded ? 'rotate-45' : ''
                            }`}
                            size={20}
                          />
                        </button>
                      ) : (
                        isSelected && (
                          <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                            <Check className="text-white" size={16} />
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>

                {/* Variants */}
                {service.has_variants && isExpanded && service.variants && (
                  <div className="mt-4 space-y-2 border-t pt-4">
                    {service.variants.map((variant) => {
                      const variantSelected =
                        bookingState.serviceId === service.id &&
                        bookingState.variantId === variant.id;
                      const variantPrice =
                        service.base_price + (variant.price_modifier || 0);
                      const variantDuration =
                        (service.base_duration || service.duration) +
                        (variant.duration_modifier || 0);

                      return (
                        <div
                          key={variant.id}
                          onClick={() =>
                            handleVariantSelect(service, variant, categoryColor)
                          }
                          className={`p-3 rounded-lg cursor-pointer transition-all ${
                            variantSelected
                              ? 'bg-purple-100 border-2 border-purple-600'
                              : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium">{variant.name}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-sm text-gray-500">
                                  {variantDuration} mins
                                </span>
                                <span className="font-semibold text-sm">
                                  ${variantPrice.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            {variantSelected && (
                              <Check className="text-purple-600" size={20} />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
