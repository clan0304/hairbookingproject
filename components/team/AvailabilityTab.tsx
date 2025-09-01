// components/team/AvailabilityTab.tsx
// ============================================
'use client'

import { useEffect, useState } from 'react'
import { AvailabilityCalendar } from '@/components/availability/AvailabilityCalendar'
import { AvailabilityFilters } from '@/components/availability/AvailabilityFilters'
import { CreateAvailabilityModal } from '@/components/availability/CreateAvailabilityModal'
import type { AvailabilitySlot, TeamMember, Shop } from '@/types/database'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns'

interface AvailabilityTabProps {
  teamMembers: TeamMember[]
}

export function AvailabilityTab({ teamMembers }: AvailabilityTabProps) {
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [shops, setShops] = useState<Shop[]>([])
  const [loading, setLoading] = useState(true)
  const [currentWeek, setCurrentWeek] = useState(new Date())
  const [selectedShop, setSelectedShop] = useState<string>('all')
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 })

  useEffect(() => {
    fetchData()
  }, [currentWeek, selectedShop, selectedTeamMember])

  async function fetchData() {
    setLoading(true)
    try {
      // Fetch shops
      const shopsResponse = await fetch('/api/admin/shops')
      const shopsData = await shopsResponse.json()
      setShops(shopsData.data || [])

      // Fetch availability slots for the current week
      const params = new URLSearchParams({
        start_date: format(weekStart, 'yyyy-MM-dd'),
        end_date: format(weekEnd, 'yyyy-MM-dd'),
      })
      
      if (selectedShop !== 'all') params.append('shop_id', selectedShop)
      if (selectedTeamMember !== 'all') params.append('team_member_id', selectedTeamMember)

      const availabilityResponse = await fetch(`/api/admin/availability?${params}`)
      const availabilityData = await availabilityResponse.json()
      setSlots(availabilityData.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1))
  }

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1))
  }

  const handleCurrentWeek = () => {
    setCurrentWeek(new Date())
  }

  const handleSlotUpdate = () => {
    fetchData()
  }

  return (
    <>
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium text-gray-900">Scheduled Shifts</h2>
          <p className="text-sm text-gray-600 mt-1">Manage team schedules across all locations</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus size={20} className="mr-2" />
          Add Shift
        </button>
      </div>

      {/* Filters */}
      <AvailabilityFilters
        shops={shops}
        teamMembers={teamMembers}
        selectedShop={selectedShop}
        selectedTeamMember={selectedTeamMember}
        onShopChange={setSelectedShop}
        onTeamMemberChange={setSelectedTeamMember}
      />

      {/* Week Navigation */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 flex items-center justify-between border-b">
          <div className="flex items-center space-x-4">
            <button
              onClick={handlePreviousWeek}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleCurrentWeek}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
            >
              This Week
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="text-lg font-medium">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </div>
        </div>

        {/* Calendar View */}
        {loading ? (
          <div className="flex items-center justify-center h-96">
            <div className="text-lg">Loading availability...</div>
          </div>
        ) : (
          <AvailabilityCalendar
            slots={slots}
            teamMembers={teamMembers}
            shops={shops}
            weekStart={weekStart}
            onSlotUpdate={handleSlotUpdate}
          />
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAvailabilityModal
          teamMembers={teamMembers}
          shops={shops}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false)
            fetchData()
          }}
        />
      )}
    </>
  )
}