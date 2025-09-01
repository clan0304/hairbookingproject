// ============================================
// app/book/[booking_url]/team/page.tsx
// (Public booking page showing team members for specific shop)
// ============================================
'use client';

import { useEffect, useState } from 'react';
import { User, MapPin, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

interface PublicTeamMember {
  id: string;
  first_name: string;
  role: string;
  photo?: string | null;
}

interface ShopInfo {
  id: string;
  name: string;
  address: string;
}

export default function BookingTeamPage({
  params,
}: {
  params: { booking_url: string };
}) {
  const [teamMembers, setTeamMembers] = useState<PublicTeamMember[]>([]);
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchShopAndTeam() {
      try {
        // First, verify the shop exists and get shop info
        const shopResponse = await fetch(
          `/api/public/shop/${params.booking_url}`
        );

        if (!shopResponse.ok) {
          setError('Shop not found');
          setLoading(false);
          return;
        }

        const shopData = await shopResponse.json();
        setShopInfo(shopData.data);

        // Then fetch team members (could be filtered by shop in the future)
        const teamResponse = await fetch(
          `/api/public/team?shop=${params.booking_url}`
        );
        const teamData = await teamResponse.json();

        if (teamResponse.ok) {
          setTeamMembers(teamData.data || []);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setError('Failed to load team members');
      } finally {
        setLoading(false);
      }
    }

    if (params.booking_url) {
      fetchShopAndTeam();
    }
  }, [params.booking_url]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading team...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-100 rounded-full p-4 mx-auto w-16 h-16 mb-4">
            <User className="w-8 h-8 text-red-600 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Oops!</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Go back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/book/${params.booking_url}`}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft size={20} className="mr-1" />
              <span>Back</span>
            </Link>
            {shopInfo && (
              <div className="text-center">
                <h3 className="font-semibold text-gray-900">{shopInfo.name}</h3>
                <p className="text-sm text-gray-500 flex items-center justify-center">
                  <MapPin size={14} className="mr-1" />
                  {shopInfo.address}
                </p>
              </div>
            )}
            <div className="w-16"></div> {/* Spacer for alignment */}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Professional
            </h1>
            <p className="text-lg text-gray-600">
              Select a team member to book your appointment
            </p>
            <div className="mt-2 text-sm text-gray-500">
              Booking at: <span className="font-medium">{shopInfo?.name}</span>
            </div>
          </div>

          {teamMembers.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {teamMembers.map((member) => (
                <Link
                  key={member.id}
                  href={`/book/${params.booking_url}/team/${member.id}`}
                  className="bg-white rounded-lg shadow hover:shadow-lg transition-all duration-200 p-6 text-center group cursor-pointer"
                >
                  <div className="mb-4">
                    {member.photo ? (
                      <Image
                        src={member.photo}
                        alt={member.first_name}
                        className="w-24 h-24 rounded-full mx-auto object-cover group-hover:scale-105 transition-transform"
                        width={24}
                        height={24}
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full mx-auto bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl font-bold group-hover:scale-105 transition-transform">
                        {member.first_name[0]}
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                    {member.first_name}
                  </h3>
                  <p className="text-sm text-gray-600">{member.role}</p>
                  <div className="mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-xs text-blue-600 font-medium">
                      Select →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <User size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg mb-2">
                No team members available
              </p>
              <p className="text-gray-400 text-sm">
                Please check back later or contact the shop directly
              </p>
            </div>
          )}

          {/* Footer Info */}
          <div className="mt-12 text-center text-sm text-gray-500">
            <p>Can&apos;t find who you&apos;re looking for?</p>
            <p className="mt-1">
              Contact us at{' '}
              <a
                href="tel:1234567890"
                className="text-blue-600 hover:text-blue-700"
              >
                (123) 456-7890
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
