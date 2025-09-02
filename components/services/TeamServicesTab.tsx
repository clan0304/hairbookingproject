// components/services/TeamServicesTab.tsx
// ============================================
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  TeamMember,
  ServiceWithDetails,
  TeamMemberService,
} from '@/types/database';
import { User, DollarSign, Clock, Check, X } from 'lucide-react';

export function TeamServicesTab() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [teamMemberServices, setTeamMemberServices] = useState<
    TeamMemberService[]
  >([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [tempPrices, setTempPrices] = useState<Record<string, number>>({});
  const [tempDurations, setTempDurations] = useState<Record<string, number>>(
    {}
  );

  const fetchData = useCallback(async () => {
    try {
      // Fetch team members
      const teamResponse = await fetch('/api/admin/team');
      const teamData = await teamResponse.json();
      if (teamResponse.ok) {
        setTeamMembers(teamData.data || []);
        if (teamData.data?.length > 0 && !selectedMember) {
          setSelectedMember(teamData.data[0].id);
        }
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
  }, [selectedMember]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (selectedMember) {
      fetchTeamMemberServices(selectedMember);
    }
  }, [selectedMember]);

  async function fetchTeamMemberServices(memberId: string) {
    try {
      console.log('Fetching services for team member:', memberId);
      const response = await fetch(`/api/admin/team/${memberId}/services`);
      const data = await response.json();
      console.log('Team member services response:', data);

      if (response.ok) {
        setTeamMemberServices(data.data || []);
        console.log('Set team member services:', data.data);
      } else {
        console.error('Failed to fetch team member services:', data.error);
        setTeamMemberServices([]);
      }
    } catch (error) {
      console.error('Error fetching team member services:', error);
      setTeamMemberServices([]);
    }
  }

  const handleToggleService = async (serviceId: string, isEnabled: boolean) => {
    if (!selectedMember) return;
    setSaving(serviceId);

    try {
      const service = services.find((s) => s.id === serviceId);
      if (!service) return;

      // Get existing team member service or use defaults
      const existingService = getTeamMemberService(serviceId);
      const price = existingService?.price || service.base_price;
      const duration = existingService?.duration || service.base_duration;

      const response = await fetch(
        `/api/admin/team/${selectedMember}/services`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: serviceId,
            is_available: isEnabled,
            price: price,
            duration: duration,
          }),
        }
      );

      if (response.ok) {
        await fetchTeamMemberServices(selectedMember);
      } else {
        const error = await response.json();
        console.error('Failed to toggle service:', error);
      }
    } catch (error) {
      console.error('Error toggling service:', error);
    } finally {
      setSaving(null);
    }
  };

  const handleUpdatePrice = async (
    serviceId: string,
    price: number,
    duration: number
  ) => {
    if (!selectedMember) return;
    setSaving(serviceId);

    try {
      const response = await fetch(
        `/api/admin/team/${selectedMember}/services`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            service_id: serviceId,
            is_available: true,
            price,
            duration,
          }),
        }
      );

      if (response.ok) {
        fetchTeamMemberServices(selectedMember);
      }
    } catch (error) {
      console.error('Error updating service price:', error);
    } finally {
      setSaving(null);
    }
  };

  const getTeamMemberService = (serviceId: string) => {
    const service = teamMemberServices.find(
      (tms) => tms.service_id === serviceId
    );
    console.log(
      `Looking for service ${serviceId} for member ${selectedMember}:`,
      service
    );
    return service;
  };

  // Group services by category
  const servicesByCategory = services.reduce((acc, service) => {
    if (!acc[service.category?.name || 'Uncategorized']) {
      acc[service.category?.name || 'Uncategorized'] = [];
    }
    acc[service.category?.name || 'Uncategorized'].push(service);
    return acc;
  }, {} as Record<string, ServiceWithDetails[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <User size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500 text-lg mb-2">No team members found</p>
        <p className="text-gray-400 text-sm">Please add team members first</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Team Member Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Team Member
        </label>
        <select
          value={selectedMember || ''}
          onChange={(e) => setSelectedMember(e.target.value)}
          className="w-full md:w-1/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
        >
          {teamMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.first_name} {member.last_name} - {member.role}
            </option>
          ))}
        </select>
      </div>

      {/* Services Grid */}
      {selectedMember && (
        <div className="space-y-6">
          {Object.entries(servicesByCategory).map(
            ([category, categoryServices]) => (
              <div
                key={category}
                className="bg-white rounded-lg border border-gray-200"
              >
                {/* Category Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="font-semibold text-gray-900">{category}</h3>
                </div>

                {/* Services */}
                <div className="divide-y divide-gray-200">
                  {categoryServices.map((service) => {
                    const teamMemberService = getTeamMemberService(service.id);
                    const isEnabled = teamMemberService?.is_available || false;
                    const isEditingThisPrice = editingPrice === service.id;

                    // Use team member's custom price/duration if available, otherwise use service base values
                    const displayPrice =
                      teamMemberService?.price ?? service.base_price;
                    const displayDuration =
                      teamMemberService?.duration ?? service.base_duration;

                    const currentPrice = tempPrices[service.id] ?? displayPrice;
                    const currentDuration =
                      tempDurations[service.id] ?? displayDuration;

                    return (
                      <div key={service.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center flex-1">
                            <input
                              type="checkbox"
                              checked={isEnabled}
                              onChange={(e) =>
                                handleToggleService(
                                  service.id,
                                  e.target.checked
                                )
                              }
                              disabled={saving === service.id}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                            />

                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {service.name}
                              </h4>
                              {service.description && (
                                <p className="text-sm text-gray-600 mt-1">
                                  {service.description}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center space-x-6">
                              {isEditingThisPrice ? (
                                <>
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center">
                                      <DollarSign
                                        size={16}
                                        className="text-gray-400"
                                      />
                                      <input
                                        type="number"
                                        value={currentPrice}
                                        onChange={(e) =>
                                          setTempPrices({
                                            ...tempPrices,
                                            [service.id]: parseFloat(
                                              e.target.value
                                            ),
                                          })
                                        }
                                        className="w-20 px-2 py-1 border rounded text-sm"
                                        step="0.01"
                                        min="0"
                                      />
                                    </div>
                                    <div className="flex items-center">
                                      <Clock
                                        size={16}
                                        className="text-gray-400 mr-1"
                                      />
                                      <input
                                        type="number"
                                        value={currentDuration}
                                        onChange={(e) =>
                                          setTempDurations({
                                            ...tempDurations,
                                            [service.id]: parseInt(
                                              e.target.value
                                            ),
                                          })
                                        }
                                        className="w-16 px-2 py-1 border rounded text-sm"
                                        step="5"
                                        min="5"
                                      />
                                      <span className="text-sm text-gray-500 ml-1">
                                        min
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex space-x-1">
                                    <button
                                      onClick={() => {
                                        handleUpdatePrice(
                                          service.id,
                                          currentPrice,
                                          currentDuration
                                        );
                                        setEditingPrice(null);
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                      disabled={saving === service.id}
                                    >
                                      <Check
                                        size={16}
                                        className="text-green-600"
                                      />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setEditingPrice(null);
                                        setTempPrices({
                                          ...tempPrices,
                                          [service.id]: displayPrice,
                                        });
                                        setTempDurations({
                                          ...tempDurations,
                                          [service.id]: displayDuration,
                                        });
                                      }}
                                      className="p-1 hover:bg-gray-100 rounded"
                                    >
                                      <X size={16} className="text-gray-600" />
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingPrice(service.id);
                                    setTempPrices({
                                      ...tempPrices,
                                      [service.id]: displayPrice,
                                    });
                                    setTempDurations({
                                      ...tempDurations,
                                      [service.id]: displayDuration,
                                    });
                                  }}
                                  className="flex items-center space-x-4 text-sm hover:bg-gray-50 px-2 py-1 rounded"
                                  disabled={!isEnabled}
                                >
                                  <span className="flex items-center text-gray-600">
                                    <DollarSign size={16} className="mr-1" />
                                    {displayPrice.toFixed(2)}
                                  </span>
                                  <span className="flex items-center text-gray-600">
                                    <Clock size={16} className="mr-1" />
                                    {displayDuration} min
                                  </span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Show variants pricing if service has variants */}
                        {isEnabled &&
                          service.has_variants &&
                          service.variants && (
                            <div className="mt-3 ml-7 p-3 bg-gray-50 rounded">
                              <p className="text-xs font-medium text-gray-700 mb-2">
                                Variant Pricing:
                              </p>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {service.variants.map((variant) => {
                                  const basePrice = displayPrice;
                                  const finalPrice =
                                    basePrice + variant.price_modifier;
                                  const baseDuration = displayDuration;
                                  const finalDuration =
                                    baseDuration + variant.duration_modifier;

                                  return (
                                    <div
                                      key={variant.id}
                                      className="text-xs text-gray-600"
                                    >
                                      <span className="font-medium">
                                        {variant.name}:
                                      </span>
                                      <span className="ml-1">
                                        ${finalPrice.toFixed(2)} /{' '}
                                        {finalDuration}min
                                      </span>
                                      {variant.is_default && (
                                        <span className="ml-1 text-yellow-500">
                                          ★
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
