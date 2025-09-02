// app/admin/services/page.tsx
// ============================================
'use client';

import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CategoriesTab } from '@/components/services/CategoriesTab';
import { ServicesTab } from '@/components/services/ServicesTab';
import { TeamServicesTab } from '@/components/services/TeamServicesTab';
import { Package, FolderOpen, Users } from 'lucide-react';

export default function ServicesPage() {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Services Management
        </h1>
        <p className="text-gray-600 mt-1">
          Manage service categories, services, and team member pricing
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 border-b">
            <TabsTrigger
              value="categories"
              className="flex items-center justify-center px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
            >
              <FolderOpen size={18} className="mr-2" />
              Categories
            </TabsTrigger>
            <TabsTrigger
              value="services"
              className="flex items-center justify-center px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
            >
              <Package size={18} className="mr-2" />
              Services
            </TabsTrigger>
            <TabsTrigger
              value="team"
              className="flex items-center justify-center px-4 py-3 data-[state=active]:border-b-2 data-[state=active]:border-blue-600"
            >
              <Users size={18} className="mr-2" />
              Team Pricing
            </TabsTrigger>
          </TabsList>

          <div className="p-6">
            <TabsContent value="categories">
              <CategoriesTab />
            </TabsContent>

            <TabsContent value="services">
              <ServicesTab />
            </TabsContent>

            <TabsContent value="team">
              <TeamServicesTab />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}
