// components/calendar/BookingDetailsModal.tsx
'use client';

import { useState } from 'react';
import { format, parse } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  DollarSign,
  Hash,
  CheckCircle,
  XCircle,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import type { BookingWithLocalTimes } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

interface BookingDetailsModalProps {
  booking: BookingWithLocalTimes;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function BookingDetailsModal({
  booking,
  isOpen,
  onClose,
  onUpdate,
}: BookingDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setIsUpdating(true);
    try {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      } else if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (newStatus === 'no_show') {
        updateData.no_show_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', booking.id);

      if (error) {
        console.error('Error updating booking status:', error);
        alert('Failed to update booking status');
      } else {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error updating booking:', error);
      alert('Failed to update booking');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this booking? This action cannot be undone.'
      )
    ) {
      return;
    }

    setIsUpdating(true);
    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      if (error) {
        console.error('Error deleting booking:', error);
        alert('Failed to delete booking');
      } else {
        onUpdate();
        onClose();
      }
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Failed to delete booking');
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = () => {
    switch (booking.status) {
      case 'confirmed':
        return (
          <Badge className="bg-blue-100 text-blue-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Confirmed
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completed
          </Badge>
        );
      case 'cancelled':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Cancelled
          </Badge>
        );
      case 'no_show':
        return (
          <Badge className="bg-gray-100 text-gray-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            No Show
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">Booking Details</DialogTitle>
            {getStatusBadge()}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Booking Number */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Hash className="w-4 h-4" />
            <span className="font-medium">Booking Number:</span>
            <span className="font-mono">{booking.booking_number}</span>
          </div>

          {/* Client Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Client Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span>
                  {booking.client_first_name} {booking.client_last_name}
                </span>
              </div>
              {booking.client_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a
                    href={`mailto:${booking.client_email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {booking.client_email}
                  </a>
                </div>
              )}
              {booking.client_phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <a
                    href={`tel:${booking.client_phone}`}
                    className="text-blue-600 hover:underline"
                  >
                    {booking.client_phone}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Appointment Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Appointment Details</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  {format(
                    new Date(booking.booking_date_local),
                    'EEEE, MMMM d, yyyy'
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span>
                  {format(
                    parse(booking.start_time_local, 'HH:mm:ss', new Date()),
                    'h:mm a'
                  )}{' '}
                  -
                  {format(
                    parse(booking.end_time_local, 'HH:mm:ss', new Date()),
                    'h:mm a'
                  )}
                  <span className="text-gray-500 ml-2">
                    ({booking.duration} minutes)
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400" />
                <span>
                  {booking.team_member_first_name}{' '}
                  {booking.team_member_last_name}
                </span>
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900">Service Details</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: booking.category_color }}
                  />
                  <span className="text-sm">{booking.service_name}</span>
                  {booking.variant_name && (
                    <span className="text-sm text-gray-500">
                      - {booking.variant_name}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-sm font-medium">
                  <DollarSign className="w-4 h-4" />
                  {booking.price.toFixed(2)}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {booking.booking_note && (
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900">Notes</h3>
              <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                {booking.booking_note}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex gap-2">
              {booking.status === 'confirmed' && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange('completed')}
                    disabled={isUpdating}
                    className="text-green-600 hover:text-green-700"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Complete
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange('no_show')}
                    disabled={isUpdating}
                    className="text-gray-600 hover:text-gray-700"
                  >
                    <AlertCircle className="w-4 h-4 mr-2" />
                    No Show
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStatusChange('cancelled')}
                    disabled={isUpdating}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                </>
              )}
              {(booking.status === 'cancelled' ||
                booking.status === 'no_show') && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleStatusChange('confirmed')}
                  disabled={isUpdating}
                >
                  Reactivate
                </Button>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDelete}
                disabled={isUpdating}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button size="sm" variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
