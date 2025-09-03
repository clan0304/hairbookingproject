/* eslint-disable @typescript-eslint/no-explicit-any */
// components/team/AvailabilityTab.tsx
'use client';

import { useEffect, useState } from 'react';
import { ShopStaffManager } from '@/components/team/ShopStaffManager';
import { RegularShiftsModal } from '@/components/team/RegularShiftsModal';
import type { AvailabilitySlot, TeamMember, Shop } from '@/types/database';
import { ChevronLeft, ChevronRight, Edit2, Loader2 } from 'lucide-react';
import {
  format,
  startOfWeek,
  endOfWeek,
  addWeeks,
  subWeeks,
  eachDayOfInterval,
} from 'date-fns';

// REMOVED: interface AvailabilityTabProps {
//   teamMembers: TeamMember[];
// }

// Component doesn't accept props - it fetches its own data
export function AvailabilityTab() {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedShop, setSelectedShop] = useState<string>('');
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showRegularShiftsModal, setShowRegularShiftsModal] = useState(false);
  const [selectedTeamMember, setSelectedTeamMember] =
    useState<TeamMember | null>(null);

  // This is the only team members state we need - the ones assigned to the selected shop
  const [assignedTeamMembers, setAssignedTeamMembers] = useState<TeamMember[]>(
    []
  );

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (selectedShop && selectedShop !== '') {
      fetchAssignedTeamMembers();
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek, selectedShop]);

  async function fetchShops() {
    try {
      setInitialLoading(true);
      const response = await fetch('/api/admin/shops');
      const data = await response.json();

      if (data.data && data.data.length > 0) {
        setShops(data.data);
        const firstShopId = data.data[0].id;
        setSelectedShop(firstShopId);
      } else {
        console.error('No shops available');
        setShops([]);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
      setShops([]);
    } finally {
      setInitialLoading(false);
    }
  }

  async function fetchAssignedTeamMembers() {
    if (!selectedShop || selectedShop === '') {
      console.log('No shop selected, skipping team member fetch');
      return;
    }

    try {
      console.log('Fetching team members for shop:', selectedShop);
      const url = `/api/admin/shops/${selectedShop}/team-members`;
      console.log('Full URL:', url);
      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        setAssignedTeamMembers([]);
        return;
      }

      const data = await response.json();

      if (data.data) {
        // Filter to only show assigned team members
        const assigned = data.data.filter((m: any) => m.is_assigned);
        setAssignedTeamMembers(assigned);
        console.log(`Found ${assigned.length} assigned team members`);
      } else {
        setAssignedTeamMembers([]);
      }
    } catch (error) {
      console.error('Error fetching assigned team members:', error);
      setAssignedTeamMembers([]);
    }
  }

  async function fetchData() {
    if (!selectedShop || selectedShop === '') {
      console.log('No shop selected, skipping availability fetch');
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        start_date: format(weekStart, 'yyyy-MM-dd'),
        end_date: format(weekEnd, 'yyyy-MM-dd'),
        shop_id: selectedShop,
      });

      const slotsResponse = await fetch(`/api/admin/availability?${params}`);
      const slotsData = await slotsResponse.json();

      if (slotsData.data) {
        setSlots(slotsData.data);
      } else {
        setSlots([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleEditRegularShifts = (member: TeamMember) => {
    setSelectedTeamMember(member);
    setShowRegularShiftsModal(true);
  };

  const handleSaveRegularShifts = async (data: any) => {
    try {
      const response = await fetch('/api/admin/availability/regular-shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        setShowRegularShiftsModal(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error saving regular shifts:', error);
    }
  };

  const calculateMemberHours = (memberId: string): number => {
    return slots
      .filter((slot) => slot.team_member_id === memberId)
      .reduce((total, slot) => {
        const start = new Date(`2000-01-01T${slot.start_time}`);
        const end = new Date(`2000-01-01T${slot.end_time}`);
        const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + hours;
      }, 0);
  };

  const getMemberSlotsForDay = (
    memberId: string,
    date: Date
  ): AvailabilitySlot[] => {
    return slots.filter(
      (slot) =>
        slot.team_member_id === memberId &&
        slot.date === format(date, 'yyyy-MM-dd')
    );
  };

  const handleShopChange = (shopId: string) => {
    console.log('Changing shop to:', shopId);
    setSelectedShop(shopId);
    setAssignedTeamMembers([]); // Clear team members while loading new ones
  };

  const handleOpenStaffModal = () => {
    if (!selectedShop || selectedShop === '') {
      alert('Please select a shop first');
      return;
    }
    console.log('Opening staff modal for shop:', selectedShop);
    setShowStaffModal(true);
  };

  const selectedShopData = shops.find((s) => s.id === selectedShop);

  // Show loading state while fetching initial data
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        <span className="ml-2">Loading shops...</span>
      </div>
    );
  }

  // Show message if no shops available
  if (shops.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          No shops available. Please create a shop first.
        </p>
      </div>
    );
  }

  // Rest of the component remains the same...
  return (
    <div className="space-y-6">
      {/* Header with shop selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <select
            value={selectedShop}
            onChange={(e) => handleShopChange(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
          >
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleOpenStaffModal}
            className="text-purple-600 hover:text-purple-700 font-medium"
            disabled={!selectedShop}
          >
            Change
          </button>
        </div>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>

          <span className="text-sm text-gray-600">This Week</span>

          <button
            onClick={handleNextWeek}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        <div className="text-lg font-medium">
          {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <span className="ml-2">Loading availability...</span>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="w-20 p-4 text-left">
                  {/* Empty cell for team member column */}
                </th>
                {weekDays.map((day) => (
                  <th
                    key={day.toISOString()}
                    className="p-4 text-center border-l"
                  >
                    <div className="font-medium">{format(day, 'EEE, d')}</div>
                    <div className="text-xs text-gray-500">
                      {format(day, 'MMM')}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {assignedTeamMembers.length > 0 ? (
                assignedTeamMembers.map((member) => (
                  <tr key={member.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditRegularShifts(member)}
                          className="p-1 hover:bg-gray-200 rounded transition-colors"
                          title="Edit regular shifts"
                        >
                          <Edit2 size={16} />
                        </button>
                        <div>
                          <div className="font-medium text-sm">
                            {member.first_name} {member.last_name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {calculateMemberHours(member.id)}h
                          </div>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((day) => {
                      const daySlots = getMemberSlotsForDay(member.id, day);
                      return (
                        <td
                          key={day.toISOString()}
                          className="p-2 border-l align-top"
                        >
                          {daySlots.length > 0 ? (
                            <div className="space-y-1">
                              {daySlots.map((slot) => (
                                <div
                                  key={slot.id}
                                  className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs"
                                >
                                  {format(
                                    new Date(`2000-01-01T${slot.start_time}`),
                                    'ha'
                                  )}{' '}
                                  -
                                  {format(
                                    new Date(`2000-01-01T${slot.end_time}`),
                                    'ha'
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-400 text-xs text-center">
                              -
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-12 text-center">
                    <p className="text-gray-500">
                      No team members assigned to this shop.
                    </p>
                    <button
                      onClick={handleOpenStaffModal}
                      className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Assign Team Members
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      {showStaffModal && selectedShopData && selectedShop && (
        <ShopStaffManager
          shopId={selectedShop}
          shopName={selectedShopData.name}
          isOpen={showStaffModal}
          onClose={() => setShowStaffModal(false)}
          onUpdate={() => {
            fetchAssignedTeamMembers();
            fetchData();
          }}
        />
      )}

      {showRegularShiftsModal &&
        selectedTeamMember &&
        selectedShopData &&
        selectedShop && (
          <RegularShiftsModal
            isOpen={showRegularShiftsModal}
            onClose={() => setShowRegularShiftsModal(false)}
            teamMember={selectedTeamMember}
            shopId={selectedShop}
            shopName={selectedShopData.name}
            onSave={handleSaveRegularShifts}
          />
        )}
    </div>
  );
}
