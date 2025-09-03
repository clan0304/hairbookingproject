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

  // Filter bookings for the selected date and group by team member
  const dayBookings = bookings.filter((booking) =>
    isSameDay(parseISO(booking.start_time_local), selectedDate)
  );

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
            <div key={member.id} className="flex-1 p-4 border-l text-center">
              {member.photo ? (
                <Image
                  src={member.photo}
                  alt={`${member.first_name} ${member.last_name}`}
                  className="w-16 h-16 rounded-full object-cover mx-auto mb-2"
                  width={64}
                  height={64}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg mx-auto mb-2">
                  {member.first_name[0]}
                  {member.last_name[0]}
                </div>
              )}
              <div className="text-sm font-medium">
                {member.first_name} {member.last_name}
              </div>
              {member.role && (
                <div className="text-xs text-gray-500 mt-1">{member.role}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto relative">
        <div className="relative min-h-full">
          {/* Current time indicator - only show if viewing today */}
          {isToday(selectedDate) && (
            <CurrentTimeIndicator
              startHour={5}
              endHour={22}
              pixelsPerMinute={20 / 15}
            />
          )}

          {/* Time slots */}
          {timeSlots.map((slot) => (
            <div
              key={`${slot.hour}-${slot.minute}`}
              className="flex"
              style={{ height: '20px' }}
            >
              {/* Time label */}
              <div className="w-20 flex-none px-2 text-xs text-gray-500 relative">
                {slot.label && (
                  <div className="absolute -top-3 right-2 text-right whitespace-pre-line leading-tight">
                    {slot.label}
                  </div>
                )}
              </div>

              {/* Team member columns */}
              {teamMembers.map((member) => {
                const slotKey = getSlotKey(slot, member.id);
                const isHovered = hoveredSlot === slotKey;
                const isOnHour = slot.minute === 0;

                return (
                  <div
                    key={`${slot.hour}-${slot.minute}-${member.id}`}
                    className={`
                      flex-1 border-l relative cursor-default
                      ${
                        isOnHour
                          ? 'border-t border-gray-300'
                          : 'border-t border-gray-100'
                      }
                      hover:bg-blue-50 transition-colors
                    `}
                    onMouseEnter={() => handleSlotHover(slot, member.id)}
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
            </div>
          ))}

          {/* Booking blocks overlay */}
          <div className="absolute inset-0 pointer-events-none">
            {teamMembers.map((member, memberIndex) => {
              const memberBookings = bookingsByMember[member.id] || [];
              const columnWidth =
                (100 - (80 / window.innerWidth) * 100) / teamMembers.length;
              const leftPosition =
                80 +
                memberIndex * ((window.innerWidth - 80) / teamMembers.length);

              return (
                <div
                  key={member.id}
                  className="absolute top-0 h-full"
                  style={{
                    left: `${leftPosition}px`,
                    width: `${columnWidth}%`,
                  }}
                >
                  {memberBookings.map((booking) => {
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
                        className="absolute left-1 right-1 pointer-events-auto"
                        style={{
                          top: `${topPosition}px`,
                          height: `${height}px`,
                        }}
                      >
                        <BookingBlockSimple booking={booking} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// Simplified booking block component
function BookingBlockSimple({ booking }: { booking: BookingWithLocalTimes }) {
  const startTime = format(parseISO(booking.start_time_local), 'h:mm a');
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
    >
      <div className="text-xs font-medium truncate">
        {booking.client_first_name} {booking.client_last_name}
      </div>
      <div className="text-xs opacity-75 truncate">
        {startTime} • {booking.service_name || 'Service'}
      </div>
    </div>
  );
}
