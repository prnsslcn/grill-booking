import type { ReactNode } from 'react';

import { SiteFooter } from '@/components/site/SiteFooter';
import { SiteHeader } from '@/components/site/SiteHeader';

/**
 * 약관·개인정보처리방침·환불정책 등 법적 문서 공통 레이아웃.
 * 본문은 시맨틱 태그(h2/h3/p/ul/table)로 작성하면 아래 유틸 셀렉터로 스타일링된다.
 */
export function LegalPage({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <SiteHeader />
      <main className="flex-1">
        <section className="border-b border-line bg-surface">
          <div className="mx-auto max-w-3xl px-5 py-14">
            <h1 className="text-3xl font-bold text-ink">{title}</h1>
            <p className="mt-2 text-sm text-subtle">시행일: {effectiveDate}</p>
          </div>
        </section>
        <section className="py-12">
          <div
            className="mx-auto max-w-3xl px-5 text-[15px] leading-relaxed text-muted [&_a]:text-ink [&_a]:underline [&_h2]:mt-9 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_h3]:mt-5 [&_h3]:font-semibold [&_h3]:text-ink [&_li]:mt-1 [&_ol]:mt-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mt-3 [&_table]:mt-4 [&_table]:w-full [&_table]:border [&_table]:border-line [&_td]:border [&_td]:border-line [&_td]:p-2.5 [&_th]:border [&_th]:border-line [&_th]:bg-line-soft [&_th]:p-2.5 [&_th]:text-left [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5"
          >
            {children}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
