// components/availability/CreateSlotModal.tsx
// ============================================
'use client';

import { useState } from 'react';
import { X, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { Shop } from '@/types/database';

interface CreateSlotModalProps {
  teamMemberId: string;
  teamMemberName: string;
  date: Date;
  shops: Shop[];
  onClose: () => void;
  onSuccess: () => void;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export function CreateSlotModal({
  teamMemberId,
  teamMemberName,
  date,
  shops,
  onClose,
  onSuccess,
}: CreateSlotModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shop_id: shops[0]?.id || '',
    start_time: '09:00',
    end_time: '17:00',
  });

  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes}${ampm}`;
  };

  const handleCreate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_member_id: teamMemberId,
          shop_id: formData.shop_id,
          is_recurring: false,
          single_date: format(date, 'yyyy-MM-dd'),
          start_time: formData.start_time,
          end_time: formData.end_time,
        }),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        console.error('Error creating slot:', error);
        alert(error.error || 'Failed to create availability slot');
      }
    } catch (error) {
      console.error('Error creating slot:', error);
      alert('Failed to create availability slot');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Calendar className="mr-2 text-purple-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">
              Add Availability
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Team Member Info */}
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Team Member:</span> {teamMemberName}
            </p>
            <p className="text-sm text-gray-700 mt-1">
              <span className="font-medium">Date:</span>{' '}
              {format(date, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          {/* Shop Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Shop Location
            </label>
            <select
              value={formData.shop_id}
              onChange={(e) =>
                setFormData({ ...formData, shop_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Start Time
              </label>
              <select
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                {TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {formatTimeForDisplay(time)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                End Time
              </label>
              <select
                value={formData.end_time}
                onChange={(e) =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={!formData.start_time}
              >
                {TIME_OPTIONS.filter((time) => time > formData.start_time).map(
                  (time) => (
                    <option key={time} value={time}>
                      {formatTimeForDisplay(time)}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* Duration Display */}
          {formData.start_time && formData.end_time && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-medium">Duration:</span>{' '}
                {(() => {
                  const [startH, startM] = formData.start_time
                    .split(':')
                    .map(Number);
                  const [endH, endM] = formData.end_time.split(':').map(Number);
                  const duration =
                    (endH * 60 + endM - (startH * 60 + startM)) / 60;
                  return `${duration} hour${duration !== 1 ? 's' : ''}`;
                })()}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={loading || !formData.shop_id}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Availability'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
