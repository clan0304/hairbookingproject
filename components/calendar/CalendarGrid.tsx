// components/calendar/CalendarGrid.tsx
'use client';

import { useState, useMemo, useCallback, useRef } from 'react';
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
    teamMemberId?: string;
    date?: string;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

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
    const top = (minutesFrom6AM / MINUTES_PER_SLOT) * SLOT_HEIGHT;

    // Calculate height based on duration
    const height = Math.max(
      SLOT_HEIGHT - 2,
      (booking.duration / MINUTES_PER_SLOT) * SLOT_HEIGHT - 2
    );

    return {
      top: `${top}px`,
      height: `${height}px`,
      left: '4px',
      right: '4px',
      position: 'absolute' as const,
    };
  };

  // Calculate time from mouse position
  const calculateTimeFromPosition = useCallback(
    (e: React.DragEvent, containerElement: HTMLElement) => {
      const rect = containerElement.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;

      // Calculate which time slot based on position
      const slotIndex = Math.floor(relativeY / SLOT_HEIGHT);
      const clampedIndex = Math.max(
        0,
        Math.min(TIME_SLOTS.length - 1, slotIndex)
      );

      return TIME_SLOTS[clampedIndex];
    },
    []
  );

  // Get team member and date from position
  const getDropTargetFromPosition = useCallback(
    (e: React.DragEvent) => {
      const dropTarget = e.currentTarget as HTMLElement;
      const teamMemberId = dropTarget.getAttribute('data-member-id');
      const date = dropTarget.getAttribute('data-date');

      if (!teamMemberId || !date) return null;

      // Calculate the time based on mouse position
      const time = calculateTimeFromPosition(e, dropTarget);

      return {
        teamMemberId,
        date,
        time,
      };
    },
    [calculateTimeFromPosition]
  );

  // Handle mouse move for hover effect
  const handleMouseMove = useCallback(
    (e: React.MouseEvent, teamMemberId?: string, date?: string) => {
      const target = e.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;

      // Calculate which time slot based on mouse position
      const slotIndex = Math.floor(relativeY / SLOT_HEIGHT);
      if (slotIndex >= 0 && slotIndex < TIME_SLOTS.length) {
        setHoveredSlot({
          time: TIME_SLOTS[slotIndex],
          teamMemberId,
          date,
        });
      }
    },
    []
  );

  // Handle mouse leave
  const handleMouseLeaveGrid = useCallback(() => {
    setHoveredSlot(null);
  }, []);

  // Handle drag start
  const handleDragStart = useCallback((booking: BookingWithDetails) => {
    setDraggedBooking(booking);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedBooking(null);
    setDragOverSlot(null);
  }, []);

  // Handle drag over
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const dropTarget = getDropTargetFromPosition(e);
      if (dropTarget) {
        setDragOverSlot(dropTarget);
      }
    },
    [getDropTargetFromPosition]
  );

  // Handle drag leave
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if we're leaving the entire drop zone
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverSlot(null);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();

      if (!draggedBooking || isUpdating) return;

      const dropTarget = getDropTargetFromPosition(e);
      if (!dropTarget) return;

      setIsUpdating(true);
      setDragOverSlot(null);

      try {
        const { teamMemberId, date, time } = dropTarget;

        // Parse the time
        const [hours, minutes] = time.split(':');
        const startTime = `${hours}:${minutes}`;

        // Calculate end time based on duration
        const totalMinutes =
          parseInt(hours) * 60 + parseInt(minutes) + draggedBooking.duration;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes
          .toString()
          .padStart(2, '0')}`;

        // Check if end time goes past 10 PM (22:00)
        if (endHours >= 22) {
          toast.error('Booking would extend past closing time (10:00 PM)');
          return;
        }

        // Prepare update data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
          date: date,
          start_time: startTime,
          end_time: endTime,
          duration: draggedBooking.duration,
        };

        // Add team member if different
        if (teamMemberId !== draggedBooking.team_member_id) {
          updateData.team_member_id = teamMemberId;
        }

        // Call API to update booking
        const response = await fetch(
          `/api/admin/calendar/${draggedBooking.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(updateData),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          if (result.conflicts) {
            toast.error(
              `Time slot conflicts with booking(s): ${result.conflicts.join(
                ', '
              )}`
            );
          } else {
            toast.error(result.error || 'Failed to update booking');
          }
          return;
        }

        toast.success('Booking updated successfully');

        // Refresh bookings
        if (onBookingUpdate) {
          onBookingUpdate();
        }
      } catch (error) {
        console.error('Error updating booking:', error);
        toast.error('Failed to update booking');
      } finally {
        setIsUpdating(false);
        setDraggedBooking(null);
      }
    },
    [draggedBooking, isUpdating, onBookingUpdate, getDropTargetFromPosition]
  );

  // Column width calculation
  const columnWidth =
    viewMode === 'day'
      ? `${100 / teamMembers.length}%`
      : `${100 / (displayDates.length * teamMembers.length)}%`;

  return (
    <div className="relative h-full overflow-auto" ref={gridRef}>
      {/* Hover time tooltip */}
      {hoveredSlot && (
        <div
          className="fixed z-50 bg-gray-900 text-white text-xs px-2 py-1 rounded pointer-events-none"
          style={{
            left: `${
              gridRef.current
                ?.querySelector(
                  `[data-member-id="${hoveredSlot.teamMemberId}"]`
                )
                ?.getBoundingClientRect().left || 0
            }px`,
            top: `${gridRef.current?.getBoundingClientRect().top || 0}px`,
            transform: 'translate(-50%, -100%)',
            marginTop: `-5px`,
          }}
        >
          {format(parse(hoveredSlot.time, 'HH:mm', new Date()), 'h:mm a')}
        </div>
      )}

      {/* Header section */}
      <div className="sticky top-0 z-20 bg-white border-b">
        {/* Date headers */}
        <div className="flex" style={{ marginLeft: `${TIME_COLUMN_WIDTH}px` }}>
          {viewMode === 'day' ? (
            // Day view - single date with team members
            <div className="flex-1">
              <div className="border-b px-4 py-2 text-center bg-gray-50">
                <p className="font-semibold text-lg">
                  {format(currentDate, 'EEEE')}
                </p>
                <p className="text-sm text-gray-600">
                  {format(currentDate, 'MMMM d, yyyy')}
                </p>
              </div>
              <div className="flex">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex-1 border-r last:border-r-0 py-2"
                  >
                    <div className="flex flex-col items-center">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={member.photo || undefined} />
                        <AvatarFallback>{member.first_name[0]}</AvatarFallback>
                      </Avatar>
                      <p className="text-sm font-medium mt-1">
                        {member.first_name}
                      </p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Week view - multiple dates with team members
            <div className="flex flex-1">
              {displayDates.map((date) => (
                <div
                  key={date.toString()}
                  className="flex-1 border-r last:border-r-0"
                >
                  <div className="border-b px-2 py-2 text-center">
                    <p className="font-semibold">{format(date, 'EEE')}</p>
                    <p className="text-sm text-gray-600">
                      {format(date, 'MMM d')}
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
                            <AvatarImage src={member.photo || undefined} />
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
              ))}
            </div>
          )}
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
          onMouseMove={(e) => {
            // For time column, use simpler calculation since it's not scrollable
            const target = e.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            const relativeY = e.clientY - rect.top;
            const slotIndex = Math.floor(relativeY / SLOT_HEIGHT);
            if (slotIndex >= 0 && slotIndex < TIME_SLOTS.length) {
              setHoveredSlot({ time: TIME_SLOTS[slotIndex] });
            }
          }}
          onMouseLeave={handleMouseLeaveGrid}
        >
          {TIME_SLOTS.map((time) => (
            <div
              key={time}
              className={`border-t text-xs text-gray-500 text-right pr-2 hover:bg-gray-50 transition-colors ${
                hoveredSlot?.time === time ? 'bg-gray-100' : ''
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

          {/* Columns with drop zones */}
          <div className="flex h-full relative">
            {viewMode === 'day'
              ? // Day view columns
                teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex-1 relative border-r last:border-r-0"
                  >
                    {/* Single drop zone for entire column */}
                    <div
                      className="absolute inset-0"
                      data-member-id={member.id}
                      data-date={format(currentDate, 'yyyy-MM-dd')}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onMouseMove={(e) =>
                        handleMouseMove(
                          e,
                          member.id,
                          format(currentDate, 'yyyy-MM-dd')
                        )
                      }
                      onMouseLeave={handleMouseLeaveGrid}
                      style={{
                        height: `${TIME_SLOTS.length * SLOT_HEIGHT}px`,
                      }}
                    >
                      {/* Visual feedback for hover */}
                      {hoveredSlot?.teamMemberId === member.id &&
                        hoveredSlot?.date ===
                          format(currentDate, 'yyyy-MM-dd') && (
                          <div
                            className="absolute left-0 right-0 bg-gray-100 opacity-50 pointer-events-none transition-all"
                            style={{
                              top: `${
                                TIME_SLOTS.indexOf(hoveredSlot.time) *
                                SLOT_HEIGHT
                              }px`,
                              height: `${SLOT_HEIGHT}px`,
                            }}
                          />
                        )}

                      {/* Visual feedback for drop zone */}
                      {dragOverSlot?.teamMemberId === member.id &&
                        dragOverSlot?.date ===
                          format(currentDate, 'yyyy-MM-dd') && (
                          <div
                            className="absolute left-0 right-0 bg-purple-100 opacity-50 pointer-events-none"
                            style={{
                              top: `${
                                TIME_SLOTS.indexOf(dragOverSlot.time) *
                                SLOT_HEIGHT
                              }px`,
                              height: `${SLOT_HEIGHT}px`,
                            }}
                          />
                        )}
                    </div>

                    {/* Bookings for this member */}
                    {bookingsByMemberAndDate
                      .get(`${member.id}-${format(currentDate, 'yyyy-MM-dd')}`)
                      ?.map((booking) => (
                        <div
                          key={booking.id}
                          style={getBookingStyle(booking)}
                          className="z-10"
                        >
                          <BookingCard
                            booking={booking}
                            compact={false}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                            isDragging={draggedBooking?.id === booking.id}
                          />
                        </div>
                      ))}
                  </div>
                ))
              : // Week view columns
                displayDates.map((date) => {
                  return teamMembers.map((member) => {
                    const key = `${date.toISOString()}-${member.id}`;
                    return (
                      <div
                        key={key}
                        className="flex-1 relative border-r last:border-r-0"
                        style={{ width: columnWidth }}
                      >
                        {/* Single drop zone for entire column */}
                        <div
                          className="absolute inset-0"
                          data-member-id={member.id}
                          data-date={format(date, 'yyyy-MM-dd')}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onMouseMove={(e) =>
                            handleMouseMove(
                              e,
                              member.id,
                              format(date, 'yyyy-MM-dd')
                            )
                          }
                          onMouseLeave={handleMouseLeaveGrid}
                          style={{
                            height: `${TIME_SLOTS.length * SLOT_HEIGHT}px`,
                          }}
                        >
                          {/* Visual feedback for hover */}
                          {hoveredSlot?.teamMemberId === member.id &&
                            hoveredSlot?.date ===
                              format(date, 'yyyy-MM-dd') && (
                              <div
                                className="absolute left-0 right-0 bg-gray-100 opacity-50 pointer-events-none transition-all"
                                style={{
                                  top: `${
                                    TIME_SLOTS.indexOf(hoveredSlot.time) *
                                    SLOT_HEIGHT
                                  }px`,
                                  height: `${SLOT_HEIGHT}px`,
                                }}
                              />
                            )}

                          {/* Visual feedback for drop zone */}
                          {dragOverSlot?.teamMemberId === member.id &&
                            dragOverSlot?.date ===
                              format(date, 'yyyy-MM-dd') && (
                              <div
                                className="absolute left-0 right-0 bg-purple-100 opacity-50 pointer-events-none"
                                style={{
                                  top: `${
                                    TIME_SLOTS.indexOf(dragOverSlot.time) *
                                    SLOT_HEIGHT
                                  }px`,
                                  height: `${SLOT_HEIGHT}px`,
                                }}
                              />
                            )}
                        </div>

                        {/* Bookings for this member and date */}
                        {bookingsByMemberAndDate
                          .get(`${member.id}-${format(date, 'yyyy-MM-dd')}`)
                          ?.map((booking) => (
                            <div
                              key={booking.id}
                              style={getBookingStyle(booking)}
                              className="z-10"
                            >
                              <BookingCard
                                booking={booking}
                                compact={viewMode === 'week'}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                                isDragging={draggedBooking?.id === booking.id}
                              />
                            </div>
                          ))}
                      </div>
                    );
                  });
                })}
          </div>
        </div>
      </div>
    </div>
  );
}
