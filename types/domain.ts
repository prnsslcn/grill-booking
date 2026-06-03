/**
 * 도메인 타입 — DB 생성 타입(types/database.ts)을 앱에서 다루기 쉬운 별칭으로 노출.
 * Row 타입은 database.ts에서 끌어와 단일 출처를 유지한다.
 */
import type { Database } from '@/types/database';

type Tables = Database['public']['Tables'];

export type Facility = Tables['facilities']['Row'];
export type FacilityUnit = Tables['facility_units']['Row'];
export type Slot = Tables['slots']['Row'];
export type Booking = Tables['bookings']['Row'];
export type Payment = Tables['payments']['Row'];
export type Notification = Tables['notifications']['Row'];

export type FacilityType = Facility['type'];
export type SlotStatus = Slot['status'];
export type BookingStatus = Booking['status'];
export type PaymentStatus = Payment['status'];

/** 2부제 시간대 정의 (17:00~19:00 / 19:30~21:30). DB의 part(1|2)와 매핑. */
export const PARTS = {
  1: { label: '1부', start: '17:00', end: '19:00' },
  2: { label: '2부', start: '19:30', end: '21:30' },
} as const;

export type Part = keyof typeof PARTS;
