# 데이터베이스 스키마 설계 (docs/schema.md)

리조트 예약 시스템의 PostgreSQL(Supabase) 스키마 설계 문서. 최우선 원칙은 **슬롯 중복 예약 방지**와 **결제-예약 정합성**이며, 둘 다 애플리케이션 코드가 아니라 **DB 레벨 제약·트랜잭션**으로 보장한다.

## 설계 핵심 원칙

1. **슬롯 중복은 UNIQUE 제약으로 원천 차단.** "조회 후 삽입"의 비원자적 검사로 막지 않는다. 동일 (시설, 날짜, 부)에 확정 예약이 둘 이상 생길 수 없도록 DB가 강제한다.
2. **결제 금액은 예약 시점에 bookings에 스냅샷으로 저장.** 시설 가격이 나중에 바뀌어도 과거 예약의 결제·환불 기록은 보존된다.
3. **결제 성공과 예약 확정은 하나의 트랜잭션.** 토스 결제 승인이 서버에서 재검증된 후에만 예약이 confirmed로 전이된다.
4. **금액은 정수(원 단위)로 저장.** 부동소수점 사용 금지.

## 테이블

### facilities (시설 종류)
시설 "종류"별 정의와 고정 가격. 동(棟) 단위가 아니라 종류 단위.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| type | text | 'tarp_tent' \| 'cabin' \| 'trailer' |
| name | text | 표시명 (예: "타프 텐트") |
| total_units | int | 보유 동 수 (타프 8, 캐빈 4, 트레일러 1) |
| price | int | 1회 예약 고정가 (원 단위 정수) |
| is_active | bool | 판매 여부 |
| created_at | timestamptz | |

### facility_units (개별 동)
실제 예약 대상이 되는 물리적 동. 타프 텐트 8동 등 개별 식별.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| facility_id | uuid FK → facilities | |
| unit_label | text | 예: "타프텐트 1호" |
| is_active | bool | 점검/휴무 시 false |

→ 총 13개 레코드 (타프 8 + 캐빈 4 + 트레일러 1)

### slots (예약 가능 슬롯)
예약 단위 = 개별 동 × 날짜 × 부. 관리자가 운영일에 맞춰 생성하거나, 예약 시 동적으로 확보.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| facility_unit_id | uuid FK → facility_units | |
| date | date | 운영일 (금/토) |
| part | smallint | 1 = 1부(17:00~19:00), 2 = 2부(19:30~21:30) |
| status | text | 'open' \| 'closed' \| 'booked' |
| created_at | timestamptz | |

**핵심 제약:**
```sql
UNIQUE (facility_unit_id, date, part)
```
→ 같은 동의 같은 날짜·같은 부는 슬롯이 단 하나만 존재. 중복 예약 원천 차단의 1차 방어선.

### bookings (예약)
예약 1건. 결제 금액을 스냅샷으로 보관.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| booking_number | text UNIQUE | 고객 조회용 예약번호 (예: R-20260612-A3F9) |
| slot_id | uuid FK → slots UNIQUE | 한 슬롯당 확정 예약 1건 |
| guest_name | text | 예약자명 (필수) |
| guest_phone | text | 연락처 (필수, 문자 알림·조회용) |
| guest_count | int | 인원 (참고용) |
| facility_snapshot | jsonb | 예약 시점 시설명·종류 |
| amount | int | 결제 금액 스냅샷 (원) |
| status | text | 예약 상태 머신 (아래 참조) |
| created_at | timestamptz | |
| updated_at | timestamptz | |

**핵심 제약:**
```sql
UNIQUE (slot_id)  -- 한 슬롯에 확정 예약 1건만
```
→ 슬롯 중복 방지의 2차(최종) 방어선. 비회원이라 user_id 없이 guest 정보를 직접 보관.

### payments (결제)
토스페이먼츠 결제 기록. 예약과 1:1.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| booking_id | uuid FK → bookings | |
| toss_payment_key | text UNIQUE | 토스 결제 키 |
| toss_order_id | text UNIQUE | 주문 ID |
| amount | int | 승인 금액 (bookings.amount와 일치 검증) |
| status | text | 'ready' \| 'paid' \| 'cancelled' \| 'partial_cancelled' |
| method | text | 카드/간편결제 등 |
| approved_at | timestamptz | 결제 승인 시각 |
| cancelled_at | timestamptz | 취소 시각 |
| raw_response | jsonb | 토스 응답 원본 보관 (감사용) |

