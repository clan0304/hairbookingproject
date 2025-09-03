// components/calendar/CalendarFilters.tsx
'use client';

import { format, addDays, addWeeks, subDays, subWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  loadingTeamMembers?: boolean;
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
  loadingTeamMembers = false,
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
    <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-lg shadow-sm border">
      <div className="flex items-center gap-4">
        {/* Shop Filter */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-700">Shop:</span>
          <select
            value={selectedShop}
            onChange={(e) => onShopChange(e.target.value)}
            className="px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Shops</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </div>

        {/* Team Member Filter */}
        <div className="relative group">
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loadingTeamMembers || teamMembers.length === 0}
          >
            <span className="font-medium text-gray-700">Staff:</span>
            {loadingTeamMembers ? (
              <span className="flex items-center gap-2 text-gray-500">
                <Loader2 size={14} className="animate-spin" />
                Loading...
              </span>
            ) : teamMembers.length === 0 ? (
              <span className="text-gray-500">No staff assigned</span>
            ) : showAllStaff ? (
              'All Staff'
            ) : (
              `${selectedTeamMembers.length} Selected`
            )}
            {!loadingTeamMembers && teamMembers.length > 0 && (
              <ChevronLeft size={16} className="rotate-270" />
            )}
          </button>

          {!loadingTeamMembers && teamMembers.length > 0 && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <div className="p-2 max-h-64 overflow-y-auto">
                <label className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showAllStaff}
                    onChange={() => onTeamMemberToggle('all')}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">
                    All Staff ({teamMembers.length})
                  </span>
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
                    <div className="flex-1">
                      <span className="text-sm">
                        {member.first_name} {member.last_name}
                      </span>
                      {member.role && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({member.role})
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 flex-1">
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
              : `Week of ${format(selectedDate, 'MMMM d, yyyy')}`}
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
      </div>
    </div>
  );
}
