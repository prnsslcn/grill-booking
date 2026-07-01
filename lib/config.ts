/**
 * 서비스 기능 토글. 코드는 살려두고 노출/판매만 켜고 끈다.
 */

/**
 * 소 세트(Beef Set) 판매 여부.
 * false면 홈·/phone·시설상세·예약·어드민 전 구간에서 숨기고 서버(예약 API·어드민)에서 거부한다.
 * 되살리려면 이 값만 true로 바꾸면 된다(관련 코드·가격·타입은 그대로 유지).
 */
export const BEEF_ENABLED = false;

/** 소고기 추가옵션 key 판별(addons.key가 beef_* ). BEEF_ENABLED=false면 이 옵션들도 숨기고 거부. */
export function isBeefAddonKey(key: string): boolean {
  return key.startsWith('beef');
}
