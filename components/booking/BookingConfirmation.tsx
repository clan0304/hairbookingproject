// components/booking/BookingConfirmation.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
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
  const bookingCreatedRef = useRef(false); // Prevent double submission

  // Store the booking state in a ref to avoid dependency issues
  const bookingStateRef = useRef(bookingState);
  const shopIdRef = useRef(shopId);

  // Update refs when props change (but won't trigger effect re-run)
  useEffect(() => {
    bookingStateRef.current = bookingState;
    shopIdRef.current = shopId;
  }, [bookingState, shopId]);

  // Helper function to convert 12-hour time to 24-hour format
  const convertTo24Hour = (time12h: string): string => {
    const [time, modifier] = time12h.split(' ');
    const timeParts = time.split(':');
    let hours = timeParts[0];
    const minutes = timeParts[1];

    if (hours === '12') {
      hours = modifier?.toLowerCase() === 'am' ? '00' : '12';
    } else if (modifier?.toLowerCase() === 'pm') {
      hours = String(parseInt(hours, 10) + 12);
    }

    return `${hours.padStart(2, '0')}:${minutes || '00'}`;
  };

  useEffect(() => {
    const createBooking = async () => {
      // Prevent double submission
      if (bookingCreatedRef.current) {
        return;
      }

      // Use refs to get current values
      const currentBookingState = bookingStateRef.current;
      const currentShopId = shopIdRef.current;

      try {
        setLoading(true);
        setError(null);
        bookingCreatedRef.current = true; // Mark as attempting to create

        // Validate required data
        if (
          !currentBookingState.selectedDate ||
          !currentBookingState.selectedTime
        ) {
          throw new Error('Missing date or time selection');
        }

        // Convert selected time to 24-hour format
        let formattedStartTime = currentBookingState.selectedTime;
        if (
          formattedStartTime.toLowerCase().includes('am') ||
          formattedStartTime.toLowerCase().includes('pm')
        ) {
          formattedStartTime = convertTo24Hour(formattedStartTime);
        }

        // Create full datetime strings by combining date and time
        const bookingDate = format(
          currentBookingState.selectedDate,
          'yyyy-MM-dd'
        );
        const startsAt = `${bookingDate}T${formattedStartTime}:00`;

        // Calculate end time
        const [hours, minutes] = formattedStartTime.split(':').map(Number);
        const startDate = new Date(currentBookingState.selectedDate);
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = new Date(
          startDate.getTime() + currentBookingState.serviceDuration! * 60000
        );
        const endsAt = `${bookingDate}T${format(endDate, 'HH:mm:ss')}`;

        // Prepare booking data
        const bookingData = {
          team_member_id: currentBookingState.teamMemberId,
          shop_id: currentShopId,
          service_id: currentBookingState.serviceId,
          variant_id: currentBookingState.variantId || null,
          starts_at: startsAt,
          ends_at: endsAt,
          duration: currentBookingState.serviceDuration,
          price: currentBookingState.teamMemberPrice,
          session_id: currentBookingState.sessionId || null,
          booking_note: null,
        };

        // Create the booking WITHOUT abort signal to ensure it completes
        console.log('Sending booking data:', bookingData);

        const response = await fetch('/api/public/booking/create', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingData),
          // NO signal here - we want this to complete even if component unmounts
        });

        // Check if the response is ok before trying to parse JSON
        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response text:', responseText);

        let responseData;
        try {
          responseData = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Failed to parse response:', parseError);
          throw new Error('Invalid response from server');
        }

        if (!response.ok) {
          // Check if it's a double booking error
          if (
            responseData.error?.includes('no_double_booking') ||
            responseData.error?.includes('already booked')
          ) {
            throw new Error(
              'This time slot has already been booked. Please select a different time.'
            );
          }

          throw new Error(responseData.error || 'Failed to create booking');
        }

        if (!responseData.data?.booking_number) {
          console.error('Response missing booking number:', responseData);
          throw new Error(
            'Booking was created but no booking number was returned'
          );
        }

        setBookingNumber(responseData.data.booking_number);
        console.log(
          'Booking created successfully:',
          responseData.data.booking_number
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (err: any) {
        console.error('Error creating booking:', err);

        // Set appropriate error message
        if (
          err.message.includes('double_booking') ||
          err.message.includes('already booked')
        ) {
          setError(
            'This time slot is no longer available. Please go back and select a different time.'
          );
        } else {
          setError(err.message || 'Failed to create booking');
        }

        // Reset the flag on error so user can retry if needed
        bookingCreatedRef.current = false;
      } finally {
        setLoading(false);
      }
    };

    createBooking();
  }, []); // Empty dependency array - only run once on mount

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
          <p className="text-gray-600 mb-2">
            There was an issue creating your booking
          </p>
          <p className="text-red-600 max-w-md mx-auto">{error}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Button onClick={() => router.back()} className="flex-1">
            Go Back & Try Again
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

  // Only show success if we have a booking number
  if (!bookingNumber) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="w-12 h-12 text-amber-600 mb-4" />
        <p className="text-lg font-medium">Processing booking...</p>
        <p className="text-gray-600">
          If this takes too long, please refresh the page
        </p>
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
          Booking Number:{' '}
          <span className="text-purple-600">{bookingNumber}</span>
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
      {bookingState.clientEmail && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-800">
            A confirmation email has been sent to{' '}
            <strong>{bookingState.clientEmail}</strong> with your booking
            details and any special instructions.
          </p>
        </Card>
      )}

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Generate Google Calendar URL
              const startDateTime = new Date(bookingState.selectedDate!);
              const [hours, minutes] = convertTo24Hour(
                bookingState.selectedTime!
              ).split(':');
              startDateTime.setHours(parseInt(hours), parseInt(minutes));

              const endDateTime = new Date(
                startDateTime.getTime() + bookingState.serviceDuration! * 60000
              );

              const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
                `${bookingState.serviceName} at ${bookingState.shopName}`
              )}&dates=${format(startDateTime, "yyyyMMdd'T'HHmmss")}/${format(
                endDateTime,
                "yyyyMMdd'T'HHmmss"
              )}&details=${encodeURIComponent(
                `Service: ${bookingState.serviceName}${
                  bookingState.variantName
                    ? ` - ${bookingState.variantName}`
                    : ''
                }\nProfessional: ${
                  bookingState.teamMemberName
                }\nBooking Number: ${bookingNumber}`
              )}&location=${encodeURIComponent(bookingState.shopAddress)}`;

              window.open(googleCalendarUrl, '_blank');
            }}
          >
            Google Calendar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Generate ICS file content for Apple/Outlook
              const startDateTime = new Date(bookingState.selectedDate!);
              const [hours, minutes] = convertTo24Hour(
                bookingState.selectedTime!
              ).split(':');
              startDateTime.setHours(parseInt(hours), parseInt(minutes));

              const endDateTime = new Date(
                startDateTime.getTime() + bookingState.serviceDuration! * 60000
              );

              const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${format(startDateTime, "yyyyMMdd'T'HHmmss")}
DTEND:${format(endDateTime, "yyyyMMdd'T'HHmmss")}
SUMMARY:${bookingState.serviceName} at ${bookingState.shopName}
DESCRIPTION:Service: ${bookingState.serviceName}${
                bookingState.variantName ? ` - ${bookingState.variantName}` : ''
              }\\nProfessional: ${
                bookingState.teamMemberName
              }\\nBooking Number: ${bookingNumber}
LOCATION:${bookingState.shopAddress}
END:VEVENT
END:VCALENDAR`;

              const blob = new Blob([icsContent], { type: 'text/calendar' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = `booking-${bookingNumber}.ics`;
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            Apple/Outlook
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
