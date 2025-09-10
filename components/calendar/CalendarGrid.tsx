// components/calendar/CalendarGrid.tsx
'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { format, addDays, isSameDay, startOfWeek, parse } from 'date-fns';
import { toast } from 'sonner';
import { Clock } from 'lucide-react';
import { CalendarGridHeader } from './CalendarGridHeader';
import { CalendarGridBody } from './CalendarGridBody';
import { TimeSlotMenu } from './TimeSlotMenu';
import { BookingModal } from './BookingModal';
import type {
  TeamMember,
  BookingWithLocalTimes as BookingWithDetails,
} from '@/types/database';

export type ViewMode = 'day' | 'week';
export type DragMode = 'move' | 'resize-top' | 'resize-bottom';

interface CalendarGridProps {
  currentDate: Date;
  viewMode: ViewMode;
  teamMembers: TeamMember[];
  bookings: BookingWithDetails[];
  loading: boolean;
  shopTimezone: string;
  shopId: string;
  onBookingUpdate?: () => void;
}

// Time slots from 6:00 AM to 10:00 PM (16 hours) - NOW IN 15-MINUTE INTERVALS
export const TIME_SLOTS = Array.from({ length: 65 }, (_, i) => {
  const hour = Math.floor(i / 4) + 6;
  const minute = (i % 4) * 15;
  return `${hour.toString().padStart(2, '0')}:${minute
    .toString()
    .padStart(2, '0')}`;
});

export const SLOT_HEIGHT = 15; // Height of each 15-minute slot in pixels
export const HEADER_HEIGHT = 120; // Height of the header section
export const TIME_COLUMN_WIDTH = 80; // Width of the time column
export const MINUTES_PER_SLOT = 15; // 15 minutes per slot
export const MIN_DURATION = 15; // Minimum booking duration in minutes

