'use client';

import { useRouter } from 'next/navigation';

import { createClient } from '@/lib/supabase/client';

export function LogoutButton() {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push('/admin/login');
    router.refresh();
  }
  return (
    <button
      onClick={logout}
      className="rounded-lg px-3 py-2 text-sm font-medium text-muted hover:bg-line-soft hover:text-ink"
    >
      로그아웃
    </button>
  );
}
