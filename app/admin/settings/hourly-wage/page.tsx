// app/admin/settings/hourly-wage/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  Plus,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface HourlyRate {
  id: string;
  day_type: 'weekday' | 'saturday' | 'sunday' | 'public_holiday';
  rate: number;
  updated_at: string;
}

interface PublicHoliday {
  id: string;
  name: string;
  date: string;
  recurring: boolean;
  created_at: string;
  updated_at: string;
}

export default function HourlyWagePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'rates' | 'holidays'>('rates');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Hourly Rates State
  const [hourlyRates, setHourlyRates] = useState<HourlyRate[]>([]);

  // Public Holidays State
  const [publicHolidays, setPublicHolidays] = useState<PublicHoliday[]>([]);

  const [editingHoliday, setEditingHoliday] = useState<PublicHoliday | null>(
    null
  );
  const [showHolidayModal, setShowHolidayModal] = useState(false);

  // Form state for new/edit holiday
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    date: '',
    recurring: false,
  });

  const dayTypeLabels = {
    weekday: 'Weekdays (Mon-Fri)',
    saturday: 'Saturday',
    sunday: 'Sunday',
    public_holiday: 'Public Holiday',
  };

  const dayTypeDescriptions = {
    weekday: 'Standard rate for Monday to Friday',
    saturday: 'Weekend rate for Saturdays',
    sunday: 'Weekend rate for Sundays',
    public_holiday: 'Special rate for public holidays',
  };

  // Fetch hourly rates
  useEffect(() => {
    fetchHourlyRates();
    fetchPublicHolidays();
  }, []);

  const fetchHourlyRates = async () => {
    try {
      const response = await fetch('/api/admin/hourly-rates');
      if (!response.ok) throw new Error('Failed to fetch rates');
      const result = await response.json();
      setHourlyRates(result.data);
    } catch (error) {
      toast.error('Failed to load hourly rates');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicHolidays = async () => {
    try {
      const response = await fetch('/api/admin/public-holidays');
      if (!response.ok) throw new Error('Failed to fetch holidays');
      const result = await response.json();
      setPublicHolidays(result.data);
    } catch (error) {
      toast.error('Failed to load public holidays');
      console.error(error);
    }
  };

  const handleRateChange = (dayType: string, value: string) => {
    setHourlyRates((prev) =>
      prev.map((rate) =>
        rate.day_type === dayType
          ? { ...rate, rate: parseFloat(value) || 0 }
          : rate
      )
    );
  };

  const handleSaveRates = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/hourly-rates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rates: hourlyRates }),
      });

      if (!response.ok) throw new Error('Failed to save rates');

      const result = await response.json();
      toast.success('Hourly rates updated successfully');
      setHourlyRates(result.data);
    } catch (error) {
      toast.error('Failed to update hourly rates');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddHoliday = () => {
    setEditingHoliday(null);
    setHolidayForm({
      name: '',
      date: '',
      recurring: false,
    });
    setShowHolidayModal(true);
  };

  const handleEditHoliday = (holiday: PublicHoliday) => {
    setEditingHoliday(holiday);
    setHolidayForm({
      name: holiday.name,
      date: holiday.date,
      recurring: holiday.recurring,
    });
    setShowHolidayModal(true);
  };

  const handleDeleteHoliday = async (id: string) => {
    if (confirm('Are you sure you want to delete this public holiday?')) {
      try {
        const response = await fetch(`/api/admin/public-holidays/${id}`, {
          method: 'DELETE',
        });

        if (!response.ok) throw new Error('Failed to delete holiday');

        toast.success('Holiday deleted successfully');
        fetchPublicHolidays();
      } catch (error) {
        toast.error('Failed to delete holiday');
        console.error(error);
      }
    }
  };

  const handleSaveHoliday = async () => {
    if (!holidayForm.name || !holidayForm.date) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const url = editingHoliday
        ? `/api/admin/public-holidays/${editingHoliday.id}`
        : '/api/admin/public-holidays';

      const method = editingHoliday ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(holidayForm),
      });

      if (!response.ok) throw new Error('Failed to save holiday');

      toast.success(
        editingHoliday
          ? 'Holiday updated successfully'
          : 'Holiday added successfully'
      );
      setShowHolidayModal(false);
      fetchPublicHolidays();
    } catch (error) {
      toast.error('Failed to save holiday');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/admin/settings')}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-semibold">Hourly Wage Management</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('rates')}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'rates'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <DollarSign className="w-4 h-4 mr-2" />
                  Hourly Rates
                </div>
              </button>
              <button
                onClick={() => setActiveTab('holidays')}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'holidays'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-2" />
                  Public Holidays
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'rates' ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-lg font-semibold mb-2">
                    Configure Hourly Rates
                  </h2>
                  <p className="text-gray-600">
                    Set different hourly rates for each day type
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {hourlyRates.map((rate) => (
                    <div
                      key={rate.id}
                      className="bg-white border border-gray-200 rounded-lg p-5 hover:border-purple-200 transition-colors"
                    >
                      <div className="mb-4">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {dayTypeLabels[rate.day_type]}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {dayTypeDescriptions[rate.day_type]}
                        </p>
                      </div>

                      <div className="flex items-center">
                        <span className="text-gray-500 mr-2">$</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={rate.rate}
                          onChange={(e) =>
                            handleRateChange(rate.day_type, e.target.value)
                          }
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-medium"
                          placeholder="0.00"
                        />
                        <span className="text-gray-500 ml-2">per hour</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-blue-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-blue-800">
                        These rates will be applied automatically when
                        calculating wages for different day types. Public
                        holiday rates will override weekend rates if a holiday
                        falls on a weekend.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleSaveRates}
                    disabled={saving}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4 mr-2" />
                    )}
                    Save Rates
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-6 flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold mb-2">
                      Public Holidays
                    </h2>
                    <p className="text-gray-600">
                      Manage public holidays for wage calculation
                    </p>
                  </div>
                  <button
                    onClick={handleAddHoliday}
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Holiday
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Name
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Date
                        </th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">
                          Recurring
                        </th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {publicHolidays.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="text-center py-8 text-gray-500"
                          >
                            No public holidays configured
                          </td>
                        </tr>
                      ) : (
                        publicHolidays.map((holiday) => (
                          <tr
                            key={holiday.id}
                            className="border-b hover:bg-gray-50"
                          >
                            <td className="py-3 px-4">{holiday.name}</td>
                            <td className="py-3 px-4">
                              {new Date(holiday.date).toLocaleDateString(
                                'en-AU',
                                {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                }
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <span
                                className={`inline-flex px-2 py-1 text-xs rounded-full ${
                                  holiday.recurring
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-gray-100 text-gray-800'
                                }`}
                              >
                                {holiday.recurring ? 'Yearly' : 'One-time'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => handleEditHoliday(holiday)}
                                  className="p-1 hover:bg-gray-100 rounded transition-colors"
                                >
                                  <Edit2 className="w-4 h-4 text-gray-600" />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteHoliday(holiday.id)
                                  }
                                  className="p-1 hover:bg-red-50 rounded transition-colors"
                                >
                                  <Trash2 className="w-4 h-4 text-red-600" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Holiday Modal */}
      {showHolidayModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Holiday Name
                </label>
                <input
                  type="text"
                  value={holidayForm.name}
                  onChange={(e) =>
                    setHolidayForm((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                  placeholder="e.g., Christmas Day"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={holidayForm.date}
                  onChange={(e) =>
                    setHolidayForm((prev) => ({
                      ...prev,
                      date: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={holidayForm.recurring}
                  onChange={(e) =>
                    setHolidayForm((prev) => ({
                      ...prev,
                      recurring: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="recurring"
                  className="ml-2 text-sm text-gray-700"
                >
                  Recurring yearly
                </label>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowHolidayModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveHoliday}
                disabled={saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