export function CalendarGrid({
  currentDate,
  viewMode,
  teamMembers,
  bookings,
  loading,
  shopId,
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
  const [hoveredSlot, setHoveredSlot] = useState<{
    time: string;
    columnId: string;
  } | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // States for manual booking creation
  const [timeSlotMenu, setTimeSlotMenu] = useState<{
    time: string;
    date: Date;
    teamMember: TeamMember;
    position: { x: number; y: number };
  } | null>(null);
  const [showAddBookingModal, setShowAddBookingModal] = useState(false);
  const [newBookingData, setNewBookingData] = useState<{
    time: string;
    date: Date;
    teamMember: TeamMember;
  } | null>(null);

  // Clear resized bookings when bookings data refreshes
  useEffect(() => {
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
      const bookingDateStr =
        booking.booking_date || booking.booking_date_local || '';
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
    const resizedData = resizedBookings.get(booking.id);
    const timeStr =
      resizedData?.start_time ||
      booking.start_time_local ||
      booking.start_time ||
      '00:00';
    const duration = resizedData?.duration || booking.duration;

    let startHour = 0;
    let startMinute = 0;

    if (timeStr && timeStr.includes(':')) {
      const parts = timeStr.split(':');
      startHour = parseInt(parts[0], 10) || 0;
      startMinute = parseInt(parts[1], 10) || 0;
    }

    if (isNaN(startHour) || isNaN(startMinute)) {
      console.warn('Invalid time for booking:', booking.id, timeStr);
      startHour = 0;
      startMinute = 0;
    }

    const minutesFrom6AM = Math.max(0, (startHour - 6) * 60 + startMinute);
    const top = (minutesFrom6AM / MINUTES_PER_SLOT) * SLOT_HEIGHT;
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
      const newStartMinutes = hours * 60 + minutes;
      const originalEndTimeStr =
        draggedBooking.end_time_local || draggedBooking.end_time || '00:00';
      const [endHours, endMinutes] = originalEndTimeStr.split(':').map(Number);
      const endTotalMinutes = endHours * 60 + endMinutes;

      newDuration = Math.max(MIN_DURATION, endTotalMinutes - newStartMinutes);

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
      const originalStartTimeStr =
        originalStartTime ||
        draggedBooking.start_time_local ||
        draggedBooking.start_time ||
        '00:00';
      const [startHours, startMinutes] = originalStartTimeStr
        .split(':')
        .map(Number);
      const startTotalMinutes = startHours * 60 + startMinutes;

      const endTotalMinutes = hours * 60 + minutes + MINUTES_PER_SLOT;

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
        const bookingElement = e.currentTarget as HTMLElement;
        const rect = bookingElement.getBoundingClientRect();
        const offsetFromTop = e.clientY - rect.top;
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
          startTime = time;
          const originalEndTimeStr =
            draggedBooking.end_time_local || draggedBooking.end_time || '00:00';
          endTime = originalEndTimeStr;

          const [startH, startM] = startTime.split(':').map(Number);
          const [endH, endM] = endTime.split(':').map(Number);
          newDuration = endH * 60 + endM - (startH * 60 + startM);

          if (newDuration < MIN_DURATION) {
            toast.error(`Booking must be at least ${MIN_DURATION} minutes`);
            return;
          }
        } else if (dragMode === 'resize-bottom') {
          const originalStartTimeStr =
            originalStartTime ||
            draggedBooking.start_time_local ||
            draggedBooking.start_time ||
            '00:00';
          startTime = originalStartTimeStr;

          const [hours, minutes] = time.split(':').map(Number);
          const endTotalMinutes = hours * 60 + minutes + MINUTES_PER_SLOT;
          const endHours = Math.floor(endTotalMinutes / 60);
          const endMinutes = endTotalMinutes % 60;
          endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes
            .toString()
            .padStart(2, '0')}`;

          const [startH, startM] = startTime.split(':').map(Number);
          newDuration = endTotalMinutes - (startH * 60 + startM);

          if (newDuration < MIN_DURATION) {
            toast.error(`Booking must be at least ${MIN_DURATION} minutes`);
            return;
          }
        } else {
          const adjustedSlotIndex = Math.max(0, slotIndex - dragOffset);
          const adjustedTime =
            TIME_SLOTS[Math.min(TIME_SLOTS.length - 1, adjustedSlotIndex)];

          const [hours, minutes] = adjustedTime.split(':');
          startTime = `${hours}:${minutes}`;

          const totalMinutes =
            parseInt(hours) * 60 + parseInt(minutes) + draggedBooking.duration;
          const endHours = Math.floor(totalMinutes / 60);
          const endMinutes = totalMinutes % 60;
          endTime = `${endHours.toString().padStart(2, '0')}:${endMinutes
            .toString()
            .padStart(2, '0')}`;

          newDuration = draggedBooking.duration;
        }

        const [endHours] = endTime.split(':').map(Number);
        if (endHours >= 22) {
          toast.error('Booking would extend past closing time (10:00 PM)');
          return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const updateData: any = {
          date: format(date, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
          duration: newDuration,
        };

        if (
          dragMode === 'move' &&
          teamMemberId !== draggedBooking.team_member_id
        ) {
          updateData.team_member_id = teamMemberId;
        }

        if (dragMode === 'resize-top' || dragMode === 'resize-bottom') {
          setResizedBookings((prev) =>
            new Map(prev).set(draggedBooking.id, {
              duration: newDuration,
              start_time: startTime,
              end_time: endTime,
            })
          );
        }

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

        if (onBookingUpdate) {
          onBookingUpdate();
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

  // Handle time slot click for manual booking
  const handleTimeSlotClick = useCallback(
    (e: React.MouseEvent, time: string, date: Date, teamMember: TeamMember) => {
      // Don't show menu if we're dragging
      if (draggedBooking) return;

      // Get click position for menu placement
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const menuPosition = {
        x: Math.min(rect.left, window.innerWidth - 300), // Ensure menu stays in viewport
        y: rect.top,
      };

      setTimeSlotMenu({
        time,
        date,
        teamMember,
        position: menuPosition,
      });
    },
    [draggedBooking]
  );

  // Handle adding appointment from menu
  const handleAddAppointment = useCallback(() => {
    if (timeSlotMenu) {
      setNewBookingData({
        time: timeSlotMenu.time,
        date: timeSlotMenu.date,
        teamMember: timeSlotMenu.teamMember,
      });
      setShowAddBookingModal(true);
      setTimeSlotMenu(null);
    }
  }, [timeSlotMenu]);

  // Handle saving new booking
  const handleSaveBooking = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (bookingData: any) => {
      try {
        const response = await fetch('/api/admin/calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bookingData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to create booking');
        }

        toast.success('Appointment created successfully');
        setShowAddBookingModal(false);
        setNewBookingData(null);

        // Refresh bookings
        if (onBookingUpdate) {
          onBookingUpdate();
        }
      } catch (error) {
        console.error('Error creating booking:', error);
        throw error;
      }
    },
    [onBookingUpdate]
  );

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
      {/* Drag Preview Overlay */}
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

      <CalendarGridHeader
        currentDate={currentDate}
        viewMode={viewMode}
        teamMembers={teamMembers}
        displayDates={displayDates}
        columnWidth={columnWidth}
      />

      <CalendarGridBody
        displayDates={displayDates}
        teamMembers={teamMembers}
        bookingsByMemberAndDate={bookingsByMemberAndDate}
        viewMode={viewMode}
        currentDate={currentDate}
        columnWidth={columnWidth}
        hoveredSlot={hoveredSlot}
        setHoveredSlot={setHoveredSlot}
        draggedBooking={draggedBooking}
        dragOverSlot={dragOverSlot}
        dragPreview={dragPreview}
        dragMode={dragMode}
        originalDuration={originalDuration}
        resizedBookings={resizedBookings}
        getBookingStyle={getBookingStyle}
        handleDragStart={handleDragStart}
        handleDragEnd={handleDragEnd}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        onTimeSlotClick={handleTimeSlotClick}
      />

      {/* Time Slot Menu */}
      {timeSlotMenu && (
        <TimeSlotMenu
          time={timeSlotMenu.time}
          date={timeSlotMenu.date}
          teamMember={timeSlotMenu.teamMember}
          position={timeSlotMenu.position}
          onClose={() => setTimeSlotMenu(null)}
          onAddAppointment={handleAddAppointment}
          onAddGroupAppointment={() => {
            // TODO: Implement group appointment
            toast.info('Group appointments coming soon');
            setTimeSlotMenu(null);
          }}
          onAddBlockedTime={() => {
            // TODO: Implement blocked time
            toast.info('Blocked time feature coming soon');
            setTimeSlotMenu(null);
          }}
        />
      )}

      {/* Add Booking Modal */}
      {showAddBookingModal && newBookingData && (
        <BookingModal
          isOpen={showAddBookingModal}
          onClose={() => {
            setShowAddBookingModal(false);
            setNewBookingData(null);
          }}
          shopId={shopId} // Use the shopId prop
          mode="create"
          teamMember={newBookingData.teamMember}
          date={newBookingData.date}
          time={newBookingData.time}
          onSave={handleSaveBooking}
        />
      )}
    </div>
  );
}
