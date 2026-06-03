import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * 슬롯 운영 래퍼. Postgres 함수(0010)를 service_role로 호출.
 * 관리자/배치 경로 전용.
 */

/**
 * 운영일(금·토) open 슬롯을 기간 단위로 멱등 생성. 생성 건수 반환.
 * @param from YYYY-MM-DD
 * @param to   YYYY-MM-DD
 */
export async function generateSlots(from: string, to: string): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('generate_slots', {
    p_from: from,
    p_to: to,
  });
  if (error) throw error;
  return data ?? 0;
}

/**
 * 만료된 pending_payment 예약을 일괄 회수(취소 + 슬롯 open 복구). 취소 건수 반환.
 * 주기 호출(cron/배치)에서 사용. 타임아웃 기본값은 DB(pending_payment_timeout)가 결정.
 */
export async function expirePendingBookings(): Promise<number> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('expire_pending_bookings', {});
  if (error) throw error;
  return data ?? 0;
}
