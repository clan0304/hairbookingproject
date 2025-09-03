// components/calendar/CalendarFilters.tsx
'use client';

import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Users, Settings } from 'lucide-react';
import { format, addDays, addWeeks, subDays, subWeeks } from 'date-fns';
import type { Shop, TeamMember } from '@/types/database';

type ViewMode = 'day' | 'week';

interface CalendarFiltersProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  selectedShop: string;
  onShopChange: (shopId: string) => void;
  shops: Shop[];
  teamMembers: TeamMember[];
  selectedTeamMembers: string[];
  onTeamMemberToggle: (memberId: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showAllStaff: boolean;
}

export function CalendarFilters({
  selectedDate,
  onDateChange,
  selectedShop,
  onShopChange,
  shops,
  teamMembers,
  selectedTeamMembers,
  onTeamMemberToggle,
  viewMode,
  onViewModeChange,
  showAllStaff,
}: CalendarFiltersProps) {
  const handlePrevious = () => {
    if (viewMode === 'day') {
      onDateChange(subDays(selectedDate, 1));
    } else {
      onDateChange(subWeeks(selectedDate, 1));
    }
  };

  const handleNext = () => {
    if (viewMode === 'day') {
      onDateChange(addDays(selectedDate, 1));
    } else {
      onDateChange(addWeeks(selectedDate, 1));
    }
  };

  const handleToday = () => {
    onDateChange(new Date());
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Shop Selector */}
        <div className="flex items-center gap-2">
          <select
            value={selectedShop}
            onChange={(e) => onShopChange(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </div>

        {/* Staff Filter Dropdown */}
        <div className="relative group">
          <button className="px-3 py-2 border rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-gray-50">
            <Users size={16} />
            {showAllStaff
              ? 'All Staff'
              : `${selectedTeamMembers.length} Selected`}
            <ChevronLeft size={16} className="rotate-270" />
          </button>

          <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
            <div className="p-2 max-h-64 overflow-y-auto">
              <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAllStaff}
                  onChange={() => onTeamMemberToggle('all')}
                  className="rounded border-gray-300"
                />
                <span className="text-sm font-medium">All Staff</span>
              </label>

              <div className="border-t my-1" />

              {teamMembers.map((member) => (
                <label
                  key={member.id}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTeamMembers.includes(member.id)}
                    onChange={() => onTeamMemberToggle(member.id)}
                    disabled={showAllStaff}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">
                    {member.first_name} {member.last_name}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Date Navigation */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevious}>
            <ChevronLeft size={16} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleToday}
            className="px-4"
          >
            Today
          </Button>

          <Button variant="outline" size="sm" onClick={handleNext}>
            <ChevronRight size={16} />
          </Button>

          <span className="px-3 py-2 text-sm font-medium">
            {viewMode === 'day'
              ? format(selectedDate, 'EEEE, MMMM d, yyyy')
              : format(selectedDate, 'MMMM d, yyyy')}
          </span>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={viewMode === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('day')}
          >
            Day
          </Button>
          <Button
            variant={viewMode === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onViewModeChange('week')}
          >
            Week
          </Button>
        </div>

        {/* Settings Button */}
        <Button variant="outline" size="sm">
          <Settings size={16} />
        </Button>
      </div>
    </div>
  );
}
