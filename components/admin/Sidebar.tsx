// components/admin/Sidebar.tsx
'use client';

import { UserButton } from '@clerk/nextjs';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Home,
  Calendar,
  Tag,
  Smile,
  BookOpen,
  User,
  Megaphone,
  Users,
  TrendingUp,
  Grid3x3,
  Settings,
  Menu,
  X,
} from 'lucide-react';

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    {
      href: '/admin',
      label: 'Home',
      icon: Home,
    },
    {
      href: '/admin/calendar',
      label: 'Calendar',
      icon: Calendar,
    },
    {
      href: '/admin/services',
      label: 'Services',
      icon: Tag,
    },
    {
      href: '/admin/clients',
      label: 'Clients',
      icon: Smile,
    },
    {
      href: '/admin/shops',
      label: 'Shops',
      icon: BookOpen,
    },
    {
      href: '/admin/team',
      label: 'Team',
      icon: User,
    },
    {
      href: '/admin/marketing',
      label: 'Marketing',
      icon: Megaphone,
    },
    {
      href: '/admin/staffmanagement',
      label: 'Shift Management',
      icon: Users,
    },
    {
      href: '/admin/analytics',
      label: 'Analytics',
      icon: TrendingUp,
    },
    {
      href: '/admin/apps',
      label: 'Apps',
      icon: Grid3x3,
    },
    {
      href: '/admin/settings',
      label: 'Settings',
      icon: Settings,
    },
  ];

  const isActiveRoute = (href: string) => {
    if (href === '/admin' && pathname === '/admin') return true;
    if (href !== '/admin' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-gray-900 text-white rounded-md"
      >
        {isMobileOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar - Icon Only */}
      <div
        className={`
        fixed lg:static
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        w-[70px]
        h-screen bg-gray-900 text-white transition-all duration-300 z-40 flex flex-col
      `}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-center border-b border-gray-800">
          <div className="text-2xl font-bold">F</div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isActiveRoute(item.href);

            return (
              <div key={item.href} className="relative group">
                <Link
                  href={item.href}
                  onClick={() => isMobileOpen && setIsMobileOpen(false)}
                  className={`
                    flex items-center justify-center py-3 transition-all duration-200
                    ${isActive ? '' : 'text-gray-400 hover:text-white'}
                  `}
                >
                  <div
                    className={`
                    p-2.5 rounded-lg flex items-center justify-center transition-all
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/25'
                        : 'hover:bg-gray-800'
                    }
                  `}
                  >
                    <Icon size={22} />
                  </div>
                </Link>

                {/* Tooltip */}
                <div
                  className="
                  absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-sm rounded-md
                  opacity-0 invisible group-hover:opacity-100 group-hover:visible
                  transition-all duration-200 whitespace-nowrap z-50
                  pointer-events-none
                "
                >
                  {item.label}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-800 p-3">
          <div className="flex items-center justify-center">
            <UserButton
              afterSignOutUrl="/auth"
              appearance={{
                elements: {
                  avatarBox: 'h-10 w-10',
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Mobile Full Sidebar (Optional - for better mobile UX) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed left-0 top-0 w-64 h-screen bg-gray-900 text-white z-50 flex flex-col">
          {/* Mobile Logo Section */}
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
            <h1 className="text-2xl font-bold">fresha</h1>
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1 hover:bg-gray-800 rounded-md transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Mobile Navigation with Labels */}
          <nav className="flex-1 overflow-y-auto py-4">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = isActiveRoute(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={`
                    flex items-center px-6 py-3 transition-all duration-200
                    ${
                      isActive
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }
                  `}
                >
                  <div
                    className={`
                    ${isActive ? 'bg-white/20' : ''}
                    p-2.5 rounded-lg flex items-center justify-center
                  `}
                  >
                    <Icon size={20} />
                  </div>
                  <span className="ml-3 font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile User Section */}
          <div className="border-t border-gray-800 p-4">
            <div className="flex items-center space-x-3">
              <UserButton
                afterSignOutUrl="/auth"
                appearance={{
                  elements: {
                    avatarBox: 'h-10 w-10',
                  },
                }}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">Admin</p>
                <p className="text-xs text-gray-400">Manage your business</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
