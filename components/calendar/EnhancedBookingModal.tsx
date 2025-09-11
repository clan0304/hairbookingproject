/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
// components/calendar/EnhancedBookingModal.tsx
'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  User,
  Phone,
  Mail,
  Clock,
  Calendar,
  ArrowLeft,
  Check,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import type {
  TeamMember,
  Client,
  Service,
  ServiceCategory,
  ServiceVariant,
  BookingWithLocalTimes,
} from '@/types/database';

interface ServiceWithCategory extends Service {
  category?: ServiceCategory;
  variants?: ServiceVariant[];
}

interface EnhancedBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  mode?: 'create' | 'edit';
  teamMember?: TeamMember;
  date?: Date;
  time?: string;
  booking?: BookingWithLocalTimes;
  onSave: (bookingData: any) => Promise<void>;
}

type Step = 'service' | 'datetime' | 'summary';

export function EnhancedBookingModal({
  isOpen,
  onClose,
  shopId,
  mode = 'create',
  teamMember,
  date,
  time,
  booking,
  onSave,
}: EnhancedBookingModalProps) {
  // UI State
  const [currentStep, setCurrentStep] = useState<Step>('service');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [serviceSearchQuery, setServiceSearchQuery] = useState('');
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingBooking, setSavingBooking] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<ServiceWithCategory[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMemberServices, setTeamMemberServices] = useState<Service[]>([]);

  // New Client Form State
  const [newClientData, setNewClientData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
  });

  // Booking Data State
  const [bookingData, setBookingData] = useState({
    client: null as Client | null,
    clientId: '',
    service: null as ServiceWithCategory | null,
    serviceId: '',
    variant: null as ServiceVariant | null,
    teamMember: teamMember || null,
    teamMemberId: teamMember?.id || '',
    date: date || new Date(),
    bookingDate: date ? format(date, 'yyyy-MM-dd') : '',
    time: time || '09:00',
    duration: 60,
    price: 0,
    notes: '',
    status: 'confirmed',
  });

  // Initialize booking data for edit mode
  useEffect(() => {
    if (mode === 'edit' && booking) {
      setBookingData((prev) => ({
        ...prev,
        clientId: booking.client_id || '',
        serviceId: booking.service_id || '',
        teamMemberId: booking.team_member_id || '',
        bookingDate: booking.booking_date_local || booking.booking_date || '',
        time: booking.start_time_local || booking.start_time || '',
        duration: booking.duration || 60,
        price: booking.price || 0,
        notes: booking.booking_note || '',
        status: booking.status || 'confirmed',
      }));
      setClientSearchQuery(
        `${booking.client_first_name} ${booking.client_last_name || ''}`.trim()
      );
    }
  }, [mode, booking]);

  // Fetch initial data when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen, shopId]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchClients(),
        fetchServices(),
        fetchCategories(),
        fetchTeamMembers(),
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients?limit=100');
      const { data } = await response.json();
      setClients(data || []);

      // If editing, find and set the client
      if (mode === 'edit' && booking && data) {
        const client = data.find((c: Client) => c.id === booking.client_id);
        if (client) {
          setBookingData((prev) => ({ ...prev, client }));
        }
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/admin/services');
      const { data } = await response.json();
      setServices(data || []);

      // If editing, find and set the service
      if (mode === 'edit' && booking && data) {
        const service = data.find((s: Service) => s.id === booking.service_id);
        if (service) {
          setBookingData((prev) => ({ ...prev, service }));
        }
      }
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/services/categories');
      const { data } = await response.json();
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`/api/admin/shops/${shopId}/team-members`);
      const { data } = await response.json();
      const assignedMembers = data?.filter((m: any) => m.is_assigned) || [];
      setTeamMembers(assignedMembers);

      // If a team member is pre-selected or in edit mode
      if (bookingData.teamMemberId) {
        const member = assignedMembers.find(
          (m: any) => m.id === bookingData.teamMemberId
        );
        if (member) {
          setBookingData((prev) => ({ ...prev, teamMember: member }));
          fetchTeamMemberServices(bookingData.teamMemberId);
        }
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchTeamMemberServices = async (teamMemberId: string) => {
    try {
      const response = await fetch(`/api/admin/team/${teamMemberId}/services`);
      const { data } = await response.json();
      const availableServices =
        data
          ?.filter((item: any) => item.is_available)
          ?.map((item: any) => item.service) || [];
      setTeamMemberServices(availableServices);
    } catch (error) {
      console.error('Error fetching team member services:', error);
    }
  };

  // Filter clients based on search
  const filteredClients = clients.filter(
    (client) =>
      clientSearchQuery === '' ||
      `${client.first_name} ${client.last_name}`
        .toLowerCase()
        .includes(clientSearchQuery.toLowerCase()) ||
      client.email?.toLowerCase().includes(clientSearchQuery.toLowerCase()) ||
      client.phone?.includes(clientSearchQuery)
  );

  // Group services by category
  const servicesByCategory = categories
    .map((category) => {
      const categoryServices = services.filter(
        (service) =>
          service.category_id === category.id &&
          service.is_active &&
          (serviceSearchQuery === '' ||
            service.name
              .toLowerCase()
              .includes(serviceSearchQuery.toLowerCase()))
      );

      // If a team member is selected, filter to only their services
      const filteredServices = bookingData.teamMember
        ? categoryServices.filter((service) =>
            teamMemberServices.some((tms) => tms.id === service.id)
          )
        : categoryServices;

      return {
        category,
        services: filteredServices,
      };
    })
    .filter((group) => group.services.length > 0);

  const handleServiceSelect = (service: ServiceWithCategory) => {
    setBookingData((prev) => ({
      ...prev,
      service,
      serviceId: service.id,
      duration: service.base_duration,
      price: service.base_price,
    }));
    setCurrentStep('datetime');
  };

  const handleClientSelect = (client: Client) => {
    setBookingData((prev) => ({
      ...prev,
      client,
      clientId: client.id,
    }));
  };

  const handleTeamMemberChange = (teamMemberId: string) => {
    const member = teamMembers.find((tm) => tm.id === teamMemberId);
    setBookingData((prev) => ({
      ...prev,
      teamMember: member || null,
      teamMemberId,
      service: null, // Reset service when team member changes
      serviceId: '',
    }));
    if (teamMemberId) {
      fetchTeamMemberServices(teamMemberId);
    }
  };

  const handleCreateClient = async () => {
    // Validate required fields
    if (!newClientData.first_name) {
      setErrors({ newClient: 'First name is required' });
      return;
    }

    try {
      const response = await fetch('/api/admin/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClientData),
      });

      if (response.ok) {
        const { data } = await response.json();
        setBookingData((prev) => ({
          ...prev,
          client: data,
          clientId: data.id,
        }));
        setShowNewClientForm(false);
        setNewClientData({
          first_name: '',
          last_name: '',
          email: '',
          phone: '',
        });
        setErrors({});
        // Refresh clients list
        await fetchClients();
      } else {
        const error = await response.json();
        setErrors({ newClient: error.error || 'Failed to create client' });
      }
    } catch (error) {
      console.error('Error creating client:', error);
      setErrors({ newClient: 'Failed to create client' });
    }
  };

  const handleSaveBooking = async () => {
    // Validate required fields
    if (!bookingData.clientId && !bookingData.client) {
      setErrors({ booking: 'Please select or create a client' });
      return;
    }
    if (!bookingData.serviceId) {
      setErrors({ booking: 'Please select a service' });
      return;
    }
    if (!bookingData.teamMemberId) {
      setErrors({ booking: 'Please select a team member' });
      return;
    }

    setSavingBooking(true);
    try {
      const dataToSave = {
        client_id: bookingData.clientId || bookingData.client?.id,
        service_id: bookingData.serviceId,
        team_member_id: bookingData.teamMemberId,
        shop_id: shopId,
        booking_date:
          bookingData.bookingDate || format(bookingData.date, 'yyyy-MM-dd'),
        start_time: bookingData.time,
        duration: bookingData.duration,
        price: bookingData.price,
        booking_note: bookingData.notes,
        status: bookingData.status,
        ...(mode === 'edit' && booking ? { id: booking.id } : {}),
      };

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Error saving booking:', error);
      setErrors({ booking: 'Failed to save booking' });
    } finally {
      setSavingBooking(false);
    }
  };

  const getTotalPrice = () => {
    if (!bookingData.service) return 0;
    let price = bookingData.price || bookingData.service.base_price;
    if (bookingData.variant) {
      price += bookingData.variant.price_modifier;
    }
    return price;
  };

  const getTotalDuration = () => {
    if (!bookingData.service) return 0;
    let duration = bookingData.duration || bookingData.service.base_duration;
    if (bookingData.variant) {
      duration += bookingData.variant.duration_modifier;
    }
    return duration;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex">
        {/* Left Panel - Client Section */}
        <div className="w-80 border-r border-gray-200 flex flex-col">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute left-4 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Navigation buttons (when not on first step) */}
          {currentStep !== 'service' && (
            <button
              onClick={() => setCurrentStep('service')}
              className="absolute left-14 top-4 p-2 hover:bg-gray-100 rounded-full transition-colors z-10"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Client Section Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <h3 className="text-center font-medium text-gray-900 mb-2">
              {bookingData.client ? 'Client Selected' : 'Add client'}
            </h3>
            <p className="text-center text-sm text-gray-500">
              Or leave empty for walk-ins
            </p>
          </div>

          {/* Client Search/Add */}
          <div className="p-4 flex-1 overflow-y-auto">
            {!showNewClientForm ? (
              <>
                {/* Search existing clients */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    value={clientSearchQuery}
                    onChange={(e) => setClientSearchQuery(e.target.value)}
                    placeholder="Search clients..."
                    className="w-full pl-10 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>

                {/* Client List */}
                {clientSearchQuery && (
                  <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        onClick={() => handleClientSelect(client)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          bookingData.client?.id === client.id
                            ? 'bg-purple-50 border-purple-300'
                            : 'hover:bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {client.first_name} {client.last_name}
                            </p>
                            {client.email && (
                              <p className="text-xs text-gray-500">
                                {client.email}
                              </p>
                            )}
                            {client.phone && (
                              <p className="text-xs text-gray-500">
                                {client.phone}
                              </p>
                            )}
                          </div>
                          {bookingData.client?.id === client.id && (
                            <Check className="w-4 h-4 text-purple-600" />
                          )}
                        </div>
                      </button>
                    ))}
                    {filteredClients.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-2">
                        No clients found
                      </p>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setShowNewClientForm(true)}
                  className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition-colors flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add new client
                </button>
              </>
            ) : (
              /* New Client Form */
              <div className="space-y-4">
                <h4 className="font-medium text-sm">New Client Details</h4>
                {errors.newClient && (
                  <div className="p-2 bg-red-50 text-red-600 text-xs rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {errors.newClient}
                  </div>
                )}
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="First name*"
                    value={newClientData.first_name}
                    onChange={(e) =>
                      setNewClientData((prev) => ({
                        ...prev,
                        first_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="text"
                    placeholder="Last name"
                    value={newClientData.last_name}
                    onChange={(e) =>
                      setNewClientData((prev) => ({
                        ...prev,
                        last_name: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={newClientData.email}
                    onChange={(e) =>
                      setNewClientData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                  <input
                    type="tel"
                    placeholder="Phone"
                    value={newClientData.phone}
                    onChange={(e) =>
                      setNewClientData((prev) => ({
                        ...prev,
                        phone: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowNewClientForm(false);
                      setErrors({});
                    }}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateClient}
                    className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            {/* Selected Client Display */}
            {bookingData.client && !showNewClientForm && (
              <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                <p className="text-sm font-medium text-purple-900">
                  {bookingData.client.first_name} {bookingData.client.last_name}
                </p>
                {bookingData.client.email && (
                  <p className="text-xs text-purple-700 flex items-center gap-1 mt-1">
                    <Mail className="w-3 h-3" />
                    {bookingData.client.email}
                  </p>
                )}
                {bookingData.client.phone && (
                  <p className="text-xs text-purple-700 flex items-center gap-1 mt-1">
                    <Phone className="w-3 h-3" />
                    {bookingData.client.phone}
                  </p>
                )}
              </div>
            )}

            {/* Team Member Selection (if not pre-selected) */}
            {!teamMember && currentStep === 'service' && (
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Team Member
                </label>
                <select
                  value={bookingData.teamMemberId}
                  onChange={(e) => handleTeamMemberChange(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Choose team member...</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Service/DateTime Selection */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b">
            <h2 className="text-xl font-semibold">
              {currentStep === 'service' && 'Select a service'}
              {currentStep === 'datetime' && 'Review appointment'}
            </h2>
            {currentStep === 'service' && (
              <div className="mt-3">
                <input
                  type="text"
                  value={serviceSearchQuery}
                  onChange={(e) => setServiceSearchQuery(e.target.value)}
                  placeholder="Search by service name"
                  className="w-full px-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : (
              <>
                {currentStep === 'service' && (
                  <div className="space-y-6">
                    {!bookingData.teamMemberId && !teamMember ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <User className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <p className="text-gray-600">
                          Please select a team member first
                        </p>
                      </div>
                    ) : servicesByCategory.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-lg">
                        <p className="text-gray-600">
                          No services available for this team member
                        </p>
                      </div>
                    ) : (
                      servicesByCategory.map(({ category, services }) => (
                        <div key={category.id}>
                          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                            {category.name}
                            <span className="text-xs text-gray-500 font-normal">
                              {services.length}
                            </span>
                          </h3>
                          <div className="space-y-2">
                            {services.map((service) => (
                              <button
                                key={service.id}
                                onClick={() => handleServiceSelect(service)}
                                className="w-full p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left group"
                              >
                                <div className="flex items-center">
                                  <div
                                    className="w-1 h-12 rounded-full mr-4"
                                    style={{ backgroundColor: category.color }}
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">
                                      {service.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {service.base_duration}min
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">
                                      A$ {service.base_price}
                                    </p>
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {currentStep === 'datetime' && bookingData.service && (
                  <div className="space-y-6">
                    {/* Date Selection */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <input
                          type="date"
                          value={
                            bookingData.bookingDate ||
                            format(bookingData.date, 'yyyy-MM-dd')
                          }
                          onChange={(e) =>
                            setBookingData((prev) => ({
                              ...prev,
                              bookingDate: e.target.value,
                            }))
                          }
                          className="px-2 py-1 border rounded focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-500" />
                        <input
                          type="time"
                          value={bookingData.time}
                          onChange={(e) =>
                            setBookingData((prev) => ({
                              ...prev,
                              time: e.target.value,
                            }))
                          }
                          className="px-2 py-1 border rounded focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-600">
                          • Doesn&apos;t repeat
                        </span>
                      </div>
                    </div>

                    {/* Services Section */}
                    <div>
                      <h3 className="font-semibold mb-3">Services</h3>
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center">
                          <div
                            className="w-1 h-12 rounded-full mr-4"
                            style={{
                              backgroundColor:
                                bookingData.service.category?.color || '#666',
                            }}
                          />
                          <div className="flex-1">
                            <p className="font-medium">
                              {bookingData.service.name}
                            </p>
                            <p className="text-sm text-gray-500">
                              {bookingData.time} • {getTotalDuration()}min •{' '}
                              {bookingData.teamMember?.first_name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">A$ {getTotalPrice()}</p>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => setCurrentStep('service')}
                        className="mt-4 px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Change service
                      </button>
                    </div>

                    {/* Duration and Price Adjustment */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Duration (minutes)
                        </label>
                        <input
                          type="number"
                          value={bookingData.duration}
                          onChange={(e) =>
                            setBookingData((prev) => ({
                              ...prev,
                              duration: parseInt(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                          min="15"
                          step="15"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Price (A$)
                        </label>
                        <input
                          type="number"
                          value={bookingData.price}
                          onChange={(e) =>
                            setBookingData((prev) => ({
                              ...prev,
                              price: parseFloat(e.target.value) || 0,
                            }))
                          }
                          className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                          min="0"
                          step="0.01"
                        />
                      </div>
                    </div>

                    {/* Notes Section */}
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Notes (optional)
                      </label>
                      <textarea
                        value={bookingData.notes}
                        onChange={(e) =>
                          setBookingData((prev) => ({
                            ...prev,
                            notes: e.target.value,
                          }))
                        }
                        placeholder="Add any special instructions or notes..."
                        className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                        rows={3}
                      />
                    </div>

                    {/* Error Display */}
                    {errors.booking && (
                      <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        {errors.booking}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-xl font-semibold">A$ {getTotalPrice()}</p>
              </div>
              <div className="flex gap-3">
                {currentStep === 'datetime' && (
                  <>
                    <button
                      onClick={() => setCurrentStep('service')}
                      className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-white"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSaveBooking}
                      disabled={savingBooking}
                      className="px-8 py-2 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {savingBooking && (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      {mode === 'create' ? 'Save' : 'Update'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
