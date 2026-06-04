import Link from 'next/link';

import { LogoutButton } from '@/components/admin/LogoutButton';
import { requireAdmin } from '@/lib/admin/auth';

const NAV = [
  { href: '/admin', label: '예약 현황' },
  { href: '/admin/slots', label: '슬롯 관리' },
  { href: '/admin/facilities', label: '가격 관리' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-40 border-b border-line bg-surface">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <div className="flex items-center gap-6">
            <span className="font-bold text-ink">운영 콘솔</span>
            <nav className="hidden gap-1 sm:flex">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-line-soft hover:text-ink"
                >
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-subtle sm:inline">{admin.email}</span>
            <LogoutButton />
          </div>
        </div>
        <nav className="flex gap-1 border-t border-line px-5 py-2 sm:hidden">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
