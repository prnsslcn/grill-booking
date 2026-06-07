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
  unit_label?: string;
  meat?: string;
}

const MEAT_LABEL: Record<string, string> = { pork: '돼지', beef: '소' };

export interface BookingDetail {
  bookingNumber: string;
  status: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
  facilityName: string;
  unitLabel: string;
  meatLabel: string;
  date: string | null;
  part: Part | null;
  amount: number;
  createdAt: string;
  updatedAt: string;
  payments: {
    status: string;
    method: string | null;
    amount: number;
    approvedAt: string | null;
    cancelledAt: string | null;
    tossPaymentKey: string | null;
  }[];
  notifications: {
    type: string;
    channel: string;
    status: string;
    sentAt: string | null;
  }[];
}

export async function getBookingDetail(bookingNumber: string): Promise<BookingDetail | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('bookings')
    .select(
      'booking_number, status, guest_name, guest_phone, guest_count, facility_snapshot, amount, created_at, updated_at, slots(date, part), payments(status, method, amount, approved_at, cancelled_at, toss_payment_key, created_at), notifications(type, channel, status, sent_at)',
    )
    .eq('booking_number', bookingNumber)
    .maybeSingle();

  if (!data) return null;
  const snapshot = (data.facility_snapshot ?? {}) as SnapshotShape;

  const payments = [...(data.payments ?? [])]
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? ''))
    .map((p) => ({
      status: p.status,
      method: p.method,
      amount: p.amount,
      approvedAt: p.approved_at,
      cancelledAt: p.cancelled_at,
      tossPaymentKey: p.toss_payment_key,
    }));

  return {
    bookingNumber: data.booking_number,
    status: data.status,
    guestName: data.guest_name,
    guestPhone: data.guest_phone,
    guestCount: data.guest_count,
    facilityName: snapshot.facility_name ?? '',
    unitLabel: snapshot.unit_label ?? '',
    meatLabel: snapshot.meat ? (MEAT_LABEL[snapshot.meat] ?? snapshot.meat) : '',
    date: data.slots?.date ?? null,
    part: (data.slots?.part as Part) ?? null,
    amount: data.amount,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    payments,
    notifications: (data.notifications ?? []).map((n) => ({
      type: n.type,
      channel: n.channel,
      status: n.status,
      sentAt: n.sent_at,
    })),
  };
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
