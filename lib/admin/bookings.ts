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
  q?: string;
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

  // 검색: 예약번호·이름·연락처 부분일치(.or 구문 깨지는 문자 제거)
  const q = filter.q?.replace(/[(),%]/g, ' ').trim();
  if (q) {
    query = query.or(
      `booking_number.ilike.%${q}%,guest_name.ilike.%${q}%,guest_phone.ilike.%${q}%`,
    );
  }

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
