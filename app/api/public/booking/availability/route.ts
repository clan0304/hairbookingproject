// app/api/public/booking/availability/route.ts
// ============================================
// Get available time slots with temporary reservation checking
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

interface Reservation {
  id: string;
  team_member_id: string;
  date: string;
  start_time: string;
  end_time: string;
  session_id: string;
  expires_at: string;
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
}

interface Service {
  base_duration: number;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const teamMemberId = searchParams.get('team_member_id');
    const serviceId = searchParams.get('service_id');
    const date = searchParams.get('date'); // Format: YYYY-MM-DD
    const shopId = searchParams.get('shop_id');
    const currentSessionId = searchParams.get('session_id'); // Current user's session

    if (!date || !shopId) {
      return NextResponse.json(
        { error: 'Date and Shop ID are required' },
        { status: 400 }
      );
    }

    // Clean up expired reservations first
    await supabase.rpc('cleanup_expired_reservations');

    // Get team member IDs (existing logic)
    let teamMemberIds: string[] = [];
    if (teamMemberId === 'any' && serviceId) {
      // Get team members who provide this service
      const { data: availableProviders } = await supabase
        .from('team_member_services')
        .select('team_member_id')
        .eq('service_id', serviceId)
        .eq('is_available', true);

      const serviceProviderIds =
        (availableProviders as TeamMemberService[] | null)?.map(
          (p: TeamMemberService) => p.team_member_id
        ) || [];

      if (serviceProviderIds.length > 0) {
        const { data: shopAvailability } = await supabase
          .from('availability_slots')
          .select('team_member_id')
          .in('team_member_id', serviceProviderIds)
          .eq('shop_id', shopId)
          .eq('date', date)
          .eq('is_available', true);

        const uniqueIds = new Set(
          (
            shopAvailability as
              | Pick<AvailabilitySlot, 'team_member_id'>[]
              | null
          )?.map(
            (slot: Pick<AvailabilitySlot, 'team_member_id'>) =>
              slot.team_member_id
          ) || []
        );
        teamMemberIds = Array.from(uniqueIds);
      }
    } else if (teamMemberId && teamMemberId !== 'any') {
      teamMemberIds = [teamMemberId];
    }

    if (teamMemberIds.length === 0) {
      return NextResponse.json({
        data: {
          available_slots: [],
          date: date,
          shop_id: shopId,
          message: 'No providers available',
        },
      });
    }

    // Get service duration
    let serviceDuration = 30;
    if (serviceId) {
      const { data: service } = await supabase
        .from('services')
        .select('base_duration')
        .eq('id', serviceId)
        .single();

      if ((service as Service | null)?.base_duration) {
        serviceDuration = (service as Service).base_duration;
      }
    }

    // Get availability slots
    const { data: availabilitySlots, error: availabilityError } = await supabase
      .from('availability_slots')
      .select('*')
      .in('team_member_id', teamMemberIds)
      .eq('shop_id', shopId)
      .eq('date', date)
      .eq('is_available', true);

    if (
      availabilityError ||
      !availabilitySlots ||
      availabilitySlots.length === 0
    ) {
      return NextResponse.json({
        data: {
          available_slots: [],
          date: date,
          shop_id: shopId,
          message: 'No availability at this location on this date',
        },
      });
    }

    // Get existing bookings
    const { data: existingBookings } = await supabase
      .from('bookings')
      .select('*')
      .in('team_member_id', teamMemberIds)
      .eq('booking_date', date)
      .in('status', ['confirmed', 'completed']);

    // Get active reservations (not expired and not from current session)
    const { data: activeReservations } = await supabase
      .from('booking_reservations')
      .select('*')
      .in('team_member_id', teamMemberIds)
      .eq('date', date)
      .gt('expires_at', new Date().toISOString())
      .neq('session_id', currentSessionId || 'none');

    const bookings: Booking[] = (existingBookings as Booking[] | null) || [];
    const reservations: Reservation[] =
      (activeReservations as Reservation[] | null) || [];

    // Generate time slots
    const timeSlots: TimeSlot[] = [];
    const slotInterval = 30;

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

        // Check if this slot is reserved by another user
        const isReserved = reservations.some((reservation: Reservation) => {
          if (reservation.team_member_id !== slot.team_member_id) return false;

          const reservationStart = parse(
            reservation.start_time,
            'HH:mm:ss',
            new Date(date)
          );
          const reservationEnd = parse(
            reservation.end_time,
            'HH:mm:ss',
            new Date(date)
          );

          return (
            (isAfter(currentSlot, reservationStart) &&
              isBefore(currentSlot, reservationEnd)) ||
            (isAfter(slotEndTime, reservationStart) &&
              isBefore(slotEndTime, reservationEnd)) ||
            format(currentSlot, 'HH:mm') === format(reservationStart, 'HH:mm')
          );
        });

        if (!isBooked && !isReserved) {
          const availableTeamMember =
            teamMemberId === 'any'
              ? slot.team_member_id
              : teamMemberId || slot.team_member_id;

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

    // Remove duplicate time slots for "any" professional
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

    uniqueSlots.sort((a: TimeSlot, b: TimeSlot) =>
      a.time.localeCompare(b.time)
    );

    return NextResponse.json({
      data: {
        date: date,
        shop_id: shopId,
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
