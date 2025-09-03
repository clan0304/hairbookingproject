/* eslint-disable @typescript-eslint/no-explicit-any */
// components/team/RegularShiftsModal.tsx
'use client';

import { useState } from 'react';
import { X, Trash2, Info } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import type { TeamMember } from '@/types/database';

interface TimeSlot {
  id: string;
  start: string;
  end: string;
}

interface DaySchedule {
  enabled: boolean;
  slots: TimeSlot[];
  totalHours: number;
}

interface RegularShiftsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamMember: TeamMember;
  shopId: string;
  shopName: string;
  onSave: (data: any) => void;
}

const DAYS_OF_WEEK = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  const period = hour < 12 ? 'am' : 'pm';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return {
    value: `${hour.toString().padStart(2, '0')}:${minute}`,
    label: `${displayHour}:${minute}${period}`,
  };
});

export function RegularShiftsModal({
  isOpen,
  onClose,
  teamMember,
  shopId,

  onSave,
}: RegularShiftsModalProps) {
  const [scheduleType, setScheduleType] = useState('everyWeek');
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [endOption, setEndOption] = useState('never');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);

  const [daySchedules, setDaySchedules] = useState<Record<string, DaySchedule>>(
    () => {
      const initial: Record<string, DaySchedule> = {};
      DAYS_OF_WEEK.forEach((day) => {
        initial[day] = {
          enabled: false,
          slots: [],
          totalHours: 0,
        };
      });
      return initial;
    }
  );

  const calculateHours = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return (endMinutes - startMinutes) / 60;
  };

  const toggleDay = (day: string) => {
    setDaySchedules((prev) => {
      const updated = { ...prev };
      const isEnabling = !updated[day].enabled;

      updated[day] = {
        ...updated[day],
        enabled: isEnabling,
        slots:
          isEnabling && updated[day].slots.length === 0
            ? [{ id: Date.now().toString(), start: '09:00', end: '17:00' }]
            : updated[day].slots,
      };

      if (isEnabling && updated[day].slots.length > 0) {
        const totalHours = updated[day].slots.reduce(
          (sum, slot) => sum + calculateHours(slot.start, slot.end),
          0
        );
        updated[day].totalHours = totalHours;
      }

      return updated;
    });
  };

  const updateSlot = (
    day: string,
    slotId: string,
    field: 'start' | 'end',
    value: string
  ) => {
    setDaySchedules((prev) => {
      const updated = { ...prev };
      const slotIndex = updated[day].slots.findIndex((s) => s.id === slotId);

      if (slotIndex !== -1) {
        updated[day].slots[slotIndex] = {
          ...updated[day].slots[slotIndex],
          [field]: value,
        };

        // Recalculate total hours
        updated[day].totalHours = updated[day].slots.reduce(
          (sum, slot) => sum + calculateHours(slot.start, slot.end),
          0
        );
      }

      return updated;
    });
  };

  const addSlot = (day: string) => {
    setDaySchedules((prev) => {
      const updated = { ...prev };
      const lastSlot = updated[day].slots[updated[day].slots.length - 1];
      const newStart = lastSlot ? lastSlot.end : '09:00';

      updated[day].slots.push({
        id: Date.now().toString(),
        start: newStart,
        end: '17:00',
      });

      // Recalculate total hours
      updated[day].totalHours = updated[day].slots.reduce(
        (sum, slot) => sum + calculateHours(slot.start, slot.end),
        0
      );

      return updated;
    });
  };

  const removeSlot = (day: string, slotId: string) => {
    setDaySchedules((prev) => {
      const updated = { ...prev };
      updated[day].slots = updated[day].slots.filter((s) => s.id !== slotId);

      // Recalculate total hours
      updated[day].totalHours = updated[day].slots.reduce(
        (sum, slot) => sum + calculateHours(slot.start, slot.end),
        0
      );

      // Disable day if no slots left
      if (updated[day].slots.length === 0) {
        updated[day].enabled = false;
      }

      return updated;
    });
  };

  const handleSave = async () => {
    setSaving(true);

    // Calculate end date based on selection
    let calculatedEndDate = null;
    if (endOption === 'date' && endDate) {
      calculatedEndDate = endDate;
    } else if (endOption === 'after') {
      // Default to 3 months if "after" is selected
      calculatedEndDate = format(
        addMonths(new Date(startDate), 3),
        'yyyy-MM-dd'
      );
    }

    const scheduleData = {
      team_member_id: teamMember.id,
      shop_id: shopId,
      schedule_type: scheduleType,
      start_date: startDate,
      end_date: calculatedEndDate,
      schedules: Object.entries(daySchedules)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .filter(([_, schedule]) => schedule.enabled)
        .map(([day, schedule]) => ({
          day_of_week: day.toLowerCase(),
          slots: schedule.slots,
        })),
    };

    await onSave(scheduleData);
    setSaving(false);
  };

  // Calculate total weekly hours
  const totalWeeklyHours = Object.values(daySchedules).reduce(
    (sum, schedule) => sum + (schedule.enabled ? schedule.totalHours : 0),
    0
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            Set {teamMember.first_name}&apos;s regular shifts
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="flex">
            {/* Left Panel - Settings */}
            <div className="w-1/3 p-6 border-r">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Schedule type
                  </label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="everyWeek">Every week</option>
                    <option value="everyTwoWeeks">Every two weeks</option>
                    <option value="everyMonth">Every month</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ends
                  </label>
                  <select
                    value={endOption}
                    onChange={(e) => setEndOption(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="never">Never</option>
                    <option value="date">On date</option>
                    <option value="after">After occurrences</option>
                  </select>

                  {endOption === 'date' && (
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full mt-2 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      min={startDate}
                    />
                  )}
                </div>

                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="flex items-start">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                    <p className="text-sm text-gray-700">
                      Team members will not be scheduled on business closed
                      periods.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel - Days */}
            <div className="flex-1 p-6">
              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day} className="border-b pb-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={daySchedules[day].enabled}
                          onChange={() => toggleDay(day)}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500 mr-3"
                        />
                        <div>
                          <span className="font-medium">{day}</span>
                          {daySchedules[day].enabled &&
                            daySchedules[day].totalHours > 0 && (
                              <span className="text-sm text-gray-500 ml-2">
                                {daySchedules[day].totalHours}h
                              </span>
                            )}
                        </div>
                      </div>
                    </div>

                    {daySchedules[day].enabled ? (
                      <div className="ml-8 space-y-2">
                        {daySchedules[day].slots.map((slot) => (
                          <div
                            key={slot.id}
                            className="flex items-center gap-2"
                          >
                            <select
                              value={slot.start}
                              onChange={(e) =>
                                updateSlot(
                                  day,
                                  slot.id,
                                  'start',
                                  e.target.value
                                )
                              }
                              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              {TIME_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            <span className="text-gray-500">-</span>

                            <select
                              value={slot.end}
                              onChange={(e) =>
                                updateSlot(day, slot.id, 'end', e.target.value)
                              }
                              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            >
                              {TIME_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            <button
                              onClick={() => removeSlot(day, slot.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}

                        <button
                          onClick={() => addSlot(day)}
                          className="text-purple-600 hover:text-purple-700 text-sm font-medium"
                        >
                          Add a shift
                        </button>
                      </div>
                    ) : (
                      <div className="ml-8 text-gray-500 text-sm">
                        No shifts
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Hours Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">
                  Total weekly hours:{' '}
                  <span className="font-semibold">{totalWeeklyHours}h</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || totalWeeklyHours === 0}
              className="px-6 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
