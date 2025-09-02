// components/booking/BookingConfirmation.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  User,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import type { BookingFlowState } from '@/types/database';

interface BookingConfirmationProps {
  bookingState: BookingFlowState;
  shopId: string;
}

export function BookingConfirmation({
  bookingState,
  shopId,
}: BookingConfirmationProps) {
  const router = useRouter();
  const [bookingNumber, setBookingNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    createBooking();
  }, []);

  const createBooking = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare booking data
      const bookingData = {
        team_member_id: bookingState.teamMemberId,
        shop_id: shopId,
        service_id: bookingState.serviceId,
        variant_id: bookingState.variantId,
        booking_date: format(bookingState.selectedDate!, 'yyyy-MM-dd'),
        start_time: bookingState.selectedTime
          ?.replace(' ', '')
          .toLowerCase()
          .includes('pm')
          ? convertTo24Hour(bookingState.selectedTime!)
          : bookingState.selectedTime?.replace(' ', '').replace('am', ''),
        duration: bookingState.serviceDuration,
        price: bookingState.teamMemberPrice,
        booking_note: bookingState.clientNote || null,
      };

      const response = await fetch('/api/public/booking/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create booking');
      }

      const { data } = await response.json();
      setBookingNumber(data.booking_number);
    } catch (err) {
      console.error('Error creating booking:', err);
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to convert 12-hour time to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');

    if (hours === '12') {
      hours = '00';
    }

    if (modifier?.toLowerCase() === 'pm') {
      hours = String(parseInt(hours, 10) + 12);
    }

    return `${hours}:${minutes || '00'}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
        <p className="text-lg font-medium">Creating your booking...</p>
        <p className="text-gray-600">Please wait a moment</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Booking Failed</h2>
          <p className="text-gray-600">
            There was an issue creating your booking
          </p>
          <p className="text-red-600 mt-2">{error}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button onClick={() => window.location.reload()} className="flex-1">
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            className="flex-1"
          >
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600">
          Your appointment has been successfully booked
        </p>
        <p className="text-lg font-semibold mt-2">
          Booking Number: {bookingNumber}
        </p>
      </div>

      {/* Booking Details Card */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Appointment Details</h3>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium">
                {bookingState.selectedDate?.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
              <p className="text-sm text-gray-600">
                {bookingState.selectedTime}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium">{bookingState.teamMemberName}</p>
              <p className="text-sm text-gray-600">
                {bookingState.serviceName}
                {bookingState.variantName && ` - ${bookingState.variantName}`}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium">{bookingState.shopName}</p>
              <p className="text-sm text-gray-600">
                {bookingState.shopAddress}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <p className="font-medium">
                Duration: {bookingState.serviceDuration} minutes
              </p>
              <p className="text-sm text-gray-600">
                Total: ${bookingState.teamMemberPrice?.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Confirmation Email Notice */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <p className="text-sm text-blue-800">
          A confirmation email has been sent to{' '}
          <strong>{bookingState.clientEmail}</strong> with your booking details
          and any special instructions.
        </p>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => router.push('/dashboard')} className="flex-1">
          View My Bookings
        </Button>
        <Button
          variant="outline"
          onClick={() => router.push('/')}
          className="flex-1"
        >
          Back to Home
        </Button>
      </div>

      {/* Add to Calendar */}
      <div className="text-center">
        <p className="text-sm text-gray-600 mb-2">Add to your calendar:</p>
        <div className="flex justify-center gap-3">
          <Button variant="outline" size="sm">
            Google Calendar
          </Button>
          <Button variant="outline" size="sm">
            Apple Calendar
          </Button>
          <Button variant="outline" size="sm">
            Outlook
          </Button>
        </div>
      </div>

      {/* Important Reminders */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>Reminders:</strong>
        </p>
        <ul className="text-sm text-yellow-800 mt-2 space-y-1 list-disc list-inside">
          <li>Please arrive 5 minutes before your appointment time</li>
          <li>
            To cancel or reschedule, please do so at least 24 hours in advance
          </li>
          <li>Bring any relevant photos or style references if applicable</li>
        </ul>
      </Card>
    </div>
  );
}
