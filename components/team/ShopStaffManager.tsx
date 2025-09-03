// components/team/ShopStaffManager.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, Search, Loader2, Users } from 'lucide-react';
import type { TeamMember } from '@/types/database';
import Image from 'next/image';

interface TeamMemberWithStatus extends TeamMember {
  is_assigned: boolean;
}

interface ShopStaffManagerProps {
  shopId: string;
  shopName: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ShopStaffManager({
  shopId,
  shopName,
  isOpen,
  onClose,
  onUpdate,
}: ShopStaffManagerProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithStatus[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
    }
  }, [isOpen, shopId]);

  async function fetchTeamMembers() {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/team`);
      const data = await response.json();

      if (data.data) {
        setTeamMembers(data.data);
        // Initialize selected members based on current assignments
        // Explicitly type the filtered array to ensure TypeScript knows the types
        const assignedMembers: TeamMemberWithStatus[] = data.data.filter(
          (m: TeamMemberWithStatus) => m.is_assigned
        );

        // Create Set with proper string type
        const assignedIds: string[] = assignedMembers.map((m) => m.id);
        const assigned = new Set<string>(assignedIds);

        setSelectedMembers(assigned);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleToggleMember = (memberId: string) => {
    const newSelected = new Set(selectedMembers);
    if (newSelected.has(memberId)) {
      newSelected.delete(memberId);
    } else {
      newSelected.add(memberId);
    }
    setSelectedMembers(newSelected);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/shops/${shopId}/team-members`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_member_ids: Array.from(selectedMembers),
        }),
      });

      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        const error = await response.json();
        console.error('Error saving assignments:', error);
      }
    } catch (error) {
      console.error('Error saving assignments:', error);
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = teamMembers.filter((member) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      member.first_name.toLowerCase().includes(searchLower) ||
      member.last_name.toLowerCase().includes(searchLower) ||
      member.email.toLowerCase().includes(searchLower) ||
      member.role.toLowerCase().includes(searchLower)
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Manage Staff for {shopName}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Select team members who work at this location
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="mt-2 text-sm text-gray-600">
            {selectedMembers.size} of {teamMembers.length} team members selected
          </div>
        </div>

        {/* Team Members List */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No team members found
            </div>
          ) : (
            <div className="space-y-4">
              {/* Currently Assigned Members */}
              {filteredMembers.some((m) => m.is_assigned) && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Currently Assigned (
                    {filteredMembers.filter((m) => m.is_assigned).length})
                  </h3>
                  <div className="space-y-2">
                    {filteredMembers
                      .filter((m) => m.is_assigned)
                      .map((member) => (
                        <label
                          key={member.id}
                          className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.has(member.id)}
                            onChange={() => handleToggleMember(member.id)}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <div className="ml-4 flex-1">
                            <div className="flex items-center">
                              {member.photo ? (
                                <Image
                                  src={member.photo}
                                  alt={`${member.first_name} ${member.last_name}`}
                                  className="w-10 h-10 rounded-full object-cover mr-3"
                                  width={40}
                                  height={40}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold mr-3">
                                  {member.first_name[0]}
                                  {member.last_name[0]}
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900">
                                  {member.first_name} {member.last_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.role}
                                </div>
                              </div>
                            </div>
                          </div>
                          <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                            Currently Assigned
                          </span>
                        </label>
                      ))}
                  </div>
                </div>
              )}

              {/* Available to Assign Members */}
              {filteredMembers.some((m) => !m.is_assigned) && (
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Available to Assign (
                    {filteredMembers.filter((m) => !m.is_assigned).length})
                  </h3>
                  <div className="space-y-2">
                    {filteredMembers
                      .filter((m) => !m.is_assigned)
                      .map((member) => (
                        <label
                          key={member.id}
                          className="flex items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedMembers.has(member.id)}
                            onChange={() => handleToggleMember(member.id)}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <div className="ml-4 flex-1">
                            <div className="flex items-center">
                              {member.photo ? (
                                <Image
                                  src={member.photo}
                                  alt={`${member.first_name} ${member.last_name}`}
                                  className="w-10 h-10 rounded-full object-cover mr-3"
                                  width={40}
                                  height={40}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-500 flex items-center justify-center text-white font-bold mr-3">
                                  {member.first_name[0]}
                                  {member.last_name[0]}
                                </div>
                              )}
                              <div>
                                <div className="font-medium text-gray-900">
                                  {member.first_name} {member.last_name}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {member.role}
                                </div>
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Users className="w-4 h-4 mr-2" />
                Save Assignments
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
