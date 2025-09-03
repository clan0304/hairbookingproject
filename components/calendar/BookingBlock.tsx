// components/calendar/BookingBlock.tsx
'use client';

import { useMemo } from 'react';
import type { BookingWithLocalTimes } from '@/types/database';
import { parseISO, format } from 'date-fns';

interface BookingBlockProps {
  booking: BookingWithLocalTimes;
  dayStartHour: number;
  pixelsPerHour: number;
  isCompact?: boolean;
}

export function BookingBlock({
  booking,
  dayStartHour,
  pixelsPerHour,
  isCompact = false,
}: BookingBlockProps) {
  const position = useMemo(() => {
    const startTime = parseISO(booking.starts_at_local);
    const endTime = parseISO(booking.ends_at_local);

    const startHour = startTime.getHours() + startTime.getMinutes() / 60;
    const endHour = endTime.getHours() + endTime.getMinutes() / 60;

    const top = (startHour - dayStartHour) * pixelsPerHour;
    const height = (endHour - startHour) * pixelsPerHour;

    return { top, height };
  }, [booking, dayStartHour, pixelsPerHour]);

  // Use category color or default
  const backgroundColor = booking.category_color || '#9333ea';

  // Determine text color based on background
  const textColor = isLightColor(backgroundColor) ? '#000' : '#fff';

  return (
    <div
      className="absolute left-1 right-1 rounded-md p-2 shadow-sm border border-white/20 cursor-pointer hover:shadow-md transition-shadow"
      style={{
        top: `${position.top}px`,
        height: `${position.height}px`,
        backgroundColor,
        color: textColor,
      }}
    >
      <div className={`flex flex-col ${isCompact ? 'text-xs' : 'text-sm'}`}>
        <div className="font-medium truncate">
          {format(parseISO(booking.starts_at_local), 'h:mm a')} -
          {format(parseISO(booking.ends_at_local), 'h:mm a')}
        </div>
        <div className="font-semibold truncate">
          {booking.client_first_name} {booking.client_last_name}
        </div>
        {!isCompact && (
          <div className="text-xs opacity-90 truncate">
            {booking.service_name}
            {booking.variant_name && ` - ${booking.variant_name}`}
          </div>
        )}
      </div>
    </div>
  );
}

// Helper function to determine if a color is light
function isLightColor(color: string): boolean {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 155;
}
