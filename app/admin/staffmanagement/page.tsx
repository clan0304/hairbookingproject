/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/staffmanagement/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Coffee,
  Users,
  FileText,
  Loader2,
  Play,
  Square,
  ChevronRight,
  ChevronLeft,
  DollarSign,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  format,
  parseISO,
  differenceInMinutes,
  startOfWeek,
  endOfWeek,
  addWeeks,
} from 'date-fns';

interface TeamMember {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  photo?: string;
}

interface Break {
  start: string;
  end: string | null;
  duration: number;
}

interface ShiftWithCalculations {
  id: string;
  team_member_id: string;
  date: string;
  shift_start: string;
  shift_end: string | null;
  breaks: Break[];
  status: 'active' | 'completed' | 'paid';
  total_break_minutes: number;
  notes?: string;
  team_member: TeamMember;
  // Calculated fields
  net_hours?: number;
  total_pay?: number;
  hourly_rate?: number;
  day_type?: string;
}

export default function StaffManagementPage() {
  // State variables
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [activeShifts, setActiveShifts] = useState<ShiftWithCalculations[]>([]);

  const [todayShifts, setTodayShifts] = useState<ShiftWithCalculations[]>([]);
  const [weeklyShifts, setWeeklyShifts] = useState<ShiftWithCalculations[]>([]);
  const [activeTab, setActiveTab] = useState<'clock' | 'active' | 'timesheet'>(
    'clock'
  );
  const [processing, setProcessing] = useState(false);
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<any>(null);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editedShift, setEditedShift] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.

  // Add these new state variables for auto clock-out functionality
  const [lastAutoClockOutDate, setLastAutoClockOutDate] = useState<string>('');
  const autoClockOutIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update current time and check for midnight
  useEffect(() => {
    const timer = setInterval(() => {
      const newTime = new Date();
      setCurrentTime(newTime);

      // Also check for midnight during regular time updates
      checkMidnightAutoClockOut();
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAutoClockOutDate]);

  // Fetch team members
  useEffect(() => {
    fetchTeamMembers();
  }, []);

  // Fetch shifts on component mount
  useEffect(() => {
    fetchActiveShifts();
    fetchTodayShifts();
    fetchWeeklyShifts(weekOffset);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekOffset]);

  // Auto clock-out functionality
  useEffect(() => {
    // Check immediately on mount
    checkMidnightAutoClockOut();

    // Set up interval to check every minute
    autoClockOutIntervalRef.current = setInterval(() => {
      checkMidnightAutoClockOut();
    }, 60000); // Check every 60 seconds

    // Cleanup interval on unmount
    return () => {
      if (autoClockOutIntervalRef.current) {
        clearInterval(autoClockOutIntervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAutoClockOutDate]);

  // Fetch team members
  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/admin/team');
      const data = await response.json();
      setTeamMembers(data.data || []);
    } catch (error) {
      console.error('Error fetching team members:', error);
    }
  };

  // Fetch active shifts
  const fetchActiveShifts = async () => {
    try {
      const response = await fetch('/api/admin/team/shifts?status=active');
      const data = await response.json();
      setActiveShifts(data.data || []);
    } catch (error) {
      console.error('Error fetching active shifts:', error);
    }
  };

  // Fetch today's shifts
  const fetchTodayShifts = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/admin/team/shifts?date=${today}`);
      const data = await response.json();
      setTodayShifts(data.data || []);
    } catch (error) {
      console.error('Error fetching today shifts:', error);
    }
  };

  // Fetch weekly shifts
  const fetchWeeklyShifts = async (offset: number) => {
    try {
      const weekRange = getWeekDateRange(offset);
      const startDate = weekRange.start.toISOString().split('T')[0];
      const endDate = weekRange.end.toISOString().split('T')[0];

      const response = await fetch(
        `/api/admin/team/shifts?start_date=${startDate}&end_date=${endDate}`
      );
      const data = await response.json();
      // Filter out active shifts for timesheet
      const completedShiftsOnly = (data.data || []).filter(
        (shift: ShiftWithCalculations) => shift.status !== 'active'
      );
      setWeeklyShifts(completedShiftsOnly);
    } catch (error) {
      console.error('Error fetching weekly shifts:', error);
    }
  };

  // Auto clock-out function
  const performAutoClockOut = async () => {
    try {
      const response = await fetch('/api/admin/team/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto_clockout' }), // Special action parameter
      });

      if (response.ok) {
        const result = await response.json();
        if (result.clockedOut > 0) {
          toast.info(
            `Automatic midnight clock-out: ${result.clockedOut} shift(s) ended`,
            {
              duration: 5000,
            }
          );
          // Refresh the shifts data
          fetchActiveShifts();
          fetchTodayShifts();
          // Refresh weekly shifts - fetchWeeklyShifts already filters out active shifts
          if (weekOffset === 0) fetchWeeklyShifts(0);
        }
      }
    } catch (error) {
      console.error('Auto clock-out error:', error);
    }
  };

  // Check if it's midnight and perform auto clock-out
  const checkMidnightAutoClockOut = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDateStr = now.toISOString().split('T')[0];

    // Check if it's between 00:00 and 00:01 (first minute after midnight)
    // and we haven't already run auto clock-out for this date
    if (
      currentHour === 0 &&
      currentMinute === 0 &&
      lastAutoClockOutDate !== currentDateStr
    ) {
      setLastAutoClockOutDate(currentDateStr);
      performAutoClockOut();
    }
  };

  // Handle clock in
  const handleClockIn = async () => {
    if (!selectedMember) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/team/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_member_id: selectedMember,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to clock in');
      }

      const {} = await response.json();
      toast.success('Clocked in successfully');
      setSelectedMember('');
      fetchActiveShifts();
      fetchTodayShifts();
      // Note: fetchWeeklyShifts already filters out active shifts
      if (weekOffset === 0) fetchWeeklyShifts(0); // Refresh weekly if viewing current week
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handle clock out
  const handleClockOut = async (shiftId: string) => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/team/shifts/${shiftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clock_out' }),
      });

      if (!response.ok) throw new Error('Failed to clock out');

      toast.success('Clocked out successfully');
      fetchActiveShifts();
      fetchTodayShifts();
      // Refresh weekly shifts - fetchWeeklyShifts already filters out active shifts
      if (weekOffset === 0) fetchWeeklyShifts(0);
    } catch (error) {
      toast.error(`${error} Failed to clock out`);
    } finally {
      setProcessing(false);
    }
  };

  // Handle break start/end
  const handleBreak = async (shiftId: string, action: 'start' | 'end') => {
    setProcessing(true);
    try {
      const response = await fetch(`/api/admin/team/shifts/${shiftId}/break`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!response.ok) throw new Error(`Failed to ${action} break`);

      toast.success(action === 'start' ? 'Break started' : 'Break ended');
      fetchActiveShifts();
      fetchTodayShifts();
      // Note: fetchWeeklyShifts already filters out active shifts
      if (weekOffset === 0) fetchWeeklyShifts(0);
    } catch (error) {
      toast.error(`Failed to ${error} break`);
    } finally {
      setProcessing(false);
    }
  };

  // ADD THIS: Handle save shift (for edit functionality)
  const handleSaveShift = async () => {
    if (!editingShiftId || !editedShift) return;

    try {
      setProcessing(true);

      const response = await fetch(`/api/admin/team/shifts/${editingShiftId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shift_start: editedShift.shift_start,
          shift_end: editedShift.shift_end,
          notes: editedShift.notes,
          date: editedShift.date,
          total_break_minutes: editedShift.total_break_minutes || 0,
        }),
      });

      if (response.ok) {
        toast.success('Shift updated successfully');

        // Refresh data
        fetchWeeklyShifts(weekOffset);
        fetchActiveShifts();
        fetchTodayShifts();

        // Update the selectedMemberDetail shifts if editing within modal
        if (selectedMemberDetail) {
          const updatedShifts = selectedMemberDetail.shifts.map((s: any) =>
            s.id === editingShiftId ? editedShift : s
          );
          setSelectedMemberDetail({
            ...selectedMemberDetail,
            shifts: updatedShifts,
          });
        }

        // Reset editing state
        setEditingShiftId(null);
        setEditedShift(null);
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update shift');
      }
    } catch (error) {
      console.error('Error updating shift:', error);
      toast.error('An error occurred while updating');
    } finally {
      setProcessing(false);
    }
  };

  // Format time helper
  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'h:mm a');
  };

  // ADD THIS: Helper function to format time for input fields
  const formatTimeForInput = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // ADD THIS: Helper function to update time while preserving date
  const updateTimeInShift = (shift: any, field: string, timeValue: string) => {
    const [hours, minutes] = timeValue.split(':');
    const dateObj = new Date(shift[field] || shift.date);
    dateObj.setHours(parseInt(hours), parseInt(minutes));
    return dateObj.toISOString();
  };

  // Get week date range
  const getWeekDateRange = (offset: number = 0) => {
    const now = new Date();
    const targetWeek = addWeeks(now, offset);
    const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });

    return {
      start: weekStart,
      end: weekEnd,
      formatted: `${format(weekStart, 'MMM d')} - ${format(
        weekEnd,
        'MMM d, yyyy'
      )}`,
    };
  };

  // Convert decimal hours to HH:MM format
  const formatHoursToHHMM = (decimalHours: number) => {
    const hours = Math.floor(decimalHours);
    const minutes = Math.round((decimalHours - hours) * 60);
    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Calculate live hours worked
  const calculateLiveHours = (shift: ShiftWithCalculations) => {
    const start = new Date(shift.shift_start);
    const end = shift.shift_end ? new Date(shift.shift_end) : currentTime;
    const totalMinutes = differenceInMinutes(end, start);

    // Get current break minutes (including live break if active)
    const breakMinutes = calculateLiveBreakMinutes(shift);
    const unpaidBreakMinutes = Math.max(breakMinutes - 20, 0);

    const netMinutes = totalMinutes - unpaidBreakMinutes;
    const hours = Math.floor(netMinutes / 60);
    const minutes = netMinutes % 60;

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
  };

  // Calculate live break minutes
  const calculateLiveBreakMinutes = (shift: ShiftWithCalculations) => {
    if (!shift.breaks || shift.breaks.length === 0) return 0;

    let totalBreakMinutes = 0;

    for (const brk of shift.breaks) {
      if (brk.end) {
        // Completed break
        totalBreakMinutes += brk.duration || 0;
      } else {
        // Active break - calculate live duration
        const breakStart = new Date(brk.start);
        const breakMinutes = differenceInMinutes(currentTime, breakStart);
        totalBreakMinutes += breakMinutes;
      }
    }

    return totalBreakMinutes;
  };

  // Format break time with live updates
  const formatBreakTime = (shift: ShiftWithCalculations) => {
    const totalMinutes = calculateLiveBreakMinutes(shift);
    const hours = Math.floor(totalMinutes / 60);

    if (hours > 0) {
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
    return `${totalMinutes} mins`;
  };

  // Check if on break
  const isOnBreak = (shift: ShiftWithCalculations) => {
    return shift.breaks && shift.breaks.some((b: any) => !b.end);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Staff Management
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage shifts, breaks, and timesheets
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('clock')}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'clock'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  Clock In/Out
                </div>
              </button>

              <button
                onClick={() => setActiveTab('timesheet')}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'timesheet'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Weekly Timesheet
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'clock' && (
              <div>
                {/* Clock In Section */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4">Clock In</h3>
                  <div className="flex gap-4">
                    <select
                      value={selectedMember}
                      onChange={(e) => setSelectedMember(e.target.value)}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                      disabled={processing}
                    >
                      <option value="">Select team member...</option>
                      {teamMembers.map((member) => {
                        const hasActiveShift = activeShifts.some(
                          (s) => s.team_member_id === member.id
                        );
                        return (
                          <option
                            key={member.id}
                            value={member.id}
                            disabled={hasActiveShift}
                          >
                            {member.first_name} {member.last_name}
                            {hasActiveShift && ' (Already clocked in)'}
                          </option>
                        );
                      })}
                    </select>
                    <button
                      onClick={handleClockIn}
                      disabled={!selectedMember || processing}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      {processing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Clock In
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Active Shifts Section */}
                <div className="bg-white rounded-lg">
                  <h3 className="text-lg font-semibold mb-4">Active Shifts</h3>
                  {activeShifts.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">
                      No active shifts at the moment
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {activeShifts.map((shift) => {
                        const onBreak = isOnBreak(shift);

                        return (
                          <div
                            key={shift.id}
                            className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                                    <span className="text-purple-600 font-semibold text-sm">
                                      {shift.team_member.first_name[0]}
                                      {shift.team_member.last_name[0]}
                                    </span>
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {shift.team_member.first_name}{' '}
                                      {shift.team_member.last_name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      Started: {formatTime(shift.shift_start)}
                                    </p>
                                  </div>
                                </div>
                                <div className="mt-3 flex items-center gap-4 text-sm">
                                  <p className="text-gray-600">
                                    Hours: {calculateLiveHours(shift)}
                                  </p>
                                  <p
                                    className={
                                      onBreak
                                        ? 'text-yellow-600 font-medium'
                                        : ''
                                    }
                                  >
                                    Break time: {formatBreakTime(shift)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex gap-2">
                                {onBreak ? (
                                  <button
                                    onClick={() => handleBreak(shift.id, 'end')}
                                    disabled={processing}
                                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors flex items-center text-sm"
                                  >
                                    <Coffee className="w-4 h-4 mr-1" />
                                    End Break
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleBreak(shift.id, 'start')
                                    }
                                    disabled={processing}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center text-sm"
                                  >
                                    <Coffee className="w-4 h-4 mr-1" />
                                    Start Break
                                  </button>
                                )}
                                <button
                                  onClick={() => handleClockOut(shift.id)}
                                  disabled={processing}
                                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center text-sm"
                                >
                                  <Square className="w-4 h-4 mr-1" />
                                  Clock Out
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'timesheet' && (
              <div>
                {/* Week Navigation */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setWeekOffset(weekOffset - 1)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-medium">
                      {getWeekDateRange(weekOffset).formatted}
                    </h3>
                    <button
                      onClick={() => setWeekOffset(weekOffset + 1)}
                      disabled={weekOffset >= 0}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                  {weekOffset !== 0 && (
                    <button
                      onClick={() => setWeekOffset(0)}
                      className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Back to current week
                    </button>
                  )}
                </div>

                {/* Weekly Summary Table */}
                <div className="bg-white rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-3 px-6 font-medium text-gray-700">
                          Team Member
                        </th>
                        <th className="text-left py-3 px-6 font-medium text-gray-700">
                          Total Hours
                        </th>
                        <th className="text-left py-3 px-6 font-medium text-gray-700">
                          Total Pay
                        </th>
                        <th className="text-left py-3 px-6 font-medium text-gray-700">
                          Shifts
                        </th>
                        <th className="text-center py-3 px-6 font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(() => {
                        // Group shifts by team member
                        const memberGroups = weeklyShifts.reduce(
                          (acc: any, shift) => {
                            const memberId = shift.team_member_id;
                            if (!acc[memberId]) {
                              acc[memberId] = {
                                member: shift.team_member,
                                shifts: [],
                                totalHours: 0,
                                totalPay: 0,
                                totalBreaks: 0,
                              };
                            }
                            acc[memberId].shifts.push(shift);
                            acc[memberId].totalHours += shift.net_hours || 0;
                            acc[memberId].totalPay += shift.total_pay || 0;
                            acc[memberId].totalBreaks +=
                              shift.total_break_minutes || 0;
                            return acc;
                          },
                          {}
                        );

                        return Object.values(memberGroups).map((data: any) => (
                          <tr
                            key={data.member.id}
                            className="hover:bg-gray-50 cursor-pointer"
                            onClick={() => setSelectedMemberDetail(data)}
                          >
                            <td className="py-4 px-6">
                              <div className="font-medium text-gray-900">
                                {data.member.first_name} {data.member.last_name}
                              </div>
                              <div className="text-sm text-gray-500">
                                {data.member.email}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="text-gray-900">
                                {formatHoursToHHMM(data.totalHours)}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="font-medium text-green-600">
                                ${data.totalPay.toFixed(2)}
                              </div>
                            </td>
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-900">
                                  {data.shifts.length}
                                </span>
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                  completed
                                </span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-center">
                              <button className="text-purple-600 hover:text-purple-700 font-medium text-sm">
                                View Details
                              </button>
                            </td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Member Detail Modal */}
                {selectedMemberDetail && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold">
                          {selectedMemberDetail.member.first_name}{' '}
                          {selectedMemberDetail.member.last_name} - Shift
                          Details
                        </h3>
                        <button
                          onClick={() => {
                            setSelectedMemberDetail(null);
                            setEditingShiftId(null);
                            setEditedShift(null);
                          }}
                          className="text-gray-400 hover:text-gray-500"
                        >
                          <X className="w-6 h-6" />
                        </button>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Total Hours
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatHoursToHHMM(selectedMemberDetail.totalHours)}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Total Pay
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            ${selectedMemberDetail.totalPay.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex items-center gap-2 text-purple-600 mb-1">
                            <Coffee className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Total Breaks
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {selectedMemberDetail.totalBreaks} mins
                          </p>
                        </div>
                      </div>

                      {/* Shifts Table */}
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                Date
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                Start Time
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                End Time
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                Hours
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                Breaks
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                Rate
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                Pay
                              </th>
                              <th className="text-left py-3 px-4 font-medium text-gray-700">
                                Status
                              </th>
                              <th className="text-center py-3 px-4 font-medium text-gray-700">
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {selectedMemberDetail.shifts.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="text-center py-8 text-gray-500"
                                >
                                  No completed shifts found
                                </td>
                              </tr>
                            ) : (
                              selectedMemberDetail.shifts.map((shift: any) => {
                                const isEditing = editingShiftId === shift.id;

                                return (
                                  <tr
                                    key={shift.id}
                                    className={
                                      isEditing ? 'bg-blue-50' : 'border-t'
                                    }
                                  >
                                    <td className="py-3 px-4">
                                      {isEditing ? (
                                        <input
                                          type="date"
                                          value={editedShift?.date || ''}
                                          onChange={(e) =>
                                            setEditedShift({
                                              ...editedShift,
                                              date: e.target.value,
                                            })
                                          }
                                          className="px-2 py-1 border rounded"
                                        />
                                      ) : (
                                        format(parseISO(shift.date), 'MMM d')
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      {isEditing ? (
                                        <input
                                          type="time"
                                          value={formatTimeForInput(
                                            editedShift?.shift_start
                                          )}
                                          onChange={(e) =>
                                            setEditedShift({
                                              ...editedShift,
                                              shift_start: updateTimeInShift(
                                                editedShift,
                                                'shift_start',
                                                e.target.value
                                              ),
                                            })
                                          }
                                          className="px-2 py-1 border rounded"
                                        />
                                      ) : (
                                        formatTime(shift.shift_start)
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      {isEditing ? (
                                        <input
                                          type="time"
                                          value={formatTimeForInput(
                                            editedShift?.shift_end
                                          )}
                                          onChange={(e) =>
                                            setEditedShift({
                                              ...editedShift,
                                              shift_end: updateTimeInShift(
                                                editedShift,
                                                'shift_end',
                                                e.target.value
                                              ),
                                            })
                                          }
                                          className="px-2 py-1 border rounded"
                                        />
                                      ) : shift.shift_end ? (
                                        formatTime(shift.shift_end)
                                      ) : (
                                        '-'
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      {formatHoursToHHMM(shift.net_hours || 0)}
                                    </td>
                                    <td className="py-3 px-4">
                                      {isEditing ? (
                                        <input
                                          type="number"
                                          value={
                                            editedShift?.total_break_minutes ||
                                            0
                                          }
                                          onChange={(e) =>
                                            setEditedShift({
                                              ...editedShift,
                                              total_break_minutes:
                                                parseInt(e.target.value) || 0,
                                            })
                                          }
                                          className="px-2 py-1 border rounded w-20"
                                          min="0"
                                        />
                                      ) : (
                                        `${shift.total_break_minutes || 0} mins`
                                      )}
                                    </td>
                                    <td className="py-3 px-4">
                                      ${shift.hourly_rate || 0}/hr
                                    </td>
                                    <td className="py-3 px-4 font-medium text-green-600">
                                      ${(shift.total_pay || 0).toFixed(2)}
                                    </td>
                                    <td className="py-3 px-4">
                                      <span
                                        className={`px-2 py-1 text-xs rounded-full ${
                                          shift.status === 'completed'
                                            ? 'bg-gray-100 text-gray-800'
                                            : 'bg-blue-100 text-blue-800'
                                        }`}
                                      >
                                        {shift.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4">
                                      <div className="flex justify-center gap-2">
                                        {isEditing ? (
                                          <>
                                            <button
                                              onClick={handleSaveShift}
                                              disabled={processing}
                                              className="text-green-600 hover:text-green-700 disabled:opacity-50"
                                              title="Save"
                                            >
                                              ✓
                                            </button>
                                            <button
                                              onClick={() => {
                                                setEditingShiftId(null);
                                                setEditedShift(null);
                                              }}
                                              className="text-red-600 hover:text-red-700"
                                              title="Cancel"
                                            >
                                              ✗
                                            </button>
                                          </>
                                        ) : (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (shift.status === 'paid') {
                                                  toast.error(
                                                    'Cannot edit paid shifts'
                                                  );
                                                  return;
                                                }
                                                setEditingShiftId(shift.id);
                                                setEditedShift(shift);
                                              }}
                                              className={
                                                shift.status === 'paid'
                                                  ? 'text-gray-400 cursor-not-allowed'
                                                  : 'text-blue-600 hover:text-blue-700'
                                              }
                                              disabled={shift.status === 'paid'}
                                            >
                                              <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                              onClick={async (e) => {
                                                e.stopPropagation();
                                                if (shift.status === 'paid') {
                                                  toast.error(
                                                    'Cannot delete paid shifts'
                                                  );
                                                  return;
                                                }
                                                if (
                                                  confirm(
                                                    'Delete this shift record?'
                                                  )
                                                ) {
                                                  try {
                                                    const response =
                                                      await fetch(
                                                        `/api/admin/team/shifts/${shift.id}`,
                                                        { method: 'DELETE' }
                                                      );
                                                    if (response.ok) {
                                                      toast.success(
                                                        'Shift deleted successfully'
                                                      );
                                                      // Refresh and close modal
                                                      fetchWeeklyShifts(
                                                        weekOffset
                                                      );
                                                      fetchActiveShifts();
                                                      fetchTodayShifts();
                                                      setSelectedMemberDetail(
                                                        null
                                                      );
                                                    }
                                                  } catch (error) {
                                                    toast.error(
                                                      'Failed to delete shift'
                                                    );
                                                  }
                                                }
                                              }}
                                              className={
                                                shift.status === 'paid'
                                                  ? 'text-gray-400 cursor-not-allowed'
                                                  : 'text-red-600 hover:text-red-700'
                                              }
                                              disabled={shift.status === 'paid'}
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
