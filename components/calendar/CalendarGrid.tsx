// components/calendar/CalendarGrid.tsx
'use client';

import { useState, useMemo, useCallback } from 'react';
import { format, addDays, isSameDay, startOfWeek, parse } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookingCard } from './BookingCard';
import { toast } from 'sonner';
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
  onBookingUpdate?: () => void;
}

// Time slots from 6:00 AM to 10:00 PM (16 hours) - NOW IN 15-MINUTE INTERVALS
const TIME_SLOTS = Array.from({ length: 65 }, (_, i) => {
  const hour = Math.floor(i / 4) + 6;
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, '0')}:${minute
    .toString()
    .padStart(2, '0')}`;
});

const SLOT_HEIGHT = 15; // Height of each 15-minute slot in pixels (reduced from 30)
const HEADER_HEIGHT = 120; // Height of the header section
const TIME_COLUMN_WIDTH = 80; // Width of the time column
const MINUTES_PER_SLOT = 15; // 15 minutes per slot (changed from 30)

export function CalendarGrid({
  currentDate,
  viewMode,
  teamMembers,
  bookings,
  loading,
  onBookingUpdate,
}: CalendarGridProps) {
  const [draggedBooking, setDraggedBooking] =
    useState<BookingWithDetails | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{
    teamMemberId: string;
    date: string;
    time: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [hoveredSlot, setHoveredSlot] = useState<{
    time: string;
    columnId: string; // Will be teamMemberId for day view, date for week view
  } | null>(null);

  // Calculate week days for week view
  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return [];
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [currentDate, viewMode]);

  // Group bookings by team member and date
  const bookingsByMemberAndDate = useMemo(() => {
    const grouped: Record<string, BookingWithDetails[]> = {};

    bookings.forEach((booking) => {
      const key =
        viewMode === 'day'
          ? booking.team_member_id
          : `${booking.booking_date}-${booking.team_member_id}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(booking);
    });

    return grouped;
  }, [bookings, viewMode]);

  // Calculate booking position and height
  const getBookingStyle = useCallback((booking: BookingWithDetails) => {
    // Parse the start time
    const [hours, minutes] = (booking.start_time || '00:00')
      .split(':')
      .map(Number);
    const startMinutes = hours * 60 + minutes;

    // Convert to slot index (each slot is 15 minutes)
    const startSlotIndex = Math.floor(
      (startMinutes - 6 * 60) / MINUTES_PER_SLOT
    );

    // Calculate height based on duration
    const durationSlots = Math.ceil(booking.duration / MINUTES_PER_SLOT);

    return {
      top: `${startSlotIndex * SLOT_HEIGHT}px`,
      height: `${durationSlots * SLOT_HEIGHT - 2}px`, // -2 for border
      left: '2px',
      right: '2px',
    };
  }, []);

  // Drag and drop handlers
  const handleDragStart = useCallback((booking: BookingWithDetails) => {
    setDraggedBooking(booking);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedBooking(null);
    setDragOverSlot(null);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, teamMemberId: string, date: Date, time: string) => {
      e.preventDefault();
      if (!draggedBooking) return;

      setDragOverSlot({
        teamMemberId,
        date: format(date, 'yyyy-MM-dd'),
        time,
      });
    },
    [draggedBooking]
  );

  const handleDrop = useCallback(
    async (
      e: React.DragEvent,
      teamMemberId: string,
      date: Date,
      time: string
    ) => {
      e.preventDefault();
      if (!draggedBooking || isUpdating) return;

      setIsUpdating(true);

      try {
        // Calculate new booking details
        const newDate = format(date, 'yyyy-MM-dd');
        const newStartTime = time;

        // Update booking via API
        const response = await fetch(
          `/api/admin/bookings/${draggedBooking.id}/reschedule`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              team_member_id: teamMemberId,
              booking_date: newDate,
              start_time: newStartTime,
            }),
          }
        );

        if (!response.ok) {
          throw new Error('Failed to reschedule booking');
        }

        toast.success('Booking rescheduled successfully');
        if (onBookingUpdate) {
          onBookingUpdate();
        }
      } catch (error) {
        console.error('Error rescheduling booking:', error);
        toast.error('Failed to reschedule booking');
      } finally {
        setIsUpdating(false);
        setDraggedBooking(null);
        setDragOverSlot(null);
      }
    },
    [draggedBooking, isUpdating, onBookingUpdate]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      {/* Header */}
      <div
        className="grid bg-gray-50 border-b"
        style={{
          gridTemplateColumns:
            viewMode === 'day'
              ? `${TIME_COLUMN_WIDTH}px repeat(${teamMembers.length}, 1fr)`
              : `${TIME_COLUMN_WIDTH}px repeat(7, 1fr)`,
          height: `${HEADER_HEIGHT}px`,
        }}
      >
        {/* Time header */}
        <div className="border-r p-4">
          <span className="text-sm font-medium text-gray-700">Time</span>
        </div>

        {/* Column headers */}
        {viewMode === 'day'
          ? // Day view - show team members
            teamMembers.map((member) => (
              <div
                key={member.id}
                className="border-r p-4 flex flex-col items-center justify-center"
              >
                <Avatar className="h-12 w-12 mb-2">
                  <AvatarImage src={member.photo || undefined} />
                  <AvatarFallback>
                    {member.first_name[0]}
                    {member.last_name?.[0] || ''}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <div className="font-medium text-sm">
                    {member.first_name} {member.last_name}
                  </div>
                  <div className="text-xs text-gray-500">{member.role}</div>
                </div>
              </div>
            ))
          : // Week view - show days
            weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={`border-r p-4 text-center ${
                  isSameDay(day, new Date()) ? 'bg-blue-50' : ''
                }`}
              >
                <div className="font-medium text-sm">{format(day, 'EEE')}</div>
                <div className="text-2xl font-bold">{format(day, 'd')}</div>
                <div className="text-xs text-gray-500">
                  {format(day, 'MMM')}
                </div>
              </div>
            ))}
      </div>

      {/* Grid */}
      <div
        className="relative"
        style={{
          height: `${TIME_SLOTS.length * SLOT_HEIGHT}px`,
        }}
      >
        {/* Time column */}
        <div
          className="absolute left-0 top-0 bg-white border-r z-10"
          style={{ width: `${TIME_COLUMN_WIDTH}px` }}
        >
          {TIME_SLOTS.map((time, index) => (
            <div
              key={time}
              className={`text-xs text-gray-500 pr-2 text-right border-t ${
                index % 4 === 0 ? 'border-gray-300' : 'border-gray-200'
              }`}
              style={{ height: `${SLOT_HEIGHT}px` }}
            >
              {/* Only show time labels on the hour for cleaner display */}
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
            {TIME_SLOTS.map((time, index) => (
              <div
                key={time}
                className={`border-t ${
                  index % 4 === 0 ? 'border-gray-300' : 'border-gray-200'
                }`}
                style={{ height: `${SLOT_HEIGHT}px` }}
              />
            ))}
          </div>

          {/* Vertical lines - NEW SECTION */}
          <div className="absolute inset-0 flex pointer-events-none z-10">
            {viewMode === 'day'
              ? teamMembers.map((_, index) => (
                  <div
                    key={`line-${index}`}
                    className="flex-1 border-r border-gray-300"
                    style={{
                      borderRightWidth:
                        index === teamMembers.length - 1 ? 0 : 1,
                    }}
                  />
                ))
              : Array.from({ length: 7 }, (_, index) => (
                  <div
                    key={`line-${index}`}
                    className="flex-1 border-r border-gray-300"
                    style={{ borderRightWidth: index === 6 ? 0 : 1 }}
                  />
                ))}
          </div>

          {/* Columns with drop zones */}
          <div className="flex h-full relative">
            {viewMode === 'day'
              ? // Day view - columns are team members
                teamMembers.map((member, index) => (
                  <div
                    key={member.id}
                    className="flex-1 relative"
                    style={{
                      borderRight:
                        index < teamMembers.length - 1
                          ? '1px solid #d1d5db'
                          : 'none',
                    }}
                  >
                    {/* Drop zones */}
                    {TIME_SLOTS.map((time, index) => (
                      <div
                        key={`${member.id}-${time}`}
                        className={`absolute w-full ${
                          hoveredSlot?.time === time &&
                          hoveredSlot?.columnId === member.id
                            ? 'bg-gray-100'
                            : ''
                        } ${
                          dragOverSlot?.teamMemberId === member.id &&
                          dragOverSlot?.time === time
                            ? 'bg-blue-100'
                            : ''
                        }`}
                        style={{
                          height: `${SLOT_HEIGHT}px`,
                          top: `${index * SLOT_HEIGHT}px`,
                        }}
                        onMouseEnter={() =>
                          setHoveredSlot({
                            time,
                            columnId: member.id,
                          })
                        }
                        onMouseLeave={() => setHoveredSlot(null)}
                        onDragOver={(e) =>
                          handleDragOver(e, member.id, currentDate, time)
                        }
                        onDrop={(e) =>
                          handleDrop(e, member.id, currentDate, time)
                        }
                      >
                        {/* Show time on hover */}
                        {hoveredSlot?.time === time &&
                          hoveredSlot?.columnId === member.id && (
                            <span className="absolute left-2 top-0 text-xs text-blue-600 font-medium">
                              {format(
                                parse(time, 'HH:mm', new Date()),
                                'h:mm a'
                              )}
                            </span>
                          )}
                      </div>
                    ))}

                    {/* Bookings */}
                    {bookingsByMemberAndDate[member.id]?.map((booking) => (
                      <div
                        key={booking.id}
                        className="absolute z-20"
                        style={getBookingStyle(booking)}
                      >
                        <BookingCard
                          booking={booking}
                          onDragStart={handleDragStart}
                          onDragEnd={handleDragEnd}
                          isDragging={draggedBooking?.id === booking.id}
                        />
                      </div>
                    ))}
                  </div>
                ))
              : // Week view - columns are days
                weekDays.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  return (
                    <div key={dateStr} className="flex-1 relative">
                      {/* Drop zones for each team member */}
                      {teamMembers.map((member) => (
                        <div key={member.id} className="relative">
                          {TIME_SLOTS.map((time, index) => (
                            <div
                              key={`${dateStr}-${member.id}-${time}`}
                              className={`absolute w-full ${
                                hoveredSlot?.time === time &&
                                hoveredSlot?.columnId === dateStr
                                  ? 'bg-gray-100'
                                  : ''
                              } ${
                                dragOverSlot?.teamMemberId === member.id &&
                                dragOverSlot?.date === dateStr &&
                                dragOverSlot?.time === time
                                  ? 'bg-blue-100'
                                  : ''
                              }`}
                              style={{
                                height: `${SLOT_HEIGHT}px`,
                                top: `${index * SLOT_HEIGHT}px`,
                              }}
                              onMouseEnter={() =>
                                setHoveredSlot({
                                  time,
                                  columnId: dateStr,
                                })
                              }
                              onMouseLeave={() => setHoveredSlot(null)}
                              onDragOver={(e) =>
                                handleDragOver(e, member.id, day, time)
                              }
                              onDrop={(e) =>
                                handleDrop(e, member.id, day, time)
                              }
                            >
                              {/* Show time on hover */}
                              {hoveredSlot?.time === time &&
                                hoveredSlot?.columnId === dateStr && (
                                  <span className="absolute left-2 top-0 text-xs text-blue-600 font-medium">
                                    {format(
                                      parse(time, 'HH:mm', new Date()),
                                      'h:mm a'
                                    )}
                                  </span>
                                )}
                            </div>
                          ))}

                          {/* Bookings for this day and member */}
                          {bookingsByMemberAndDate[
                            `${dateStr}-${member.id}`
                          ]?.map((booking) => (
                            <div
                              key={booking.id}
                              className="absolute z-20"
                              style={getBookingStyle(booking)}
                            >
                              <BookingCard
                                booking={booking}
                                compact={true}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                isDragging={draggedBooking?.id === booking.id}
                              />
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
