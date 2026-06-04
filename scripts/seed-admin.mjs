// 개발용 관리자 계정 시드. 서비스롤로 Auth 사용자 생성 + admins 매핑.
// 실행: node --env-file=.env.local scripts/seed-admin.mjs [email] [password]
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2] || process.env.ADMIN_EMAIL || 'admin@asea.local';
const password = process.argv[3] || process.env.ADMIN_PASSWORD || 'asea-admin-1234';

if (!url || !serviceKey) {
  console.error('환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

let userId;
const { data: created, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  if (/registered|already|exists/i.test(error.message)) {
    const { data: list } = await supabase.auth.admin.listUsers();
    userId = list.users.find((u) => u.email === email)?.id;
    if (!userId) {
      console.error('기존 사용자 조회 실패:', error.message);
      process.exit(1);
    }
    console.log('기존 사용자 재사용:', email);
  } else {
    console.error('createUser 실패:', error.message);
    process.exit(1);
  }
} else {
  userId = created.user.id;
  console.log('Auth 사용자 생성:', email);
}

const { error: upsertError } = await supabase.from('admins').upsert({ id: userId, email });
if (upsertError) {
  console.error('admins 매핑 실패:', upsertError.message);
  process.exit(1);
}

console.log('✅ 관리자 준비 완료');
console.log('   이메일:', email);
console.log('   비밀번호:', password);
console.log('   user id:', userId);
