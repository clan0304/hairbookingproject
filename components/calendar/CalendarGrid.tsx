// components/calendar/CalendarGrid.tsx
'use client';

import { DayView } from '@/components/calendar/DayView';
import { WeekView } from '@/components/calendar/WeekView';
import type { BookingWithLocalTimes, TeamMember } from '@/types/database';

type ViewMode = 'day' | 'week';

interface CalendarGridProps {
  bookings: BookingWithLocalTimes[];
  teamMembers: TeamMember[];
  selectedDate: Date;
  viewMode: ViewMode;
  loading: boolean;
}

export function CalendarGrid({
  bookings,
  teamMembers,
  selectedDate,
  viewMode,
  loading,
}: CalendarGridProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">Loading calendar...</div>
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg text-gray-500">No team members to display</div>
      </div>
    );
  }

  return (
    <div className="h-full bg-white rounded-lg shadow-sm border overflow-hidden">
      {viewMode === 'day' ? (
        <DayView
          bookings={bookings}
          teamMembers={teamMembers}
          selectedDate={selectedDate}
        />
      ) : (
        <WeekView
          bookings={bookings}
          teamMembers={teamMembers}
          selectedDate={selectedDate}
        />
      )}
    </div>
  );
}
