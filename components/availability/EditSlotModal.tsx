// components/availability/EditSlotModal.tsx
// ============================================
'use client';

import { useState } from 'react';
import { X, Clock, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import type { AvailabilitySlot, Shop } from '@/types/database';

interface EditSlotModalProps {
  slot: AvailabilitySlot;
  shops: Shop[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditSlotModal({
  slot,
  shops,
  onClose,
  onSuccess,
}: EditSlotModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    shop_id: slot.shop_id,
    start_time: slot.start_time,
    end_time: slot.end_time,
  });

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/availability/${slot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating slot:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this availability slot?'))
      return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/availability/${slot.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error deleting slot:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Clock className="mr-2 text-gray-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Availability
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 p-3 rounded">
            <p className="text-sm text-gray-600">
              Date:{' '}
              <span className="font-medium">
                {format(new Date(slot.date), 'EEEE, MMMM d, yyyy')}
              </span>
            </p>
          </div>

          {/* Shop */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shop Location
            </label>
            <select
              value={formData.shop_id}
              onChange={(e) =>
                setFormData({ ...formData, shop_id: e.target.value })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            >
              {shops.map((shop) => (
                <option key={shop.id} value={shop.id}>
                  {shop.name}
                </option>
              ))}
            </select>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) =>
                  setFormData({ ...formData, start_time: e.target.value })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) =>
                  setFormData({ ...formData, end_time: e.target.value })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-between">
          <button
            onClick={handleDelete}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </button>
          <div className="space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdate}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
