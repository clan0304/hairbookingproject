// components/calendar/CurrentTimeIndicator.tsx
'use client';

import { useEffect, useState } from 'react';

interface TimeSlot {
  hour: number;
  minute: number;
  label?: string;
  display?: string;
}

interface CurrentTimeIndicatorProps {
  timeSlots?: TimeSlot[];
  slotHeight?: number;
}

export function CurrentTimeIndicator({
  timeSlots = [],
  slotHeight = 20,
}: CurrentTimeIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Update immediately on mount
    setCurrentTime(new Date());

    // Then update every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  // Safety checks
  if (!timeSlots || timeSlots.length === 0) {
    console.warn('CurrentTimeIndicator: No time slots provided');
    return null;
  }

  const currentHour = currentTime.getHours();
  const currentMinute = currentTime.getMinutes();

  // Check if current time is within the time slots range
  const firstSlot = timeSlots[0];
  const lastSlot = timeSlots[timeSlots.length - 1];

  if (!firstSlot || !lastSlot) {
    return null;
  }

  // Check if current time is outside of business hours
  if (
    currentHour < firstSlot.hour ||
    (currentHour === lastSlot.hour && currentMinute > lastSlot.minute + 14) ||
    currentHour > lastSlot.hour
  ) {
    return null;
  }

  // Find the slot that contains the current time
  let slotIndex = -1;
  for (let i = 0; i < timeSlots.length; i++) {
    const slot = timeSlots[i];
    if (!slot) continue;

    if (slot.hour === currentHour) {
      // Check if current minute falls within this 15-minute slot
      if (currentMinute >= slot.minute && currentMinute < slot.minute + 15) {
        slotIndex = i;
        break;
      }
    }
  }

  // If we couldn't find an exact slot, return null
  if (slotIndex === -1) {
    return null;
  }

  // Calculate exact position
  const slot = timeSlots[slotIndex];
  const minutesIntoSlot = currentMinute - slot.minute;
  const pixelOffset = (minutesIntoSlot / 15) * slotHeight;
  const topPosition = slotIndex * slotHeight + pixelOffset;

  return (
    <div
      className="absolute left-0 right-0 z-30 pointer-events-none"
      style={{ top: `${topPosition}px` }}
    >
      <div className="relative flex items-center">
        {/* Red dot */}
        <div className="absolute -left-2 w-2 h-2 bg-red-500 rounded-full shadow-sm" />
        {/* Red line */}
        <div className="w-full h-0.5 bg-red-500 shadow-sm" />
        {/* Time label */}
        <div className="absolute right-0 -top-2 text-[10px] text-red-500 font-medium px-1 bg-white rounded">
          {currentTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })}
        </div>
      </div>
    </div>
  );
}

// Also export as default for compatibility
export default CurrentTimeIndicator;
