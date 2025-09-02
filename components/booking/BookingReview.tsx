// components/booking/BookingReview.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@clerk/nextjs';
import { createClient } from '@/lib/supabase/client';
import { User, Mail, Phone, AlertCircle } from 'lucide-react';
import type { BookingFlowState } from '@/types/database';

interface BookingReviewProps {
  bookingState: BookingFlowState;
  onUpdate: (state: BookingFlowState) => void;
}

interface BookingDetail {
  id: string;
  label: string;
  value: string | null | undefined;
}

interface ClientData {
  id: string;
  first_name: string;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  photo?: string | null;
}

export function BookingReview({ bookingState, onUpdate }: BookingReviewProps) {
  const { userId } = useAuth();
  const [clientData, setClientData] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [specialNote, setSpecialNote] = useState(bookingState.clientNote || '');

  useEffect(() => {
    async function fetchClientData() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        // Get client data only - this is what matters for the business
        const { data: client, error } = await supabase
          .from('clients')
          .select('*')
          .eq('clerk_id', userId)
          .single();

        if (error) {
          console.error('Error fetching client data:', error);
          setLoading(false);
          return;
        }

        if (client) {
          setClientData(client);

          // Update booking state with client information
          onUpdate({
            ...bookingState,
            clientId: client.id,
            clientName: `${client.first_name} ${client.last_name || ''}`.trim(),
            clientEmail: client.email || '',
            clientPhone: client.phone || '',
          });
        }
      } catch (error) {
        console.error('Error fetching client data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchClientData();
  }, [userId]); // Only depend on userId to avoid loops

  const handleNoteChange = (value: string) => {
    setSpecialNote(value);
    onUpdate({
      ...bookingState,
      clientNote: value,
    });
  };

  // Create booking details array with unique IDs
  const bookingDetails: BookingDetail[] = [
    {
      id: 'service',
      label: 'Service:',
      value: bookingState.serviceName
        ? `${bookingState.serviceName}${
            bookingState.variantName ? ` - ${bookingState.variantName}` : ''
          }`
        : null,
    },
    {
      id: 'professional',
      label: 'Professional:',
      value: bookingState.teamMemberName,
    },
    {
      id: 'date',
      label: 'Date:',
      value: bookingState.selectedDate?.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    },
    {
      id: 'time',
      label: 'Time:',
      value: bookingState.selectedTime,
    },
    {
      id: 'duration',
      label: 'Duration:',
      value: bookingState.serviceDuration
        ? `${bookingState.serviceDuration} minutes`
        : null,
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Review & Confirm</h2>
          <p className="text-gray-600">Loading your information...</p>
        </div>
        <div className="animate-pulse">
          <div className="h-32 bg-gray-100 rounded-lg mb-4"></div>
          <div className="h-24 bg-gray-100 rounded-lg"></div>
        </div>
      </div>
    );
  }

  if (!clientData) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Review & Confirm</h2>
        </div>
        <Card className="p-6">
          <div className="flex items-center gap-3 text-amber-600">
            <AlertCircle className="w-5 h-5" />
            <p className="font-medium">Client profile not found</p>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Please contact support to complete your profile before booking.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Review & Confirm</h2>
        <p className="text-gray-600">
          Please review your booking details before confirming
        </p>
      </div>

      {/* Booking Details Summary */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Booking Details</h3>
        <div className="space-y-3 text-sm">
          {bookingDetails
            .filter((detail) => detail.value)
            .map((detail) => (
              <div key={`detail-${detail.id}`} className="flex justify-between">
                <span className="text-gray-600">{detail.label}</span>
                <span className="font-medium text-right">{detail.value}</span>
              </div>
            ))}
          <div className="flex justify-between pt-3 border-t">
            <span className="font-semibold">Total:</span>
            <span className="font-semibold text-lg">
              ${bookingState.teamMemberPrice?.toFixed(2)}
            </span>
          </div>
        </div>
      </Card>

      {/* Client Information - Display Only */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Your Information</h3>
        <div className="space-y-3">
          {/* Name */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">Name</span>
            </div>
            <span className="font-medium">
              {clientData.first_name} {clientData.last_name || ''}
            </span>
          </div>

          {/* Email */}
          {clientData.email && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">Email</span>
              </div>
              <span className="font-medium">{clientData.email}</span>
            </div>
          )}

          {/* Phone */}
          {clientData.phone && (
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-600">Phone</span>
              </div>
              <span className="font-medium">{clientData.phone}</span>
            </div>
          )}
        </div>

        {/* Missing Information Alert */}
        {(!clientData.email || !clientData.phone) && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Incomplete profile</p>
              <p className="text-xs mt-1">
                Some contact information is missing. Please update your profile
                for better communication.
              </p>
            </div>
          </div>
        )}

        {/* Info Alert */}
        {clientData.email && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium">Using your account information</p>
              <p className="text-xs mt-1">
                We'll send confirmation to {clientData.email}
              </p>
            </div>
          </div>
        )}
      </Card>

      {/* Special Requests Field - Still allow this for notes */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Special Requests</h3>
        <div className="space-y-2">
          <label htmlFor="note" className="block text-sm text-gray-600">
            Any special requests or notes for your appointment? (Optional)
          </label>
          <textarea
            id="note"
            placeholder="E.g., I prefer a specific styling technique, allergies to certain products, running late, etc."
            value={specialNote}
            onChange={(e) => handleNoteChange(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                     focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                     hover:border-gray-400 transition-colors
                     placeholder:text-gray-400 resize-none"
          />
          <p className="text-xs text-gray-500">
            This helps our professionals prepare for your appointment
          </p>
        </div>
      </Card>

      {/* Cancellation Policy */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>Cancellation Policy:</strong> You can cancel or reschedule
          your appointment up to 24 hours before the scheduled time without any
          charges. Late cancellations may incur a fee.
        </p>
      </Card>

      {/* Confirmation Notice */}
      <Card className="p-4 bg-green-50 border-green-200">
        <div className="flex items-start gap-2">
          <div className="text-green-600 mt-0.5">✓</div>
          <div className="text-sm text-green-800">
            <p className="font-medium">Ready to confirm</p>
            <p className="text-xs mt-1">
              By confirming, you agree to our terms and cancellation policy.
              {clientData.email && (
                <> A confirmation email will be sent to {clientData.email}.</>
              )}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
