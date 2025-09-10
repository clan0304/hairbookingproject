// components/calendar/CalendarGrid.tsx
'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, addDays, isSameDay, startOfWeek, parse } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BookingCard } from './BookingCard';
import { toast } from 'sonner';
import { Clock, GripVertical } from 'lucide-react';
import type {
  TeamMember,
  BookingWithLocalTimes as BookingWithDetails,
} from '@/types/database';

type ViewMode = 'day' | 'week';
type DragMode = 'move' | 'resize-top' | 'resize-bottom';

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

const SLOT_HEIGHT = 15; // Height of each 15-minute slot in pixels
const HEADER_HEIGHT = 120; // Height of the header section
const TIME_COLUMN_WIDTH = 80; // Width of the time column
const MINUTES_PER_SLOT = 15; // 15 minutes per slot
const MIN_DURATION = 15; // Minimum booking duration in minutes

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
  const [dragMode, setDragMode] = useState<DragMode>('move');
  const [dragOverSlot, setDragOverSlot] = useState<{
    teamMemberId: string;
    date: string;
    time: string;
  } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [dragOffset, setDragOffset] = useState<number>(0);
  const [originalDuration, setOriginalDuration] = useState<number>(0);
  const [originalStartTime, setOriginalStartTime] = useState<string>('');
  const [resizedBookings, setResizedBookings] = useState<
    Map<string, { duration: number; start_time: string; end_time: string }>
  >(new Map());
  // Update the hoveredSlot state to track both dimensions
  const [hoveredSlot, setHoveredSlot] = useState<{
    time: string;
    columnId: string; // Will be teamMemberId for day view, date for week view
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Clear resized bookings when bookings data refreshes
  useEffect(() => {
    // When bookings prop changes, clear the local resized state
    setResizedBookings(new Map());
  }, [bookings]);

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
    // Check if this booking has been resized locally
    const resizedData = resizedBookings.get(booking.id);

    // Get the time string - prioritize resized data, then local view data
    const timeStr =
      resizedData?.start_time ||
      booking.start_time_local ||
      booking.start_time ||
      '00:00';

    // Use resized duration if available
    const duration = resizedData?.duration || booking.duration;

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
      (duration / MINUTES_PER_SLOT) * SLOT_HEIGHT - 2
    );

    return {
      top: `${top}px`,
      height: `${height}px`,
      left: '4px',
      right: '4px',
      position: 'absolute' as const,
    };
  };

  // Calculate preview position and details based on drag mode
  const getDragPreview = useCallback(() => {
    if (!dragOverSlot || !draggedBooking) return null;

    const [hours, minutes] = dragOverSlot.time.split(':').map(Number);

    let startTimeFormatted: string;
    let endTimeFormatted: string;
    let newDuration: number;
    let top: number;
    let height: number;

    if (dragMode === 'resize-top') {
      // Resizing from top - changing start time
      const newStartMinutes = hours * 60 + minutes;

      // Get original end time
      const originalEndTimeStr =
        draggedBooking.end_time_local || draggedBooking.end_time || '00:00';
      const [endHours, endMinutes] = originalEndTimeStr.split(':').map(Number);
      const endTotalMinutes = endHours * 60 + endMinutes;

      // Calculate new duration
      newDuration = Math.max(MIN_DURATION, endTotalMinutes - newStartMinutes);

      // If duration would be negative or too small, adjust
      if (newDuration < MIN_DURATION) {
        return null;
      }

      startTimeFormatted = format(
        parse(dragOverSlot.time, 'HH:mm', new Date()),
        'h:mm a'
      );
      endTimeFormatted = format(
        parse(originalEndTimeStr, 'HH:mm', new Date()),
        'h:mm a'
      );

      const minutesFrom6AM = Math.max(0, (hours - 6) * 60 + minutes);
      top = (minutesFrom6AM / MINUTES_PER_SLOT) * SLOT_HEIGHT;
      height = Math.max(
        SLOT_HEIGHT - 2,
        (newDuration / MINUTES_PER_SLOT) * SLOT_HEIGHT - 2
      );
    } else if (dragMode === 'resize-bottom') {
      // Resizing from bottom - changing end time
      const originalStartTimeStr =
        originalStartTime ||
        draggedBooking.start_time_local ||
        draggedBooking.start_time ||
        '00:00';
      const [startHours, startMinutes] = originalStartTimeStr
        .split(':')
        .map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;

      // For bottom resize, calculate end time at the dropped position + 1 slot
      const endTotalMinutes = hours * 60 + minutes + MINUTES_PER_SLOT;

      // Calculate new duration
      newDuration = Math.max(MIN_DURATION, endTotalMinutes - startTotalMinutes);

      if (newDuration < MIN_DURATION) {
        return null;
      }

      startTimeFormatted = format(
        parse(originalStartTimeStr, 'HH:mm', new Date()),
        'h:mm a'
      );

      const endHours = Math.floor(endTotalMinutes / 60);
      const endMinutes = endTotalMinutes % 60;
      endTimeFormatted = format(
        parse(
          `${endHours.toString().padStart(2, '0')}:${endMinutes
            .toString()
            .padStart(2, '0')}`,
          'HH:mm',
          new Date()
        ),
        'h:mm a'
      );

      const minutesFrom6AM = Math.max(0, (startHours - 6) * 60 + startMinutes);
      top = (minutesFrom6AM / MINUTES_PER_SLOT) * SLOT_HEIGHT;
      height = Math.max(
        SLOT_HEIGHT - 2,
        (newDuration / MINUTES_PER_SLOT) * SLOT_HEIGHT - 2
      );
    } else {
      // Moving - same as before
      const totalMinutes = hours * 60 + minutes + draggedBooking.duration;
      const endHours = Math.floor(totalMinutes / 60);
      const endMinutes = totalMinutes % 60;

      startTimeFormatted = format(
        parse(dragOverSlot.time, 'HH:mm', new Date()),
        'h:mm a'
      );
      endTimeFormatted = format(
        parse(
          `${endHours.toString().padStart(2, '0')}:${endMinutes
            .toString()
            .padStart(2, '0')}`,
          'HH:mm',
          new Date()
        ),
        'h:mm a'
      );

      newDuration = draggedBooking.duration;

      const minutesFrom6AM = Math.max(0, (hours - 6) * 60 + minutes);
      top = (minutesFrom6AM / MINUTES_PER_SLOT) * SLOT_HEIGHT;
      height = Math.max(
        SLOT_HEIGHT - 2,
        (draggedBooking.duration / MINUTES_PER_SLOT) * SLOT_HEIGHT - 2
      );
    }

    // Check if it goes past closing time
    const [endH] = endTimeFormatted.split(':');
    const isPastClosing =
      parseInt(endH) >= 10 && endTimeFormatted.includes('PM');

    return {
      startTime: startTimeFormatted,
      endTime: endTimeFormatted,
      duration: newDuration,
      top,
      height,
      isPastClosing,
      teamMemberName:
        teamMembers.find((m) => m.id === dragOverSlot.teamMemberId)
          ?.first_name || '',
    };
  }, [dragOverSlot, draggedBooking, teamMembers, dragMode, originalStartTime]);

  // Handle drag start for moving
  const handleDragStart = useCallback(
    (
      booking: BookingWithDetails,
      e: React.DragEvent,
      mode: DragMode = 'move'
    ) => {
      setDraggedBooking(booking);
      setDragMode(mode);
      setOriginalDuration(booking.duration);
      setOriginalStartTime(
        booking.start_time_local || booking.start_time || '00:00'
      );

      if (mode === 'move') {
        // Calculate where in the booking card the user clicked
        const bookingElement = e.currentTarget as HTMLElement;
        const rect = bookingElement.getBoundingClientRect();
        const offsetFromTop = e.clientY - rect.top;

        // Convert pixel offset to time offset (in slots)
        const slotOffset = Math.round(offsetFromTop / SLOT_HEIGHT);
        setDragOffset(slotOffset);
      } else {
        setDragOffset(0);
      }
    },
    []
  );

  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedBooking(null);
    setDragOverSlot(null);
    setDragOffset(0);
    setDragMode('move');
    setOriginalDuration(0);
    setOriginalStartTime('');
    // Don't clear resizedBookings here - let it persist until data refreshes
  }, []);

  // Handle drag over for individual cells - adjust based on mode
  const handleDragOver = useCallback(
    (
      e: React.DragEvent,
      teamMemberId: string,
      date: Date,
      time: string,
      slotIndex: number
    ) => {
      e.preventDefault();
      if (!draggedBooking) return;

      let adjustedTime = time;

      if (dragMode === 'move') {
        // Adjust the slot index by the drag offset to align top of card
        const adjustedSlotIndex = Math.max(0, slotIndex - dragOffset);
        adjustedTime =
          TIME_SLOTS[Math.min(TIME_SLOTS.length - 1, adjustedSlotIndex)];
      }

      setDragOverSlot({
        teamMemberId,
        date: format(date, 'yyyy-MM-dd'),
        time: adjustedTime,
      });
    },
    [draggedBooking, dragOffset, dragMode]
  );

  // Handle drop for individual cells
  const handleDrop = useCallback(
    async (
      e: React.DragEvent,
      teamMemberId: string,
      date: Date,
      time: string,
      slotIndex: number
    ) => {
      e.preventDefault();
      if (!draggedBooking || isUpdating) return;

      setIsUpdating(true);
      setDragOverSlot(null);

      try {
        let startTime: string;
        let endTime: string;
        let newDuration: number;

        if (dragMode === 'resize-top') {
          // Changing start time
          startTime = time;

          // Keep original end time
          const originalEndTimeStr =
            draggedBooking.end_time_local || draggedBooking.end_time || '00:00';
          endTime = originalEndTimeStr;

          // Calculate new duration
          const [startH, startM] = startTime.split(':').map(Number);
          const [endH, endM] = endTime.split(':').map(Number);
          newDuration = endH * 60 + endM - (startH * 60 + startM);

          if (newDuration < MIN_DURATION) {
            toast.error(`Booking must be at least ${MIN_DURATION} minutes`);
            return;
          }
        } else if (dragMode === 'resize-bottom') {
          // Changing end time - use the actual dropped slot time
          const originalStartTimeStr =
            originalStartTime ||
            draggedBooking.start_time_local ||
            draggedBooking.start_time ||
            '00:00';
          startTime = originalStartTimeStr;

          // Use the time directly where the bottom handle was dropped
          const [hours, minutes] = time.split(':').map(Number);
          // For bottom resize, the drop position represents where we want the booking to end
          // Add MINUTES_PER_SLOT because we want the booking to end AFTER this slot
          const endTotalMinutes = hours * 60 + minutes + MINUTES_PER_SLOT;
          const endHours = Math.floor(endTotalMinutes / 60);
          const endMinutes = endTotalMinutes % 60;
          endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes
            .toString()
            .padStart(2, '0')}`;

          // Calculate new duration
          const [startH, startM] = startTime.split(':').map(Number);
          newDuration = endTotalMinutes - (startH * 60 + startM);

          if (newDuration < MIN_DURATION) {
            toast.error(`Booking must be at least ${MIN_DURATION} minutes`);
            return;
          }
        } else {
          // Moving - adjust for offset
          const adjustedSlotIndex = Math.max(0, slotIndex - dragOffset);
          const adjustedTime =
            TIME_SLOTS[Math.min(TIME_SLOTS.length - 1, adjustedSlotIndex)];

          const [hours, minutes] = adjustedTime.split(':');
          startTime = `${hours}:${minutes}`;

          // Calculate end time based on original duration
          const totalMinutes =
            parseInt(hours) * 60 + parseInt(minutes) + draggedBooking.duration;
          const endHours = Math.floor(totalMinutes / 60);
          const endMinutes = totalMinutes % 60;
          endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes
            .toString()
            .padStart(2, '0')}`;

          newDuration = draggedBooking.duration;
        }

        // Check if end time goes past 10 PM (22:00)
        const [endHours] = endTime.split(':').map(Number);
        if (endHours >= 22) {
          toast.error('Booking would extend past closing time (10:00 PM)');
          return;
        }

        // Prepare update data
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
          date: format(date, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          duration: newDuration,
        };

        // Add team member if different (only for move mode)
        if (
          dragMode === 'move' &&
          teamMemberId !== draggedBooking.team_member_id
        ) {
          updateData.team_member_id = teamMemberId;
        }

        // Update local state immediately for visual feedback
        if (dragMode === 'resize-top' || dragMode === 'resize-bottom') {
          setResizedBookings((prev) =>
            new Map(prev).set(draggedBooking.id, {
              duration: newDuration,
              start_time: startTime,
              end_time: endTime,
            })
          );
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
          // Revert local changes on error
          if (dragMode === 'resize-top' || dragMode === 'resize-bottom') {
            setResizedBookings((prev) => {
              const newMap = new Map(prev);
              newMap.delete(draggedBooking.id);
              return newMap;
            });
          }

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

        // Refresh bookings (this will clear the resizedBookings map after new data loads)
        if (onBookingUpdate) {
          onBookingUpdate();
          // Clear the resized booking after successful update
          setTimeout(() => {
            setResizedBookings(new Map());
          }, 100);
        }
      } catch (error) {
        console.error('Error updating booking:', error);
        toast.error('Failed to update booking');
      } finally {
        setIsUpdating(false);
        setDraggedBooking(null);
        setDragOffset(0);
        setDragMode('move');
        setOriginalDuration(0);
        setOriginalStartTime('');
      }
    },
    [
      draggedBooking,
      isUpdating,
      onBookingUpdate,
      dragOffset,
      dragMode,
      originalStartTime,
    ]
  );

  // Column width calculation
  const columnWidth =
    viewMode === 'day'
      ? `${100 / teamMembers.length}%`
      : `${100 / (displayDates.length * teamMembers.length)}%`;

  const dragPreview = getDragPreview();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-auto" ref={gridRef}>
      {/* Drag Preview Overlay - Shows when dragging */}
      {dragPreview && draggedBooking && (
        <div
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 
                        bg-white rounded-lg shadow-xl border-2 border-blue-500 p-4 
                        min-w-[320px] pointer-events-none"
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg ${
                dragPreview.isPastClosing ? 'bg-red-100' : 'bg-blue-100'
              }`}
            >
              <Clock
                className={`w-5 h-5 ${
                  dragPreview.isPastClosing ? 'text-red-600' : 'text-blue-600'
                }`}
              />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-sm">
                {draggedBooking.client_first_name}{' '}
                {draggedBooking.client_last_name}
              </p>
              <p className="text-sm text-gray-600">
                {dragMode === 'move' &&
                  dragPreview.teamMemberName &&
                  dragOverSlot?.teamMemberId !==
                    draggedBooking.team_member_id && (
                    <span className="text-blue-600 font-medium">
                      → {dragPreview.teamMemberName} •{' '}
                    </span>
                  )}
                <span
                  className={
                    dragPreview.isPastClosing ? 'text-red-600 font-medium' : ''
                  }
                >
                  {dragPreview.startTime} - {dragPreview.endTime}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {dragMode === 'resize-top' && '↑ Adjusting start time • '}
                {dragMode === 'resize-bottom' && '↓ Adjusting end time • '}
                Duration: {dragPreview.duration} mins
                {dragPreview.duration !== originalDuration &&
                  ` (${dragPreview.duration > originalDuration ? '+' : ''}${
                    dragPreview.duration - originalDuration
                  } mins)`}
              </p>
              {dragPreview.isPastClosing && (
                <p className="text-xs text-red-600 mt-1">
                  ⚠️ Extends past closing time
                </p>
              )}
            </div>
          </div>
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
          className="absolute top-0 left-0 bg-white border-r"
          style={{
            width: `${TIME_COLUMN_WIDTH}px`,
          }}
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

          {/* Columns with drop zones */}
          <div className="flex h-full relative">
            {viewMode === 'day'
              ? // Day View - columns are team members
                teamMembers.map((member) => {
                  return (
                    <div key={member.id} className="flex-1 relative border-r">
                      {TIME_SLOTS.map((time, index) => (
                        <div
                          key={`${member.id}-${time}`}
                          className={`
                          absolute w-full transition-colors duration-150
                          ${
                            hoveredSlot?.time === time &&
                            hoveredSlot?.columnId === member.id &&
                            !draggedBooking
                              ? 'bg-gray-100'
                              : ''
                          }
                          ${
                            dragOverSlot?.teamMemberId === member.id &&
                            dragOverSlot?.time === time
                              ? 'bg-blue-100 border-2 border-blue-400 border-dashed'
                              : ''
                          }
                        `}
                          style={{
                            height: `${SLOT_HEIGHT}px`,
                            top: `${index * SLOT_HEIGHT}px`,
                          }}
                          onMouseEnter={() =>
                            !draggedBooking &&
                            setHoveredSlot({
                              time,
                              columnId: member.id,
                            })
                          }
                          onMouseLeave={() => setHoveredSlot(null)}
                          onDragOver={(e) =>
                            handleDragOver(
                              e,
                              member.id,
                              currentDate,
                              time,
                              index
                            )
                          }
                          onDrop={(e) =>
                            handleDrop(e, member.id, currentDate, time, index)
                          }
                        >
                          {/* Show time on hover when not dragging */}
                          {hoveredSlot?.time === time &&
                            hoveredSlot?.columnId === member.id &&
                            !draggedBooking && (
                              <span className="absolute left-2 top-0 text-xs text-gray-600 font-medium">
                                {format(
                                  parse(time, 'HH:mm', new Date()),
                                  'h:mm a'
                                )}
                              </span>
                            )}

                          {/* Show drop indicator when dragging */}
                          {dragOverSlot?.teamMemberId === member.id &&
                            dragOverSlot?.time === time &&
                            draggedBooking && (
                              <div
                                className="absolute inset-x-2 top-0 bg-blue-500 text-white 
                                            text-xs px-2 py-0.5 rounded-sm font-medium"
                              >
                                {dragMode === 'move'
                                  ? 'Drop here: '
                                  : dragMode === 'resize-top'
                                  ? 'New start: '
                                  : 'New end: '}
                                {format(
                                  parse(time, 'HH:mm', new Date()),
                                  'h:mm a'
                                )}
                              </div>
                            )}
                        </div>
                      ))}

                      {/* Ghost preview of where booking will be placed */}
                      {dragOverSlot?.teamMemberId === member.id &&
                        dragPreview && (
                          <div
                            className="absolute z-5 pointer-events-none opacity-40"
                            style={{
                              top: `${dragPreview.top}px`,
                              height: `${dragPreview.height}px`,
                              left: '4px',
                              right: '4px',
                              backgroundColor:
                                draggedBooking?.category_color || '#6366f1',
                              borderRadius: '6px',
                              border: '2px dashed #3b82f6',
                            }}
                          >
                            <div className="p-1 text-xs font-medium text-white">
                              {draggedBooking?.service_name}
                            </div>
                          </div>
                        )}

                      {/* Bookings for this member with resize handles */}
                      {bookingsByMemberAndDate
                        .get(
                          `${member.id}-${format(currentDate, 'yyyy-MM-dd')}`
                        )
                        ?.map((booking) => {
                          const style = getBookingStyle(booking);
                          const backgroundColor =
                            booking.category_color || '#6366f1';

                          return (
                            <div
                              key={booking.id}
                              style={style}
                              className="z-10 group relative"
                            >
                              {/* Top resize handle */}
                              <div
                                draggable
                                onDragStart={(e) =>
                                  handleDragStart(booking, e, 'resize-top')
                                }
                                onDragEnd={handleDragEnd}
                                className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize 
                                         opacity-0 group-hover:opacity-100 bg-blue-500/20 
                                         hover:bg-blue-500/40 transition-opacity z-20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical className="w-3 h-3 mx-auto text-blue-600" />
                              </div>

                              {/* Full height colored background */}
                              <div
                                className="absolute inset-0 rounded-md"
                                style={{ backgroundColor }}
                              />

                              {/* Main booking card content on top of background */}
                              <div className="relative h-full">
                                <BookingCard
                                  booking={booking}
                                  compact={false}
                                  onDragStart={(booking, e) =>
                                    handleDragStart(booking, e, 'move')
                                  }
                                  onDragEnd={handleDragEnd}
                                  isDragging={
                                    draggedBooking?.id === booking.id &&
                                    dragMode === 'move'
                                  }
                                  transparentBg={true} // Pass flag to make BookingCard background transparent
                                />
                              </div>

                              {/* Bottom resize handle - made slightly larger for better grabbing */}
                              <div
                                draggable
                                onDragStart={(e) =>
                                  handleDragStart(booking, e, 'resize-bottom')
                                }
                                onDragEnd={handleDragEnd}
                                className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize 
                                         opacity-0 group-hover:opacity-100 bg-blue-500/20 
                                         hover:bg-blue-500/40 transition-opacity z-20"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <GripVertical className="w-3 h-3 mx-auto text-blue-600 mt-0.5" />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  );
                })
              : // Week View - columns are days
                displayDates.map((date) => {
                  const dateStr = format(date, 'yyyy-MM-dd');
                  return (
                    <div key={dateStr} className="flex-1 relative border-r">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="relative">
                          {TIME_SLOTS.map((time, index) => (
                            <div
                              key={`${dateStr}-${member.id}-${time}`}
                              className={`
                              absolute w-full transition-colors duration-150
                              ${
                                hoveredSlot?.time === time &&
                                hoveredSlot?.columnId === dateStr &&
                                !draggedBooking
                                  ? 'bg-gray-100'
                                  : ''
                              }
                              ${
                                dragOverSlot?.teamMemberId === member.id &&
                                dragOverSlot?.date === dateStr &&
                                dragOverSlot?.time === time
                                  ? 'bg-blue-100 border-2 border-blue-400 border-dashed'
                                  : ''
                              }
                            `}
                              style={{
                                height: `${SLOT_HEIGHT}px`,
                                top: `${index * SLOT_HEIGHT}px`,
                                width: columnWidth,
                                left: `${
                                  teamMembers.indexOf(member) *
                                  parseFloat(columnWidth)
                                }%`,
                              }}
                              onMouseEnter={() =>
                                !draggedBooking &&
                                setHoveredSlot({
                                  time,
                                  columnId: dateStr,
                                })
                              }
                              onMouseLeave={() => setHoveredSlot(null)}
                              onDragOver={(e) =>
                                handleDragOver(e, member.id, date, time, index)
                              }
                              onDrop={(e) =>
                                handleDrop(e, member.id, date, time, index)
                              }
                            >
                              {/* Show time on hover when not dragging */}
                              {hoveredSlot?.time === time &&
                                hoveredSlot?.columnId === dateStr &&
                                !draggedBooking && (
                                  <span className="absolute left-1 top-0 text-xs text-gray-600 font-medium">
                                    {format(
                                      parse(time, 'HH:mm', new Date()),
                                      'h:mm a'
                                    )}
                                  </span>
                                )}

                              {/* Show drop indicator when dragging */}
                              {dragOverSlot?.teamMemberId === member.id &&
                                dragOverSlot?.date === dateStr &&
                                dragOverSlot?.time === time &&
                                draggedBooking && (
                                  <div
                                    className="absolute inset-x-1 top-0 bg-blue-500 text-white 
                                                text-xs px-1 py-0.5 rounded-sm font-medium"
                                  >
                                    {format(
                                      parse(time, 'HH:mm', new Date()),
                                      'h:mm a'
                                    )}
                                  </div>
                                )}
                            </div>
                          ))}

                          {/* Ghost preview for week view */}
                          {dragOverSlot?.teamMemberId === member.id &&
                            dragOverSlot?.date === dateStr &&
                            dragPreview && (
                              <div
                                className="absolute z-5 pointer-events-none opacity-40"
                                style={{
                                  top: `${dragPreview.top}px`,
                                  height: `${dragPreview.height}px`,
                                  width: columnWidth,
                                  left: `${
                                    teamMembers.indexOf(member) *
                                    parseFloat(columnWidth)
                                  }%`,
                                  backgroundColor:
                                    draggedBooking?.category_color || '#6366f1',
                                  borderRadius: '4px',
                                  border: '2px dashed #3b82f6',
                                }}
                              />
                            )}

                          {/* Bookings for this day and member with resize handles */}
                          {bookingsByMemberAndDate
                            .get(`${member.id}-${dateStr}`)
                            ?.map((booking) => {
                              const baseStyle = getBookingStyle(booking);
                              const backgroundColor =
                                booking.category_color || '#6366f1';

                              return (
                                <div
                                  key={booking.id}
                                  style={{
                                    ...baseStyle,
                                    width: columnWidth,
                                    left: `${
                                      teamMembers.indexOf(member) *
                                      parseFloat(columnWidth)
                                    }%`,
                                  }}
                                  className="z-10 group relative"
                                >
                                  {/* Full height colored background */}
                                  <div
                                    className="absolute inset-0 rounded pointer-events-none"
                                    style={{ backgroundColor }}
                                  />

                                  {/* Week view has smaller resize handles */}
                                  <div
                                    draggable
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      console.log(
                                        'Top resize started (week view)'
                                      );
                                      handleDragStart(booking, e, 'resize-top');
                                    }}
                                    onDragEnd={(e) => {
                                      e.stopPropagation();
                                      handleDragEnd();
                                    }}
                                    className="absolute top-0 left-0 right-0 h-2 cursor-ns-resize 
                                             opacity-0 group-hover:opacity-100 bg-blue-500/30 
                                             hover:bg-blue-500/50 transition-opacity z-30
                                             pointer-events-auto"
                                    style={{ touchAction: 'none' }}
                                  />

                                  {/* Main booking card content */}
                                  <div
                                    className="relative h-full pointer-events-auto"
                                    style={{ padding: '4px 0' }}
                                  >
                                    <BookingCard
                                      booking={booking}
                                      compact={true}
                                      onDragStart={(booking, e) => {
                                        console.log(
                                          'Card drag started (week view)'
                                        );
                                        handleDragStart(booking, e, 'move');
                                      }}
                                      onDragEnd={handleDragEnd}
                                      isDragging={
                                        draggedBooking?.id === booking.id &&
                                        dragMode === 'move'
                                      }
                                      transparentBg={true}
                                    />
                                  </div>

                                  <div
                                    draggable
                                    onDragStart={(e) => {
                                      e.stopPropagation();
                                      console.log(
                                        'Bottom resize started (week view)'
                                      );
                                      handleDragStart(
                                        booking,
                                        e,
                                        'resize-bottom'
                                      );
                                    }}
                                    onDragEnd={(e) => {
                                      e.stopPropagation();
                                      handleDragEnd();
                                    }}
                                    className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize 
                                             opacity-0 group-hover:opacity-100 bg-blue-500/30 
                                             hover:bg-blue-500/50 transition-opacity z-30
                                             pointer-events-auto"
                                    style={{ touchAction: 'none' }}
                                  />
                                </div>
                              );
                            })}
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
