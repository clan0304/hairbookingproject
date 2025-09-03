// app/admin/calendar/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarFilters } from '@/components/calendar/CalendarFilters';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import type { BookingWithLocalTimes, Shop, TeamMember } from '@/types/database';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

type ViewMode = 'day' | 'week';

export default function CalendarPage() {
  const [bookings, setBookings] = useState<BookingWithLocalTimes[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [showAllStaff, setShowAllStaff] = useState(true);

  // Fetch bookings with useCallback to memoize the function
  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);

      let startDate, endDate;
      if (viewMode === 'day') {
        startDate = startOfDay(selectedDate);
        endDate = endOfDay(selectedDate);
      } else {
        startDate = startOfWeek(selectedDate, { weekStartsOn: 1 });
        endDate = endOfWeek(selectedDate, { weekStartsOn: 1 });
      }

      const params = new URLSearchParams({
        start_date: format(startDate, 'yyyy-MM-dd'),
        end_date: format(endDate, 'yyyy-MM-dd'),
        ...(selectedShop !== 'all' && { shop_id: selectedShop }),
        ...(selectedTeamMembers.length > 0 && {
          team_member_ids: selectedTeamMembers.join(','),
        }),
      });

      const response = await fetch(`/api/admin/calendar/bookings?${params}`);
      const data = await response.json();

      if (data.data) {
        setBookings(data.data);
      }
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedShop, selectedTeamMembers, viewMode]);

  // Initial data fetch
  useEffect(() => {
    async function fetchInitialData() {
      try {
        // Fetch shops
        const shopsRes = await fetch('/api/admin/shops');
        const shopsData = await shopsRes.json();
        if (shopsData.data) {
          setShops(shopsData.data);
          if (shopsData.data.length > 0 && selectedShop === 'all') {
            setSelectedShop(shopsData.data[0].id);
          }
        }

        // Fetch team members
        const teamRes = await fetch('/api/admin/team');
        const teamData = await teamRes.json();
        if (teamData.data) {
          setTeamMembers(teamData.data);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    }

    fetchInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // This is fine as the function is defined inside the effect

  // Fetch bookings when filters change
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleTeamMemberToggle = (memberId: string) => {
    if (memberId === 'all') {
      setShowAllStaff(!showAllStaff);
      setSelectedTeamMembers([]);
    } else {
      setSelectedTeamMembers((prev) => {
        if (prev.includes(memberId)) {
          return prev.filter((id) => id !== memberId);
        }
        return [...prev, memberId];
      });
      setShowAllStaff(false);
    }
  };

  // Filter team members based on selected shop
  const filteredTeamMembers = teamMembers.filter(() => {
    if (selectedShop === 'all') return true;
    // In a real app, you might have a shop_team_members junction table
    // For now, we'll show all team members
    return true;
  });

  const displayedTeamMembers = showAllStaff
    ? filteredTeamMembers
    : filteredTeamMembers.filter((m) => selectedTeamMembers.includes(m.id));

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Calendar</h1>

        <CalendarFilters
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          selectedShop={selectedShop}
          onShopChange={setSelectedShop}
          shops={shops}
          teamMembers={filteredTeamMembers}
          selectedTeamMembers={selectedTeamMembers}
          onTeamMemberToggle={handleTeamMemberToggle}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showAllStaff={showAllStaff}
        />
      </div>

      <div className="flex-1 overflow-hidden mt-6">
        <CalendarGrid
          bookings={bookings}
          teamMembers={displayedTeamMembers}
          selectedDate={selectedDate}
          viewMode={viewMode}
          loading={loading}
        />
      </div>
    </div>
  );
}
