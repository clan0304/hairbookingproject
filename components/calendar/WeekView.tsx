// components/calendar/WeekView.tsx
'use client';

import { useState } from 'react';
import { format, parseISO, startOfWeek, addDays, isToday } from 'date-fns';
import type { BookingWithLocalTimes, TeamMember } from '@/types/database';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';

interface WeekViewProps {
  bookings: BookingWithLocalTimes[];
  teamMembers: TeamMember[];
  selectedDate: Date;
}

interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
  display: string;
}

export function WeekView({
  bookings,
  teamMembers,
  selectedDate,
}: WeekViewProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Generate 15-minute interval time slots from 5am to 10pm
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 5;
    const endHour = 22;

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const period = hour >= 12 ? 'pm' : 'am';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

        // Only show label on the hour
        const label = minute === 0 ? `${displayHour}:00\n${period}` : '';

        // Display format for hover
        const displayMinute = minute.toString().padStart(2, '0');
        const display = `${displayHour}:${displayMinute}${period}`;

        slots.push({ hour, minute, label, display });
      }
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();

  // Group bookings by day and team member
  const bookingsByDayAndMember: Record<
    string,
    Record<string, BookingWithLocalTimes[]>
  > = {};

  bookings.forEach((booking) => {
    const bookingDate = parseISO(booking.start_time_local);
    const dayKey = format(bookingDate, 'yyyy-MM-dd');
    const memberId = booking.team_member_id;

    if (memberId) {
      if (!bookingsByDayAndMember[dayKey]) {
        bookingsByDayAndMember[dayKey] = {};
      }
      if (!bookingsByDayAndMember[dayKey][memberId]) {
        bookingsByDayAndMember[dayKey][memberId] = [];
      }
      bookingsByDayAndMember[dayKey][memberId].push(booking);
    }
  });

  const getSlotKey = (slot: TimeSlot, date: Date, memberId: string) => {
    return `${format(date, 'yyyy-MM-dd')}-${slot.hour}-${
      slot.minute
    }-${memberId}`;
  };

  const handleSlotHover = (slot: TimeSlot, date: Date, memberId: string) => {
    setHoveredSlot(getSlotKey(slot, date, memberId));
  };

  const handleSlotLeave = () => {
    setHoveredSlot(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header with days and team members */}
      <div className="flex-none bg-gray-50 border-b overflow-x-auto">
        <div className="flex min-w-max">
          <div className="w-20 flex-none" />
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="flex-1 min-w-0">
              <div
                className={`
                  p-2 text-center border-l
                  ${isToday(day) ? 'bg-blue-50' : ''}
                `}
              >
                <div className="text-sm font-medium">{format(day, 'EEE')}</div>
                <div
                  className={`
                    text-lg font-bold
                    ${isToday(day) ? 'text-blue-600' : ''}
                  `}
                >
                  {format(day, 'd')}
                </div>
              </div>

              {/* Team members for this day */}
              <div className="flex border-t">
                {teamMembers.map((member) => (
                  <div
                    key={`${day.toISOString()}-${member.id}`}
                    className="flex-1 p-2 border-l text-center min-w-[120px]"
                  >
                    <div className="text-xs font-medium truncate">
                      {member.first_name} {member.last_name[0]}.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto relative">
        {/* Current time indicator for today's column */}
        {weekDays.some((day) => isToday(day)) && (
          <CurrentTimeIndicator
            startHour={5}
            endHour={22}
            pixelsPerMinute={20 / 15}
          />
        )}

        <div className="flex min-w-max">
          {/* Time labels column */}
          <div className="w-20 flex-none">
            {timeSlots.map((slot) => (
              <div
                key={`time-${slot.hour}-${slot.minute}`}
                className="relative"
                style={{ height: '20px' }}
              >
                {slot.label && (
                  <div className="absolute -top-3 right-2 text-xs text-gray-500 text-right whitespace-pre-line leading-tight">
                    {slot.label}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Days columns */}
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="flex-1 min-w-0 border-l">
              <div className="flex h-full">
                {teamMembers.map((member) => (
                  <div
                    key={`${day.toISOString()}-${member.id}-column`}
                    className="flex-1 min-w-[120px] border-l relative"
                  >
                    {/* Time slots for this day/member */}
                    {timeSlots.map((slot) => {
                      const slotKey = getSlotKey(slot, day, member.id);
                      const isHovered = hoveredSlot === slotKey;
                      const isOnHour = slot.minute === 0;

                      return (
                        <div
                          key={`${slot.hour}-${slot.minute}`}
                          className={`
                            relative cursor-default
                            ${
                              isOnHour
                                ? 'border-t border-gray-300'
                                : 'border-t border-gray-100'
                            }
                            hover:bg-blue-50 transition-colors
                          `}
                          style={{ height: '20px' }}
                          onMouseEnter={() =>
                            handleSlotHover(slot, day, member.id)
                          }
                          onMouseLeave={handleSlotLeave}
                        >
                          {/* Hover time tooltip */}
                          {isHovered && (
                            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                              <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium whitespace-nowrap shadow-lg">
                                {slot.display}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Bookings for this day/member */}
                    {(() => {
                      const dayKey = format(day, 'yyyy-MM-dd');
                      const memberBookings =
                        bookingsByDayAndMember[dayKey]?.[member.id] || [];

                      return memberBookings.map((booking) => {
                        const bookingDate = parseISO(booking.start_time_local);
                        const bookingHour = bookingDate.getHours();
                        const bookingMinute = bookingDate.getMinutes();

                        // Calculate position based on 15-minute slots (20px each)
                        const slotIndex = timeSlots.findIndex(
                          (slot) =>
                            slot.hour === bookingHour &&
                            slot.minute === bookingMinute
                        );

                        if (slotIndex === -1) return null;

                        const topPosition = slotIndex * 20;
                        const duration = booking.duration || 60; // default to 60 minutes
                        const height = (duration / 15) * 20; // 20px per 15 minutes

                        return (
                          <div
                            key={booking.id}
                            className="absolute left-1 right-1 z-10 pointer-events-auto"
                            style={{
                              top: `${topPosition}px`,
                              height: `${height}px`,
                            }}
                          >
                            <WeekViewBookingBlock booking={booking} />
                          </div>
                        );
                      });
                    })()}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Compact booking block for week view
function WeekViewBookingBlock({ booking }: { booking: BookingWithLocalTimes }) {
  const statusColors = {
    confirmed: 'bg-green-100 border-green-300 text-green-900',
    pending: 'bg-yellow-100 border-yellow-300 text-yellow-900',
    cancelled: 'bg-red-100 border-red-300 text-red-900',
    completed: 'bg-blue-100 border-blue-300 text-blue-900',
    no_show: 'bg-gray-100 border-gray-300 text-gray-900',
  };

  const bgColor = statusColors[booking.status] || statusColors.pending;

  return (
    <div
      className={`h-full rounded border ${bgColor} p-1 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer`}
      title={`${booking.client_first_name} ${booking.client_last_name} - ${
        booking.service_name || 'Service'
      }`}
    >
      <div className="text-xs font-medium truncate">
        {booking.client_first_name} {booking.client_last_name}.
      </div>
      {booking.duration && booking.duration >= 45 && (
        <div className="text-xs opacity-75 truncate">
          {format(parseISO(booking.start_time_local), 'h:mma')}
        </div>
      )}
    </div>
  );
}
