// app/admin/calendar/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { CalendarFilters } from '@/components/calendar/CalendarFilters';
import { CalendarGrid } from '@/components/calendar/CalendarGrid';
import type { BookingWithLocalTimes, Shop, TeamMember } from '@/types/database';
import { format, startOfWeek, endOfWeek, startOfDay, endOfDay } from 'date-fns';

type ViewMode = 'day' | 'week';

interface TeamMemberWithStatus extends TeamMember {
  is_assigned: boolean;
  other_shops: string[];
}

export default function CalendarPage() {
  const [bookings, setBookings] = useState<BookingWithLocalTimes[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [allTeamMembers, setAllTeamMembers] = useState<TeamMemberWithStatus[]>(
    []
  );
  const [filteredTeamMembers, setFilteredTeamMembers] = useState<TeamMember[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [loadingTeamMembers, setLoadingTeamMembers] = useState(false);

  // Filter states
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShop, setSelectedShop] = useState<string>('all');
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [showAllStaff, setShowAllStaff] = useState(true);

  // Fetch team members for the selected shop
  const fetchTeamMembersForShop = useCallback(async (shopId: string) => {
    if (shopId === 'all') {
      try {
        setLoadingTeamMembers(true);
        const response = await fetch('/api/admin/team');
        const data = await response.json();

        if (data.data) {
          setAllTeamMembers(
            data.data.map((member: TeamMember) => ({
              ...member,
              is_assigned: true,
              other_shops: [],
            }))
          );
          setFilteredTeamMembers(data.data);
        }
      } catch (error) {
        console.error('Error fetching all team members:', error);
      } finally {
        setLoadingTeamMembers(false);
      }
    } else {
      try {
        setLoadingTeamMembers(true);
        const response = await fetch(`/api/admin/shops/${shopId}/team-members`);
        const data = await response.json();

        if (response.ok && data.data) {
          setAllTeamMembers(data.data);
          const assignedMembers = data.data.filter(
            (m: TeamMemberWithStatus) => m.is_assigned
          );
          setFilteredTeamMembers(assignedMembers);

          setSelectedTeamMembers((prev) =>
            prev.filter((id) =>
              assignedMembers.some((m: TeamMember) => m.id === id)
            )
          );
        } else {
          console.error('Failed to fetch team members for shop:', data.error);
          setFilteredTeamMembers([]);
        }
      } catch (error) {
        console.error('Error fetching team members for shop:', error);
        setFilteredTeamMembers([]);
      } finally {
        setLoadingTeamMembers(false);
      }
    }
  }, []);

  // Fetch bookings
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
        ...(selectedTeamMembers.length > 0 &&
          !showAllStaff && {
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
  }, [selectedDate, selectedShop, selectedTeamMembers, viewMode, showAllStaff]);

  // Initial data fetch - shops only
  useEffect(() => {
    async function fetchInitialData() {
      try {
        const shopsRes = await fetch('/api/admin/shops');
        const shopsData = await shopsRes.json();
        if (shopsData.data && shopsData.data.length > 0) {
          setShops(shopsData.data);
          const firstShopId = shopsData.data[0].id;
          setSelectedShop(firstShopId);
        }
      } catch (error) {
        console.error('Error fetching initial data:', error);
      }
    }

    fetchInitialData();
  }, []);

  // Fetch team members when selected shop changes
  useEffect(() => {
    if (selectedShop) {
      fetchTeamMembersForShop(selectedShop);
    }
  }, [selectedShop, fetchTeamMembersForShop]);

  // Fetch bookings when filters change
  useEffect(() => {
    if (selectedShop) {
      fetchBookings();
    }
  }, [fetchBookings, selectedShop]);

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

  const handleShopChange = (shopId: string) => {
    setSelectedShop(shopId);
    setShowAllStaff(true);
    setSelectedTeamMembers([]);
  };

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
          onShopChange={handleShopChange}
          shops={shops}
          teamMembers={filteredTeamMembers}
          selectedTeamMembers={selectedTeamMembers}
          onTeamMemberToggle={handleTeamMemberToggle}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          showAllStaff={showAllStaff}
          loadingTeamMembers={loadingTeamMembers}
        />
      </div>

      <div className="flex-1 overflow-hidden mt-6">
        <CalendarGrid
          bookings={bookings}
          teamMembers={displayedTeamMembers}
          selectedDate={selectedDate}
          viewMode={viewMode}
          loading={loading || loadingTeamMembers}
        />
      </div>
    </div>
  );
}
