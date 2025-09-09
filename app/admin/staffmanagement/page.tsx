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
  Save,
  XCircle,
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
  const [selectedMemberDetail, setSelectedMemberDetail] = useState<any>(null);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [editedShift, setEditedShift] = useState<any>(null);
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
                      onClick={() => setWeekOffset(weekOffset - 1)}
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
                      onClick={() => setWeekOffset(weekOffset + 1)}
                      disabled={weekOffset >= 0}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Summary Table */}
                <div className="bg-white rounded-lg overflow-hidden border">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left py-4 px-6 font-medium text-gray-700">
                          Employee
                        </th>
                        <th className="text-left py-4 px-6 font-medium text-gray-700">
                          Total Hours
                        </th>
                        <th className="text-left py-4 px-6 font-medium text-gray-700">
                          Total Pay
                        </th>
                        <th className="text-left py-4 px-6 font-medium text-gray-700">
                          Shifts
                        </th>
                        <th className="text-center py-4 px-6 font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Group shifts by team member
                        const shiftsByMember = weeklyShifts.reduce(
                          (acc: any, shift) => {
                            const memberId = shift.team_member_id;
                            if (!acc[memberId]) {
                              acc[memberId] = {
                                member: shift.team_member,
                                shifts: [],
                                totalHours: 0,
                                totalPay: 0,
                                totalBreaks: 0,
                                completedCount: 0,
                                activeCount: 0,
                              };
                            }
                            acc[memberId].shifts.push(shift);

                            // Calculate hours for active shifts
                            if (shift.status === 'active') {
                              const [hours, mins] =
                                calculateLiveHours(shift).split(':');
                              acc[memberId].totalHours +=
                                parseInt(hours) + parseInt(mins) / 60;
                              acc[memberId].activeCount++;
                              // Estimate pay for active shifts
                              const estimatedPay =
                                (parseInt(hours) + parseInt(mins) / 60) *
                                (shift.hourly_rate || 25);
                              acc[memberId].totalPay += estimatedPay;
                            } else {
                              acc[memberId].totalHours += shift.net_hours || 0;
                              acc[memberId].totalPay += shift.total_pay || 0;
                              if (shift.status === 'completed')
                                acc[memberId].completedCount++;
                            }

                            acc[memberId].totalBreaks +=
                              shift.total_break_minutes || 0;
                            return acc;
                          },
                          {}
                        );

                        // Add team members with no shifts
                        teamMembers.forEach((member) => {
                          if (!shiftsByMember[member.id]) {
                            shiftsByMember[member.id] = {
                              member: member,
                              shifts: [],
                              totalHours: 0,
                              totalPay: 0,
                              totalBreaks: 0,
                              completedCount: 0,
                              activeCount: 0,
                            };
                          }
                        });

                        return Object.values(shiftsByMember).map(
                          (memberData: any) => (
                            <tr
                              key={memberData.member.id}
                              className="border-b hover:bg-gray-50 cursor-pointer transition-colors"
                              onClick={() =>
                                setSelectedMemberDetail(memberData)
                              }
                            >
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                                    {memberData.member.first_name[0]}
                                    {memberData.member.last_name[0]}
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {memberData.member.first_name}{' '}
                                      {memberData.member.last_name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {memberData.member.email}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-6">
                                <span className="font-medium text-blue-600">
                                  {formatHoursToHHMM(memberData.totalHours)}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <span className="font-semibold text-green-600">
                                  ${memberData.totalPay.toFixed(2)}
                                </span>
                              </td>
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-2">
                                  {memberData.completedCount > 0 && (
                                    <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                      {memberData.completedCount} completed
                                    </span>
                                  )}
                                  {memberData.activeCount > 0 && (
                                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                      {memberData.activeCount} active
                                    </span>
                                  )}
                                  {memberData.shifts.length === 0 && (
                                    <span className="text-sm text-gray-500">
                                      No shifts
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-6 text-center">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedMemberDetail(memberData);
                                  }}
                                  className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                                >
                                  View Details →
                                </button>
                              </td>
                            </tr>
                          )
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Grand Total Row */}
                <div className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Week Total</span>
                    <div className="flex gap-8">
                      <div>
                        <span className="text-purple-100 text-sm">
                          Total Pay:
                        </span>
                        <span className="ml-2 font-bold text-lg">
                          $
                          {weeklyShifts
                            .reduce((sum, shift) => {
                              if (shift.status === 'active') {
                                const [hours, mins] =
                                  calculateLiveHours(shift).split(':');
                                const totalHours =
                                  parseInt(hours) + parseInt(mins) / 60;
                                return (
                                  sum + totalHours * (shift.hourly_rate || 25)
                                );
                              }
                              return sum + (shift.total_pay || 0);
                            }, 0)
                            .toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detail Modal with Edit/Delete */}
                {selectedMemberDetail && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden">
                      {/* Modal Header */}
                      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
                        <div className="flex justify-between items-start">
                          <div>
                            <h2 className="text-2xl font-bold mb-1">
                              {selectedMemberDetail.member.first_name}{' '}
                              {selectedMemberDetail.member.last_name}
                            </h2>
                            <p className="text-purple-100">
                              {getWeekDateRange(weekOffset).formatted}
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedMemberDetail(null);
                              setEditingShiftId(null);
                              setEditedShift(null);
                            }}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-3 gap-4 p-6 border-b">
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-blue-600 mb-1">
                            <Clock className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Total Hours
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            {formatHoursToHHMM(selectedMemberDetail.totalHours)}
                          </p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="flex items-center gap-2 text-green-600 mb-1">
                            <DollarSign className="w-4 h-4" />
                            <span className="text-sm font-medium">
                              Total Earnings
                            </span>
                          </div>
                          <p className="text-2xl font-bold text-gray-900">
                            ${selectedMemberDetail.totalPay.toFixed(2)}
                          </p>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4">
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

                      {/* Detailed Shifts Table with Edit/Delete */}
                      <div className="overflow-y-auto max-h-[400px]">
                        <table className="w-full">
                          <thead className="bg-gray-50 sticky top-0">
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
                          <tbody>
                            {selectedMemberDetail.shifts.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={9}
                                  className="text-center py-8 text-gray-500"
                                >
                                  No shifts recorded for this week
                                </td>
                              </tr>
                            ) : (
                              selectedMemberDetail.shifts
                                .sort(
                                  (a: any, b: any) =>
                                    new Date(a.date).getTime() -
                                    new Date(b.date).getTime()
                                )
                                .map((shift: any) => {
                                  const isEditing = editingShiftId === shift.id;
                                  const currentShift = isEditing
                                    ? editedShift
                                    : shift;

                                  return (
                                    <tr
                                      key={shift.id}
                                      className="border-b hover:bg-gray-50"
                                    >
                                      <td className="py-3 px-4 text-gray-900">
                                        {format(
                                          parseISO(shift.date),
                                          'EEE, MMM d'
                                        )}
                                      </td>
                                      <td className="py-3 px-4 text-gray-600">
                                        {isEditing ? (
                                          <input
                                            type="time"
                                            value={format(
                                              parseISO(
                                                currentShift.shift_start
                                              ),
                                              'HH:mm'
                                            )}
                                            onChange={(e) => {
                                              const [hours, minutes] =
                                                e.target.value.split(':');
                                              const newDate = new Date(
                                                currentShift.shift_start
                                              );
                                              newDate.setHours(
                                                parseInt(hours),
                                                parseInt(minutes)
                                              );
                                              setEditedShift({
                                                ...currentShift,
                                                shift_start:
                                                  newDate.toISOString(),
                                              });
                                            }}
                                            className="px-2 py-1 border rounded"
                                          />
                                        ) : (
                                          formatTime(shift.shift_start)
                                        )}
                                      </td>
                                      <td className="py-3 px-4 text-gray-600">
                                        {isEditing ? (
                                          shift.shift_end ? (
                                            <input
                                              type="time"
                                              value={format(
                                                parseISO(
                                                  currentShift.shift_end
                                                ),
                                                'HH:mm'
                                              )}
                                              onChange={(e) => {
                                                const [hours, minutes] =
                                                  e.target.value.split(':');
                                                const newDate = new Date(
                                                  currentShift.shift_end
                                                );
                                                newDate.setHours(
                                                  parseInt(hours),
                                                  parseInt(minutes)
                                                );
                                                setEditedShift({
                                                  ...currentShift,
                                                  shift_end:
                                                    newDate.toISOString(),
                                                });
                                              }}
                                              className="px-2 py-1 border rounded"
                                            />
                                          ) : (
                                            <span className="text-gray-400">
                                              Active
                                            </span>
                                          )
                                        ) : shift.shift_end ? (
                                          formatTime(shift.shift_end)
                                        ) : (
                                          '-'
                                        )}
                                      </td>
                                      <td className="py-3 px-4 font-medium">
                                        {shift.status === 'active' ? (
                                          <span className="text-blue-600">
                                            {calculateLiveHours(shift)}
                                          </span>
                                        ) : (
                                          formatHoursToHHMM(
                                            shift.net_hours || 0
                                          )
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        {isEditing ? (
                                          <input
                                            type="number"
                                            value={
                                              currentShift.total_break_minutes ||
                                              0
                                            }
                                            onChange={(e) =>
                                              setEditedShift({
                                                ...currentShift,
                                                total_break_minutes:
                                                  parseInt(e.target.value) || 0,
                                              })
                                            }
                                            className="px-2 py-1 border rounded w-20"
                                            min="0"
                                          />
                                        ) : shift.status === 'active' ? (
                                          formatBreakTime(shift)
                                        ) : (
                                          `${
                                            shift.total_break_minutes || 0
                                          } mins`
                                        )}
                                      </td>
                                      <td className="py-3 px-4">
                                        ${(shift.hourly_rate || 25).toFixed(0)}
                                        /h
                                      </td>
                                      <td className="py-3 px-4 font-medium text-green-600">
                                        $
                                        {shift.status === 'active'
                                          ? (() => {
                                              const [hours, mins] =
                                                calculateLiveHours(shift).split(
                                                  ':'
                                                );
                                              const totalHours =
                                                parseInt(hours) +
                                                parseInt(mins) / 60;
                                              return (
                                                totalHours *
                                                (shift.hourly_rate || 25)
                                              ).toFixed(2);
                                            })()
                                          : (shift.total_pay || 0).toFixed(2)}
                                      </td>
                                      <td className="py-3 px-4">
                                        <span
                                          className={`px-2 py-1 text-xs font-medium rounded-full ${
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
                                      <td className="py-3 px-4">
                                        <div className="flex items-center justify-center gap-1">
                                          {isEditing ? (
                                            <>
                                              <button
                                                onClick={async () => {
                                                  // Handle save
                                                  try {
                                                    const response =
                                                      await fetch(
                                                        `/api/admin/team/shifts/${shift.id}`,
                                                        {
                                                          method: 'PUT',
                                                          headers: {
                                                            'Content-Type':
                                                              'application/json',
                                                          },
                                                          body: JSON.stringify({
                                                            shift_start:
                                                              editedShift.shift_start,
                                                            shift_end:
                                                              editedShift.shift_end,
                                                            total_break_minutes:
                                                              editedShift.total_break_minutes,
                                                          }),
                                                        }
                                                      );

                                                    if (response.ok) {
                                                      toast.success(
                                                        'Shift updated successfully'
                                                      );
                                                      setEditingShiftId(null);
                                                      setEditedShift(null);
                                                      fetchWeeklyShifts(
                                                        weekOffset
                                                      );
                                                      // Update modal data
                                                      const updatedShifts =
                                                        selectedMemberDetail.shifts.map(
                                                          (s: any) =>
                                                            s.id === shift.id
                                                              ? editedShift
                                                              : s
                                                        );
                                                      setSelectedMemberDetail({
                                                        ...selectedMemberDetail,
                                                        shifts: updatedShifts,
                                                      });
                                                    } else {
                                                      toast.error(
                                                        'Failed to update shift'
                                                      );
                                                    }
                                                  } catch (error) {
                                                    toast.error(
                                                      `${error} Error updating shift`
                                                    );
                                                  }
                                                }}
                                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                title="Save"
                                              >
                                                <Save className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={() => {
                                                  setEditingShiftId(null);
                                                  setEditedShift(null);
                                                }}
                                                className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                                                title="Cancel"
                                              >
                                                <XCircle className="w-4 h-4" />
                                              </button>
                                            </>
                                          ) : (
                                            <>
                                              <button
                                                onClick={() => {
                                                  setEditingShiftId(shift.id);
                                                  setEditedShift(shift);
                                                }}
                                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                                title="Edit"
                                                disabled={
                                                  shift.status === 'active'
                                                }
                                              >
                                                <Edit2 className="w-4 h-4" />
                                              </button>
                                              <button
                                                onClick={async () => {
                                                  if (
                                                    confirm(
                                                      'Are you sure you want to delete this shift?'
                                                    )
                                                  ) {
                                                    try {
                                                      const response =
                                                        await fetch(
                                                          `/api/admin/team/shifts/${shift.id}`,
                                                          {
                                                            method: 'DELETE',
                                                          }
                                                        );

                                                      if (response.ok) {
                                                        toast.success(
                                                          'Shift deleted successfully'
                                                        );
                                                        fetchWeeklyShifts(
                                                          weekOffset
                                                        );
                                                        // Update the modal data
                                                        const updatedShifts =
                                                          selectedMemberDetail.shifts.filter(
                                                            (s: any) =>
                                                              s.id !== shift.id
                                                          );
                                                        const newTotalHours =
                                                          updatedShifts.reduce(
                                                            (
                                                              sum: number,
                                                              s: any
                                                            ) =>
                                                              sum +
                                                              (s.net_hours ||
                                                                0),
                                                            0
                                                          );
                                                        const newTotalPay =
                                                          updatedShifts.reduce(
                                                            (
                                                              sum: number,
                                                              s: any
                                                            ) =>
                                                              sum +
                                                              (s.total_pay ||
                                                                0),
                                                            0
                                                          );
                                                        const newTotalBreaks =
                                                          updatedShifts.reduce(
                                                            (
                                                              sum: number,
                                                              s: any
                                                            ) =>
                                                              sum +
                                                              (s.total_break_minutes ||
                                                                0),
                                                            0
                                                          );

                                                        setSelectedMemberDetail(
                                                          {
                                                            ...selectedMemberDetail,
                                                            shifts:
                                                              updatedShifts,
                                                            totalHours:
                                                              newTotalHours,
                                                            totalPay:
                                                              newTotalPay,
                                                            totalBreaks:
                                                              newTotalBreaks,
                                                          }
                                                        );
                                                      } else {
                                                        toast.error(
                                                          'Failed to delete shift'
                                                        );
                                                      }
                                                    } catch (error) {
                                                      toast.error(
                                                        `${error} Error deleting shift`
                                                      );
                                                    }
                                                  }
                                                }}
                                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                title="Delete"
                                                disabled={
                                                  shift.status === 'active'
                                                }
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