### admins (관리자)
Supabase Auth 사용자 중 관리자 권한 매핑. 인증은 Supabase Auth, 권한 체크는 이 테이블 + RLS.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK FK → auth.users | |
| email | text | |
| created_at | timestamptz | |

### notifications (알림 발송 이력)
문자 발송 기록. 발송 서비스는 미정이나 이력 구조는 미리 확보.

| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| booking_id | uuid FK → bookings | |
| type | text | 'confirm' \| 'reminder' \| 'cancel' |
| channel | text | 'sms' \| 'kakao_alimtalk' (확장 대비) |
| recipient | text | 'customer' \| 'admin' (확정/취소는 고객·관리자 동시 발송 → 각 1건 기록) |
| status | text | 'pending' \| 'sent' \| 'failed' |
| sent_at | timestamptz | |
| payload | jsonb | 발송 내용·응답(to, text, providerResponse) |

## 예약 상태 머신 (bookings.status)

```
pending_payment  ─결제승인+서버재검증─→  confirmed
      │                                      │
      │ 결제실패/타임아웃                     │ 고객/관리자 취소
      ▼                                      ▼
   cancelled                            cancel_requested
                                             │ 토스 환불 API 성공
                                             ▼
                                          refunded
```

- **pending_payment**: 예약 임시 생성, 결제 진행 중. 슬롯은 이 단계에서 선점(아래 동시성 처리 참조).
- **confirmed**: 토스 결제 승인이 서버에서 재검증됨. 예약 확정. 확정 문자 발송.
- **cancelled**: 결제 미완료로 무산. 선점한 슬롯 해제.
- **cancel_requested**: 확정 후 취소 요청. 환불 처리 대기.
- **refunded**: 토스 환불 완료. 슬롯 해제, 취소 문자 발송.

## 동시성 처리 (슬롯 선점 → 결제 → 확정)

월 1000명이라 충돌은 드물지만, "마지막 한 자리를 두 명이 동시에" 시나리오는 반드시 막아야 한다. 흐름:

1. 고객이 슬롯 선택 → 서버가 트랜잭션 시작
2. 해당 slot을 `SELECT ... FOR UPDATE`로 잠금, status가 'open'인지 확인
3. bookings에 `pending_payment`로 INSERT (slot_id UNIQUE 제약이 최종 방어). slots.status를 'booked'로 변경
4. 커밋 → 토스 결제창 진행
5. 결제 성공 시 서버가 토스 결제 승인 API로 **금액·주문ID 재검증** → payments 기록 + bookings를 `confirmed`로 갱신 (트랜잭션)
6. 결제 실패/이탈/타임아웃(예: 10분) 시 → bookings `cancelled`, slots 'open' 복구 (정리 작업)

→ slot_id에 건 UNIQUE 제약 덕분에, 설령 동시에 두 요청이 들어와도 둘 중 하나만 INSERT 성공하고 나머지는 제약 위반으로 실패한다. 코드 버그가 있어도 DB가 데이터 정합성을 지킨다.

## 환불 / 취소 정합성

- 환불은 반드시 **토스 결제 취소 API 호출 성공 → DB 상태 갱신** 순서. DB 먼저 바꾸고 API 실패하면 돈은 안 돌려주고 예약만 취소된 상태가 됨 (금지).
- 부분 환불 가능성(취소 수수료 차감 등)을 위해 payments.status에 partial_cancelled 포함.
- 환불 규정(취소 시점별 수수료율)은 미정 — 확정 후 정책 테이블 또는 상수로 반영.

## Row Level Security (RLS)

- 모든 테이블 RLS 활성화.
- 고객(비로그인/anon): bookings·payments 직접 접근 차단. 예약 생성·조회는 **서버 라우트(서비스 롤 키)**를 통해서만. 예약 조회는 booking_number + guest_phone 일치 검증을 서버에서 수행.
- 관리자: admins에 등록된 auth.users만 전체 접근. RLS 정책으로 강제.
- 토스 시크릿 키·Supabase 서비스 롤 키는 서버 전용. 절대 클라이언트 노출 금지.

## 미정 / 추후 반영

- 환불 수수료 정책 (취소 시점별 차감률)
- 슬롯 자동 생성 정책 (몇 주치 미리 열어둘지)
- pending_payment 타임아웃 시간 (기본 10분 제안)
- 동일 연락처 예약 묶음 조회 (단골 관리 — 추후)
