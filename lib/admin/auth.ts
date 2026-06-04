import 'server-only';

import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';

/**
 * 관리자 인증 경계. 세션 기반 서버 클라이언트(RLS 적용)로 검증한다.
 * admins 테이블 self-read(RLS: id=auth.uid())로 관리자 여부 확인.
 */

export interface AdminUser {
  id: string;
  email: string;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: admin } = await supabase
    .from('admins')
    .select('id, email')
    .eq('id', user.id)
    .maybeSingle();

  if (!admin) return null;
  return { id: admin.id, email: admin.email };
}

/** 미인증/비관리자면 로그인으로 리다이렉트. 통과 시 AdminUser 반환. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getAdminUser();
  if (!admin) redirect('/admin/login');
  return admin;
}
