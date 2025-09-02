// components/services/VariantsManager.tsx
// ============================================
'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, Check, X, Star } from 'lucide-react';
import { ServiceWithDetails, ServiceVariant } from '@/types/database';

interface VariantsManagerProps {
  service: ServiceWithDetails;
  onUpdate: () => void;
}

export function VariantsManager({ service, onUpdate }: VariantsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    duration_modifier: 0,
    price_modifier: 0,
    is_default: false,
  });

  const handleAdd = async () => {
    try {
      const response = await fetch(
        `/api/admin/services/${service.id}/variants`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        setIsAdding(false);
        setFormData({
          name: '',
          duration_modifier: 0,
          price_modifier: 0,
          is_default: false,
        });
        onUpdate();
      }
    } catch (error) {
      console.error('Error adding variant:', error);
    }
  };

  const handleUpdate = async (variantId: string) => {
    try {
      const response = await fetch(
        `/api/admin/services/${service.id}/variants/${variantId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      );

      if (response.ok) {
        setEditingId(null);
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating variant:', error);
    }
  };

  const handleDelete = async (variantId: string) => {
    if (!confirm('Delete this variant?')) return;

    try {
      const response = await fetch(
        `/api/admin/services/${service.id}/variants/${variantId}`,
        {
          method: 'DELETE',
        }
      );

      if (response.ok) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error deleting variant:', error);
    }
  };

  const startEdit = (variant: ServiceVariant) => {
    setEditingId(variant.id);
    setFormData({
      name: variant.name,
      duration_modifier: variant.duration_modifier,
      price_modifier: variant.price_modifier,
      is_default: variant.is_default,
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <h5 className="text-sm font-medium text-gray-700">Variants</h5>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <Plus size={16} className="mr-1" />
            Add Variant
          </button>
        )}
      </div>

      <div className="space-y-2">
        {/* Existing Variants */}
        {service.variants?.map((variant) => (
          <div
            key={variant.id}
            className="bg-white border border-gray-200 rounded p-3"
          >
            {editingId === variant.id ? (
              <div className="grid grid-cols-5 gap-2">
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="px-2 py-1 border rounded text-sm"
                  placeholder="Variant name"
                />
                <input
                  type="number"
                  value={formData.duration_modifier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      duration_modifier: parseInt(e.target.value),
                    })
                  }
                  className="px-2 py-1 border rounded text-sm"
                  placeholder="Duration"
                />
                <input
                  type="number"
                  step="0.01"
                  value={formData.price_modifier}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      price_modifier: parseFloat(e.target.value),
                    })
                  }
                  className="px-2 py-1 border rounded text-sm"
                  placeholder="Price"
                />
                <label className="flex items-center text-sm">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) =>
                      setFormData({ ...formData, is_default: e.target.checked })
                    }
                    className="mr-1"
                  />
                  Default
                </label>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleUpdate(variant.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Check size={16} className="text-green-600" />
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <X size={16} className="text-gray-600" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="font-medium">{variant.name}</span>
                  {variant.is_default && (
                    <Star size={14} className="text-yellow-500 fill-current" />
                  )}
                  <span className="text-gray-500">
                    Duration: {variant.duration_modifier > 0 ? '+' : ''}
                    {variant.duration_modifier} min
                  </span>
                  <span className="text-gray-500">
                    Price: {variant.price_modifier >= 0 ? '+' : ''}$
                    {variant.price_modifier}
                  </span>
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => startEdit(variant)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Edit2 size={16} className="text-gray-600" />
                  </button>
                  <button
                    onClick={() => handleDelete(variant.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <Trash2 size={16} className="text-red-600" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add New Variant Form */}
        {isAdding && (
          <div className="bg-white border border-blue-200 rounded p-3">
            <div className="grid grid-cols-5 gap-2">
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="px-2 py-1 border rounded text-sm"
                placeholder="Variant name"
                autoFocus
              />
              <input
                type="number"
                value={formData.duration_modifier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    duration_modifier: parseInt(e.target.value),
                  })
                }
                className="px-2 py-1 border rounded text-sm"
                placeholder="Duration modifier"
              />
              <input
                type="number"
                step="0.01"
                value={formData.price_modifier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    price_modifier: parseFloat(e.target.value),
                  })
                }
                className="px-2 py-1 border rounded text-sm"
                placeholder="Price modifier"
              />
              <label className="flex items-center text-sm">
                <input
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) =>
                    setFormData({ ...formData, is_default: e.target.checked })
                  }
                  className="mr-1"
                />
                Default
              </label>
              <div className="flex space-x-1">
                <button
                  onClick={handleAdd}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <Check size={16} className="text-green-600" />
                </button>
                <button
                  onClick={() => {
                    setIsAdding(false);
                    setFormData({
                      name: '',
                      duration_modifier: 0,
                      price_modifier: 0,
                      is_default: false,
                    });
                  }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X size={16} className="text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
