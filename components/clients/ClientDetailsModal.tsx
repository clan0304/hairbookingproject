/* eslint-disable @typescript-eslint/no-explicit-any */
// components/clients/ClientDetailsModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  X,
  User,
  Mail,
  Phone,
  Calendar,
  Clock,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Client } from '@/types/database';

interface ClientDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client;
  onEdit: () => void;
}

interface BookingHistory {
  id: string;
  booking_number: string;
  booking_date: string;
  start_time: string;
  service_name?: string;
  team_member_name?: string;
  price: number;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
}

export function ClientDetailsModal({
  isOpen,
  onClose,
  client,
  onEdit,
}: ClientDetailsModalProps) {
  const [bookingHistory, setBookingHistory] = useState<BookingHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [stats, setStats] = useState({
    totalBookings: 0,
    completedBookings: 0,
    totalSpent: 0,
    lastVisit: null as string | null,
  });

  useEffect(() => {
    if (isOpen && client) {
      fetchClientDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, client]);

  const fetchClientDetails = async () => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/admin/clients/${client.id}`);
      const data = await response.json();

      if (data.data?.recent_bookings) {
        setBookingHistory(data.data.recent_bookings);

        // Calculate stats
        const bookings = data.data.recent_bookings;
        const completed = bookings.filter((b: any) => b.status === 'completed');
        const totalSpent = completed.reduce(
          (sum: number, b: any) => sum + (b.price || 0),
          0
        );
        const lastCompleted = completed[0]?.booking_date;

        setStats({
          totalBookings: bookings.length,
          completedBookings: completed.length,
          totalSpent,
          lastVisit: lastCompleted || null,
        });
      }
    } catch (error) {
      console.error('Error fetching client details:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'confirmed':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'no_show':
        return <AlertCircle className="w-4 h-4 text-orange-600" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'no_show':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Client Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Edit client"
            >
              <Edit className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Client Info */}
          <div className="flex items-start gap-6">
            <Avatar className="h-20 w-20">
              <AvatarImage src={client.photo || undefined} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-xl">
                {client.first_name[0]}
                {client.last_name?.[0] || ''}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="text-2xl font-semibold text-gray-900">
                {client.first_name} {client.last_name}
              </h3>
              <div className="mt-3 space-y-2">
                {client.email && (
                  <div className="flex items-center text-gray-600">
                    <Mail className="w-4 h-4 mr-2" />
                    <span>{client.email}</span>
                  </div>
                )}
                {client.phone && (
                  <div className="flex items-center text-gray-600">
                    <Phone className="w-4 h-4 mr-2" />
                    <span>{client.phone}</span>
                  </div>
                )}
                <div className="flex items-center text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  <span>
                    Client since{' '}
                    {format(new Date(client.created_at), 'MMMM yyyy')}
                  </span>
                </div>
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-2 text-gray-600" />
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.is_authenticated
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {client.is_authenticated
                      ? 'Registered User'
                      : 'Guest Client'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Bookings</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {stats.totalBookings}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {stats.completedBookings}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                ${stats.totalSpent.toFixed(2)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600">Last Visit</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">
                {stats.lastVisit
                  ? format(new Date(stats.lastVisit), 'MMM d, yyyy')
                  : 'Never'}
              </p>
            </div>
          </div>

          {/* Booking History */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 mb-4">
              Recent Booking History
            </h4>
            {loadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : bookingHistory.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No booking history found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Service
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Team Member
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Price
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {bookingHistory.map((booking) => (
                      <tr key={booking.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">
                          <div>
                            <p className="font-medium">
                              {format(
                                new Date(booking.booking_date),
                                'MMM d, yyyy'
                              )}
                            </p>
                            <p className="text-xs text-gray-500">
                              {booking.start_time}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {booking.service_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          {booking.team_member_name || 'N/A'}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">
                          ${booking.price.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              booking.status
                            )}`}
                          >
                            {getStatusIcon(booking.status)}
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
