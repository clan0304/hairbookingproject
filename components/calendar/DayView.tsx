// components/calendar/DayView.tsx
'use client';

import { useState } from 'react';
import { format, parseISO, isSameDay, isToday } from 'date-fns';
import type { BookingWithLocalTimes, TeamMember } from '@/types/database';
import { CurrentTimeIndicator } from './CurrentTimeIndicator';
import Image from 'next/image';

interface DayViewProps {
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

export function DayView({ bookings, teamMembers, selectedDate }: DayViewProps) {
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);

  // Generate 15-minute interval time slots from 6am to 9pm
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 6;
    const endHour = 21;

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
  const slotHeight = 20; // Height of each 15-minute slot in pixels

  // Filter bookings for the selected date and group by team member
  const dayBookings = bookings.filter((booking) => {
    const bookingDate = booking.booking_date_local || booking.starts_at_local;
    if (!bookingDate) return false;

    const parsedDate =
      typeof bookingDate === 'string' ? parseISO(bookingDate) : bookingDate;
    return isSameDay(parsedDate, selectedDate);
  });

  const bookingsByMember: Record<string, BookingWithLocalTimes[]> = {};
  dayBookings.forEach((booking) => {
    const memberId = booking.team_member_id;
    if (memberId) {
      if (!bookingsByMember[memberId]) {
        bookingsByMember[memberId] = [];
      }
      bookingsByMember[memberId].push(booking);
    }
  });

  const getSlotKey = (slot: TimeSlot, memberId: string) => {
    return `${slot.hour}-${slot.minute}-${memberId}`;
  };

  const handleSlotHover = (slot: TimeSlot, memberId: string) => {
    setHoveredSlot(getSlotKey(slot, memberId));
  };

  const handleSlotLeave = () => {
    setHoveredSlot(null);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Team member headers */}
      <div className="flex-none bg-gray-50 border-b">
        <div className="flex">
          <div className="w-20 flex-none" />
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex-1 p-4 border-l text-center min-w-[180px]"
            >
              {member.photo ? (
                <div className="flex flex-col items-center">
                  <Image
                    src={member.photo}
                    alt={`${member.first_name} ${member.last_name}`}
                    width={40}
                    height={40}
                    className="rounded-full mb-1"
                  />
                  <div className="text-sm font-medium">
                    {member.first_name} {member.last_name}
                  </div>
                  <div className="text-xs text-gray-500">{member.role}</div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-purple-500 text-white flex items-center justify-center mb-1">
                    {member.first_name[0]}
                    {member.last_name[0]}
                  </div>
                  <div className="text-sm font-medium">
                    {member.first_name} {member.last_name}
                  </div>
                  <div className="text-xs text-gray-500">{member.role}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex relative">
          {/* Time column */}
          <div className="w-20 flex-none">
            {timeSlots.map((slot, index) => (
              <div
                key={`time-${index}`}
                className="border-b border-gray-200 text-right pr-2 text-xs text-gray-600"
                style={{
                  height: `${slotHeight}px`,
                  lineHeight: `${slotHeight}px`,
                }}
              >
                {slot.label}
              </div>
            ))}
          </div>

          {/* Team member columns */}
          {teamMembers.map((member) => {
            const memberBookings = bookingsByMember[member.id] || [];

            return (
              <div
                key={member.id}
                className="flex-1 relative border-l min-w-[180px]"
              >
                {/* Background grid */}
                {timeSlots.map((slot, index) => {
                  const isHovered = hoveredSlot === getSlotKey(slot, member.id);
                  const isHourMark = slot.minute === 0;

                  return (
                    <div
                      key={`slot-${index}`}
                      className={`border-b ${
                        isHourMark ? 'border-gray-300' : 'border-gray-200'
                      } ${isHovered ? 'bg-gray-50' : ''}`}
                      style={{ height: `${slotHeight}px` }}
                      onMouseEnter={() => handleSlotHover(slot, member.id)}
                      onMouseLeave={handleSlotLeave}
                      title={slot.display}
                    />
                  );
                })}

                {/* Bookings overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {memberBookings.map((booking) => {
                    // Parse the booking start time
                    const startTimeStr = booking.start_time_local;
                    if (!startTimeStr) return null;

                    // Parse time string (HH:MM:SS format)
                    const [hourStr, minuteStr] = startTimeStr.split(':');
                    const bookingHour = parseInt(hourStr, 10);
                    const bookingMinute = parseInt(minuteStr, 10);

                    // Find the corresponding slot index
                    const slotIndex = timeSlots.findIndex(
                      (slot) =>
                        slot.hour === bookingHour &&
                        slot.minute === bookingMinute
                    );

                    if (slotIndex === -1) {
                      console.warn(
                        `No slot found for booking at ${startTimeStr}`,
                        booking
                      );
                      return null;
                    }

                    // Calculate position and height
                    const topPosition = slotIndex * slotHeight;
                    const duration = booking.duration || 60; // default to 60 minutes
                    const height = (duration / 15) * slotHeight; // 15 minutes per slot

                    return (
                      <div
                        key={booking.id}
                        className="absolute left-1 right-1 pointer-events-auto"
                        style={{
                          top: `${topPosition}px`,
                          height: `${height - 2}px`, // Subtract 2px for spacing
                        }}
                      >
                        <BookingBlock booking={booking} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Current time indicator - positioned over the entire grid */}
        {isToday(selectedDate) && timeSlots && timeSlots.length > 0 && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ left: '80px' }}
          >
            <CurrentTimeIndicator
              timeSlots={timeSlots}
              slotHeight={slotHeight}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// Booking block component
function BookingBlock({ booking }: { booking: BookingWithLocalTimes }) {
  const startTime = booking.start_time_local
    ? format(parseISO(`2024-01-01T${booking.start_time_local}`), 'h:mm a')
    : '';

  const statusColors = {
    confirmed:
      'bg-green-100 border-green-300 text-green-900 hover:bg-green-200',
    pending:
      'bg-yellow-100 border-yellow-300 text-yellow-900 hover:bg-yellow-200',
    cancelled: 'bg-red-100 border-red-300 text-red-900 hover:bg-red-200',
    completed: 'bg-blue-100 border-blue-300 text-blue-900 hover:bg-blue-200',
    no_show: 'bg-gray-100 border-gray-300 text-gray-900 hover:bg-gray-200',
  };

  const bgColor = statusColors[booking.status] || statusColors.confirmed;

  // Use category color as left border
  const categoryColor = booking.category_color || '#6B7280';

  return (
    <div
      className={`h-full rounded-md border ${bgColor} p-1.5 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden relative`}
      title={`${booking.client_first_name} ${booking.client_last_name} - ${booking.service_name}`}
      style={{
        borderLeftWidth: '3px',
        borderLeftColor: categoryColor,
      }}
    >
      <div className="text-xs">
        <div className="font-semibold truncate">
          {booking.client_first_name} {booking.client_last_name?.charAt(0)}.
        </div>
        <div className="opacity-75 truncate">{startTime}</div>
        {booking.duration >= 30 && (
          <div className="opacity-75 truncate text-[10px]">
            {booking.service_name}
            {booking.variant_name && ` - ${booking.variant_name}`}
          </div>
        )}
        {booking.duration >= 60 && booking.booking_note && (
          <div className="opacity-60 truncate text-[10px] italic">
            Note: {booking.booking_note}
          </div>
        )}
      </div>
    </div>
  );
}
