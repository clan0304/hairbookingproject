// components/calendar/WeekView.tsx
'use client';

import { format, startOfWeek, addDays, parseISO, isToday } from 'date-fns';
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
  // Generate 15-minute interval time slots from 6am to 9pm (matching DayView)
  const generateTimeSlots = (): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const startHour = 6;
    const endHour = 21;

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const period = hour >= 12 ? 'pm' : 'am';
        const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

        // Only show label on the hour
        const label = minute === 0 ? `${displayHour}:00 ${period}` : '';

        // Display format for hover
        const displayMinute = minute.toString().padStart(2, '0');
        const display = `${displayHour}:${displayMinute}${period}`;

        slots.push({ hour, minute, label, display });
      }
    }

    return slots;
  };

  const timeSlots = generateTimeSlots();
  const slotHeight = 20; // Height of each 15-minute slot in pixels (matching DayView)

  // Get the week dates
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 }); // Monday start
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group bookings by team member and date
  const bookingsByMemberAndDate: Record<
    string,
    Record<string, BookingWithLocalTimes[]>
  > = {};

  teamMembers.forEach((member) => {
    bookingsByMemberAndDate[member.id] = {};
    weekDates.forEach((date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      bookingsByMemberAndDate[member.id][dateKey] = [];
    });
  });

  bookings.forEach((booking) => {
    const memberId = booking.team_member_id;
    if (memberId && bookingsByMemberAndDate[memberId]) {
      const bookingDate = booking.booking_date_local || booking.starts_at_local;
      if (bookingDate) {
        const parsedDate =
          typeof bookingDate === 'string' ? parseISO(bookingDate) : bookingDate;
        const dateKey = format(parsedDate, 'yyyy-MM-dd');

        if (bookingsByMemberAndDate[memberId][dateKey]) {
          bookingsByMemberAndDate[memberId][dateKey].push(booking);
        }
      }
    }
  });

  return (
    <div className="h-full flex flex-col">
      {/* Header with days and team members */}
      <div className="flex-none bg-gray-50 border-b">
        <div className="flex">
          {/* Time column header */}
          <div className="w-20 flex-none border-r p-2 text-center">
            <div className="text-xs font-medium text-gray-600">Time</div>
          </div>

          {/* Day columns */}
          {weekDates.map((date) => (
            <div key={date.toISOString()} className="flex-1 border-r">
              <div className="p-2 text-center border-b bg-white">
                <div
                  className={`text-sm font-medium ${
                    isToday(date) ? 'text-blue-600' : 'text-gray-900'
                  }`}
                >
                  {format(date, 'EEE')}
                </div>
                <div
                  className={`text-lg ${
                    isToday(date) ? 'text-blue-600 font-bold' : 'text-gray-700'
                  }`}
                >
                  {format(date, 'd')}
                </div>
              </div>

              {/* Team member headers for each day */}
              <div className="flex">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex-1 p-1 text-center border-r last:border-r-0"
                    style={{ minWidth: `${100 / teamMembers.length}px` }}
                  >
                    <div className="text-xs font-medium text-gray-700 truncate">
                      {member.first_name} {member.last_name[0]}.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time grid with bookings */}
      <div className="flex-1 overflow-auto">
        <div className="flex">
          {/* Time column */}
          <div className="w-20 flex-none">
            {timeSlots.map((slot, index) => (
              <div
                key={`time-${index}`}
                className="border-b border-r border-gray-200 text-right pr-2 text-xs text-gray-600"
                style={{
                  height: `${slotHeight}px`,
                  lineHeight: `${slotHeight}px`,
                }}
              >
                {slot.label}
              </div>
            ))}
          </div>

          {/* Day columns with team member sub-columns */}
          {weekDates.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd');
            const showCurrentTime = isToday(date);

            return (
              <div
                key={date.toISOString()}
                className="flex-1 flex border-r relative"
              >
                {teamMembers.map((member, memberIndex) => {
                  const memberBookings =
                    bookingsByMemberAndDate[member.id]?.[dateKey] || [];

                  return (
                    <div
                      key={member.id}
                      className={`flex-1 relative ${
                        memberIndex > 0 ? 'border-l' : ''
                      }`}
                      style={{ minWidth: `${100 / teamMembers.length}px` }}
                    >
                      {/* Background grid */}
                      {timeSlots.map((slot, index) => {
                        const isHourMark = slot.minute === 0;

                        return (
                          <div
                            key={`slot-${index}`}
                            className={`border-b ${
                              isHourMark ? 'border-gray-300' : 'border-gray-200'
                            }`}
                            style={{ height: `${slotHeight}px` }}
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
                          const duration = booking.duration || 60;
                          const height = (duration / 15) * slotHeight;

                          return (
                            <div
                              key={booking.id}
                              className="absolute left-0.5 right-0.5 pointer-events-auto"
                              style={{
                                top: `${topPosition}px`,
                                height: `${height - 1}px`, // Subtract 1px for spacing
                              }}
                            >
                              <WeekViewBookingBlock booking={booking} />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Current time indicator for today */}
                {showCurrentTime && timeSlots && timeSlots.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    <CurrentTimeIndicator
                      timeSlots={timeSlots}
                      slotHeight={slotHeight}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Compact booking block for week view
function WeekViewBookingBlock({ booking }: { booking: BookingWithLocalTimes }) {
  const startTime = booking.start_time_local
    ? format(parseISO(`2024-01-01T${booking.start_time_local}`), 'h:mm')
    : '';

  const statusColors = {
    confirmed:
      'bg-green-100 border-green-400 text-green-900 hover:bg-green-200',
    completed: 'bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200',
    cancelled: 'bg-red-100 border-red-400 text-red-900 hover:bg-red-200',
    no_show: 'bg-gray-100 border-gray-400 text-gray-900 hover:bg-gray-200',
    pending:
      'bg-yellow-100 border-yellow-400 text-yellow-900 hover:bg-yellow-200',
  };

  const bgColor = statusColors[booking.status] || statusColors.confirmed;
  const categoryColor = booking.category_color || '#6B7280';

  // Determine what to show based on duration
  const showTime = booking.duration >= 30;
  const showService = booking.duration >= 45;

  return (
    <div
      className={`h-full rounded border ${bgColor} px-0.5 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden relative group`}
      title={`${booking.client_first_name} ${booking.client_last_name}
${booking.service_name}${
        booking.variant_name ? ` - ${booking.variant_name}` : ''
      }
${startTime} (${booking.duration} min)
${booking.booking_note ? `Note: ${booking.booking_note}` : ''}`}
      style={{
        borderLeftWidth: '2px',
        borderLeftColor: categoryColor,
        fontSize: '10px',
      }}
    >
      {/* Minimal display for small slots */}
      <div className="text-[10px] leading-tight">
        <div className="font-semibold truncate">
          {booking.client_first_name} {booking.client_last_name?.charAt(0)}.
        </div>
        {showTime && <div className="opacity-75 truncate">{startTime}</div>}
        {showService && (
          <div className="opacity-60 truncate">{booking.service_name}</div>
        )}
      </div>

      {/* Hover overlay with full details */}
      <div className="absolute inset-0 bg-black/85 text-white p-1 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center text-[10px] leading-tight">
        <div className="font-semibold">
          {booking.client_first_name} {booking.client_last_name}
        </div>
        <div>{booking.service_name}</div>
        {booking.variant_name && (
          <div className="text-[9px]">({booking.variant_name})</div>
        )}
        <div className="mt-0.5">
          {startTime} • {booking.duration}min
        </div>
        {booking.client_phone && (
          <div className="text-[9px]">📞 {booking.client_phone}</div>
        )}
        <div className="mt-0.5">💰 ${booking.price}</div>
        {booking.booking_note && (
          <div className="text-[9px] italic mt-0.5">
            Note: {booking.booking_note}
          </div>
        )}
      </div>
    </div>
  );
}
