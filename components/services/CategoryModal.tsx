// components/services/CategoryModal.tsx
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ServiceCategory } from '@/types/database';

interface CategoryModalProps {
  mode: 'create' | 'edit';
  category: ServiceCategory | null;
  onClose: () => void;
  onSuccess: () => void;
}

const colorOptions = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Teal', value: '#14B8A6' },
];

export function CategoryModal({
  mode,
  category,
  onClose,
  onSuccess,
}: CategoryModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    is_active: true,
  });

  useEffect(() => {
    if (mode === 'edit' && category) {
      setFormData({
        name: category.name,
        description: category.description || '',
        color: category.color,
        is_active: category.is_active,
      });
    }
  }, [mode, category]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url =
        mode === 'create'
          ? '/api/admin/services/categories'
          : `/api/admin/services/categories/${category?.id}`;

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save category');
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Add Category' : 'Edit Category'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Category Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              placeholder="e.g. Hair Services"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Appointment color
            </label>
            <div className="relative">
              <button
                type="button"
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border flex items-center justify-between"
                onClick={(e) => {
                  const select = e.currentTarget
                    .nextElementSibling as HTMLElement;
                  select.classList.toggle('hidden');
                }}
              >
                <div className="flex items-center">
                  <div
                    className="w-6 h-6 rounded-full mr-2"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span>
                    {colorOptions.find((c) => c.value === formData.color)
                      ?.name || 'Custom'}
                  </span>
                </div>
                <svg
                  className="w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              <div className="hidden absolute z-10 w-full bg-white border border-gray-300 rounded-md shadow-lg mt-1">
                {colorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center"
                    onClick={() => {
                      setFormData({ ...formData, color: color.value });
                      const parent = document.querySelector('.hidden.absolute');
                      parent?.classList.add('hidden');
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full mr-2"
                      style={{ backgroundColor: color.value }}
                    />
                    {color.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              placeholder="Optional description for this category"
            />
            <p className="mt-1 text-xs text-gray-500 text-right">
              {formData.description.length}/255
            </p>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="is_active"
              className="ml-2 block text-sm text-gray-900"
            >
              Active
            </label>
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="mr-2 animate-spin" />
                  {mode === 'create' ? 'Adding...' : 'Saving...'}
                </>
              ) : mode === 'create' ? (
                'Add'
              ) : (
                'Save'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
