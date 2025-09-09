// app/admin/settings/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import {
  DollarSign,
  Calendar,
  Receipt,
  CreditCard,
  Users,
  FileText,
} from 'lucide-react';

interface SettingCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  color: string;
}

export default function SettingsPage() {
  const router = useRouter();

  const settingCards: SettingCard[] = [
    {
      id: 'hourly-wage',
      title: 'Hourly Wage',
      description:
        'Manage hourly rates for different days and configure public holidays.',
      icon: <DollarSign className="w-8 h-8" />,
      path: '/admin/settings/hourly-wage',
      color: 'text-purple-600',
    },
    {
      id: 'scheduling',
      title: 'Scheduling',
      description:
        'Set your availability, manage bookable resources and online booking preferences.',
      icon: <Calendar className="w-8 h-8" />,
      path: '/admin/settings/scheduling',
      color: 'text-purple-600',
    },
    {
      id: 'sales',
      title: 'Sales',
      description:
        'Configure payment methods, taxes, receipts, service charges and gift cards.',
      icon: <Receipt className="w-8 h-8" />,
      path: '/admin/settings/sales',
      color: 'text-purple-600',
    },
    {
      id: 'billing',
      title: 'Billing',
      description:
        'Manage Fresha invoices, messaging balance, add-ons and billing.',
      icon: <CreditCard className="w-8 h-8" />,
      path: '/admin/settings/billing',
      color: 'text-purple-600',
    },
    {
      id: 'team',
      title: 'Team',
      description: 'Manage permissions, compensation and time-off.',
      icon: <Users className="w-8 h-8" />,
      path: '/admin/settings/team',
      color: 'text-purple-600',
    },
    {
      id: 'forms',
      title: 'Forms',
      description: 'Configure templates for client forms.',
      icon: <FileText className="w-8 h-8" />,
      path: '/admin/settings/forms',
      color: 'text-purple-600',
    },
  ];

  const handleCardClick = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">
            Manage your business settings and preferences
          </p>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {settingCards.map((card) => (
            <button
              key={card.id}
              onClick={() => handleCardClick(card.path)}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:border-gray-300 
                         transition-all duration-300 hover:shadow-lg hover:-translate-y-1 
                         text-left cursor-pointer group"
            >
              <div
                className={`${card.color} mb-4 transition-transform duration-300 group-hover:scale-110`}
              >
                {card.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {card.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                {card.description}
              </p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
