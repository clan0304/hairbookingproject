// app/admin/team/page.tsx
// ============================================
'use client';

import { useEffect, useState } from 'react';
import { TeamTable } from '@/components/team/TeamTable';
import { TeamMemberModal } from '@/components/team/TeamMemberModal';
import type { TeamMember } from '@/types/database';
import { Plus, Users } from 'lucide-react';

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: 'create' | 'edit';
    member: TeamMember | null;
  }>({
    isOpen: false,
    mode: 'create',
    member: null,
  });

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  async function fetchTeamMembers() {
    try {
      const response = await fetch('/api/admin/team');
      const data = await response.json();

      if (response.ok) {
        setTeamMembers(data.data || []);
      } else {
        console.error('Failed to fetch team members:', data.error);
      }
    } catch (error) {
      console.error('Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleOpenCreate = () => {
    setModalState({
      isOpen: true,
      mode: 'create',
      member: null,
    });
  };

  const handleOpenEdit = (member: TeamMember) => {
    setModalState({
      isOpen: true,
      mode: 'edit',
      member,
    });
  };

  const handleCloseModal = () => {
    setModalState({
      isOpen: false,
      mode: 'create',
      member: null,
    });
  };

  const handleModalSuccess = () => {
    handleCloseModal();
    fetchTeamMembers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this team member?')) return;

    try {
      const response = await fetch(`/api/admin/team/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchTeamMembers();
      } else {
        console.error('Failed to delete team member');
      }
    } catch (error) {
      console.error('Error deleting team member:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading team members...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div className="flex items-center">
          <Users className="mr-3 text-gray-600" size={28} />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Team Management
            </h1>
            <p className="text-gray-600 mt-1">
              Manage your team members and their roles
            </p>
          </div>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Add Team Member
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">
            {teamMembers.length}
          </div>
          <div className="text-gray-600">Total Members</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">
            {teamMembers.filter((m) => m.is_visible).length}
          </div>
          <div className="text-gray-600">Visible on Booking</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">
            {[...new Set(teamMembers.map((m) => m.role))].length}
          </div>
          <div className="text-gray-600">Different Roles</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-2xl font-bold text-gray-900">
            {teamMembers.filter((m) => m.photo).length}
          </div>
          <div className="text-gray-600">With Photos</div>
        </div>
      </div>

      {/* Team Table */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <TeamTable
          teamMembers={teamMembers}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
        />
      </div>

      {/* Modal */}
      {modalState.isOpen && (
        <TeamMemberModal
          mode={modalState.mode}
          member={modalState.member}
          onClose={handleCloseModal}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
}
