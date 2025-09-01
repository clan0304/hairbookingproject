// components/availability/AvailabilityFilters.tsx
// ============================================
'use client';

import { Shop, TeamMember } from '@/types/database';

interface AvailabilityFiltersProps {
  shops: Shop[];
  teamMembers: TeamMember[];
  selectedShop: string;
  selectedTeamMember: string;
  onShopChange: (shopId: string) => void;
  onTeamMemberChange: (memberId: string) => void;
}

export function AvailabilityFilters({
  shops,
  teamMembers,
  selectedShop,
  selectedTeamMember,
  onShopChange,
  onTeamMemberChange,
}: AvailabilityFiltersProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shop Location
          </label>
          <select
            value={selectedShop}
            onChange={(e) => onShopChange(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          >
            <option value="all">All Shops</option>
            {shops.map((shop) => (
              <option key={shop.id} value={shop.id}>
                {shop.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Team Member
          </label>
          <select
            value={selectedTeamMember}
            onChange={(e) => onTeamMemberChange(e.target.value)}
            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
          >
            <option value="all">All Team Members</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
