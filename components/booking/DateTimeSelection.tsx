// components/booking/DateTimeSelection.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, User } from 'lucide-react';
import { format, addDays, startOfWeek, addWeeks, subWeeks } from 'date-fns';
import type { BookingFlowState } from '@/types/database';

interface DateTimeSelectionProps {
  shopId: string;
  teamMemberId: string;
  serviceDuration: number;
  bookingState: BookingFlowState;
  onUpdate: (state: BookingFlowState) => void;
}

interface TimeSlot {
  time: string;
  display_time: string;
  is_available: boolean;
}

export function DateTimeSelection({
  shopId,
  teamMemberId,
  serviceDuration,
  bookingState,
  onUpdate,
}: DateTimeSelectionProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(
    bookingState.selectedDate || new Date()
  );
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  // Memoize fetchAvailableSlots with useCallback
  const fetchAvailableSlots = useCallback(async () => {
    if (!selectedDate || !teamMemberId || !bookingState.serviceId) {
      return;
    }

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(
        `/api/public/booking/availability?` +
          `team_member_id=${teamMemberId}&` +
          `service_id=${bookingState.serviceId}&` +
          `date=${dateStr}&` +
          `shop_id=${shopId}`
      );

      if (!response.ok) {
        console.error('Failed to fetch available slots');
        setTimeSlots([]);
        return;
      }

      const { data } = await response.json();
      setTimeSlots(data?.available_slots || []);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setTimeSlots([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, teamMemberId, bookingState.serviceId, shopId]);

  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    onUpdate({
      ...bookingState,
      selectedDate: date,
      selectedTime: null, // Reset time when date changes
    });
  };

  const handleTimeSelect = (slot: TimeSlot) => {
    onUpdate({
      ...bookingState,
      selectedTime: slot.display_time,
    });
  };

  // Generate week dates for horizontal date selector
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Start on Monday
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Navigation functions
  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Select time</h2>

      {/* Professional Info Bar */}
      {bookingState.teamMemberName && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <User size={16} className="text-purple-600" />
            </div>
            <span className="font-medium">{bookingState.teamMemberName}</span>
          </div>
          <button className="text-sm text-purple-600 hover:text-purple-700">
            Change
          </button>
        </div>
      )}

      {/* Month and Navigation */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {format(currentWeek, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center gap-1">
          <button
            onClick={goToPreviousWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Previous week"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Next week"
          >
            <ChevronRight size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Horizontal Date Selector - Matches your UI */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((date) => {
          const isSelected =
            selectedDate?.toDateString() === date.toDateString();
          const isToday = new Date().toDateString() === date.toDateString();
          const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
          const dayNumber = format(date, 'd');
          const dayName = format(date, 'EEE');

          return (
            <button
              key={date.toISOString()}
              onClick={() => !isPast && handleDateSelect(date)}
              disabled={isPast}
              className={`
                relative p-3 rounded-xl text-center transition-all
                ${
                  isSelected
                    ? 'bg-purple-600 text-white shadow-lg transform scale-105'
                    : isPast
                    ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                    : 'bg-white hover:bg-purple-50 hover:shadow-md text-gray-700'
                }
                ${isToday && !isSelected ? 'ring-2 ring-purple-200' : ''}
              `}
            >
              {/* Day number - large and bold like in your UI */}
              <div
                className={`text-2xl font-bold mb-1 ${
                  isSelected
                    ? 'text-white'
                    : isPast
                    ? 'text-gray-300'
                    : 'text-gray-900'
                }`}
              >
                {dayNumber}
              </div>

              {/* Day name - smaller text below */}
              <div
                className={`text-xs ${
                  isSelected ? 'text-purple-100' : 'text-gray-500'
                }`}
              >
                {dayName}
              </div>

              {/* Today indicator */}
              {isToday && (
                <div
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    isSelected ? 'bg-white' : 'bg-purple-600'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Time Slots Grid */}
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Available times for {format(selectedDate, 'MMMM d, yyyy')}
        </h3>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-14 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : timeSlots.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {timeSlots.map((slot, index) => {
              const isSelected =
                bookingState.selectedTime === slot.display_time;

              return (
                <button
                  key={`${slot.time}-${index}`}
                  onClick={() => slot.is_available && handleTimeSelect(slot)}
                  disabled={!slot.is_available}
                  className={`
                    py-4 px-4 rounded-lg font-medium transition-all
                    ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md transform scale-105'
                        : slot.is_available
                        ? 'bg-white border-2 border-gray-200 hover:border-purple-300 hover:bg-purple-50 text-gray-900'
                        : 'bg-gray-50 text-gray-300 cursor-not-allowed border-2 border-gray-100'
                    }
                  `}
                >
                  {slot.display_time}
                </button>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center">
            <div className="text-gray-400 mb-2">
              <svg
                className="w-12 h-12 mx-auto mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <p className="text-gray-600 font-medium">No available time slots</p>
            <p className="text-sm text-gray-500 mt-1">
              Please select a different date or professional
            </p>
          </Card>
        )}
      </div>

      {/* Selected Time Summary */}
      {bookingState.selectedTime && (
        <Card className="p-4 bg-purple-50 border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">
                Selected appointment:
              </p>
              <p className="text-lg font-semibold text-purple-900">
                {format(selectedDate, 'EEEE, MMMM d')} at{' '}
                {bookingState.selectedTime}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-purple-600">Duration</p>
              <p className="font-semibold text-purple-900">
                {serviceDuration} mins
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
