/* eslint-disable @typescript-eslint/no-explicit-any */
// components/calendar/BookingModal.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  DollarSign,
} from 'lucide-react';
import { format } from 'date-fns';
import type {
  TeamMember,
  Client,
  Service,
  BookingWithLocalTimes,
} from '@/types/database';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  mode: 'create' | 'edit';

  // For create mode
  teamMember?: TeamMember;
  date?: Date;
  time?: string;

  // For edit mode
  booking?: BookingWithLocalTimes;

  onSave: (bookingData: any) => Promise<void>;
}

export function BookingModal({
  isOpen,
  onClose,
  shopId,
  mode,
  teamMember,
  date,
  time,
  booking,
  onSave,
}: BookingModalProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  const [bookingData, setBookingData] = useState({
    clientId: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    serviceId: '',
    teamMemberId: '',
    bookingDate: '',
    startTime: '',
    duration: 60,
    price: 0,
    notes: '',
    status: 'confirmed',
  });

  // Initialize form data based on mode
  useEffect(() => {
    if (mode === 'create' && teamMember && date && time) {
      setBookingData((prev) => ({
        ...prev,
        teamMemberId: teamMember.id,
        bookingDate: format(date, 'yyyy-MM-dd'),
        startTime: time,
      }));
    } else if (mode === 'edit' && booking) {
      setBookingData({
        clientId: booking.client_id || '',
        clientName: `${booking.client_first_name} ${
          booking.client_last_name || ''
        }`.trim(),
        clientEmail: booking.client_email || '',
        clientPhone: booking.client_phone || '',
        serviceId: booking.service_id || '',
        teamMemberId: booking.team_member_id || '',
        bookingDate: booking.booking_date_local || booking.booking_date || '',
        startTime: booking.start_time_local || booking.start_time || '',
        duration: booking.duration || 60,
        price: booking.price || 0,
        notes: booking.booking_note || '',
        status: booking.status || 'confirmed',
      });
      setSearchQuery(
        `${booking.client_first_name} ${booking.client_last_name || ''}`.trim()
      );
    }
  }, [mode, teamMember, date, time, booking]);

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      fetchTeamMembers();
      if (bookingData.teamMemberId) {
        fetchServices(bookingData.teamMemberId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, shopId, bookingData.teamMemberId]);

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/admin/clients');
      const { data } = await response.json();
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchTeamMembers = async () => {
    try {
      const response = await fetch(`/api/admin/shops/${shopId}/team-members`);
      const { data } = await response.json();
      setTeamMembers(data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  const fetchServices = async (teamMemberId: string) => {
    try {
      const response = await fetch(`/api/admin/team/${teamMemberId}/services`);
      const { data } = await response.json();
      setServices(data?.map((item: any) => item.service) || []);
    } catch (error) {
      console.error('Error fetching services:', error);
    }
  };

  const filteredClients = clients.filter((client) => {
    const query = searchQuery.toLowerCase();
    return (
      client.first_name?.toLowerCase().includes(query) ||
      client.last_name?.toLowerCase().includes(query) ||
      client.email?.toLowerCase().includes(query) ||
      client.phone?.includes(query)
    );
  });

  const handleClientSelect = (client: Client) => {
    setBookingData({
      ...bookingData,
      clientId: client.id,
      clientName: `${client.first_name} ${client.last_name || ''}`.trim(),
      clientEmail: client.email || '',
      clientPhone: client.phone || '',
    });
    setSearchQuery(`${client.first_name} ${client.last_name || ''}`.trim());
    setShowClientDropdown(false);
  };

  const handleServiceSelect = (serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    if (service) {
      setBookingData({
        ...bookingData,
        serviceId,
        duration: service.base_duration,
        price: service.base_price,
      });
    }
  };

  const handleTeamMemberChange = (teamMemberId: string) => {
    setBookingData({
      ...bookingData,
      teamMemberId,
      serviceId: '', // Reset service when team member changes
    });
    fetchServices(teamMemberId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookingData.clientId && !bookingData.clientName) {
      alert('Please select or enter a client');
      return;
    }

    if (!bookingData.serviceId) {
      alert('Please select a service');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        ...bookingData,
        shop_id: shopId,
        booking_date: bookingData.bookingDate,
        start_time: bookingData.startTime,
        team_member_id: bookingData.teamMemberId,
        // Include booking ID for edit mode
        ...(mode === 'edit' && booking ? { id: booking.id } : {}),
      };

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error(
        `Error ${mode === 'create' ? 'creating' : 'updating'} booking:`,
        error
      );
      alert(`Failed to ${mode === 'create' ? 'create' : 'update'} booking`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const currentTeamMember =
    teamMembers.find((tm) => tm.id === bookingData.teamMemberId) || teamMember;
  const modalTitle = mode === 'create' ? 'Add Appointment' : 'Edit Appointment';
  const submitButtonText =
    mode === 'create' ? 'Create Appointment' : 'Update Appointment';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Team Member Selection (show in edit mode or when no team member pre-selected) */}
          {(mode === 'edit' || !teamMember) && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <User className="w-4 h-4 inline mr-1" />
                Team Member
              </label>
              <select
                value={bookingData.teamMemberId}
                onChange={(e) => handleTeamMemberChange(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select team member</option>
                {teamMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Appointment Info */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            {currentTeamMember && (
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-500" />
                <span className="font-medium">
                  {currentTeamMember.first_name} {currentTeamMember.last_name}
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={bookingData.bookingDate}
                onChange={(e) =>
                  setBookingData({
                    ...bookingData,
                    bookingDate: e.target.value,
                  })
                }
                className="px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-500" />
              <input
                type="time"
                value={bookingData.startTime}
                onChange={(e) =>
                  setBookingData({ ...bookingData, startTime: e.target.value })
                }
                className="px-2 py-1 border rounded focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Client
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowClientDropdown(true);
                  if (!e.target.value) {
                    setBookingData({
                      ...bookingData,
                      clientId: '',
                      clientName: '',
                    });
                  }
                }}
                onFocus={() => setShowClientDropdown(true)}
                placeholder="Search for existing client or enter new client name"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required={mode === 'create'}
              />

              {/* Client Dropdown */}
              {showClientDropdown &&
                searchQuery &&
                filteredClients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto z-10">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => handleClientSelect(client)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            {client.first_name} {client.last_name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {client.email} • {client.phone}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
            </div>

            {/* New Client Fields */}
            {!bookingData.clientId && searchQuery && (
              <div className="space-y-3 mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">
                  New Client Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      <Mail className="w-3 h-3 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={bookingData.clientEmail}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          clientEmail: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      <Phone className="w-3 h-3 inline mr-1" />
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={bookingData.clientPhone}
                      onChange={(e) =>
                        setBookingData({
                          ...bookingData,
                          clientPhone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      placeholder="+1 234 567 8900"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Service Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Service
            </label>
            <select
              value={bookingData.serviceId}
              onChange={(e) => handleServiceSelect(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
              disabled={!bookingData.teamMemberId}
            >
              <option value="">
                {bookingData.teamMemberId
                  ? 'Select a service'
                  : 'Select team member first'}
              </option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} - {service.base_duration} mins - $
                  {service.base_price}
                </option>
              ))}
            </select>
          </div>

          {/* Duration and Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <Clock className="w-4 h-4 inline mr-1" />
                Duration (minutes)
              </label>
              <input
                type="number"
                value={bookingData.duration}
                onChange={(e) =>
                  setBookingData({
                    ...bookingData,
                    duration: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="15"
                step="15"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Price
              </label>
              <input
                type="number"
                value={bookingData.price}
                onChange={(e) =>
                  setBookingData({
                    ...bookingData,
                    price: parseFloat(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* Status (for edit mode) */}
          {mode === 'edit' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                value={bookingData.status}
                onChange={(e) =>
                  setBookingData({ ...bookingData, status: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              value={bookingData.notes}
              onChange={(e) =>
                setBookingData({ ...bookingData, notes: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add any special notes or instructions..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
