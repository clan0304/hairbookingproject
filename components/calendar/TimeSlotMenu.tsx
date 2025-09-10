// components/calendar/TimeSlotMenu.tsx
'use client';

import { Calendar, Users, CalendarX, X } from 'lucide-react';
import { format, parse } from 'date-fns';
import type { TeamMember } from '@/types/database';

interface TimeSlotMenuProps {
  time: string;
  date: Date;
  teamMember: TeamMember;
  position: { x: number; y: number };
  onClose: () => void;
  onAddAppointment: () => void;
  onAddGroupAppointment: () => void;
  onAddBlockedTime: () => void;
}

export function TimeSlotMenu({
  time,
  date,
  teamMember,
  position,
  onClose,
  onAddAppointment,
  onAddGroupAppointment,
  onAddBlockedTime,
}: TimeSlotMenuProps) {
  const formattedTime = format(parse(time, 'HH:mm', new Date()), 'h:mm a');

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        className="fixed z-50 bg-white rounded-lg shadow-xl border border-gray-200 py-2 min-w-[280px]"
        style={{
          top: `${position.y}px`,
          left: `${position.x}px`,
        }}
      >
        {/* Header */}
        <div className="px-4 py-2 bg-gray-100 border-b border-gray-200 flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">{formattedTime}</p>
            <p className="text-xs text-gray-600">
              {format(date, 'EEEE, MMMM d')} • {teamMember.first_name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="py-1">
          <button
            onClick={onAddAppointment}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">Add appointment</span>
          </button>

          <button
            onClick={onAddGroupAppointment}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <Users className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">Add group appointment</span>
          </button>

          <button
            onClick={onAddBlockedTime}
            className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-3 transition-colors"
          >
            <CalendarX className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">Add blocked time</span>
          </button>
        </div>
      </div>
    </>
  );
}
