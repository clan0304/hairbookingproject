// components/availability/AvailabilityCalendar.tsx
// ============================================
'use client';

import { useState } from 'react';
import { format, addDays, isSameDay } from 'date-fns';
import { EditSlotModal } from './EditSlotModal';
import type { AvailabilitySlot, TeamMember, Shop } from '@/types/database';
import Image from 'next/image';

interface AvailabilityCalendarProps {
  slots: AvailabilitySlot[];
  teamMembers: TeamMember[];
  shops: Shop[];
  weekStart: Date;
  onSlotUpdate: () => void;
}

export function AvailabilityCalendar({
  slots,
  teamMembers,
  shops,
  weekStart,
  onSlotUpdate,
}: AvailabilityCalendarProps) {
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(
    null
  );
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Group slots by team member
  const slotsByMember = teamMembers.reduce((acc, member) => {
    acc[member.id] = slots.filter((slot) => slot.team_member_id === member.id);
    return acc;
  }, {} as Record<string, AvailabilitySlot[]>);

  const getSlotForDay = (memberId: string, day: Date) => {
    return (
      slotsByMember[memberId]?.filter((slot) =>
        isSameDay(new Date(slot.date), day)
      ) || []
    );
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'pm' : 'am';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}${minutes !== '00' ? `:${minutes}` : ''}${ampm}`;
  };

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-4 font-medium text-gray-900 min-w-[200px]">
                Team Member
              </th>
              {days.map((day) => (
                <th
                  key={day.toISOString()}
                  className="text-center p-4 min-w-[140px]"
                >
                  <div className="font-medium text-gray-900">
                    {format(day, 'EEE')}
                  </div>
                  <div className="text-sm text-gray-500">
                    {format(day, 'MMM d')}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member) => (
              <tr key={member.id} className="border-b hover:bg-gray-50">
                <td className="p-4">
                  <div className="flex items-center">
                    {member.photo ? (
                      <Image
                        src={member.photo}
                        alt={member.first_name}
                        className="w-8 h-8 rounded-full mr-3"
                        width={8}
                        height={8}
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 mr-3 flex items-center justify-center text-xs font-medium text-white">
                        {member.first_name[0]}
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.first_name} {member.last_name}
                      </div>
                      <div className="text-xs text-gray-500">{member.role}</div>
                    </div>
                  </div>
                </td>
                {days.map((day) => {
                  const daySlots = getSlotForDay(member.id, day);
                  return (
                    <td
                      key={day.toISOString()}
                      className="p-2 text-center align-top"
                    >
                      {daySlots.length > 0 ? (
                        <div className="space-y-1">
                          {daySlots.map((slot) => {
                            const shop = shops.find(
                              (s) => s.id === slot.shop_id
                            );
                            return (
                              <button
                                key={slot.id}
                                onClick={() => setSelectedSlot(slot)}
                                className="w-full px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-800 rounded transition-colors"
                              >
                                <div className="font-medium">
                                  {formatTime(slot.start_time)} -{' '}
                                  {formatTime(slot.end_time)}
                                </div>
                                <div className="text-blue-600 truncate">
                                  {shop?.name}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-gray-400 text-xs">No shifts</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Slot Modal */}
      {selectedSlot && (
        <EditSlotModal
          slot={selectedSlot}
          shops={shops}
          onClose={() => setSelectedSlot(null)}
          onSuccess={() => {
            setSelectedSlot(null);
            onSlotUpdate();
          }}
        />
      )}
    </>
  );
}
