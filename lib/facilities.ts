/**
 * 시설 소개 콘텐츠 + 슬러그↔DB type 매핑. 헤더 드롭다운·홈 카드·시설 상세 페이지가 공유.
 * 가격·정원 등 변동값은 DB(facilities)에서 가져오고, 여기엔 정적 소개 콘텐츠만 둔다.
 */

export type FacilityType = 'tarp_tent' | 'cabin' | 'outdoor_table';

export interface FacilityContent {
  slug: string;
  type: FacilityType;
  label: string;
  tagline: string; // 드롭다운·카드 부제
  intro: string; // 상세 페이지 소개 문단
  features: { title: string; desc: string }[];
  capacity: number; // 표시용(기본값; 실제 정원은 DB와 동일)
  units: number;
  /** 상세 페이지 히어로 배경/글자 색 */
  hero: string;
  /** 강조 텍스트 색 */
  accent: string;
  /** 갤러리 헤드라인을 한 줄로(기본은 공백 단위로 줄바꿈) */
  headlineOneLine?: boolean;
  /** 준비 중(임시) — 상세 대신 준비중 페이지(/soon)로 유도 */
  comingSoon?: boolean;
}

export const FACILITIES: FacilityContent[] = [
  {
    slug: 'tarp-tent',
    type: 'tarp_tent',
    label: '타프 텐트',
    tagline: '6인 · 8동',
    intro:
      '사방이 트인 오픈형 타프 텐트에서 즐기는 숯불 바비큐입니다. 탁 트인 개방감은 그대로 살리되, 타프 지붕이 햇볕과 가벼운 비를 막아줘 날씨에 크게 구애받지 않습니다. 가족·친구 모임에 알맞은 크기로 가장 인기 있는 자리입니다.',
    features: [
      { title: '오픈형 개방감', desc: '사방이 트인 타프 아래에서 즐기는 시원한 분위기' },
      { title: '날씨 대비', desc: '타프 지붕으로 햇볕·가벼운 비에도 편안하게' },
      { title: '6인 기준 · 8동', desc: '가족·친구 모임에 알맞은 크기, 여유로운 동 수' },
    ],
    capacity: 6,
    units: 8,
    hero: 'bg-[#23322d] text-white',
    accent: 'text-white',
    headlineOneLine: true,
  },
  {
    slug: 'cabana',
    type: 'cabin',
    label: '프라이빗 카바나',
    tagline: '8인 · 4동',
    intro:
      '옆 팀과 분리된 독립 공간에서 아늑하게 즐기는 프라이빗 카바나입니다. 차분한 분위기에서 단체 모임이나 특별한 저녁을 보내기에 좋습니다. 가장 넉넉한 정원으로 단체 예약에 적합합니다.',
    features: [
      { title: '독립된 공간', desc: '옆 팀과 분리되어 우리끼리 편안하게' },
      { title: '아늑한 분위기', desc: '차분하게 즐기는 프라이빗한 저녁' },
      { title: '8인 기준 · 4동', desc: '단체·모임에 넉넉한 가장 큰 자리' },
    ],
    capacity: 8,
    units: 4,
    hero: 'bg-brand text-white',
    accent: 'text-white',
  },
  {
    slug: 'outdoor-table',
    type: 'outdoor_table',
    label: '야외 테이블',
    tagline: '4인 · 10동',
    intro:
      '별도 시설 없이 가볍게 즐기는 야외 테이블입니다. 소규모 인원이 부담 없이 즐기기 좋은 구성으로, 커플이나 소가족에게 알맞습니다. 우천 시에는 운영이 제한될 수 있습니다.',
    features: [
      { title: '간편하게', desc: '가볍게 즐기는 노지 감성의 BBQ' },
      { title: '부담 없는 구성', desc: '소규모 인원에 알맞은 가성비 자리' },
      { title: '4인 기준 · 10동', desc: '커플·소가족에 적당 / 우천 시 운영 제한 가능' },
    ],
    capacity: 4,
    units: 10,
    hero: 'bg-brand-soft text-ink',
    accent: 'text-brand',
    headlineOneLine: true,
    comingSoon: true,
  },
];

export function facilityBySlug(slug: string): FacilityContent | undefined {
  return FACILITIES.find((f) => f.slug === slug);
}

export function facilityByType(type: string): FacilityContent | undefined {
  return FACILITIES.find((f) => f.type === type);
}

/** 1인 기준 고기 제공량(g) */
export const GRAMS_PER_PERSON = 150;
/** 세트당 고기 제공량 = 정원 × 1인 150g (4인 600g · 6인 900g · 8인 1200g) */
export function meatGrams(capacity: number): number {
  return capacity * GRAMS_PER_PERSON;
}
