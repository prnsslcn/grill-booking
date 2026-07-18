'use client';

import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { DropletReveal } from '@/components/site/DropletReveal';
import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';
import { formatDateKorean, formatWon } from '@/lib/format';

interface LookupResult {
  bookingNumber: string;
  status: string;
  guestName: string;
  guestCount: number;
  facilityName: string;
  meatLabel: string;
  addons: { label: string; qty: number }[];
  date: string;
  partLabel: string;
  partTime: string;
  amount: number;
  paymentStatus: string;
  refundPreview: { cancellable: boolean; rate: number; amount: number } | null;
}

const STATUS: Record<string, { tone: 'success' | 'warning' | 'neutral' | 'danger'; label: string }> = {
  confirmed: { tone: 'success', label: '예약 확정' },
  pending_payment: { tone: 'warning', label: '결제 대기' },
  cancel_requested: { tone: 'warning', label: '취소 처리중' },
  refunded: { tone: 'neutral', label: '환불 완료' },
  cancelled: { tone: 'neutral', label: '취소됨' },
};

export default function LookupPage() {
  const [bookingNumber, setBookingNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState<LookupResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function lookup() {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/bookings/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingNumber: bookingNumber.trim(), phone: phone.trim() }),
      });
      if (res.status === 404) {
        setError('일치하는 예약을 찾을 수 없습니다. 예약번호와 연락처를 확인해 주세요.');
        return;
      }
      if (!res.ok) {
        setError('조회 중 문제가 발생했습니다.');
        return;
      }
      setResult((await res.json()) as LookupResult);
    } finally {
      setLoading(false);
    }
  }

  async function cancel() {
    if (!result) return;
    const refund = result.refundPreview?.amount ?? 0;
    if (!confirm(`예약을 취소하시겠습니까?\n환불 예상 금액: ${formatWon(refund)}`)) return;
    setCancelling(true);
    try {
      const res = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingNumber: bookingNumber.trim(), phone: phone.trim() }),
      });
      if (!res.ok) {
        setError('취소 처리 중 문제가 발생했습니다.');
        return;
      }
      await lookup(); // 상태 갱신
    } finally {
      setCancelling(false);
    }
  }

  const st = result ? (STATUS[result.status] ?? { tone: 'neutral' as const, label: result.status }) : null;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-md flex-1 px-5 py-10">
        <DropletReveal>
          <h1 className="text-2xl font-bold text-ink">예약 조회</h1>
        </DropletReveal>
        <DropletReveal delay={90}>
          <p className="mt-2 text-muted">예약번호와 연락처로 조회하세요.</p>
        </DropletReveal>

        <div className="mt-6 space-y-4">
          <DropletReveal delay={180}>
            <Field label="예약번호">
              <Input
                value={bookingNumber}
                onChange={(e) => setBookingNumber(e.target.value)}
                placeholder="R-20260612-XXXXXX"
              />
            </Field>
          </DropletReveal>
          <DropletReveal delay={270}>
            <Field label="휴대폰 번호">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                inputMode="numeric"
              />
            </Field>
          </DropletReveal>
          <DropletReveal delay={360}>
            <Button size="lg" onClick={lookup} disabled={loading || !bookingNumber || !phone}>
              {loading ? '조회 중…' : '조회하기'}
            </Button>
          </DropletReveal>
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        {result && st && (
          <DropletReveal>
          <Card className="mt-8 overflow-hidden">
            <div className="flex items-center justify-between border-b border-line p-5">
              <span className="text-sm text-muted">{result.bookingNumber}</span>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <div className="divide-y divide-line">
              <Row label="시설" value={result.facilityName} />
              {result.meatLabel && <Row label="구성" value={`${result.meatLabel} Set`} />}
              {result.addons.length > 0 && (
                <Row label="추가 메뉴" value={result.addons.map((a) => `${a.label} × ${a.qty}`).join(', ')} />
              )}
              <Row label="일시" value={`${formatDateKorean(result.date)} · ${result.partLabel} ${result.partTime}`} />
              <Row label="예약자" value={`${result.guestName} (${result.guestCount}명)`} />
              <Row label="결제 금액" value={formatWon(result.amount)} />
            </div>

            {result.refundPreview?.cancellable && (
              <div className="border-t border-line p-5">
                <p className="text-sm text-muted">
                  지금 취소 시 환불 예상:{' '}
                  <span className="font-semibold text-ink">
                    {formatWon(result.refundPreview.amount)}
                  </span>{' '}
                  ({Math.round(result.refundPreview.rate * 100)}%)
                </p>
                <Button
                  variant="secondary"
                  size="lg"
                  className="mt-3"
                  onClick={cancel}
                  disabled={cancelling}
                >
                  {cancelling ? '취소 처리 중…' : '예약 취소'}
                </Button>
              </div>
            )}
          </Card>
          </DropletReveal>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-5">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-ink">{value}</span>
    </div>
  );
}
