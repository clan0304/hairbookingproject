// components/shops/ShopDetailsModal.tsx
// ============================================
'use client';

import { useState } from 'react';
import { Shop } from '@/types/database';
import { X, Loader2, Trash2, Copy, CheckCircle } from 'lucide-react';
import { ImageUpload } from './ImageUpload';
import Image from 'next/image';

interface ShopDetailsModalProps {
  shop: Shop;
  onClose: () => void;
  onUpdate: () => void;
  onDelete: () => void;
}

export function ShopDetailsModal({
  shop,
  onClose,
  onUpdate,
  onDelete,
}: ShopDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    name: shop.name,
    address: shop.address,
    phone: shop.phone || '',
    is_active: shop.is_active,
  });

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('name', formData.name);
      formDataToSend.append('address', formData.address);
      formDataToSend.append('phone', formData.phone);
      formDataToSend.append('is_active', formData.is_active.toString());

      if (imageFile) {
        formDataToSend.append('image', imageFile);
      }

      const response = await fetch(`/api/admin/shops/${shop.id}`, {
        method: 'PUT',
        body: formDataToSend,
      });

      if (response.ok) {
        setIsEditing(false);
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating shop:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this shop?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/shops/${shop.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onDelete();
      }
    } catch (error) {
      console.error('Error deleting shop:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyBookingUrl = () => {
    const fullUrl = `${window.location.origin}/book/${shop.booking_url}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Shop' : 'Shop Details'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {isEditing ? (
            <form className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shop Image
                </label>
                <ImageUpload
                  onImageSelect={setImageFile}
                  currentImage={shop.image}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Shop Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Address
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  rows={2}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 border"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Active</span>
                </label>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              {shop.image && (
                <div className="h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <Image
                    src={shop.image}
                    alt={shop.name}
                    className="w-full h-full object-cover"
                    fill
                  />
                </div>
              )}

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {shop.name}
                </h3>

                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Address
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {shop.address}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {shop.phone || 'Not provided'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Booking URL
                    </dt>
                    <dd className="mt-1">
                      <div className="flex items-center space-x-2">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded flex-1 truncate">
                          {window.location.origin}/book/{shop.booking_url}
                        </code>
                        <button
                          onClick={copyBookingUrl}
                          className="p-1 hover:bg-gray-100 rounded transition-colors"
                        >
                          {copied ? (
                            <CheckCircle size={20} className="text-green-600" />
                          ) : (
                            <Copy size={20} className="text-gray-600" />
                          )}
                        </button>
                      </div>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Status
                    </dt>
                    <dd className="mt-1">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${
                          shop.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {shop.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </dd>
                  </div>

                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Created
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(shop.created_at).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex justify-between">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
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
            </>
          ) : (
            <>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <Trash2 size={16} className="mr-2" />
                Delete
              </button>
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Edit Shop
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
