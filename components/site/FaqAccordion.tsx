'use client';

import { useState } from 'react';

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
      '한강라면·햇반, 커피 쿠폰 무료 제공',
    ],
  },
  {
    q: '고기 세트는 어떻게 구성되나요?',
    a: [
      '모든 상품에 고기세트(Pork Set / Beef Set)가 포함됩니다.',
      '세트는 예약 시 선택하며, 가격은 시설별로 다릅니다.',
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
      '전화 033-339-0616 / 0664로 문의해 주세요.',
      '단체 BBQ(최대 200명)는 사전 예약·문의로 진행됩니다.',
    ],
  },
  {
    q: '우천 시에는 어떻게 되나요?',
    a: ['야외 테이블(4인)은 우천 시 운영이 제한될 수 있습니다.'],
  },
];

export function FaqAccordion() {
  // 한 번에 하나만 펼침(reference 동작). 기본 첫 항목 펼침.
  const [open, setOpen] = useState(0);

  return (
    <section className="bg-surface py-20 scroll-mt-24" id="faq">
      <div className="mx-auto grid max-w-5xl gap-10 px-5 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        {/* 좌: 헤딩 */}
        <div className="lg:sticky lg:top-28 lg:self-start">
          <h2 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">
            자주 묻는
            <br />
            질문
          </h2>
          <p className="mt-4 text-muted">
            궁금한 점이 더 있다면
            <br className="hidden sm:block" /> 033-339-0616 / 0664로 연락 주세요.
          </p>
        </div>

        {/* 우: 아코디언 */}
        <div className="space-y-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i;
            return (
              <div
                key={f.q}
                className={`rounded-3xl border bg-surface transition-colors ${
                  isOpen ? 'border-brand/40' : 'border-line'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-base font-semibold text-ink sm:text-lg">{f.q}</span>
                  <span
                    className={`flex h-9 w-9 flex-none items-center justify-center rounded-full border transition-all duration-300 ${
                      isOpen
                        ? 'rotate-45 border-brand bg-brand text-white'
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

                {/* grid-rows 트랜지션으로 높이 측정 없이 부드럽게 펼침 */}
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
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
