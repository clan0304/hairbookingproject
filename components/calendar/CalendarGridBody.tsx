// components/calendar/CalendarGridBody.tsx
'use client';

import { format, parse } from 'date-fns';
import { GripVertical } from 'lucide-react';
import { BookingCard } from './BookingCard';
import type {
  TeamMember,
  BookingWithLocalTimes as BookingWithDetails,
} from '@/types/database';
import type { ViewMode, DragMode } from './CalendarGrid';
import {
  TIME_SLOTS,
  SLOT_HEIGHT,
  HEADER_HEIGHT,
  TIME_COLUMN_WIDTH,
} from './CalendarGrid';

interface CalendarGridBodyProps {
  displayDates: Date[];
  teamMembers: TeamMember[];
  bookingsByMemberAndDate: Map<string, BookingWithDetails[]>;
  viewMode: ViewMode;
  currentDate: Date;
  columnWidth: string;
  hoveredSlot: { time: string; columnId: string } | null;
  setHoveredSlot: (slot: { time: string; columnId: string } | null) => void;
  draggedBooking: BookingWithDetails | null;
  dragOverSlot: { teamMemberId: string; date: string; time: string } | null;
  dragPreview: {
    top: number;
    height: number;
    teamMemberName: string;
  } | null;
  dragMode: DragMode;
  originalDuration: number;
  resizedBookings: Map<
    string,
    { duration: number; start_time: string; end_time: string }
  >;
  getBookingStyle: (booking: BookingWithDetails) => {
    top: string;
    height: string;
    left: string;
    right: string;
    position: 'absolute';
  };
  handleDragStart: (
    booking: BookingWithDetails,
    e: React.DragEvent,
    mode?: DragMode
  ) => void;
  handleDragEnd: () => void;
  handleDragOver: (
    e: React.DragEvent,
    teamMemberId: string,
    date: Date,
    time: string,
    slotIndex: number
  ) => void;
  handleDrop: (
    e: React.DragEvent,
    teamMemberId: string,
    date: Date,
    time: string,
    slotIndex: number
  ) => void;
  onTimeSlotClick?: (
    e: React.MouseEvent,
    time: string,
    date: Date,
    teamMember: TeamMember
  ) => void;
}

