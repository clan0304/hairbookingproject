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
  is_active: boolean;
}

interface ServiceItem {
  id: string;
  category_id: string;
  name: string;
  description?: string | null;
  base_duration: number;
  base_price: number;
  has_variants: boolean;
  is_active: boolean;
  category?: ServiceCategory;
  variants?: ServiceVariant[] | null;
  min_price: number;
  has_providers: boolean;
}

interface CategoryGroup {
  category: ServiceCategory | null;
  services: ServiceItem[];
}

interface ServicesResponse {
  services: ServiceItem[];
  categories: CategoryGroup[];
  shop_id: string;
}

export function ServiceSelection({
  shopId,
  bookingState,
  onUpdate,
}: ServiceSelectionProps) {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('featured');
  const [loading, setLoading] = useState(true);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(
    new Set()
  );

  // Use useCallback to memoize the function and avoid dependency issues
  const fetchServices = useCallback(async () => {
    try {
      setLoading(true);
      // Use the general services endpoint
      const response = await fetch(`/api/public/services?shop_id=${shopId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch services');
      }

      const data: { data: ServicesResponse } = await response.json();

      if (data?.data?.categories) {
        setCategories(data.data.categories);
      }
    } catch (error) {
      console.error('Error fetching services:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  }, [shopId]);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const handleServiceSelect = (service: ServiceItem, categoryColor: string) => {
    onUpdate({
      ...bookingState,
      serviceId: service.id,
      serviceName: service.name,
      servicePrice: service.base_price,
      serviceDuration: service.base_duration,
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
      serviceDuration: service.base_duration + (variant.duration_modifier || 0),
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
      // Get first 5 available services from all categories
      const allServices: ServiceItem[] = [];
      categories.forEach((categoryGroup) => {
        categoryGroup.services.forEach((service) => {
          if (service.is_active && allServices.length < 5) {
            allServices.push(service);
          }
        });
      });
      return allServices;
    }

    // Find services in the selected category
    const categoryGroup = categories.find(
      (cat) => cat.category?.name === selectedCategory
    );
    return categoryGroup?.services || [];
  };

  const filteredServices = getFilteredServices();

  // Get the category color for selected category
  const getCategoryColor = (): string => {
    const categoryGroup = categories.find(
      (cat) => cat.category?.name === selectedCategory
    );
    return categoryGroup?.category?.color || '#6B7280';
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div
              key={`skeleton-tab-${i}`}
              className="h-10 w-24 bg-gray-100 rounded-full animate-pulse"
            />
          ))}
        </div>
        {[1, 2, 3].map((i) => (
          <div
            key={`skeleton-service-${i}`}
            className="h-24 bg-gray-100 rounded-lg animate-pulse"
          />
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
          key="featured-tab"
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
          .filter(
            (cat) =>
              cat.category && cat.category.is_active && cat.services.length > 0
          )
          .map((categoryGroup) => (
            <button
              key={`category-tab-${categoryGroup.category!.id}`}
              onClick={() => setSelectedCategory(categoryGroup.category!.name)}
              className={`px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === categoryGroup.category!.name
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {categoryGroup.category!.name}
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
            const categoryColor = getCategoryColor();

            return (
              <Card
                key={`service-${service.id}`}
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
                          {service.base_duration} mins
                        </span>
                        <span className="font-semibold">
                          from ${service.min_price || service.base_price}
                        </span>
                      </div>
                      {service.has_providers && (
                        <p className="text-xs text-gray-500 mt-1">
                          Professionals available
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
                        service.base_duration +
                        (variant.duration_modifier || 0);

                      return (
                        <div
                          key={`variant-${service.id}-${variant.id}`}
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
