// components/calendar/CurrentTimeIndicator.tsx
'use client';

import { useEffect, useState } from 'react';

interface CurrentTimeIndicatorProps {
  startHour: number;
  endHour: number;
  pixelsPerMinute: number;
}

export function CurrentTimeIndicator({
  startHour,
  endHour,
  pixelsPerMinute,
}: CurrentTimeIndicatorProps) {
  const [currentMinutes, setCurrentMinutes] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const totalMinutes = hours * 60 + minutes;
      const startMinutes = startHour * 60;
      const endMinutes = endHour * 60;

      // Check if current time is within the visible range
      if (totalMinutes >= startMinutes && totalMinutes <= endMinutes) {
        setCurrentMinutes(totalMinutes - startMinutes);
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Update immediately
    updateTime();

    // Update every minute
    const interval = setInterval(updateTime, 60000);

    return () => clearInterval(interval);
  }, [startHour, endHour]);

  if (!isVisible) return null;

  const topPosition = currentMinutes * pixelsPerMinute;
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <div
      className="absolute left-0 right-0 pointer-events-none z-30"
      style={{ top: `${topPosition}px` }}
    >
      {/* Time label */}
      <div className="absolute -left-20 -top-2 bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
        {currentTime}
      </div>

      {/* Red line */}
      <div className="h-0.5 bg-red-500 relative">
        {/* Red dot at the start */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-red-500 rounded-full" />
      </div>
    </div>
  );
}
