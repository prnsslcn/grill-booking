# 배포 런북 (스테이징 → 운영)

Next.js(앱)는 **Vercel**, DB/Auth는 **Supabase 호스티드**. 이번은 테스트 키 유지 **스테이징** 배포.

---

## A. Supabase 호스티드 프로젝트

1. https://supabase.com → New project. 이름·리전(Northeast Asia(Seoul) 권장)·**DB 비밀번호** 설정(기록해 둘 것).
2. 생성 후 **Project Settings → API**에서 확보:
   - `Project URL` (https://xxxx.supabase.co)
   - `anon` public key
   - `service_role` secret key
3. **Project ref**(URL의 `xxxx`)도 확인.

### 마이그레이션 push (로컬에서)
```bash
pnpm exec supabase login                 # 액세스 토큰 발급(브라우저)
pnpm exec supabase link --project-ref <PROJECT_REF>   # DB 비밀번호 입력
pnpm exec supabase db push               # 0001~0013 적용(테이블·제약·RLS·시드가격)
```
→ facilities/units/가격 시드는 마이그레이션에 포함되어 자동 반영. RLS도 적용됨.

### 관리자 계정 + 슬롯 시드 (프로덕션 DB 대상)
임시 env 파일로 prod 값을 가리켜 실행:
```bash
# .env.prod (커밋 금지) 만들고:
#   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=<service_role>
node --env-file=.env.prod scripts/seed-admin.mjs admin@도메인 <비밀번호>
```
슬롯은 **지연 생성**이라 별도 작업 불필요 — 고객이 금·토 날짜를 조회하는 순간 자동 생성된다.
(관리자가 특정 동을 미리 닫거나 휴무 처리하려면 **슬롯 관리**에서 해당 날짜를 한 번 조회→생성 후 토글.)

---

## B. Vercel 배포

1. https://vercel.com → Add New → Project → GitHub `grill-booking` import.
2. Framework: Next.js 자동 감지. Build: 기본값(`next build`).
3. **Environment Variables** (Production) 입력:

| 키 | 값 | 노출 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | https://xxxx.supabase.co | 공개 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key | 공개 |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key | **서버 전용** |
| `NEXT_PUBLIC_TOSS_CLIENT_KEY` | test_ck_... | 공개 |
| `TOSS_SECRET_KEY` | test_sk_... | **서버 전용** |
| `NEXT_PUBLIC_PAYMENTS_FAKE` | `0` | 공개 |
| `TOSS_FAKE` | `0` | 서버 |

4. Deploy. 완료 후 `https://<프로젝트>.vercel.app` 발급.

> 토스 successUrl/failUrl은 `window.location.origin` 기반이라 배포 도메인에 **자동 적응**(추가 설정 불필요).

---

## C. 배포 후 점검 체크리스트
- [ ] `/` 랜딩 + 시설·가격 표시
- [ ] 관리자 `/admin/login` 로그인 → 슬롯 생성(향후 금·토)
- [ ] `/booking` 예약 → 토스 결제창(테스트) → `/booking/success` → 완료
- [ ] `/booking/lookup` 조회 + 취소·환불
- [ ] Supabase Studio(호스티드)에서 bookings/payments 확인

---

## D. 실오픈 전환 (나중)
1. 토스 **전자결제 신청**(사업자등록·정산계좌·심사) → **운영 키** 발급.
2. Vercel 환경변수의 토스 키를 운영 키로 교체, `NEXT_PUBLIC_PAYMENTS_FAKE`·`TOSS_FAKE`는 `0` 유지.
3. 커스텀 도메인 연결(Vercel Domains).
4. (권장) 슬롯 자동생성 스케줄러 도입 — `generate_slots`/`expire_pending_bookings`를 Vercel Cron 또는 Supabase pg_cron으로.

---

## 주의
- 스테이징은 **테스트 결제**라 실제 청구 없음 → 외부에 "실예약 가능"으로 오인되지 않게 안내/접근제한 고려.
- `service_role`·`TOSS_SECRET_KEY`는 절대 `NEXT_PUBLIC_`로 두지 말 것(서버 전용).
- `.env.prod` 등 실키 파일은 커밋 금지(`.env*`는 .gitignore 처리됨).
