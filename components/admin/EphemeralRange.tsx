'use client';

import { useEffect } from 'react';

/**
 * 매출 기간 필터를 '일회성'으로 만든다. 서버가 ?from&to 로 렌더한 뒤, 주소창의 쿼리만 비워
 * (현재 화면 데이터는 그대로) 새로고침하면 기본 기간(이번 달 전체)으로 로드되게 한다.
 */
export function EphemeralRange({ deps }: { deps: string }) {
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [deps]);
  return null;
}
