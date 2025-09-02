// app/api/public/booking/availability/route.ts
// ============================================
// Get available time slots for booking
// Considers team member, service duration, and existing bookings
// ============================================
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { addMinutes, format, parse, isAfter, isBefore } from 'date-fns';

const supabase = createServerClient();

// Define types for better type safety
interface AvailabilitySlot {
  id: string;
  team_member_id: string;
  shop_id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface Booking {
  id: string;
  team_member_id: string;
  service_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
}

interface TimeSlot {
  time: string;
  display_time: string;
  end_time: string;
  display_end_time: string;
  team_member_id: string;
  shop_id: string;
  is_available: boolean;
  slot_id: string;
}

interface TeamMemberService {
  team_member_id: string;
  duration?: number;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamMemberId = searchParams.get('team_member_id');
    const serviceId = searchParams.get('service_id');
    const date = searchParams.get('date'); // Format: YYYY-MM-DD

    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    // If "any" professional selected, get all available team members for this service
    let teamMemberIds: string[] = [];
    if (teamMemberId === 'any' && serviceId) {
      const { data: availableProviders } = await supabase
        .from('team_member_services')
        .select('team_member_id')
        .eq('service_id', serviceId)
        .eq('is_available', true);

      teamMemberIds =
        availableProviders?.map((p: TeamMemberService) => p.team_member_id) ||
        [];
    } else if (teamMemberId && teamMemberId !== 'any') {
      teamMemberIds = [teamMemberId];
    }

    if (teamMemberIds.length === 0) {
      return NextResponse.json({
        data: {
          available_slots: [],
          date: date,
          message: 'No providers available for this service',
        },
      });
    }

    // Get service duration (from specific team member or base)
    let serviceDuration = 30; // default
    if (serviceId && teamMemberId && teamMemberId !== 'any') {
      const { data: teamService } = await supabase
        .from('team_member_services')
        .select('duration')
        .eq('team_member_id', teamMemberId)
        .eq('service_id', serviceId)
        .single();

      if (teamService && typeof teamService.duration === 'number') {
        serviceDuration = teamService.duration;
      }
    } else if (serviceId) {
      const { data: service } = await supabase
        .from('services')
        .select('base_duration')
        .eq('id', serviceId)
        .single();

      if (service && typeof service.base_duration === 'number') {
        serviceDuration = service.base_duration;
      }
    }

    // Get availability slots for the team members on this date
    const { data: availabilitySlots, error: availabilityError } = await supabase
      .from('availability_slots')
      .select('*')
      .in('team_member_id', teamMemberIds)
      .eq('date', date)
      .eq('is_available', true);

    if (availabilityError) {
      console.error('Error fetching availability slots:', availabilityError);
      return NextResponse.json(
        { error: 'Failed to fetch availability' },
        { status: 500 }
      );
    }

    if (!availabilitySlots || availabilitySlots.length === 0) {
      return NextResponse.json({
        data: {
          available_slots: [],
          date: date,
          message: 'No availability on this date',
        },
      });
    }

    // Get existing bookings for these team members on this date
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('*')
      .in('team_member_id', teamMemberIds)
      .eq('booking_date', date)
      .in('status', ['confirmed', 'pending']);

    const bookings: Booking[] = existingBookings || [];

    // Generate time slots
    const timeSlots: TimeSlot[] = [];
    const slotInterval = 30; // 30-minute intervals

    for (const slot of availabilitySlots as AvailabilitySlot[]) {
      const startTime = parse(slot.start_time, 'HH:mm:ss', new Date(date));
      const endTime = parse(slot.end_time, 'HH:mm:ss', new Date(date));

      let currentSlot = startTime;

      while (
        isBefore(addMinutes(currentSlot, serviceDuration), endTime) ||
        format(addMinutes(currentSlot, serviceDuration), 'HH:mm') ===
          format(endTime, 'HH:mm')
      ) {
        const slotEndTime = addMinutes(currentSlot, serviceDuration);

        // Check if this slot conflicts with any existing bookings
        const isBooked = bookings.some((booking: Booking) => {
          if (booking.team_member_id !== slot.team_member_id) return false;

          const bookingStart = parse(
            booking.start_time,
            'HH:mm:ss',
            new Date(date)
          );
          const bookingEnd = parse(
            booking.end_time,
            'HH:mm:ss',
            new Date(date)
          );

          return (
            (isAfter(currentSlot, bookingStart) &&
              isBefore(currentSlot, bookingEnd)) ||
            (isAfter(slotEndTime, bookingStart) &&
              isBefore(slotEndTime, bookingEnd)) ||
            format(currentSlot, 'HH:mm') === format(bookingStart, 'HH:mm')
          );
        });

        if (!isBooked) {
          // For "any" professional, we need to track which team member is available
          const availableTeamMember =
            teamMemberId === 'any'
              ? slot.team_member_id
              : teamMemberId || slot.team_member_id; // Fallback to slot's team member if teamMemberId is null

          timeSlots.push({
            time: format(currentSlot, 'HH:mm'),
            display_time: format(currentSlot, 'h:mm a'),
            end_time: format(slotEndTime, 'HH:mm'),
            display_end_time: format(slotEndTime, 'h:mm a'),
            team_member_id: availableTeamMember,
            shop_id: slot.shop_id,
            is_available: true,
            slot_id: `${slot.id}_${format(currentSlot, 'HHmm')}`,
          });
        }

        currentSlot = addMinutes(currentSlot, slotInterval);
      }
    }

    // Remove duplicate time slots (when multiple team members are available at the same time)
    const uniqueSlots: TimeSlot[] =
      teamMemberId === 'any'
        ? timeSlots.reduce((acc: TimeSlot[], slot: TimeSlot) => {
            const existingSlot = acc.find(
              (s: TimeSlot) => s.time === slot.time
            );
            if (!existingSlot) {
              acc.push(slot);
            }
            return acc;
          }, [])
        : timeSlots;

    // Sort slots by time
    uniqueSlots.sort((a: TimeSlot, b: TimeSlot) =>
      a.time.localeCompare(b.time)
    );

    return NextResponse.json({
      data: {
        date: date,
        service_duration: serviceDuration,
        available_slots: uniqueSlots,
        total_slots: uniqueSlots.length,
        team_member_id: teamMemberId,
        service_id: serviceId,
      },
    });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
