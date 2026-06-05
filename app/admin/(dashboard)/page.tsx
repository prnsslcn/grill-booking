import Link from 'next/link';

import { CancelButton } from '@/components/admin/CancelButton';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { listBookings } from '@/lib/admin/bookings';
import { formatDateKorean, formatWon } from '@/lib/format';
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

const STATUS_FILTERS = [
  { value: '', label: '전체' },
  { value: 'confirmed', label: '확정' },
  { value: 'pending_payment', label: '결제대기' },
  { value: 'refunded', label: '환불완료' },
  { value: 'cancelled', label: '취소' },
];

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; status?: string }>;
}) {
  const { date = '', status = '' } = await searchParams;
  const bookings = await listBookings({ date: date || undefined, status: status || undefined });
  const now = new Date();

  return (
    <div>
      <h1 className="text-xl font-bold text-ink">예약 현황</h1>

      <form className="mt-5 flex flex-wrap items-end gap-3" method="get">
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">이용일</span>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="h-11 rounded-xl border border-line px-3 text-sm outline-none focus:border-accent"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-ink">상태</span>
          <select
            name="status"
            defaultValue={status}
            className="h-11 rounded-xl border border-line px-3 text-sm outline-none focus:border-accent"
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button className="h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white">
          조회
        </button>
        {date && (
          <Link
            href={status ? `/admin?status=${status}` : '/admin'}
            className="flex h-11 items-center rounded-xl border border-line px-4 text-sm font-medium text-muted hover:bg-line-soft"
          >
            전체 기간
          </Link>
        )}
      </form>

      <p className="mt-5 text-sm text-muted">
        {date ? formatDateKorean(date) : '전체 기간'} · {bookings.length}건
      </p>

      <div className="mt-2 space-y-2">
        {bookings.map((b) => {
          const meta = STATUS_META[b.status] ?? { tone: 'neutral' as const, label: b.status };
          const preview =
            b.status === 'confirmed' && b.date ? refundAmount(b.amount, b.date, now) : 0;
          return (
            <Card key={b.bookingNumber} className="flex flex-wrap items-center gap-x-4 gap-y-2 p-4">
              <Badge tone={meta.tone}>{meta.label}</Badge>
              <span className="font-mono text-sm text-muted">{b.bookingNumber}</span>
              <span className="font-medium text-ink">{b.facilityName}</span>
              <span className="text-sm text-muted">
                {b.date ? formatDateKorean(b.date) : '-'}
                {b.part ? ` · ${PARTS[b.part].label}` : ''}
              </span>
              <span className="text-sm text-muted">
                {b.guestName} · {b.guestPhone} · {b.guestCount}명
              </span>
              <span className="ml-auto font-semibold text-ink">{formatWon(b.amount)}</span>
              {b.status === 'confirmed' && (
                <CancelButton bookingNumber={b.bookingNumber} refundAmount={preview} />
              )}
            </Card>
          );
        })}
        {bookings.length === 0 && (
          <p className="py-10 text-center text-sm text-subtle">조건에 맞는 예약이 없습니다.</p>
        )}
      </div>
    </div>
  );
}
