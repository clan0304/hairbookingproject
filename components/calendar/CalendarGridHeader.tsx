// components/calendar/CalendarGridHeader.tsx
'use client';

import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { TeamMember } from '@/types/database';
import type { ViewMode } from './CalendarGrid';
import { TIME_COLUMN_WIDTH } from './CalendarGrid';

interface CalendarGridHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  teamMembers: TeamMember[];
  displayDates: Date[];
  columnWidth: string;
}

export function CalendarGridHeader({
  currentDate,
  viewMode,
  teamMembers,
  displayDates,
  columnWidth,
}: CalendarGridHeaderProps) {
  return (
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
  );
}
