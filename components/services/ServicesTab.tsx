// components/services/ServicesTab.tsx
// ============================================
'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Package,
  ChevronDown,
  ChevronRight,
  Clock,
  DollarSign,
} from 'lucide-react';
import { ServiceCategory, ServiceWithDetails } from '@/types/database';
import { ServiceModal } from './ServiceModal';
import { VariantsManager } from './VariantsManager';

export function ServicesTab() {
  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(
    new Set()
  );
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    service: ServiceWithDetails | null;
  }>({
    isOpen: false,
    mode: 'create',
    service: null,
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch categories
      const catResponse = await fetch('/api/admin/services/categories');
      const catData = await catResponse.json();
      if (catResponse.ok) {
        setCategories(catData.data || []);
      }

      // Fetch services
      const servResponse = await fetch('/api/admin/services');
      const servData = await servResponse.json();
      if (servResponse.ok) {
        setServices(servData.data || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this service?')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/services/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const toggleExpanded = (serviceId: string) => {
    const newExpanded = new Set(expandedServices);
    if (newExpanded.has(serviceId)) {
      newExpanded.delete(serviceId);
    } else {
      newExpanded.add(serviceId);
    }
    setExpandedServices(newExpanded);
  };

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    const categoryId = service.category_id;
    if (!acc[categoryId]) {
      acc[categoryId] = [];
    }
    acc[categoryId].push(service);
    return acc;
  }, {} as Record<string, ServiceWithDetails[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading services...</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Services</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your services and their pricing
            </p>
          </div>
          <button
            onClick={() =>
              setModalState({ isOpen: true, mode: 'create', service: null })
            }
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            disabled={categories.length === 0}
          >
            <Plus size={20} className="mr-2" />
            Add Service
          </button>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg mb-2">No categories found</p>
            <p className="text-gray-400 text-sm">
              Please create a category first
            </p>
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <Package size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 text-lg mb-2">No services found</p>
            <p className="text-gray-400 text-sm">
              Create your first service to get started
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {categories.map((category) => {
              const categoryServices = servicesByCategory[category.id] || [];
              if (categoryServices.length === 0) return null;

              return (
                <div
                  key={category.id}
                  className="bg-white rounded-lg border border-gray-200"
                >
                  {/* Category Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center">
                      <div
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: category.color }}
                      />
                      <h3 className="font-semibold text-gray-900">
                        {category.name}
                      </h3>
                      <span className="ml-3 text-sm text-gray-500">
                        ({categoryServices.length} services)
                      </span>
                    </div>
                  </div>

                  {/* Services List */}
                  <div className="divide-y divide-gray-200">
                    {categoryServices.map((service) => (
                      <div key={service.id}>
                        {/* Service Row */}
                        <div className="px-6 py-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center flex-1">
                              <button
                                onClick={() =>
                                  service.has_variants &&
                                  toggleExpanded(service.id)
                                }
                                className="mr-3"
                                disabled={!service.has_variants}
                              >
                                {service.has_variants ? (
                                  expandedServices.has(service.id) ? (
                                    <ChevronDown
                                      size={20}
                                      className="text-gray-500"
                                    />
                                  ) : (
                                    <ChevronRight
                                      size={20}
                                      className="text-gray-500"
                                    />
                                  )
                                ) : (
                                  <div className="w-5" />
                                )}
                              </button>

                              <div className="flex-1">
                                <div className="flex items-center">
                                  <h4 className="font-medium text-gray-900">
                                    {service.name}
                                  </h4>
                                  {service.has_variants && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                                      Has variants
                                    </span>
                                  )}
                                  {!service.is_active && (
                                    <span className="ml-2 px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                                {service.description && (
                                  <p className="text-sm text-gray-600 mt-1">
                                    {service.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center space-x-6 text-sm">
                                <div className="flex items-center text-gray-600">
                                  <Clock size={16} className="mr-1" />
                                  {service.base_duration} min
                                </div>
                                <div className="flex items-center text-gray-600">
                                  <DollarSign size={16} className="mr-1" />$
                                  {service.base_price}
                                </div>
                              </div>

                              <div className="flex items-center space-x-2 ml-6">
                                <button
                                  onClick={() =>
                                    setModalState({
                                      isOpen: true,
                                      mode: 'edit',
                                      service,
                                    })
                                  }
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                  <Edit2 size={16} className="text-gray-600" />
                                </button>
                                <button
                                  onClick={() => handleDelete(service.id)}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                  <Trash2 size={16} className="text-red-600" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Variants Section */}
                        {service.has_variants &&
                          expandedServices.has(service.id) && (
                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                              <VariantsManager
                                service={service}
                                onUpdate={fetchData}
                              />
                            </div>
                          )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Service Modal */}
      {modalState.isOpen && (
        <ServiceModal
          mode={modalState.mode}
          service={modalState.service}
          categories={categories}
          onClose={() =>
            setModalState({ isOpen: false, mode: 'create', service: null })
          }
          onSuccess={() => {
            setModalState({ isOpen: false, mode: 'create', service: null });
            fetchData();
          }}
        />
      )}
    </>
  );
}
