// components/booking/DateTimeSelection.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, User, AlertCircle } from 'lucide-react';
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
  end_time: string;
  display_end_time: string;
  team_member_id: string;
  shop_id: string;
  is_available: boolean;
  slot_id: string;
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
  const [sessionId] = useState(
    () => bookingState.sessionId || crypto.randomUUID()
  ); // Use existing or create new
  const [reservationExpiry, setReservationExpiry] = useState<Date | null>(null);
  const reservationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Update bookingState with sessionId on mount
  useEffect(() => {
    if (!bookingState.sessionId) {
      onUpdate({
        ...bookingState,
        sessionId: sessionId,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch available slots
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
          `shop_id=${shopId}&` +
          `session_id=${sessionId}` // Pass session ID to exclude own reservations
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
  }, [selectedDate, teamMemberId, bookingState.serviceId, shopId, sessionId]);

  useEffect(() => {
    fetchAvailableSlots();
  }, [fetchAvailableSlots]);

  // Create reservation when time is selected
  const createReservation = async (slot: TimeSlot) => {
    try {
      const response = await fetch('/api/public/booking/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_member_id: slot.team_member_id,
          shop_id: shopId,
          service_id: bookingState.serviceId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          start_time: slot.time,
          duration: serviceDuration,
          session_id: sessionId,
        }),
      });

      if (response.ok) {
        const { data } = await response.json();
        const expiryDate = new Date(data.expires_at);
        setReservationExpiry(expiryDate);

        // Start countdown timer
        startReservationTimer(expiryDate);
      }
    } catch (error) {
      console.error('Error creating reservation:', error);
    }
  };

  // Start reservation expiry timer
  const startReservationTimer = (expiryDate: Date) => {
    // Clear existing timer
    if (reservationTimerRef.current) {
      clearInterval(reservationTimerRef.current);
    }

    // Update timer every second
    reservationTimerRef.current = setInterval(() => {
      const now = new Date();
      if (now >= expiryDate) {
        // Reservation expired
        clearInterval(reservationTimerRef.current!);
        setReservationExpiry(null);
        // Clear selected time
        onUpdate({
          ...bookingState,
          selectedTime: null,
        });
        // Refresh available slots
        fetchAvailableSlots();
      }
    }, 1000);
  };

  // Clean up reservation ONLY when going back or truly unmounting
  // Don't clean up when moving forward to review/confirm
  useEffect(() => {
    return () => {
      if (reservationTimerRef.current) {
        clearInterval(reservationTimerRef.current);
      }
      // Don't release reservation here - it will be released by the booking API
      // or if the user goes back to select a different time
    };
  }, []);

  const handleDateSelect = (date: Date) => {
    // Release current reservation if changing date
    if (bookingState.selectedTime && sessionId) {
      fetch(`/api/public/booking/reserve?session_id=${sessionId}`, {
        method: 'DELETE',
      });
    }

    setSelectedDate(date);
    setReservationExpiry(null);
    onUpdate({
      ...bookingState,
      selectedDate: date,
      selectedTime: null, // Reset time when date changes
    });
  };

  const handleTimeSelect = async (slot: TimeSlot) => {
    // Create reservation for this slot
    await createReservation(slot);

    onUpdate({
      ...bookingState,
      selectedTime: slot.display_time,
      sessionId: sessionId, // Ensure sessionId is included
    });
  };

  // Calculate remaining time for reservation
  const getTimeRemaining = () => {
    if (!reservationExpiry) return null;

    const now = new Date();
    const diff = reservationExpiry.getTime() - now.getTime();

    if (diff <= 0) return null;

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // Generate week dates for horizontal date selector
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const goToPreviousWeek = () => setCurrentWeek(subWeeks(currentWeek, 1));
  const goToNextWeek = () => setCurrentWeek(addWeeks(currentWeek, 1));

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Select time</h2>

      {/* Reservation Timer Alert */}
      {reservationExpiry && bookingState.selectedTime && (
        <Card className="p-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Time slot reserved
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Complete your booking within {getTimeRemaining()} or this slot
                will be released
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Professional Info Bar */}
      {bookingState.teamMemberName && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <User size={16} className="text-purple-600" />
            </div>
            <span className="font-medium">{bookingState.teamMemberName}</span>
          </div>
          <span className="text-sm text-gray-600">
            {bookingState.serviceDuration} mins
          </span>
        </div>
      )}

      {/* Date Selector */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-700">Select Date</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={goToPreviousWeek}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              disabled={
                weekStart <= new Date() ||
                weekStart.toDateString() === new Date().toDateString()
              }
            >
              <ChevronLeft
                className={`w-5 h-5 ${
                  weekStart <= new Date() ||
                  weekStart.toDateString() === new Date().toDateString()
                    ? 'text-gray-300'
                    : 'text-gray-600'
                }`}
              />
            </button>
            <button
              onClick={goToNextWeek}
              className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Week Days */}
        <div className="grid grid-cols-7 gap-2">
          {weekDates.map((date) => {
            const isSelected =
              selectedDate.toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();
            const isPast = date < new Date() && !isToday;
            const dayName = format(date, 'EEE');
            const dayNumber = format(date, 'd');

            return (
              <button
                key={date.toISOString()}
                onClick={() => !isPast && handleDateSelect(date)}
                disabled={isPast}
                className={`
                  relative p-3 rounded-lg text-center transition-all
                  ${
                    isSelected
                      ? 'bg-purple-600 text-white shadow-md'
                      : isPast
                      ? 'bg-gray-50 text-gray-300 cursor-not-allowed'
                      : 'bg-white hover:bg-gray-50 border border-gray-200'
                  }
                `}
              >
                <div
                  className={`text-lg font-medium ${
                    isSelected
                      ? 'text-white'
                      : isPast
                      ? 'text-gray-300'
                      : 'text-gray-900'
                  }`}
                >
                  {dayNumber}
                </div>
                <div
                  className={`text-xs ${
                    isSelected ? 'text-purple-100' : 'text-gray-500'
                  }`}
                >
                  {dayName}
                </div>
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
                key={`skeleton-slot-${i}`}
                className="h-14 bg-gray-100 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : timeSlots.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {timeSlots.map((slot) => {
              const isSelected =
                bookingState.selectedTime === slot.display_time;

              return (
                <button
                  key={`time-slot-${slot.slot_id}`}
                  onClick={() => slot.is_available && handleTimeSelect(slot)}
                  disabled={!slot.is_available}
                  className={`
                    py-4 px-4 rounded-lg font-medium transition-all
                    ${
                      isSelected
                        ? 'bg-purple-600 text-white shadow-md transform scale-105'
                        : slot.is_available
                        ? 'bg-white border border-gray-200 hover:border-purple-300 hover:shadow-sm'
                        : 'bg-gray-50 text-gray-300 cursor-not-allowed'
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
            <p className="text-gray-500">
              No available times for this date. Please select another date.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
