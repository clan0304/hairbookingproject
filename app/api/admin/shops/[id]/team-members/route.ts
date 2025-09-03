// app/api/admin/shops/[id]/team-members/route.ts
// Note: The folder is [id] not [shopId], so we use params.id

import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

interface TeamMemberWithStatus {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string | null;
  role: string;
  photo?: string | null;
  is_visible?: boolean;
  display_order?: number;
  created_at: string;
  updated_at: string;
  is_assigned: boolean;
  other_shops: string[];
}

// GET all team members with assignment status for a shop
export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> } // Changed from shopId to id
) {
  try {
    // Await params properly for Next.js 15
    const params = await context.params;
    const shopId = params.id; // Use params.id since folder is [id]

    console.log('GET request - Shop ID:', shopId);

    // Validate shopId
    if (!shopId || shopId === 'undefined') {
      console.error('Invalid shop ID received:', shopId);
      return NextResponse.json(
        { error: 'Shop ID is required and must be valid' },
        { status: 400 }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all team members
    const { data: allTeamMembers, error: teamError } = await supabaseAdmin
      .from('team_members')
      .select('*')
      .eq('is_visible', true)
      .order('first_name');

    if (teamError) {
      console.error('Error fetching team members:', teamError);
      return NextResponse.json({ error: teamError.message }, { status: 400 });
    }

    // Get assignments for this shop
    const { data: assignments, error: assignError } = await supabaseAdmin
      .from('shop_team_members')
      .select('team_member_id')
      .eq('shop_id', shopId)
      .eq('is_active', true);

    if (assignError) {
      console.error('Error fetching assignments:', assignError);
      return NextResponse.json({ error: assignError.message }, { status: 400 });
    }

    const assignedIds = new Set(
      assignments?.map((a) => a.team_member_id) || []
    );

    // Add assignment status and other shop assignments
    const teamMembersWithStatus: TeamMemberWithStatus[] = await Promise.all(
      allTeamMembers?.map(async (member) => {
        // Get all shops this member is assigned to
        const { data: memberShops } = await supabaseAdmin
          .from('shop_team_members')
          .select(
            `
            shop_id,
            shops (
              id,
              name
            )
          `
          )
          .eq('team_member_id', member.id)
          .eq('is_active', true);

        // Extract shop names, filtering out the current shop
        const otherShopNames: string[] = [];
        if (memberShops) {
          memberShops.forEach((ms) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const shop = ms.shops as any;
            if (shop && ms.shop_id !== shopId) {
              if (shop.name) {
                otherShopNames.push(shop.name);
              } else if (Array.isArray(shop) && shop[0]?.name) {
                otherShopNames.push(shop[0].name);
              }
            }
          });
        }

        return {
          ...member,
          is_assigned: assignedIds.has(member.id),
          other_shops: otherShopNames,
        };
      }) || []
    );

    return NextResponse.json({
      data: teamMembersWithStatus,
      assigned_count: assignedIds.size,
      total_count: teamMembersWithStatus.length,
    });
  } catch (error) {
    console.error('Unexpected error in team-members GET:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// PUT bulk update team members for a shop
export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> } // Changed from shopId to id
) {
  try {
    const params = await context.params;
    const shopId = params.id; // Use params.id since folder is [id]

    console.log('PUT request - Shop ID:', shopId);

    if (!shopId || shopId === 'undefined') {
      return NextResponse.json(
        { error: 'Shop ID is required and must be valid' },
        { status: 400 }
      );
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('clerk_id', userId)
      .single();

    if (userData?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { team_member_ids } = body;

    console.log('Team member IDs to assign:', team_member_ids);

    if (!Array.isArray(team_member_ids)) {
      return NextResponse.json(
        { error: 'team_member_ids must be an array' },
        { status: 400 }
      );
    }

    // Deactivate all existing assignments for this shop
    console.log(`Deactivating existing assignments for shop ${shopId}...`);
    const { error: deactivateError } = await supabaseAdmin
      .from('shop_team_members')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('shop_id', shopId);

    if (deactivateError) {
      console.error('Error deactivating assignments:', deactivateError);
      return NextResponse.json(
        { error: deactivateError.message },
        { status: 400 }
      );
    }

    // Create new assignments if any
    if (team_member_ids.length > 0) {
      console.log(`Creating ${team_member_ids.length} new assignments...`);
      const assignments = team_member_ids.map((team_member_id) => ({
        shop_id: shopId,
        team_member_id,
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await supabaseAdmin
        .from('shop_team_members')
        .upsert(assignments, {
          onConflict: 'shop_id,team_member_id',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        console.error('Error creating assignments:', upsertError);
        return NextResponse.json(
          { error: upsertError.message },
          { status: 400 }
        );
      }
    }

    // Fetch and return the updated list
    const { data: updatedAssignments } = await supabaseAdmin
      .from('shop_team_members')
      .select(
        `
        team_member_id,
        team_members (
          id,
          first_name,
          last_name,
          email
        )
      `
      )
      .eq('shop_id', shopId)
      .eq('is_active', true);

    console.log(
      `Successfully updated assignments. Now ${
        updatedAssignments?.length || 0
      } active assignments`
    );
    return NextResponse.json({
      data: updatedAssignments,
      message: 'Team members updated successfully',
    });
  } catch (error) {
    console.error('Unexpected error in PUT team-members:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST add single team member to shop
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> } // Changed from shopId to id
) {
  try {
    const params = await context.params;
    const shopId = params.id; // Use params.id since folder is [id]

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { team_member_id } = body;

    const { data, error } = await supabaseAdmin
      .from('shop_team_members')
      .upsert(
        {
          shop_id: shopId,
          team_member_id,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'shop_id,team_member_id',
        }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Error adding team member:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
