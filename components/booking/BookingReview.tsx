// components/booking/BookingReview.tsx
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import type { BookingFlowState } from '@/types/database';

interface BookingReviewProps {
  bookingState: BookingFlowState;
  onUpdate: (state: BookingFlowState) => void;
}

export function BookingReview({ bookingState, onUpdate }: BookingReviewProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone: string) => {
    const re = /^[\d\s()+-]+$/;
    return phone.length >= 10 && re.test(phone);
  };

  const handleInputChange = (field: string, value: string) => {
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }

    // Validate on change
    if (field === 'clientEmail' && value && !validateEmail(value)) {
      setErrors((prev) => ({ ...prev, clientEmail: 'Invalid email format' }));
    }
    if (field === 'clientPhone' && value && !validatePhone(value)) {
      setErrors((prev) => ({ ...prev, clientPhone: 'Invalid phone format' }));
    }

    onUpdate({
      ...bookingState,
      [field]: value,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Review & Confirm</h2>
        <p className="text-gray-600">
          Please provide your contact information to confirm the booking
        </p>
      </div>

      {/* Booking Details Summary */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Booking Details</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Service:</span>
            <span className="font-medium">
              {bookingState.serviceName}
              {bookingState.variantName && ` - ${bookingState.variantName}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Professional:</span>
            <span className="font-medium">{bookingState.teamMemberName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">
              {bookingState.selectedDate?.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Time:</span>
            <span className="font-medium">{bookingState.selectedTime}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Duration:</span>
            <span className="font-medium">
              {bookingState.serviceDuration} minutes
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t">
            <span className="font-semibold">Total:</span>
            <span className="font-semibold text-lg">
              ${bookingState.teamMemberPrice?.toFixed(2)}
            </span>
          </div>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Your Information</h3>
        <div className="space-y-4">
          {/* Full Name Field */}
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              placeholder="John Doe"
              value={bookingState.clientName}
              onChange={(e) => handleInputChange('clientName', e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       hover:border-gray-400 transition-colors
                       placeholder:text-gray-400"
            />
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email *
            </label>
            <input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={bookingState.clientEmail}
              onChange={(e) => handleInputChange('clientEmail', e.target.value)}
              required
              className={`w-full px-3 py-2 border rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       hover:border-gray-400 transition-colors
                       placeholder:text-gray-400
                       ${
                         errors.clientEmail
                           ? 'border-red-500'
                           : 'border-gray-300'
                       }`}
            />
            {errors.clientEmail && (
              <p className="text-sm text-red-500 mt-1">{errors.clientEmail}</p>
            )}
          </div>

          {/* Phone Field */}
          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Phone Number *
            </label>
            <input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              value={bookingState.clientPhone}
              onChange={(e) => handleInputChange('clientPhone', e.target.value)}
              required
              className={`w-full px-3 py-2 border rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       hover:border-gray-400 transition-colors
                       placeholder:text-gray-400
                       ${
                         errors.clientPhone
                           ? 'border-red-500'
                           : 'border-gray-300'
                       }`}
            />
            {errors.clientPhone && (
              <p className="text-sm text-red-500 mt-1">{errors.clientPhone}</p>
            )}
          </div>

          {/* Special Requests Field */}
          <div className="space-y-2">
            <label
              htmlFor="note"
              className="block text-sm font-medium text-gray-700"
            >
              Special Requests (Optional)
            </label>
            <textarea
              id="note"
              placeholder="Any special requests or notes for your appointment..."
              value={bookingState.clientNote}
              onChange={(e) => handleInputChange('clientNote', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent
                       hover:border-gray-400 transition-colors
                       placeholder:text-gray-400 resize-none"
            />
          </div>
        </div>
      </Card>

      {/* Cancellation Policy */}
      <Card className="p-4 bg-yellow-50 border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>Cancellation Policy:</strong> You can cancel or reschedule
          your appointment up to 24 hours before the scheduled time without any
          charges.
        </p>
      </Card>
    </div>
  );
}
