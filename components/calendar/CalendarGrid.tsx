// components/calendar/CalendarGrid.tsx
'use client';

import { useMemo } from 'react';
import { format, addDays, isSameDay, startOfWeek, parse } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookingCard } from './BookingCard';
import type {
  TeamMember,
  BookingWithLocalTimes as BookingWithDetails,
} from '@/types/database';

type ViewMode = 'day' | 'week';

interface CalendarGridProps {
  currentDate: Date;
  viewMode: ViewMode;
  teamMembers: TeamMember[];
  bookings: BookingWithDetails[];
  loading: boolean;
  shopTimezone: string;
}

// Time slots from 6:00 AM to 10:00 PM (16 hours)
const TIME_SLOTS = Array.from({ length: 33 }, (_, i) => {
  const hour = Math.floor(i / 2) + 6;
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

const SLOT_HEIGHT = 30; // Height of each 30-minute slot in pixels
const HEADER_HEIGHT = 120; // Height of the header section
const TIME_COLUMN_WIDTH = 80; // Width of the time column

export function CalendarGrid({
  currentDate,
  viewMode,
  teamMembers,
  bookings,
  loading,
}: CalendarGridProps) {
  // Calculate the dates to display
  const displayDates = useMemo(() => {
    if (viewMode === 'day') {
      return [currentDate];
    } else {
      const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    }
  }, [currentDate, viewMode]);

  // Group bookings by team member and date
  const bookingsByMemberAndDate = useMemo(() => {
    const grouped = new Map<string, BookingWithDetails[]>();

    bookings.forEach((booking) => {
      // booking_date from the VIEW is already in local date format (YYYY-MM-DD)
      const bookingDateStr =
        booking.booking_date || booking.booking_date_local || '';
      // Ensure we have a valid date string
      if (!bookingDateStr) return;

      const bookingDate = new Date(bookingDateStr + 'T00:00:00');

      displayDates.forEach((date) => {
        if (isSameDay(bookingDate, date)) {
          const key = `${booking.team_member_id}-${format(date, 'yyyy-MM-dd')}`;
          const existing = grouped.get(key) || [];
          grouped.set(key, [...existing, booking]);
        }
      });
    });

    return grouped;
  }, [bookings, displayDates]);

  // Calculate booking position and height
  const getBookingStyle = (booking: BookingWithDetails) => {
    // Get the time string - prioritize start_time_local from the VIEW
    const timeStr = booking.start_time_local || booking.start_time || '00:00';

    let startHour = 0;
    let startMinute = 0;

    // Parse time string (format: "HH:MM" or "HH:MM:SS")
    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      startHour = parseInt(parts[0], 10) || 0;
      startMinute = parseInt(parts[1], 10) || 0;
    }

    // Validate parsed values
    if (isNaN(startHour) || isNaN(startMinute)) {
      console.warn('Invalid time for booking:', booking.id, timeStr);
      startHour = 0;
      startMinute = 0;
    }

    // Calculate position from 6:00 AM
    const minutesFrom6AM = Math.max(0, (startHour - 6) * 60 + startMinute);
    const top = (minutesFrom6AM / 30) * SLOT_HEIGHT;

    // Calculate height based on duration
    const height = Math.max(
      SLOT_HEIGHT - 4,
      (booking.duration / 30) * SLOT_HEIGHT - 4
    );

    return {
      top: `${top}px`,
      height: `${height}px`,
      left: '4px',
      right: '4px',
      position: 'absolute' as const,
    };
  };

  // Column width calculation
  const columnWidth =
    viewMode === 'day'
      ? `calc((100% - ${TIME_COLUMN_WIDTH}px) / ${teamMembers.length})`
      : `calc((100% - ${TIME_COLUMN_WIDTH}px) / ${teamMembers.length * 7})`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  if (!teamMembers.length) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-gray-500">No team members selected</p>
          <p className="text-sm text-gray-400 mt-2">
            Please select team members to view their schedule
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full bg-white">
      <div className="absolute inset-0 overflow-auto">
        {/* Fixed Header */}
        <div
          className="sticky top-0 z-20 bg-white border-b"
          style={{ height: `${HEADER_HEIGHT}px` }}
        >
          {/* Time column header */}
          <div
            className="absolute top-0 left-0 border-r bg-gray-50"
            style={{
              width: `${TIME_COLUMN_WIDTH}px`,
              height: `${HEADER_HEIGHT}px`,
            }}
          />

          {/* Team member headers */}
          <div
            className="absolute top-0"
            style={{ left: `${TIME_COLUMN_WIDTH}px`, right: 0 }}
          >
            <div className="flex h-full">
              {viewMode === 'day'
                ? // Day view - just team members
                  teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="border-r flex-1 flex flex-col items-center justify-center py-4"
                      style={{ width: columnWidth }}
                    >
                      <Avatar className="h-12 w-12 mb-2">
                        <AvatarImage src={member.photo || undefined} />
                        <AvatarFallback>
                          {member.first_name[0]}
                          {member.last_name?.[0] || ''}
                        </AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium text-center">
                        {member.first_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {member.last_name}
                      </p>
                    </div>
                  ))
                : // Week view - dates and team members
                  displayDates.map((date) => (
                    <div
                      key={format(date, 'yyyy-MM-dd')}
                      className="flex flex-1 border-r"
                    >
                      <div className="flex flex-col border-b bg-gray-50 w-full">
                        <div className="text-center py-2 border-b">
                          <p className="text-xs text-gray-500">
                            {format(date, 'EEE')}
                          </p>
                          <p className="text-lg font-medium">
                            {format(date, 'd')}
                          </p>
                        </div>
                        <div className="flex">
                          {teamMembers.map((member) => (
                            <div
                              key={`${date}-${member.id}`}
                              className="flex-1 border-r last:border-r-0 py-2"
                              style={{ width: columnWidth }}
                            >
                              <div className="flex flex-col items-center">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage
                                    src={member.photo || undefined}
                                  />
                                  <AvatarFallback className="text-xs">
                                    {member.first_name[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-xs mt-1 text-center">
                                  {member.first_name}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
            </div>
          </div>
        </div>

        {/* Time grid */}
        <div className="relative" style={{ paddingTop: `${HEADER_HEIGHT}px` }}>
          {/* Time labels */}
          <div
            className="absolute top-0 left-0"
            style={{
              width: `${TIME_COLUMN_WIDTH}px`,
            }}
          >
            {TIME_SLOTS.map((time) => (
              <div
                key={time}
                className="border-t text-xs text-gray-500 text-right pr-2"
                style={{ height: `${SLOT_HEIGHT}px` }}
              >
                {time.endsWith('00') && (
                  <span className="inline-block -mt-2">
                    {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Grid columns and bookings */}
          <div
            className="absolute top-0"
            style={{
              left: `${TIME_COLUMN_WIDTH}px`,
              right: 0,
            }}
          >
            {/* Grid background */}
            <div className="absolute inset-0">
              {TIME_SLOTS.map((time) => (
                <div
                  key={time}
                  className="border-t"
                  style={{ height: `${SLOT_HEIGHT}px` }}
                />
              ))}
            </div>

            {/* Columns */}
            <div className="flex h-full relative">
              {viewMode === 'day'
                ? // Day view columns
                  teamMembers.map((member) => (
                    <div
                      key={member.id}
                      className="border-r relative"
                      style={{ width: columnWidth }}
                    >
                      {/* Bookings for this member on this day */}
                      {bookingsByMemberAndDate
                        .get(
                          `${member.id}-${format(currentDate, 'yyyy-MM-dd')}`
                        )
                        ?.map((booking) => (
                          <div
                            key={booking.id}
                            style={getBookingStyle(booking)}
                          >
                            <BookingCard booking={booking} />
                          </div>
                        ))}
                    </div>
                  ))
                : // Week view columns
                  displayDates.map((date) => (
                    <div
                      key={format(date, 'yyyy-MM-dd')}
                      className="flex flex-1 border-r"
                    >
                      {teamMembers.map((member) => (
                        <div
                          key={`${date}-${member.id}`}
                          className="relative border-r last:border-r-0"
                          style={{ width: columnWidth }}
                        >
                          {/* Bookings for this member on this date */}
                          {bookingsByMemberAndDate
                            .get(`${member.id}-${format(date, 'yyyy-MM-dd')}`)
                            ?.map((booking) => (
                              <div
                                key={booking.id}
                                style={getBookingStyle(booking)}
                              >
                                <BookingCard booking={booking} compact={true} />
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
