import type { Metadata } from 'next';

import { LegalPage } from '@/components/site/LegalPage';

export const metadata: Metadata = {
  title: '취소·환불정책 — Alpensia BBQ',
  description: '알펜시아 BBQ 취소 및 환불정책',
};

export default function RefundPolicyPage() {
  return (
    <LegalPage title="취소·환불정책" effectiveDate="2026년 6월 9일">
      <p>
        알펜시아 BBQ는 고기세트가 포함된 상품 특성상 전액 선결제로 운영됩니다. 예약 취소 시 환불 금액은
        결제 금액을 기준으로, <strong>이용일 자정(00:00, 한국 표준시)</strong>을 기준으로 남은 기간에
        따라 아래와 같이 산정됩니다.
      </p>

      <h2>환불 규정</h2>
      <table>
        <thead>
          <tr>
            <th>취소 시점</th>
            <th>환불 금액</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>이용 2일 전까지</td>
            <td>결제 금액의 100% 환불</td>
          </tr>
          <tr>
            <td>이용 1일 전</td>
            <td>결제 금액의 50% 환불</td>
          </tr>
          <tr>
            <td>이용 당일</td>
            <td>환불 불가</td>
          </tr>
          <tr>
            <td>노쇼(예약 후 미방문)</td>
            <td>환불 불가 (당일 취소와 동일)</td>
          </tr>
        </tbody>
      </table>
      <p>
        예: 토요일 이용 예약의 경우 목요일 자정 이전 취소 시 100%, 금요일 중 취소 시 50%, 토요일 당일
        취소 시 환불이 불가합니다.
      </p>

      <h2>환불 처리 방법</h2>
      <ul>
        <li>
          취소·환불은 <a href="/booking/lookup">예약조회</a>에서 직접 신청하거나 고객센터로 문의하여
          진행할 수 있습니다.
        </li>
        <li>
          환불은 최초 결제 수단으로 처리되며(결제대행사 토스페이먼츠를 통한 결제 취소), 카드사·결제수단
          사정에 따라 영업일 기준 수일이 소요될 수 있습니다.
        </li>
      </ul>

      <h2>우천 및 천재지변</h2>
      <p>
        태풍·호우 등 천재지변 또는 회사의 통제를 벗어난 사유로 시설 이용이 불가능한 경우, 해당 예약은
        본 규정과 별도로 협의하여 처리합니다. 특히 야외 테이블 등 우천에 영향을 받는 시설은 기상 상황에
        따라 운영이 제한될 수 있으며, 이 경우 회사 안내에 따릅니다.
      </p>

      <h2>문의</h2>
      <p>
        취소·환불 관련 문의: 010-3045-2994 (11:00~19:00) · campingclub2020@naver.com
      </p>
    </LegalPage>
  );
}
