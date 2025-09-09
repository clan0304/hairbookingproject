/* eslint-disable @typescript-eslint/no-explicit-any */
// app/admin/staffmanagement/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Coffee,
  Calendar,
  Users,
  FileText,
  Loader2,
  Play,
  Square,
  ChevronRight,
  ChevronLeft,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [todayShifts, setTodayShifts] = useState<ShiftWithCalculations[]>([]);
  const [weeklyShifts, setWeeklyShifts] = useState<ShiftWithCalculations[]>([]);
  const [activeTab, setActiveTab] = useState<'clock' | 'active' | 'timesheet'>(
    'clock'
  );
  const [processing, setProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.

  // Ref to store interval ID for cleanup
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch team members
  const fetchTeamMembers = async () => {
    try {
      const response = await fetch('/api/admin/team');
      if (!response.ok) throw new Error('Failed to fetch team members');
      const { data } = await response.json();
      setTeamMembers(data);
    } catch (error) {
      toast.error('Failed to load team members');
      console.error(error);
    }
  };

  // Fetch active shifts (from any date)
  const fetchActiveShifts = async () => {
    try {
      const response = await fetch(`/api/admin/team/shifts?status=active`);
      if (!response.ok) throw new Error('Failed to fetch active shifts');
      const { data } = await response.json();
      setActiveShifts(data);
    } catch (error) {
      toast.error('Failed to load active shifts');
      console.error(error);
    }
  };

  // Fetch today's shifts
  const fetchTodayShifts = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(`/api/admin/team/shifts?date=${today}`);
      if (!response.ok) throw new Error('Failed to fetch shifts');
      const { data } = await response.json();
      setTodayShifts(data);
    } catch (error) {
      toast.error('Failed to load shifts');
      console.error(error);
    }
  };

  // Fetch weekly shifts
  const fetchWeeklyShifts = async (offset: number = 0) => {
    try {
      const now = new Date();
      const targetWeek = addWeeks(now, offset);
      const weekStart = startOfWeek(targetWeek, { weekStartsOn: 1 }); // Monday as start
      const weekEnd = endOfWeek(targetWeek, { weekStartsOn: 1 });

      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');

      const response = await fetch(
        `/api/admin/team/shifts?start_date=${startDate}&end_date=${endDate}`
      );
      if (!response.ok) throw new Error('Failed to fetch weekly shifts');
      const { data } = await response.json();

      setWeeklyShifts(data);
    } catch (error) {
      toast.error('Failed to load weekly shifts');
      console.error(error);
    }
  };

  // Update current time every second for live updates
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Fetch data on mount and when week changes
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await Promise.all([
        fetchTeamMembers(),
        fetchActiveShifts(),
        fetchTodayShifts(),
        fetchWeeklyShifts(weekOffset),
      ]);
      setLoading(false);
    };
    loadInitialData();
  }, [weekOffset]);

  // Handle clock in
  const handleClockIn = async () => {
    if (!selectedMember) {
      toast.error('Please select a team member');
      return;
    }

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/team/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_member_id: selectedMember }),
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
      if (weekOffset === 0) fetchWeeklyShifts(0);
    } catch (error) {
      toast.error(`Failed to ${error} break`);
    } finally {
      setProcessing(false);
    }
  };

  // Format time helper
  const formatTime = (dateString: string) => {
    return format(parseISO(dateString), 'h:mm a');
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
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Staff Management
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage shifts, breaks, and timesheets
            </p>
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
                onClick={() => setActiveTab('active')}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'active'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center">
                  <Users className="w-4 h-4 mr-2" />
                  Active Shifts ({activeShifts.length})
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
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Clock In
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Currently Working */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">
                    Currently Working
                  </h3>
                  {activeShifts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No active shifts at the moment
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeShifts.map((shift) => {
                        const onBreak = isOnBreak(shift);
                        return (
                          <div
                            key={shift.id}
                            className="bg-white border border-gray-200 rounded-lg p-4"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center mb-2">
                                  <h4 className="font-semibold text-gray-900">
                                    {shift.team_member.first_name}{' '}
                                    {shift.team_member.last_name}
                                  </h4>
                                  {onBreak && (
                                    <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full flex items-center">
                                      <Coffee className="w-3 h-3 mr-1" />
                                      On Break
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                  <p>
                                    Started: {formatTime(shift.shift_start)}
                                  </p>
                                  <p>
                                    Hours worked: {calculateLiveHours(shift)}
                                  </p>
                                  <p
                                    className={
                                      onBreak
                                        ? 'font-semibold text-yellow-600'
                                        : ''
                                    }
                                  >
                                    Breaks: {formatBreakTime(shift)}
                                    {onBreak && (
                                      <span className="ml-1 inline-block w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {onBreak ? (
                                  <button
                                    onClick={() => handleBreak(shift.id, 'end')}
                                    disabled={processing}
                                    className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 text-sm"
                                  >
                                    End Break
                                  </button>
                                ) : (
                                  <button
                                    onClick={() =>
                                      handleBreak(shift.id, 'start')
                                    }
                                    disabled={processing}
                                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                                  >
                                    Start Break
                                  </button>
                                )}
                                <button
                                  onClick={() => handleClockOut(shift.id)}
                                  disabled={processing}
                                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm flex items-center"
                                >
                                  <Square className="w-3 h-3 mr-1" />
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

            {activeTab === 'active' && (
              <div>
                <h3 className="text-lg font-semibold mb-4">Active Shifts</h3>
                {activeShifts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No active shifts at the moment</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeShifts.map((shift) => {
                      const onBreak = isOnBreak(shift);
                      return (
                        <div
                          key={shift.id}
                          className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h4 className="font-semibold text-lg">
                                {shift.team_member.first_name}{' '}
                                {shift.team_member.last_name}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {shift.team_member.email}
                              </p>
                            </div>
                            {onBreak ? (
                              <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full flex items-center">
                                <Coffee className="w-3 h-3 mr-1" />
                                On Break
                              </span>
                            ) : (
                              <span className="px-3 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                                Working
                              </span>
                            )}
                          </div>

                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Started:</span>
                              <span className="font-medium">
                                {formatTime(shift.shift_start)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Duration:</span>
                              <span className="font-medium">
                                {calculateLiveHours(shift)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Breaks:</span>
                              <span
                                className={`font-medium ${
                                  onBreak ? 'text-yellow-600' : ''
                                }`}
                              >
                                {formatBreakTime(shift)}
                                {onBreak && (
                                  <span className="ml-1 inline-block w-1.5 h-1.5 bg-yellow-500 rounded-full animate-pulse"></span>
                                )}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">
                                Current Earnings:
                              </span>
                              <span className="font-medium text-green-600">
                                ${(shift.total_pay || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'timesheet' && (
              <div>
                {/* Week Navigation */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold">Weekly Timesheet</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setWeekOffset(weekOffset - 1);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="px-4 py-2 bg-gray-100 rounded-lg min-w-[200px] text-center">
                      <span className="font-medium">
                        {getWeekDateRange(weekOffset).formatted}
                      </span>
                      {weekOffset === 0 && (
                        <span className="ml-2 text-xs text-green-600 font-medium">
                          (Current Week)
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setWeekOffset(weekOffset + 1);
                      }}
                      disabled={weekOffset >= 0}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {weeklyShifts.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p>No shifts recorded this week</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-gray-50">
                          <th className="text-left py-3 px-4">Employee</th>
                          <th className="text-left py-3 px-4">Date</th>
                          <th className="text-left py-3 px-4">Time</th>
                          <th className="text-left py-3 px-4">Hours</th>
                          <th className="text-left py-3 px-4">Breaks</th>
                          <th className="text-left py-3 px-4">Type</th>
                          <th className="text-left py-3 px-4">Rate</th>
                          <th className="text-left py-3 px-4">Pay</th>
                          <th className="text-left py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {weeklyShifts
                          .sort((a, b) => {
                            // Sort by date, then by team member
                            if (a.date !== b.date) {
                              return (
                                new Date(a.date).getTime() -
                                new Date(b.date).getTime()
                              );
                            }
                            return `${a.team_member.first_name} ${a.team_member.last_name}`.localeCompare(
                              `${b.team_member.first_name} ${b.team_member.last_name}`
                            );
                          })
                          .map((shift) => {
                            const dayTypeColors = {
                              weekday: 'text-gray-600',
                              saturday: 'text-blue-600',
                              sunday: 'text-orange-600',
                              public_holiday: 'text-red-600',
                            };

                            return (
                              <tr
                                key={shift.id}
                                className="border-b hover:bg-gray-50"
                              >
                                <td className="py-3 px-4">
                                  <div>
                                    <div className="font-medium text-sm">
                                      {shift.team_member.first_name}{' '}
                                      {shift.team_member.last_name}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {format(parseISO(shift.date), 'EEE, MMM d')}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {formatTime(shift.shift_start)}
                                  {shift.shift_end &&
                                    ` - ${formatTime(shift.shift_end)}`}
                                </td>
                                <td className="py-3 px-4 font-medium">
                                  {shift.status === 'active'
                                    ? calculateLiveHours(shift)
                                    : formatHoursToHHMM(shift.net_hours || 0)}
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  {shift.status === 'active'
                                    ? formatBreakTime(shift)
                                    : `${shift.total_break_minutes} mins`}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`text-sm font-medium ${
                                      dayTypeColors[
                                        shift.day_type as keyof typeof dayTypeColors
                                      ] || 'text-gray-600'
                                    }`}
                                  >
                                    {shift.day_type?.replace('_', ' ')}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-sm">
                                  ${shift.hourly_rate}/h
                                </td>
                                <td className="py-3 px-4 font-medium text-green-600">
                                  ${(shift.total_pay || 0).toFixed(2)}
                                </td>
                                <td className="py-3 px-4">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs ${
                                      shift.status === 'active'
                                        ? 'bg-green-100 text-green-800'
                                        : shift.status === 'completed'
                                        ? 'bg-blue-100 text-blue-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}
                                  >
                                    {shift.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 font-semibold">
                          <td colSpan={3} className="py-3 px-4">
                            Weekly Total
                          </td>
                          <td className="py-3 px-4 text-blue-600">
                            {(() => {
                              const totalMinutes = weeklyShifts.reduce(
                                (sum, shift) => {
                                  if (shift.status === 'active') {
                                    const [hours, mins] =
                                      calculateLiveHours(shift).split(':');
                                    return (
                                      sum +
                                      parseInt(hours) * 60 +
                                      parseInt(mins)
                                    );
                                  } else {
                                    return sum + (shift.net_hours || 0) * 60;
                                  }
                                },
                                0
                              );
                              const hours = Math.floor(totalMinutes / 60);
                              const mins = Math.round(totalMinutes % 60);
                              return `${hours}:${mins
                                .toString()
                                .padStart(2, '0')}`;
                            })()}
                          </td>
                          <td className="py-3 px-4">
                            {weeklyShifts.reduce((sum, s) => {
                              return (
                                sum +
                                (s.status === 'active'
                                  ? calculateLiveBreakMinutes(s)
                                  : s.total_break_minutes)
                              );
                            }, 0)}{' '}
                            mins
                          </td>
                          <td colSpan={2} className="py-3 px-4">
                            -
                          </td>
                          <td className="py-3 px-4 text-green-600">
                            $
                            {weeklyShifts
                              .reduce((sum, s) => sum + (s.total_pay || 0), 0)
                              .toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs text-gray-500">
                              {
                                weeklyShifts.filter(
                                  (s) => s.status === 'completed'
                                ).length
                              }{' '}
                              completed
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
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
