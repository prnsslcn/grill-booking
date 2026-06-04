import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import type { Part } from '@/types/domain';

export interface AdminBooking {
  bookingNumber: string;
  status: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  facilityName: string;
  date: string | null;
  part: Part | null;
  amount: number;
  createdAt: string;
}

interface SnapshotShape {
  facility_name?: string;
}

export async function listBookings(filter: {
  date?: string;
  status?: string;
}): Promise<AdminBooking[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from('bookings')
    .select(
      'booking_number, status, guest_name, guest_phone, guest_count, facility_snapshot, amount, created_at, slots(date, part)',
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (filter.status) query = query.eq('status', filter.status);

  const { data } = await query;
  let rows = data ?? [];
  if (filter.date) rows = rows.filter((r) => r.slots?.date === filter.date);

  return rows.map((r) => {
    const snapshot = (r.facility_snapshot ?? {}) as SnapshotShape;
    return {
      bookingNumber: r.booking_number,
      status: r.status,
      guestName: r.guest_name,
      guestPhone: r.guest_phone,
      guestCount: r.guest_count,
      facilityName: snapshot.facility_name ?? '',
      date: r.slots?.date ?? null,
      part: (r.slots?.part as Part) ?? null,
      amount: r.amount,
      createdAt: r.created_at,
    };
  });
}
