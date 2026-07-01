'use client';

import { useState } from 'react';

import { BEEF_ENABLED } from '@/lib/config';

type Faq = { q: string; a: string[] };

const FAQS: Faq[] = [
  {
    q: '언제 운영하나요?',
    a: [
      '매주 금·토요일에 운영합니다 (성수기 주중·동계 휴장).',
      '1부 17:00~19:00 / 2부 19:30~21:30, 회차당 2시간입니다.',
      '전 회차 100% 선결제로 예약이 확정됩니다.',
    ],
  },
  {
    q: '무엇이 포함되나요?',
    a: [
      '숯·석쇠·집게·식기·생수 등 기본 세팅',
      '상추·양파·버섯·소시지·쌈장 등 기본 식재료',
      '커피 쿠폰 무료 제공',
      '한강라면·햇반은 정원 수만큼 제공되며, 라면·햇반 개수 구성은 택 1로 선택하실 수 있습니다',
    ],
  },
  {
    q: '고기 세트는 어떻게 구성되나요?',
    a: [
      `모든 상품에 고기세트(${BEEF_ENABLED ? 'Pork Set / Beef Set' : 'Pork Set'})가 포함됩니다.`,
      '고기는 정원 기준 1인 150g — 4인 600g · 6인 900g · 8인 1200g으로 제공됩니다.',
      BEEF_ENABLED ? '세트는 예약 시 선택하며, 가격은 시설별로 다릅니다.' : '가격은 시설별로 다릅니다.',
    ],
  },
  {
    q: '환불 규정은 어떻게 되나요?',
    a: [
      '이용 2일 전까지: 100% 환불',
      '이용 1일 전: 50% 환불',
      '이용 당일·노쇼: 환불 불가',
    ],
  },
  {
    q: '예약·문의는 어떻게 하나요?',
    a: [
      '전화 010-3045-2994로 문의해 주세요.',
      '단체 BBQ(최대 200명)는 사전 예약·문의로 진행됩니다. 단체 예약은 최소 일주일 전에 문의해 주세요.',
    ],
  },
  {
    q: '우천 시에는 어떻게 되나요?',
    a: ['야외 테이블(4인)은 우천 시 운영이 제한될 수 있습니다.'],
  },
];

export function FaqAccordion() {
  // 다중 열림 — 다른 항목을 눌러도 이미 연 항목은 닫히지 않음. 기본 첫 항목 펼침.
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));

  return (
    <section className="bg-surface py-20 scroll-mt-24" id="faq">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        {/* 좌: 헤딩 */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h1 className="text-4xl font-bold leading-tight text-ink sm:text-5xl">
            FAQ
          </h1>
        </div>

        {/* 우: 아코디언 */}
        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open.has(i);
            return (
              <div
                key={f.q}
                className={`rounded-3xl border bg-surface transition-colors ${
                  isOpen ? 'border-brand/40' : 'border-line'
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    setOpen((prev) => {
                      const next = new Set(prev);
                      if (next.has(i)) next.delete(i);
                      else next.add(i);
                      return next;
                    })
                  }
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-base font-semibold text-ink sm:text-lg">{f.q}</span>
                  <span
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-full border transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isOpen
                        ? 'rotate-45 border-line text-ink'
                        : 'border-line text-muted'
                    }`}
                    aria-hidden
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M8 3v10M3 8h10"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </button>

                {/* grid-rows 트랜지션으로 높이 측정 없이 부드럽게 펼침 + 내용 페이드 */}
                <div
                  className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div
                    className={`overflow-hidden transition-opacity duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                      isOpen ? 'opacity-100' : 'opacity-0'
                    }`}
                  >
                    <ul className="space-y-1.5 px-6 pb-6 text-sm leading-relaxed text-muted">
                      {f.a.map((line) => (
                        <li key={line} className="flex gap-2">
                          <span className="mt-2 h-1 w-1 flex-none rounded-full bg-brand" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
