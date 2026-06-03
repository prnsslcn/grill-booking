import 'server-only';

import { toReservationError, ReservationError } from '@/lib/booking/errors';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 슬롯 선점 → pending_payment 예약 생성.
 *
 * 실제 정합성 로직은 Postgres 함수 reserve_slot(0010 마이그레이션)이 단일 트랜잭션으로 수행한다:
 *   슬롯 FOR UPDATE 잠금 → 상태확인/지연회수 → 가격·스냅샷 → 예약 INSERT → 슬롯 booked.
 * 동시 요청은 FOR UPDATE로 직렬화되고, bookings_active_slot_unique가 최종 백스톱.
 *
 * service_role(admin 클라이언트)로 호출 — RLS 우회는 이 서버 경로에 한정.
 */

export interface ReserveInput {
  slotId: string;
  guestName: string;
  guestPhone: string;
  guestCount: number;
}

export interface ReserveResult {
  bookingId: string;
  bookingNumber: string;
  orderId: string;
  amount: number;
}

export async function reserveSlot(input: ReserveInput): Promise<ReserveResult> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc('reserve_slot', {
    p_slot_id: input.slotId,
    p_guest_name: input.guestName,
    p_guest_phone: input.guestPhone,
    p_guest_count: input.guestCount,
  });

  if (error) {
    throw toReservationError(error);
  }

  // reserve_slot은 table을 반환 → 첫 행 사용
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    throw new ReservationError('UNKNOWN', '예약 결과가 비어 있습니다.');
  }

  return {
    bookingId: row.booking_id,
    bookingNumber: row.booking_number,
    orderId: row.order_id,
    amount: row.amount,
  };
}
