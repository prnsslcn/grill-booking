import 'server-only';

import { serverEnv } from '@/lib/env';
import {
  getNotificationSender,
  type NotificationSender,
} from '@/lib/notifications';
import {
  buildMessages,
  type BookingInfo,
  type MessageExtra,
} from '@/lib/notifications/messages';
import type { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/types/database';
import type { Part } from '@/types/domain';

type AdminClient = ReturnType<typeof createAdminClient>;

type Recipient = 'customer' | 'admin';

interface SnapshotShape {
  facility_name?: string;
  unit_label?: string;
}

/**
 * 예약 확정/취소 시 고객·관리자 동시 발송 + 이력 기록(단일 진입점).
 *
 * 발송 구현체는 getNotificationSender()(env 게이트)로 결정한다. 관리자 번호
 * (ADMIN_NOTIFY_PHONE)가 없으면 관리자 발송은 건너뛴다. 전 과정 best-effort —
 * 어떤 단계가 실패해도 예약 확정/환불 자체는 유지한다.
 */
export async function dispatchBookingNotification(
  supabase: AdminClient,
  bookingId: string,
  type: 'confirm' | 'cancel',
  extra: MessageExtra = {},
): Promise<void> {
  try {
    const { data } = await supabase
      .from('bookings')
      .select(
        'booking_number, guest_name, guest_phone, guest_count, amount, facility_snapshot, slots(date, part)',
      )
      .eq('id', bookingId)
      .maybeSingle();

    if (!data || !data.slots) return;

    const snapshot = (data.facility_snapshot ?? {}) as SnapshotShape;
    const info: BookingInfo = {
      bookingNumber: data.booking_number,
      guestName: data.guest_name,
      guestPhone: data.guest_phone,
      guestCount: data.guest_count,
      amount: data.amount,
      facilityName: snapshot.facility_name ?? '',
      unitLabel: snapshot.unit_label ?? '',
      dateIso: data.slots.date,
      part: data.slots.part as Part,
    };

    const { customer, admin } = buildMessages(type, info, extra);
    const sender = getNotificationSender();
    const adminPhone = serverEnv.adminNotifyPhone;

    // 고객·관리자 발송은 서로 독립 — 한쪽 실패가 다른 쪽을 막지 않는다.
    await sendAndRecord(supabase, sender, bookingId, type, 'customer', data.guest_phone, customer);
    if (adminPhone) {
      await sendAndRecord(supabase, sender, bookingId, type, 'admin', adminPhone, admin);
    }
  } catch {
    // best-effort: 알림 실패가 예약/환불 트랜잭션을 되돌리지 않는다.
  }
}

/** 단일 수신자 발송 + notifications 이력 1건 기록. 자체적으로 예외를 삼킨다. */
async function sendAndRecord(
  supabase: AdminClient,
  sender: NotificationSender,
  bookingId: string,
  type: 'confirm' | 'cancel',
  recipient: Recipient,
  to: string,
  text: string,
): Promise<void> {
  try {
    const result = await sender.send({
      bookingId,
      to,
      type,
      channel: 'sms',
      payload: { recipient, text },
    });

    await supabase.from('notifications').insert({
      booking_id: bookingId,
      type,
      channel: 'sms',
      recipient,
      status: result.status,
      sent_at: result.status === 'sent' ? new Date().toISOString() : null,
      payload: { to, text, providerResponse: result.providerResponse } as Json,
    });
  } catch {
    // best-effort: 개별 수신자 실패는 다른 수신자/예약에 영향 없음.
  }
}
