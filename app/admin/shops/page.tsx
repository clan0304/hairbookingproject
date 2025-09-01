// app/admin/shops/page.tsx
// ============================================
'use client';

import { useEffect, useState } from 'react';
import { ShopsTable } from '@/components/shops/ShopsTable';
import { CreateShopForm } from '@/components/shops/CreateShopForm';
import { ShopDetailsModal } from '@/components/shops/ShopDetailsModal';
import type { Shop } from '@/types/database';
import { Plus } from 'lucide-react';

export default function ShopsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  useEffect(() => {
    fetchShops();
  }, []);

  async function fetchShops() {
    try {
      const response = await fetch('/api/admin/shops');
      const data = await response.json();

      if (response.ok) {
        setShops(data.data || []);
      } else {
        console.error('Failed to fetch shops:', data.error);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleShopCreated = () => {
    setShowCreateForm(false);
    fetchShops();
  };

  const handleShopUpdated = () => {
    setSelectedShop(null);
    fetchShops();
  };

  const handleShopDeleted = () => {
    setSelectedShop(null);
    fetchShops();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading shops...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Shops Management</h1>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Add Shop
        </button>
      </div>

      {/* Create Shop Form */}
      {showCreateForm && (
        <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Create New Shop
              </h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <CreateShopForm onShopCreated={handleShopCreated} />
          </div>
        </div>
      )}

      {/* Shops Table */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <ShopsTable shops={shops} onShopClick={setSelectedShop} />
        </div>
      </div>

      {/* Shop Details Modal */}
      {selectedShop && (
        <ShopDetailsModal
          shop={selectedShop}
          onClose={() => setSelectedShop(null)}
          onUpdate={handleShopUpdated}
          onDelete={handleShopDeleted}
        />
      )}
    </div>
  );
}
