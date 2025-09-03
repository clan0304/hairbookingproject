// components/booking/BookingReview.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
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

  const fetchClientData = useCallback(async () => {
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
        // Make sure all required fields are populated
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
  }, [userId, bookingState, onUpdate]);

  useEffect(() => {
    fetchClientData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Only depend on userId to avoid loops

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
        weekday: 'short',
        month: 'short',
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
        ? `${bookingState.serviceDuration} mins`
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
              ${bookingState.teamMemberPrice?.toFixed(2) || '0.00'}
            </span>
          </div>
        </div>
      </Card>

      {/* Client Information */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Your Information</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <User className="w-4 h-4 text-gray-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">
                {clientData.first_name} {clientData.last_name || ''}
              </p>
            </div>
          </div>

          {clientData.email && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm">{clientData.email}</p>
              </div>
            </div>
          )}

          {clientData.phone && (
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-gray-400" />
              <div className="flex-1">
                <p className="text-sm">{clientData.phone}</p>
              </div>
            </div>
          )}
        </div>

        {/* Missing Information Alert */}
        {(!clientData.email || !clientData.phone) && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <p className="text-sm text-amber-800">
                Some contact information is missing. Please update your profile
                for better communication.
              </p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
