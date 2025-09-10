// components/clients/ClientModal.tsx
'use client';

import { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Client } from '@/types/database';

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onSave: (clientData: Partial<Client>) => Promise<void>;
  mode: 'create' | 'edit';
}

export function ClientModal({
  isOpen,
  onClose,
  client,
  onSave,
  mode,
}: ClientModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    photo: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (client && mode === 'edit') {
      setFormData({
        first_name: client.first_name || '',
        last_name: client.last_name || '',
        email: client.email || '',
        phone: client.phone || '',
        photo: client.photo || '',
      });
    } else if (mode === 'create') {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        photo: '',
      });
    }
  }, [client, mode]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !isValidPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone: string) => {
    // Basic phone validation - adjust based on your requirements
    const phoneRegex = /^[\d\s\-\+\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving client:', error);
      // Error handling is done in the parent component
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalTitle = mode === 'create' ? 'Add New Client' : 'Edit Client';
  const submitButtonText =
    mode === 'create' ? 'Create Client' : 'Update Client';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">{modalTitle}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Photo */}
          <div className="flex justify-center">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={formData.photo || undefined} />
                <AvatarFallback className="bg-blue-100 text-blue-600 text-2xl">
                  {formData.first_name[0] || 'C'}
                  {formData.last_name[0] || ''}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute bottom-0 right-0 p-1.5 bg-white border rounded-full shadow-lg hover:bg-gray-50"
                title="Change photo"
              >
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>

          {/* First Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <User className="w-4 h-4 inline mr-1" />
              First Name *
            </label>
            <input
              type="text"
              value={formData.first_name}
              onChange={(e) =>
                setFormData({ ...formData, first_name: e.target.value })
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.first_name ? 'border-red-500' : ''
              }`}
              placeholder="John"
              required
            />
            {errors.first_name && (
              <p className="text-sm text-red-600">{errors.first_name}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <User className="w-4 h-4 inline mr-1" />
              Last Name
            </label>
            <input
              type="text"
              value={formData.last_name}
              onChange={(e) =>
                setFormData({ ...formData, last_name: e.target.value })
              }
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Doe"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Mail className="w-4 h-4 inline mr-1" />
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? 'border-red-500' : ''
              }`}
              placeholder="john.doe@example.com"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.phone ? 'border-red-500' : ''
              }`}
              placeholder="+1 234 567 8900"
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Saving...' : submitButtonText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
