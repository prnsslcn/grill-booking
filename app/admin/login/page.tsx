'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Field, Input } from '@/components/ui/Field';
import { createClient } from '@/lib/supabase/client';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
      setLoading(false);
      return;
    }
    router.push('/admin');
    router.refresh();
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-5">
      <Card className="w-full max-w-sm p-7">
        <h1 className="text-xl font-bold text-ink">관리자 로그인</h1>
        <p className="mt-1 text-sm text-muted">아세아 그릴 리조트 운영</p>
        <form onSubmit={login} className="mt-6 space-y-4">
          <Field label="이메일">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@asea.local"
              autoComplete="username"
            />
          </Field>
          <Field label="비밀번호" error={error}>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <Button size="lg" type="submit" disabled={loading || !email || !password}>
            {loading ? '로그인 중…' : '로그인'}
          </Button>
        </form>
      </Card>
    </div>
  );
}
