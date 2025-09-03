// components/calendar/CalendarGrid.tsx
'use client';

import { DayView } from '@/components/calendar/DayView';
import { WeekView } from '@/components/calendar/WeekView';
import type { BookingWithLocalTimes, TeamMember } from '@/types/database';
import { Users } from 'lucide-react';

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
      <div className="flex items-center justify-center h-full bg-white rounded-lg shadow-sm border">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
            <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
          </div>
          <div className="text-lg text-gray-500">Loading calendar...</div>
        </div>
      </div>
    );
  }

  if (teamMembers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-white rounded-lg shadow-sm border">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <Users size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Team Members Assigned
          </h3>
          <p className="text-gray-500">
            There are no team members assigned to this shop yet. Please assign
            team members to this shop to view their schedules.
          </p>
          <p className="text-sm text-gray-400 mt-4">
            Tip: You can assign team members from the Team Members page or the
            Shop Settings.
          </p>
        </div>
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
