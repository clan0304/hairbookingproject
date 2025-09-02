// components/booking/BookingConfirmation.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  User,
  Loader2,
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
}: BookingConfirmationProps) {
  const router = useRouter();
  const [bookingNumber, setBookingNumber] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // In a real app, this would create the booking
  useState(() => {
    // Simulate booking creation
    setTimeout(() => {
      setBookingNumber(`BK-${format(new Date(), 'yyyyMMdd')}-001`);
      setLoading(false);
    }, 2000);
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600 mb-4" />
        <p className="text-lg font-medium">Creating your booking...</p>
        <p className="text-gray-600">Please wait a moment</p>
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
          <strong>{bookingState.clientEmail}</strong> with your booking details.
        </p>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => router.push('/')} className="flex-1">
          Back to Home
        </Button>
        <Button
          variant="outline"
          onClick={() => window.print()}
          className="flex-1"
        >
          Print Confirmation
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
    </div>
  );
}
