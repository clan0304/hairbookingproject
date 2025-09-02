// components/services/ServiceModal.tsx
// ============================================
'use client';

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ServiceCategory, ServiceWithDetails } from '@/types/database';

interface ServiceModalProps {
  mode: 'create' | 'edit';
  service: ServiceWithDetails | null;
  categories: ServiceCategory[];
  onClose: () => void;
  onSuccess: () => void;
}

export function ServiceModal({
  mode,
  service,
  categories,
  onClose,
  onSuccess,
}: ServiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    description: '',
    base_duration: 30,
    base_price: 0,
    has_variants: false,
    is_active: true,
  });

  useEffect(() => {
    if (mode === 'edit' && service) {
      setFormData({
        category_id: service.category_id,
        name: service.name,
        description: service.description || '',
        base_duration: service.base_duration,
        base_price: service.base_price,
        has_variants: service.has_variants,
        is_active: service.is_active,
      });
    } else if (categories.length > 0) {
      setFormData((prev) => ({ ...prev, category_id: categories[0].id }));
    }
  }, [mode, service, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url =
        mode === 'create'
          ? '/api/admin/services'
          : `/api/admin/services/${service?.id}`;

      const response = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        onSuccess();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save service');
      }
    } catch (error) {
      console.error('Error saving service:', error);
      alert('Failed to save service');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {mode === 'create' ? 'Add Service' : 'Edit Service'}
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
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              required
              value={formData.category_id}
              onChange={(e) =>
                setFormData({ ...formData, category_id: e.target.value })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
            >
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          {/* Service Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Service name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              placeholder="e.g. Women's Haircut"
            />
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
              placeholder="Optional description for this service"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes) *
              </label>
              <input
                type="number"
                required
                min="5"
                step="5"
                value={formData.base_duration}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    base_duration: parseInt(e.target.value),
                  })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            </div>

            {/* Base Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base price ($) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.base_price}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    base_price: parseFloat(e.target.value),
                  })
                }
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
              />
            </div>
          </div>

          {/* Has Variants */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="has_variants"
              checked={formData.has_variants}
              onChange={(e) =>
                setFormData({ ...formData, has_variants: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="has_variants"
              className="ml-2 block text-sm text-gray-900"
            >
              This service has variants (e.g., Short Hair, Long Hair)
            </label>
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
                'Add Service'
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
