// components/team/TeamTable.tsx
// ============================================
'use client';

import { TeamMember } from '@/types/database';
import { Edit2, Trash2, Mail, Phone, User, Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';

interface TeamTableProps {
  teamMembers: TeamMember[];
  onEdit: (member: TeamMember) => void;
  onDelete: (id: string) => void;
}

export function TeamTable({ teamMembers, onEdit, onDelete }: TeamTableProps) {
  if (teamMembers.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <User size={48} className="mx-auto mb-4 text-gray-300" />
        <p className="text-lg mb-2">No team members found</p>
        <p className="text-sm">Add your first team member to get started</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Team Member
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Contact
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Visibility
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Joined
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {teamMembers.map((member) => (
            <tr key={member.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex-shrink-0">
                    {member.photo ? (
                      <Image
                        className="h-10 w-10 rounded-full object-cover"
                        src={member.photo}
                        alt={member.first_name}
                        height={10}
                        width={10}
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                        {member.first_name[0]}
                        {member.last_name[0]}
                      </div>
                    )}
                  </div>
                  <div className="ml-4">
                    <div className="text-sm font-medium text-gray-900">
                      {member.first_name} {member.last_name}
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {member.role}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <div className="flex flex-col space-y-1">
                  <div className="flex items-center">
                    <Mail size={14} className="mr-1" />
                    <a
                      href={`mailto:${member.email}`}
                      className="hover:text-blue-600"
                    >
                      {member.email}
                    </a>
                  </div>
                  {member.phone && (
                    <div className="flex items-center">
                      <Phone size={14} className="mr-1" />
                      <a
                        href={`tel:${member.phone}`}
                        className="hover:text-blue-600"
                      >
                        {member.phone}
                      </a>
                    </div>
                  )}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {member.is_visible ? (
                  <span className="inline-flex items-center text-green-600">
                    <Eye size={16} className="mr-1" />
                    <span className="text-xs">Visible</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center text-gray-400">
                    <EyeOff size={16} className="mr-1" />
                    <span className="text-xs">Hidden</span>
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                {new Date(member.created_at).toLocaleDateString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button
                  onClick={() => onEdit(member)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                  title="Edit"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  onClick={() => onDelete(member.id)}
                  className="text-red-600 hover:text-red-900"
                  title="Delete"
                >
                  <Trash2 size={18} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