export function CalendarGridBody({
  displayDates,
  teamMembers,
  bookingsByMemberAndDate,
  viewMode,
  currentDate,
  columnWidth,
  hoveredSlot,
  setHoveredSlot,
  draggedBooking,
  dragOverSlot,
  dragPreview,
  dragMode,
  getBookingStyle,
  handleDragStart,
  handleDragEnd,
  handleDragOver,
  handleDrop,
  onTimeSlotClick,
}: CalendarGridBodyProps) {
  const renderTimeSlot = (
    time: string,
    index: number,
    member: TeamMember,
    date: Date,
    columnId: string
  ) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key =
      viewMode === 'day'
        ? `${member.id}-${time}`
        : `${dateStr}-${member.id}-${time}`;

    const isHovered =
      hoveredSlot?.time === time &&
      hoveredSlot?.columnId === columnId &&
      !draggedBooking;

    const isDragOver =
      dragOverSlot?.teamMemberId === member.id &&
      (viewMode === 'day' || dragOverSlot?.date === dateStr) &&
      dragOverSlot?.time === time;

    const slotStyle =
      viewMode === 'week'
        ? {
            height: `${SLOT_HEIGHT}px`,
            top: `${index * SLOT_HEIGHT}px`,
            width: columnWidth,
            left: `${teamMembers.indexOf(member) * parseFloat(columnWidth)}%`,
          }
        : {
            height: `${SLOT_HEIGHT}px`,
            top: `${index * SLOT_HEIGHT}px`,
          };

    return (
      <div
        key={key}
        className={`
          absolute w-full transition-colors duration-150 cursor-pointer
          ${isHovered ? 'bg-gray-100' : ''}
          ${
            isDragOver
              ? 'bg-blue-100 border-2 border-blue-400 border-dashed'
              : ''
          }
        `}
        style={slotStyle}
        onClick={(e) => {
          if (!draggedBooking && onTimeSlotClick) {
            onTimeSlotClick(e, time, date, member);
          }
        }}
        onMouseEnter={() =>
          !draggedBooking && setHoveredSlot({ time, columnId })
        }
        onMouseLeave={() => setHoveredSlot(null)}
        onDragOver={(e) => handleDragOver(e, member.id, date, time, index)}
        onDrop={(e) => handleDrop(e, member.id, date, time, index)}
      >
        {/* Show time on hover */}
        {isHovered && (
          <span className="absolute left-2 top-0 text-xs text-gray-600 font-medium">
            {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
          </span>
        )}

        {/* Show drop indicator when dragging */}
        {isDragOver && draggedBooking && (
          <div
            className="absolute inset-x-2 top-0 bg-blue-500 text-white 
                          text-xs px-2 py-0.5 rounded-sm font-medium"
          >
            {dragMode === 'move'
              ? 'Drop here: '
              : dragMode === 'resize-top'
              ? 'New start: '
              : 'New end: '}
            {format(parse(time, 'HH:mm', new Date()), 'h:mm a')}
          </div>
        )}
      </div>
    );
  };

  const renderBooking = (booking: BookingWithDetails, member: TeamMember) => {
    const style = getBookingStyle(booking);
    const backgroundColor = booking.category_color || '#6366f1';
    const isDragging = draggedBooking?.id === booking.id && dragMode === 'move';

    if (viewMode === 'week') {
      return (
        <div
          key={booking.id}
          style={{
            ...style,
            width: columnWidth,
            left: `${teamMembers.indexOf(member) * parseFloat(columnWidth)}%`,
          }}
          className="z-10 group relative"
        >
          <div
            className="absolute inset-0 rounded pointer-events-none"
            style={{ backgroundColor }}
          />

          {/* Top resize handle */}
          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
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

          {/* Booking card */}
          <div
            className="relative h-full pointer-events-auto"
            style={{ padding: '4px 0' }}
          >
            <BookingCard
              booking={booking}
              compact={true}
              onDragStart={(booking, e) => handleDragStart(booking, e, 'move')}
              onDragEnd={handleDragEnd}
              isDragging={isDragging}
              transparentBg={true}
            />
          </div>

          {/* Bottom resize handle */}
          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              handleDragStart(booking, e, 'resize-bottom');
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
    }

    // Day view
    return (
      <div key={booking.id} style={style} className="z-10 group relative">
        {/* Top resize handle */}
        <div
          draggable
          onDragStart={(e) => handleDragStart(booking, e, 'resize-top')}
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

        {/* Booking card */}
        <div className="relative h-full">
          <BookingCard
            booking={booking}
            compact={false}
            onDragStart={(booking, e) => handleDragStart(booking, e, 'move')}
            onDragEnd={handleDragEnd}
            isDragging={isDragging}
            transparentBg={true}
          />
        </div>

        {/* Bottom resize handle */}
        <div
          draggable
          onDragStart={(e) => handleDragStart(booking, e, 'resize-bottom')}
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
  };

  const renderGhostPreview = (member: TeamMember, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const showPreview =
      dragOverSlot?.teamMemberId === member.id &&
      (viewMode === 'day' || dragOverSlot?.date === dateStr) &&
      dragPreview;

    if (!showPreview || !draggedBooking) return null;

    const previewStyle =
      viewMode === 'week'
        ? {
            top: `${dragPreview.top}px`,
            height: `${dragPreview.height}px`,
            width: columnWidth,
            left: `${teamMembers.indexOf(member) * parseFloat(columnWidth)}%`,
            backgroundColor: draggedBooking.category_color || '#6366f1',
            borderRadius: '4px',
            border: '2px dashed #3b82f6',
          }
        : {
            top: `${dragPreview.top}px`,
            height: `${dragPreview.height}px`,
            left: '4px',
            right: '4px',
            backgroundColor: draggedBooking.category_color || '#6366f1',
            borderRadius: '6px',
            border: '2px dashed #3b82f6',
          };

    return (
      <div
        className="absolute z-5 pointer-events-none opacity-40"
        style={previewStyle}
      >
        {viewMode === 'day' && (
          <div className="p-1 text-xs font-medium text-white">
            {draggedBooking.service_name}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative" style={{ paddingTop: `${HEADER_HEIGHT}px` }}>
      {/* Time labels */}
      <div
        className="absolute top-0 left-0 bg-white border-r"
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
        style={{ left: `${TIME_COLUMN_WIDTH}px`, right: 0 }}
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
            ? // Day View
              teamMembers.map((member) => (
                <div key={member.id} className="flex-1 relative border-r">
                  {TIME_SLOTS.map((time, index) =>
                    renderTimeSlot(time, index, member, currentDate, member.id)
                  )}

                  {renderGhostPreview(member, currentDate)}

                  {bookingsByMemberAndDate
                    .get(`${member.id}-${format(currentDate, 'yyyy-MM-dd')}`)
                    ?.map((booking) => renderBooking(booking, member))}
                </div>
              ))
            : // Week View
              displayDates.map((date) => {
                const dateStr = format(date, 'yyyy-MM-dd');
                return (
                  <div key={dateStr} className="flex-1 relative border-r">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="relative">
                        {TIME_SLOTS.map((time, index) =>
                          renderTimeSlot(time, index, member, date, dateStr)
                        )}

                        {renderGhostPreview(member, date)}

                        {bookingsByMemberAndDate
                          .get(`${member.id}-${dateStr}`)
                          ?.map((booking) => renderBooking(booking, member))}
                      </div>
                    ))}
                  </div>
                );
              })}
        </div>
      </div>
    </div>
  );
}
