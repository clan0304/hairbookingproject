// components/calendar/BookingCard.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, User, Mail, Phone } from 'lucide-react';
import type { BookingWithLocalTimes as BookingWithDetails } from '@/types/database';

interface BookingCardProps {
  booking: BookingWithDetails;
  compact?: boolean;
  onDragStart?: (booking: BookingWithDetails) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
}

export function BookingCard({
  booking,
  compact = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
}: BookingCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Parse times
  const startTime = parse(booking.start_time, 'HH:mm:ss', new Date());
  const endTime = parse(booking.end_time, 'HH:mm:ss', new Date());

  // Get color based on service category
  const backgroundColor = booking.category_color || '#6366f1';
  const isLightColor = (color: string) => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 155;
  };

  const textColor = isLightColor(backgroundColor)
    ? 'text-gray-900'
    : 'text-white';

  // Calculate popover position
  useEffect(() => {
    if (showDetails && cardRef.current && !isDragging) {
      const rect = cardRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Default position (right of the card)
      let left = rect.right + 8;
      let top = rect.top;

      // Check if popover would go off-screen
      if (left + 320 > viewportWidth) {
        // Show on left side instead
        left = rect.left - 328;
      }

      // If still off-screen (too far left), center it
      if (left < 8) {
        left = rect.left;
      }

      // Adjust vertical position if needed
      if (top + 400 > viewportHeight) {
        top = Math.max(8, viewportHeight - 408);
      }

      setPopoverPosition({ top, left });
    }
  }, [showDetails, isDragging]);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        cardRef.current &&
        !cardRef.current.contains(event.target as Node)
      ) {
        setShowDetails(false);
      }
    }

    if (showDetails) {
      document.addEventListener('mousedown', handleClickOutside);
      return () =>
        document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDetails]);

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) {
      onDragStart(booking);
      // Set drag effect
      e.dataTransfer.effectAllowed = 'move';
      // Store booking data in drag event
      e.dataTransfer.setData('bookingId', booking.id);
      e.dataTransfer.setData('bookingData', JSON.stringify(booking));
      // Hide details popover when starting drag
      setShowDetails(false);
    }
  };

  const handleDragEnd = () => {
    if (onDragEnd) {
      onDragEnd();
    }
  };

  const handleClick = () => {
    // Don't show details if we're dragging
    if (!isDragging) {
      setShowDetails(!showDetails);
    }
  };

  if (compact) {
    // Compact view for week mode
    return (
      <>
        <div
          ref={cardRef}
          onClick={handleClick}
          draggable={true}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          className={`rounded px-1 py-0.5 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${textColor} ${
            isDragging ? 'opacity-50' : ''
          }`}
          style={{
            backgroundColor,
            cursor: isDragging ? 'grabbing' : 'grab',
          }}
        >
          <p className="text-xs font-medium truncate">
            {format(startTime, 'h:mm a')}
          </p>
          <p className="text-xs truncate">
            {booking.client_first_name} {booking.client_last_name?.[0]}
          </p>
        </div>

        {showDetails && !isDragging && (
          <div
            ref={popoverRef}
            className="fixed z-50 w-80 rounded-md border bg-white p-4 shadow-md"
            style={{
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`,
            }}
          >
            <BookingDetails booking={booking} />
          </div>
        )}
      </>
    );
  }

  // Full view for day mode
  return (
    <>
      <div
        ref={cardRef}
        onClick={handleClick}
        draggable={true}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        className={`rounded-md px-2 py-1.5 cursor-pointer hover:opacity-90 transition-opacity overflow-hidden ${textColor} ${
          isDragging ? 'opacity-50' : ''
        }`}
        style={{
          backgroundColor,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-medium">
            {format(startTime, 'h:mm')} - {format(endTime, 'h:mm a')}
          </p>
        </div>
        <p className="text-sm font-medium truncate">
          {booking.client_first_name} {booking.client_last_name}
        </p>
        <p className="text-xs opacity-90 truncate">
          {booking.service_name}
          {booking.variant_name && ` - ${booking.variant_name}`}
        </p>
      </div>

      {showDetails && !isDragging && (
        <div
          ref={popoverRef}
          className="fixed z-50 w-80 rounded-md border bg-white p-4 shadow-md"
          style={{
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
          }}
        >
          <BookingDetails booking={booking} />
        </div>
      )}
    </>
  );
}

function BookingDetails({ booking }: { booking: BookingWithDetails }) {
  const startTime = parse(booking.start_time, 'HH:mm:ss', new Date());
  const endTime = parse(booking.end_time, 'HH:mm:ss', new Date());

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-semibold">
            {booking.client_first_name} {booking.client_last_name}
          </h4>
          <p className="text-sm text-gray-500">
            Booking #{booking.booking_number}
          </p>
        </div>
        <Badge
          variant={booking.status === 'confirmed' ? 'default' : 'secondary'}
        >
          {booking.status}
        </Badge>
      </div>

      {/* Service Details */}
      <div
        className="p-3 rounded-md"
        style={{ backgroundColor: `${booking.category_color}15` }}
      >
        <p className="font-medium text-sm">{booking.service_name}</p>
        {booking.variant_name && (
          <p className="text-sm text-gray-600">
            Variant: {booking.variant_name}
          </p>
        )}
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{booking.duration} min</span>
          </div>
          <span>${booking.price.toFixed(2)}</span>
        </div>
      </div>

      {/* Time */}
      <div className="flex items-center gap-2 text-sm">
        <Clock className="h-4 w-4 text-gray-400" />
        <span>
          {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
        </span>
      </div>

      {/* Staff */}
      <div className="flex items-center gap-2 text-sm">
        <User className="h-4 w-4 text-gray-400" />
        <span>
          {booking.team_member_first_name} {booking.team_member_last_name}
        </span>
      </div>

      {/* Contact Info */}
      {booking.client_email && (
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-gray-400" />
          <a
            href={`mailto:${booking.client_email}`}
            className="text-blue-600 hover:underline"
          >
            {booking.client_email}
          </a>
        </div>
      )}

      {booking.client_phone && (
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-gray-400" />
          <a
            href={`tel:${booking.client_phone}`}
            className="text-blue-600 hover:underline"
          >
            {booking.client_phone}
          </a>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t">
        <Button size="sm" variant="outline" className="flex-1">
          Edit
        </Button>
        <Button size="sm" variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button size="sm" className="flex-1">
          Complete
        </Button>
      </div>
    </div>
  );
}
