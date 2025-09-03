// components/calendar/WeekView.tsx
'use client';

import { useMemo } from 'react';
import { BookingBlock } from '@/components/calendar/BookingBlock';
import type { BookingWithLocalTimes, TeamMember } from '@/types/database';
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  parseISO,
} from 'date-fns';

interface WeekViewProps {
  bookings: BookingWithLocalTimes[];
  teamMembers: TeamMember[];
  selectedDate: Date;
}

export function WeekView({
  bookings,
  teamMembers,
  selectedDate,
}: WeekViewProps) {
  const weekDays = useMemo(() => {
    const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
    const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [selectedDate]);

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

  // Group bookings by day and team member
  const bookingsByDayAndMember = useMemo(() => {
    const grouped: Record<string, Record<string, BookingWithLocalTimes[]>> = {};

    weekDays.forEach((day) => {
      const dayKey = format(day, 'yyyy-MM-dd');
      grouped[dayKey] = {};
      teamMembers.forEach((member) => {
        grouped[dayKey][member.id] = [];
      });
    });

    bookings.forEach((booking) => {
      const bookingDate = parseISO(booking.starts_at_local);
      const dayKey = format(bookingDate, 'yyyy-MM-dd');

      if (grouped[dayKey] && grouped[dayKey][booking.team_member_id]) {
        grouped[dayKey][booking.team_member_id].push(booking);
      }
    });

    return grouped;
  }, [bookings, teamMembers, weekDays]);

  // Calculate column width
  const totalColumns = weekDays.length * teamMembers.length;
  const columnWidth = `${(100 - 10) / totalColumns}%`; // 10% for time column

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-none border-b bg-gray-50">
        <div className="flex">
          <div className="w-20 flex-none" />
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="flex-1 border-l">
              <div className="text-center py-2 text-sm font-medium">
                {format(day, 'EEE')}
              </div>
              <div className="text-center pb-2 text-xs text-gray-500">
                {format(day, 'MMM d')}
              </div>
              <div className="flex">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex-1 px-1 py-1 border-l first:border-l-0"
                  >
                    <div className="text-xs text-center truncate">
                      {member.first_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid */}
      <div className="flex-1 overflow-y-auto">
        <div className="relative">
          {/* Time slots */}
          {timeSlots.map((slot) => (
            <div
              key={slot.hour}
              className="flex border-b"
              style={{ height: '60px' }}
            >
              <div className="w-20 flex-none px-2 py-1 text-xs text-gray-500">
                {slot.label}
              </div>
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="flex-1 flex border-l">
                  {teamMembers.map((member, idx) => (
                    <div
                      key={member.id}
                      className={`flex-1 relative ${idx > 0 ? 'border-l' : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          ))}

          {/* Booking blocks */}
          {weekDays.map((day, dayIndex) => {
            const dayKey = format(day, 'yyyy-MM-dd');
            return teamMembers.map((member, memberIndex) => {
              const memberBookings =
                bookingsByDayAndMember[dayKey]?.[member.id] || [];
              const columnIndex = dayIndex * teamMembers.length + memberIndex;

              return (
                <div
                  key={`${dayKey}-${member.id}`}
                  className="absolute top-0"
                  style={{
                    left: `calc(80px + ${
                      columnIndex * parseFloat(columnWidth)
                    }%)`,
                    width: columnWidth,
                  }}
                >
                  {memberBookings.map((booking) => (
                    <BookingBlock
                      key={booking.id}
                      booking={booking}
                      dayStartHour={9}
                      pixelsPerHour={60}
                      isCompact
                    />
                  ))}
                </div>
              );
            });
          })}
        </div>
      </div>
    </div>
  );
}
