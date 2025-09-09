// components/calendar/CalendarHeader.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  Settings,
  ChevronDown,
  Check,
} from 'lucide-react';
import { format } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useState, useRef, useEffect } from 'react';
import type { Shop, TeamMember } from '@/types/database';

type ViewMode = 'day' | 'week';

interface CalendarHeaderProps {
  currentDate: Date;
  viewMode: ViewMode;
  selectedShop: string;
  shops: Shop[];
  teamMembers: TeamMember[];
  selectedTeamMembers: string[];
  showAllTeam: boolean;
  onDateChange: (date: Date) => void;
  onViewModeChange: (mode: ViewMode) => void;
  onShopChange: (shopId: string) => void;
  onTeamMemberToggle: (memberId: string) => void;
  onAllTeamToggle: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}

export function CalendarHeader({
  currentDate,
  viewMode,
  selectedShop,
  shops,
  teamMembers,
  selectedTeamMembers,
  showAllTeam,
  onViewModeChange,
  onShopChange,
  onTeamMemberToggle,
  onAllTeamToggle,
  onPrevious,
  onNext,
  onToday,
}: CalendarHeaderProps) {
  const [showShopDropdown, setShowShopDropdown] = useState(false);
  const [showTeamPopover, setShowTeamPopover] = useState(false);
  const shopDropdownRef = useRef<HTMLDivElement>(null);
  const teamPopoverRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        shopDropdownRef.current &&
        !shopDropdownRef.current.contains(event.target as Node)
      ) {
        setShowShopDropdown(false);
      }
      if (
        teamPopoverRef.current &&
        !teamPopoverRef.current.contains(event.target as Node)
      ) {
        setShowTeamPopover(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDateDisplay = () => {
    if (viewMode === 'day') {
      return format(currentDate, 'EEE d MMM');
    } else {
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      if (weekStart.getMonth() === weekEnd.getMonth()) {
        return `${format(weekStart, 'd')} - ${format(weekEnd, 'd MMM yyyy')}`;
      } else if (weekStart.getFullYear() === weekEnd.getFullYear()) {
        return `${format(weekStart, 'd MMM')} - ${format(
          weekEnd,
          'd MMM yyyy'
        )}`;
      } else {
        return `${format(weekStart, 'd MMM yyyy')} - ${format(
          weekEnd,
          'd MMM yyyy'
        )}`;
      }
    }
  };

  const selectedShopName =
    shops.find((s) => s.id === selectedShop)?.name || 'Select a shop';

  return (
    <div className="bg-white border-b px-6 py-3 z-50">
      <div className="flex items-center justify-between gap-4">
        {/* Left side - Navigation and Date */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onToday}
            className="text-sm"
          >
            Today
          </Button>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onPrevious}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="min-w-[180px] text-center">
              <span className="text-lg font-medium">{getDateDisplay()}</span>
            </div>

            <Button
              variant="ghost"
              size="icon"
              onClick={onNext}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Center - Shop and Team Filters */}
        <div className="flex items-center gap-3">
          {/* Shop Selector - Custom Dropdown */}
          <div className="relative" ref={shopDropdownRef}>
            <button
              onClick={() => setShowShopDropdown(!showShopDropdown)}
              className="flex h-10 w-[250px] items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <span>{selectedShopName}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </button>

            {showShopDropdown && (
              <div className="absolute top-full mt-1 w-full z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white shadow-md">
                <div className="p-1">
                  {shops.map((shop) => (
                    <button
                      key={shop.id}
                      onClick={() => {
                        onShopChange(shop.id);
                        setShowShopDropdown(false);
                      }}
                      className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100"
                    >
                      {selectedShop === shop.id && (
                        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                          <Check className="h-4 w-4" />
                        </span>
                      )}
                      {shop.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Team Member Filter - Custom Popover */}
          <div className="relative" ref={teamPopoverRef}>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowTeamPopover(!showTeamPopover)}
            >
              <Users className="h-4 w-4" />
              {showAllTeam
                ? 'All team'
                : `${selectedTeamMembers.length} selected`}
            </Button>

            {showTeamPopover && (
              <div className="absolute top-full mt-2 w-80 z-50 rounded-md border bg-white p-4 shadow-md">
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <span className="font-medium">Team Members</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onAllTeamToggle}
                      className="text-xs"
                    >
                      {showAllTeam ? 'Clear all' : 'Select all'}
                    </Button>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {teamMembers.map((member) => (
                      <label
                        key={member.id}
                        className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            showAllTeam ||
                            selectedTeamMembers.includes(member.id)
                          }
                          onChange={() => onTeamMemberToggle(member.id)}
                          disabled={showAllTeam}
                          className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <div className="flex items-center gap-2 flex-1">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={member.photo || undefined} />
                            <AvatarFallback>
                              {member.first_name[0]}
                              {member.last_name?.[0] || ''}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm">
                            {member.first_name} {member.last_name}
                          </span>
                        </div>
                      </label>
                    ))}
                    {teamMembers.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No team members assigned to this shop
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side - View Mode and Actions */}
        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex items-center border rounded-lg">
            <Button
              variant={viewMode === 'day' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('day')}
              className="rounded-r-none"
            >
              Day
            </Button>
            <Button
              variant={viewMode === 'week' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onViewModeChange('week')}
              className="rounded-l-none"
            >
              Week
            </Button>
          </div>

          {/* Settings Button */}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>

          {/* Add Booking Button */}
          <Button className="gap-2">
            Add
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
