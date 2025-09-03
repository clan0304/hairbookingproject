// components/calendar/DayView.tsx
'use client';

import { useMemo } from 'react';
import { BookingBlock } from '@/components/calendar/BookingBlock';
import type { BookingWithLocalTimes, TeamMember } from '@/types/database';
import { format, parseISO, isSameDay } from 'date-fns';
import Image from 'next/image';

interface DayViewProps {
  bookings: BookingWithLocalTimes[];
  teamMembers: TeamMember[];
  selectedDate: Date;
}

export function DayView({ bookings, teamMembers, selectedDate }: DayViewProps) {
  // Generate time slots (e.g., 9 AM to 8 PM)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 9; hour < 20; hour++) {
      slots.push({
        hour,
        label: format(new Date().setHours(hour, 0, 0, 0), 'h:mm a'),
      });
    }
    return slots;
  }, []);

  // Group bookings by team member
  const bookingsByMember = useMemo(() => {
    const grouped: Record<string, BookingWithLocalTimes[]> = {};

    teamMembers.forEach((member) => {
      grouped[member.id] = [];
    });

    bookings.forEach((booking) => {
      const bookingDate = parseISO(booking.starts_at_local);
      if (
        isSameDay(bookingDate, selectedDate) &&
        grouped[booking.team_member_id]
      ) {
        grouped[booking.team_member_id].push(booking);
      }
    });

    return grouped;
  }, [bookings, teamMembers, selectedDate]);

  return (
    <div className="h-full flex flex-col">
      {/* Header with team member photos/names */}
      <div className="flex-none border-b bg-gray-50">
        <div className="flex">
          <div className="w-20 flex-none" />
          {teamMembers.map((member) => (
            <div
              key={member.id}
              className="flex-1 px-4 py-3 border-l flex flex-col items-center"
            >
              {member.photo ? (
                <Image
                  src={member.photo}
                  alt={`${member.first_name} ${member.last_name}`}
                  className="w-16 h-16 rounded-full object-cover mb-2"
                  width={16}
                  height={16}
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-lg mb-2">
                  {member.first_name[0]}
                  {member.last_name[0]}
                </div>
              )}
              <div className="text-sm font-medium text-center">
                {member.first_name} {member.last_name}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Time labels and grid lines */}
          {timeSlots.map((slot) => (
            <div
              key={slot.hour}
              className="flex border-b"
              style={{ height: '80px' }}
            >
              <div className="w-20 flex-none px-2 py-2 text-xs text-gray-500">
                {slot.label}
              </div>
              {teamMembers.map((member) => (
                <div
                  key={`${slot.hour}-${member.id}`}
                  className="flex-1 border-l relative"
                />
              ))}
            </div>
          ))}

          {/* Booking blocks */}
          {teamMembers.map((member, memberIndex) => {
            const memberBookings = bookingsByMember[member.id] || [];

            return (
              <div
                key={member.id}
                className="absolute top-0"
                style={{
                  left: `${
                    80 + (memberIndex * (100 - 80)) / teamMembers.length
                  }px`,
                  width: `${(100 - 80) / teamMembers.length}%`,
                }}
              >
                {memberBookings.map((booking) => (
                  <BookingBlock
                    key={booking.id}
                    booking={booking}
                    dayStartHour={9}
                    pixelsPerHour={80}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
