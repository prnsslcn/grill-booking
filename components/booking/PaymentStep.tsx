'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PAYMENTS_FAKE, PayError, payAndConfirm, reserveSlotClient } from '@/lib/client/pay';
import { requestTossPayment } from '@/lib/client/toss-payment';
import { formatDateKorean, formatWon } from '@/lib/format';
import { PARTS, type Part } from '@/types/domain';

interface Props {
  selected: { slotId: string; facilityName: string; price: number; part: Part };
  date: string;
  guest: { name: string; phone: string; count: number };
  onSlotTaken: () => void;
}

function mapError(code: string): string {
  if (code === 'SLOT_TAKEN') return '선택하신 슬롯이 방금 마감되었습니다. 다시 선택해 주세요.';
  if (code === 'PRICE_NOT_SET') return '해당 시설은 현재 예약을 받지 않습니다.';
  return '결제 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}

export function PaymentStep({ selected, date, guest, onSlotTaken }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // fake 모드: reserve → fake confirm → 완료
  async function payFake() {
    setSubmitting(true);
    setError('');
    try {
      const { bookingNumber } = await payAndConfirm({
        slotId: selected.slotId,
        guestName: guest.name,
        guestPhone: guest.phone,
        guestCount: guest.count,
      });
      router.push(`/booking/complete?n=${encodeURIComponent(bookingNumber)}`);
    } catch (err) {
      const code = err instanceof PayError ? err.code : 'UNKNOWN';
      setError(mapError(code));
      if (code === 'SLOT_TAKEN') onSlotTaken();
    } finally {
      setSubmitting(false);
    }
  }

  // real 모드: reserve → 토스 결제창 → (successUrl) 서버 confirm
  async function payReal() {
    setSubmitting(true);
    setError('');
    try {
      const { orderId } = await reserveSlotClient({
        slotId: selected.slotId,
        guestName: guest.name,
        guestPhone: guest.phone,
        guestCount: guest.count,
      });
      await requestTossPayment({
        amount: selected.price,
        orderId,
        orderName: `${selected.facilityName} ${formatDateKorean(date)} ${PARTS[selected.part].label}`,
        customerName: guest.name,
        customerMobilePhone: guest.phone.replace(/\D/g, ''),
      });
      // 결제창이 successUrl로 리다이렉트하므로 여기 도달은 보통 없음
    } catch (err) {
      if (err instanceof PayError) {
        setError(mapError(err.code));
        if (err.code === 'SLOT_TAKEN') onSlotTaken();
      } else {
        const code = (err as { code?: string }).code;
        // 사용자가 결제창을 닫은 경우(USER_CANCEL)는 조용히 무시
        if (code && code !== 'USER_CANCEL') {
          setError('결제가 취소되었거나 실패했습니다. 다시 시도해 주세요.');
        }
      }
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-ink">결제</h2>
      <Card className="divide-y divide-line">
        <Row label="시설" value={selected.facilityName} />
        <Row label="일시" value={`${formatDateKorean(date)} · ${PARTS[selected.part].label}`} />
        <Row label="예약자" value={`${guest.name} (${guest.count}명)`} />
        <div className="flex items-center justify-between p-5">
          <span className="font-semibold text-ink">결제 금액</span>
          <span className="text-xl font-extrabold text-ink">{formatWon(selected.price)}</span>
        </div>
      </Card>

      {PAYMENTS_FAKE && (
        <div className="rounded-xl bg-[#fff5e5] px-4 py-3 text-sm text-[#c2780f]">
          <Badge tone="warning">개발 모드</Badge> 실제 결제 대신 테스트 결제로 진행됩니다.
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <Button size="lg" onClick={PAYMENTS_FAKE ? payFake : payReal} disabled={submitting}>
        {submitting ? '처리 중…' : `${formatWon(selected.price)} 결제하기`}
      </Button>
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
