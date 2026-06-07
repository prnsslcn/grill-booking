import Link from 'next/link';

import { CancelButton } from '@/components/admin/CancelButton';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { getBookingDetail } from '@/lib/admin/bookings';
import { formatDateKorean, formatDateTimeKorean, formatWon } from '@/lib/format';
import { refundAmount } from '@/lib/policy/refund';
import { PARTS } from '@/types/domain';

export const dynamic = 'force-dynamic';

const STATUS_META: Record<string, { tone: 'success' | 'warning' | 'neutral' | 'danger'; label: string }> = {
  confirmed: { tone: 'success', label: '확정' },
  pending_payment: { tone: 'warning', label: '결제대기' },
  cancel_requested: { tone: 'warning', label: '취소요청' },
  refunded: { tone: 'neutral', label: '환불완료' },
  cancelled: { tone: 'neutral', label: '취소' },
};

const PAYMENT_LABEL: Record<string, string> = {
  ready: '결제대기',
  paid: '결제완료',
  cancelled: '전액취소',
  partial_cancelled: '부분취소',
};

const NOTI_LABEL: Record<string, string> = { confirm: '확정', reminder: '리마인더', cancel: '취소' };
const RECIPIENT_LABEL: Record<string, string> = { customer: '고객', admin: '관리자' };

export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ bookingNumber: string }>;
}) {
  const { bookingNumber } = await params;
  const b = await getBookingDetail(decodeURIComponent(bookingNumber));

  if (!b) {
    return (
      <div>
        <Link href="/admin" className="text-sm text-muted hover:text-ink">
          ← 예약 현황
        </Link>
        <p className="mt-8 text-center text-sm text-subtle">예약을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const meta = STATUS_META[b.status] ?? { tone: 'neutral' as const, label: b.status };
  const refundPreview =
    b.status === 'confirmed' && b.date ? refundAmount(b.amount, b.date, new Date()) : 0;

  return (
    <div className="space-y-6">
      <Link href="/admin" className="text-sm text-muted hover:text-ink">
        ← 예약 현황
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <h1 className="font-mono text-lg font-bold text-ink">{b.bookingNumber}</h1>
      </div>

      {/* 예약 정보 */}
      <Card className="divide-y divide-line">
        <Row label="시설" value={`${b.facilityName}${b.unitLabel ? ` (${b.unitLabel})` : ''}`} />
        {b.meatLabel && <Row label="구성" value={`${b.meatLabel} 세트`} />}
        {b.addons.length > 0 && (
          <Row label="추가 메뉴" value={b.addons.map((a) => `${a.label} × ${a.qty}`).join(', ')} />
        )}
        <Row
          label="이용 일시"
          value={b.date ? `${formatDateKorean(b.date)} · ${b.part ? PARTS[b.part].label : ''}${b.part ? ` ${PARTS[b.part].start}~${PARTS[b.part].end}` : ''}` : '-'}
        />
        <Row label="예약자" value={`${b.guestName} · ${b.guestPhone} · ${b.guestCount}명`} />
        <Row label="결제 금액" value={formatWon(b.amount)} />
        <Row label="예약 일시" value={formatDateTimeKorean(b.createdAt)} />
        <Row label="최종 변경" value={formatDateTimeKorean(b.updatedAt)} />
      </Card>

      {/* 취소·환불 */}
      {b.status === 'confirmed' && (
        <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <p className="font-semibold text-ink">예약 취소 · 환불</p>
            <p className="mt-1 text-sm text-muted">
              지금 취소 시 환불 예상: <span className="font-semibold text-ink">{formatWon(refundPreview)}</span>
            </p>
          </div>
          <CancelButton bookingNumber={b.bookingNumber} refundAmount={refundPreview} />
        </Card>
      )}

      {/* 결제 내역 */}
      <div>
        <h2 className="mb-2 text-sm font-bold text-ink">결제 내역</h2>
        <Card className="divide-y divide-line">
          {b.payments.length === 0 && <p className="p-4 text-sm text-subtle">결제 기록 없음</p>}
          {b.payments.map((p, i) => (
            <div key={i} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
              <span className="font-medium text-ink">{PAYMENT_LABEL[p.status] ?? p.status}</span>
              <span className="text-muted">{p.method ?? '-'} · {formatWon(p.amount)}</span>
              <span className="text-xs text-subtle">
                {p.approvedAt ? `승인 ${formatDateTimeKorean(p.approvedAt)}` : ''}
                {p.cancelledAt ? ` · 취소 ${formatDateTimeKorean(p.cancelledAt)}` : ''}
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* 알림 발송 이력 */}
      <div>
        <h2 className="mb-2 text-sm font-bold text-ink">알림 발송 이력</h2>
        <Card className="divide-y divide-line">
          {b.notifications.length === 0 && <p className="p-4 text-sm text-subtle">발송 기록 없음</p>}
          {b.notifications.map((n, i) => (
            <div key={i} className="flex items-center justify-between gap-2 p-4 text-sm">
              <span className="text-ink">
                {NOTI_LABEL[n.type] ?? n.type} 알림 · {RECIPIENT_LABEL[n.recipient] ?? n.recipient} · {n.channel}
              </span>
              <span className="text-xs text-subtle">
                {n.status}
                {n.sentAt ? ` · ${formatDateTimeKorean(n.sentAt)}` : ''}
              </span>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <span className="shrink-0 text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
