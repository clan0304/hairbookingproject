// components/shops/ShopsTable.tsx
// ============================================
'use client';

import { Shop } from '@/types/database';
import { MapPin, Phone, ExternalLink, Edit } from 'lucide-react';
import Image from 'next/image';

interface ShopsTableProps {
  shops: Shop[];
  onShopClick: (shop: Shop) => void;
}

export function ShopsTable({ shops, onShopClick }: ShopsTableProps) {
  if (shops.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg mb-2">No shops found</p>
        <p className="text-sm">Create your first shop using the form above.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {shops.map((shop) => (
        <div
          key={shop.id}
          className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => onShopClick(shop)}
        >
          {/* Shop Image */}
          <div className="h-48 bg-gray-100 relative">
            {shop.image ? (
              <Image
                src={shop.image}
                alt={shop.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <MapPin size={48} />
              </div>
            )}
            <div className="absolute top-2 right-2">
              <span
                className={`px-2 py-1 text-xs font-medium rounded-full ${
                  shop.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {shop.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>

          {/* Shop Details */}
          <div className="p-4">
            <h3 className="font-semibold text-lg text-gray-900 mb-2">
              {shop.name}
            </h3>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start">
                <MapPin size={16} className="mr-2 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{shop.address}</span>
              </div>

              {shop.phone && (
                <div className="flex items-center">
                  <Phone size={16} className="mr-2 flex-shrink-0" />
                  <span>{shop.phone}</span>
                </div>
              )}

              <div className="flex items-center">
                <ExternalLink size={16} className="mr-2 flex-shrink-0" />
                <span className="font-mono text-xs text-blue-600 truncate">
                  /book/{shop.booking_url}
                </span>
              </div>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Created {new Date(shop.created_at).toLocaleDateString()}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShopClick(shop);
                }}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <Edit size={16} className="text-gray-600" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
