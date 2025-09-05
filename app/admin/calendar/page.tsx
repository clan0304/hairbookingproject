// app/admin/calendar/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarHeader } from '@/components/calendar/CalendarHeader';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import { format, startOfWeek, endOfWeek, addDays, subDays } from 'date-fns';
import type {
  Shop,
  TeamMember,
  BookingWithLocalTimes as BookingWithDetails,
} from '@/types/database';

type ViewMode = 'day' | 'week';

export default function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [showAllTeam, setShowAllTeam] = useState(true);
  const [shops, setShops] = useState<Shop[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch shops on mount
  useEffect(() => {
    fetchShops();
  }, []);

  // Fetch team members when shop changes
  useEffect(() => {
    if (selectedShop) {
      fetchTeamMembers(selectedShop);
    } else {
      setTeamMembers([]);
      setSelectedTeamMembers([]);
    }
  }, [selectedShop]);

  // Fetch bookings when date, shop, or team members change
  useEffect(() => {
    if (selectedShop) {
      fetchBookings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode, selectedShop, selectedTeamMembers, showAllTeam]);

  const fetchShops = async () => {
    try {
      const response = await fetch('/api/admin/shops');
      const { data } = await response.json();
      setShops(data || []);

      // Auto-select first shop
      if (data && data.length > 0) {
        setSelectedShop(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  const fetchTeamMembers = async (shopId: string) => {
    try {
      const response = await fetch(`/api/admin/shops/${shopId}/team-members`);
      const { data } = await response.json();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const assignedMembers = data?.filter((m: any) => m.is_assigned) || [];
      setTeamMembers(assignedMembers);

      // Select all team members by default
      setSelectedTeamMembers(assignedMembers.map((m: TeamMember) => m.id));
    } catch (error) {
      console.error('Error fetching team members:', error);
      setTeamMembers([]);
    }
  };

  const fetchBookings = async () => {
    if (!selectedShop) return;

    setLoading(true);
    try {
      // Calculate date range based on view mode
      let startDate, endDate;
      if (viewMode === 'day') {
        startDate = format(currentDate, 'yyyy-MM-dd');
        endDate = startDate;
      } else {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        startDate = format(weekStart, 'yyyy-MM-dd');
        endDate = format(weekEnd, 'yyyy-MM-dd');
      }

      // Build query parameters
      const params = new URLSearchParams({
        shop_id: selectedShop,
        start_date: startDate,
        end_date: endDate,
        status: 'confirmed',
      });

      // Add team member filter if not showing all
      if (!showAllTeam && selectedTeamMembers.length > 0) {
        params.append('team_member_ids', selectedTeamMembers.join(','));
      }

      const response = await fetch(`/api/admin/calendar?${params}`);
      const { data } = await response.json();

      setBookings(data || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle booking update from drag and drop
  const handleBookingUpdate = useCallback(() => {
    // Refresh bookings after drag and drop update
    fetchBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, viewMode, selectedShop, selectedTeamMembers, showAllTeam]);

  const handleDateChange = (date: Date) => {
    setCurrentDate(date);
  };

  const handlePrevious = () => {
    if (viewMode === 'day') {
      setCurrentDate(subDays(currentDate, 1));
    } else {
      setCurrentDate(subDays(currentDate, 7));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      setCurrentDate(addDays(currentDate, 1));
    } else {
      setCurrentDate(addDays(currentDate, 7));
    }
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const handleTeamMemberToggle = (memberId: string) => {
    setSelectedTeamMembers((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
    setShowAllTeam(false);
  };

  const handleAllTeamToggle = () => {
    if (showAllTeam) {
      setShowAllTeam(false);
      setSelectedTeamMembers([]);
    } else {
      setShowAllTeam(true);
      setSelectedTeamMembers(teamMembers.map((m) => m.id));
    }
  };

  // Get visible team members based on filters
  const visibleTeamMembers = showAllTeam
    ? teamMembers
    : teamMembers.filter((m) => selectedTeamMembers.includes(m.id));

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <CalendarHeader
        currentDate={currentDate}
        viewMode={viewMode}
        selectedShop={selectedShop}
        shops={shops}
        teamMembers={teamMembers}
        selectedTeamMembers={selectedTeamMembers}
        showAllTeam={showAllTeam}
        onDateChange={handleDateChange}
        onViewModeChange={setViewMode}
        onShopChange={setSelectedShop}
        onTeamMemberToggle={handleTeamMemberToggle}
        onAllTeamToggle={handleAllTeamToggle}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToday={handleToday}
      />

      <div className="flex-1 overflow-hidden">
        <CalendarGrid
          currentDate={currentDate}
          viewMode={viewMode}
          teamMembers={visibleTeamMembers}
          bookings={bookings}
          loading={loading}
          shopTimezone={'Australia/Melbourne'} // Use default timezone or get from shop
          onBookingUpdate={handleBookingUpdate} // Pass the update handler
        />
      </div>
    </div>
  );
}
