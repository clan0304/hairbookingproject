// components/availability/EditSlotModal.tsx
// ============================================
'use client';

import { useState } from 'react';
import { X, Clock, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import type { AvailabilitySlot, Shop } from '@/types/database';

interface EditSlotModalProps {
  slot: AvailabilitySlot;
  shops: Shop[];
  onClose: () => void;
  onSuccess: () => void;
}

const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const minute = i % 2 === 0 ? '00' : '30';
  return `${hour.toString().padStart(2, '0')}:${minute}`;
});

export function EditSlotModal({
  slot,
  shops,
  onClose,
  onSuccess,
}: EditSlotModalProps) {
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    shop_id: slot.shop_id,
    start_time: slot.start_time.substring(0, 5), // Ensure HH:MM format
    end_time: slot.end_time.substring(0, 5),
  });

  const formatTimeForDisplay = (time: string) => {
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes}${ampm}`;
  };

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
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to update availability');
      }
    } catch (error) {
      console.error('Error updating slot:', error);
      alert('Failed to update availability');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/availability/${slot.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete availability');
      }
    } catch (error) {
      console.error('Error deleting slot:', error);
      alert('Failed to delete availability');
    } finally {
      setLoading(false);
    }
  };

  // Calculate duration
  const calculateDuration = () => {
    const [startH, startM] = formData.start_time.split(':').map(Number);
    const [endH, endM] = formData.end_time.split(':').map(Number);
    const duration = (endH * 60 + endM - (startH * 60 + startM)) / 60;
    return duration;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <div className="flex items-center">
            <Clock className="mr-2 text-purple-600" size={20} />
            <h2 className="text-xl font-semibold text-gray-900">
              Edit Availability
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
          {/* Date Display */}
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Date:</span>{' '}
              {format(new Date(slot.date), 'EEEE, MMMM d, yyyy')}
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
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Duration:</span>{' '}
              {calculateDuration()} hour{calculateDuration() !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Delete Confirmation */}
          {deleteConfirm && (
            <div className="bg-red-50 border border-red-200 p-3 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 mr-2 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium mb-1">
                    Are you sure you want to delete this availability?
                  </p>
                  <p className="text-xs text-red-600">
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 bg-gray-50">
          {!deleteConfirm ? (
            <div className="flex justify-between">
              <button
                onClick={() => setDeleteConfirm(true)}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </button>
              <div className="space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
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
          ) : (
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={loading}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Yes, Delete'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
