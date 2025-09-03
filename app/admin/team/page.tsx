// app/admin/team/page.tsx - Team Page with Tabs
// ============================================
'use client';

import { useEffect, useState } from 'react';
import { TeamTable } from '@/components/team/TeamTable';
import { TeamMemberModal } from '@/components/team/TeamMemberModal';
import { AvailabilityTab } from '@/components/team/AvailabilityTab';
import type { TeamMember } from '@/types/database';
import { Plus, Users, Calendar, Clock, DollarSign } from 'lucide-react';

type TabType = 'members' | 'shifts' | 'timesheets' | 'payruns';

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<TabType>('members');
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

  const tabs = [
    { id: 'members' as TabType, label: 'Team members', icon: Users },
    { id: 'shifts' as TabType, label: 'Scheduled shifts', icon: Calendar },
    {
      id: 'timesheets' as TabType,
      label: 'Timesheets',
      icon: Clock,
      disabled: true,
    },
    {
      id: 'payruns' as TabType,
      label: 'Pay runs',
      icon: DollarSign,
      disabled: true,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="p-6">
          <h1 className="text-2xl font-semibold text-gray-900">Team</h1>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white border-b">
        <div className="px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => !tab.disabled && setActiveTab(tab.id)}
                  disabled={tab.disabled}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    flex items-center gap-2
                    ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : tab.disabled
                        ? 'border-transparent text-gray-400 cursor-not-allowed'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon size={18} />
                  {tab.label}
                  {tab.disabled && (
                    <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                      Coming soon
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'members' && (
          <>
            {/* Team Members Tab */}
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">
                  Team Members
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your team members and their roles
                </p>
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
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-lg">Loading team members...</div>
                </div>
              ) : (
                <TeamTable
                  teamMembers={teamMembers}
                  onEdit={handleOpenEdit}
                  onDelete={handleDelete}
                />
              )}
            </div>
          </>
        )}

        {activeTab === 'shifts' && <AvailabilityTab />}

        {activeTab === 'timesheets' && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <Clock size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Timesheets Coming Soon
            </h3>
            <p className="text-gray-600">
              Track working hours and manage timesheets for your team.
            </p>
          </div>
        )}

        {activeTab === 'payruns' && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <DollarSign size={48} className="mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Pay Runs Coming Soon
            </h3>
            <p className="text-gray-600">
              Manage payroll and compensation for your team members.
            </p>
          </div>
        )}
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
