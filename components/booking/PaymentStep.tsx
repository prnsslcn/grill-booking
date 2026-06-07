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

interface Selected {
  slotId: string;
  facilityName: string;
  part: Part;
  capacity: number;
  amount: number;
  meat: 'pork' | 'beef';
  meatLabel: string;
  addons: Record<string, number>;
  addonLines: { label: string; price: number; qty: number }[];
}

interface Props {
  selected: Selected;
  date: string;
  guest: { name: string; phone: string };
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

  const reserveInput = {
    slotId: selected.slotId,
    guestName: guest.name,
    guestPhone: guest.phone,
    guestCount: selected.capacity,
    meat: selected.meat,
    addons: selected.addons,
  };

  async function payFake() {
    setSubmitting(true);
    setError('');
    try {
      const { bookingNumber } = await payAndConfirm(reserveInput);
      router.push(`/booking/complete?n=${encodeURIComponent(bookingNumber)}`);
    } catch (err) {
      const code = err instanceof PayError ? err.code : 'UNKNOWN';
      setError(mapError(code));
      if (code === 'SLOT_TAKEN') onSlotTaken();
    } finally {
      setSubmitting(false);
    }
  }

  async function payReal() {
    setSubmitting(true);
    setError('');
    try {
      const { orderId } = await reserveSlotClient(reserveInput);
      await requestTossPayment({
        amount: selected.amount,
        orderId,
        orderName: `${selected.facilityName} ${formatDateKorean(date)} ${PARTS[selected.part].label} (${selected.meatLabel})`,
        customerName: guest.name,
        customerMobilePhone: guest.phone.replace(/\D/g, ''),
      });
    } catch (err) {
      if (err instanceof PayError) {
        setError(mapError(err.code));
        if (err.code === 'SLOT_TAKEN') onSlotTaken();
      } else {
        const code = (err as { code?: string }).code;
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
        <Row label="시설" value={`${selected.facilityName} · ${selected.capacity}인`} />
        <Row label="일시" value={`${formatDateKorean(date)} · ${PARTS[selected.part].label}`} />
        <Row label="구성" value={`${selected.meatLabel} 세트`} />
        {selected.addonLines.length > 0 && (
          <div className="p-5">
            <span className="text-sm text-muted">추가 메뉴</span>
            <ul className="mt-1.5 space-y-1">
              {selected.addonLines.map((a) => (
                <li key={a.label} className="flex justify-between text-sm text-ink">
                  <span>
                    {a.label} × {a.qty}
                  </span>
                  <span>{formatWon(a.price * a.qty)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Row label="예약자" value={guest.name} />
        <div className="flex items-center justify-between p-5">
          <span className="font-semibold text-ink">결제 금액</span>
          <span className="text-xl font-extrabold text-ink">{formatWon(selected.amount)}</span>
        </div>
      </Card>

      {PAYMENTS_FAKE && (
        <div className="rounded-xl bg-[#fff5e5] px-4 py-3 text-sm text-[#c2780f]">
          <Badge tone="warning">개발 모드</Badge> 실제 결제 대신 테스트 결제로 진행됩니다.
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}

      <Button size="lg" onClick={PAYMENTS_FAKE ? payFake : payReal} disabled={submitting}>
        {submitting ? '처리 중…' : `${formatWon(selected.amount)} 결제하기`}
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
