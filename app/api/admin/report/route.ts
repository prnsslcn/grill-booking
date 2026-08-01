import ExcelJS from 'exceljs';

import { requireAdmin } from '@/lib/admin/auth';
import { getMonthReport, type ReportRow } from '@/lib/admin/report';
import { defaultReportRange } from '@/lib/admin/report-range';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PART_LABEL: Record<number, string> = { 1: '1부', 2: '2부' };

/** ISO(UTC) → KST 'YYYY-MM-DD HH:mm' */
function kstDateTime(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(new Date(iso).getTime() + 9 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}

function buildSheet(
  ws: ExcelJS.Worksheet,
  rows: ReportRow[],
  kind: 'online' | 'offline',
) {
  ws.columns = [
    { header: '이용일', key: 'date', width: 12 },
    { header: '부', key: 'part', width: 6 },
    { header: '시설', key: 'facility', width: 14 },
    { header: '예약번호', key: 'no', width: 18 },
    { header: '예약자', key: 'name', width: 10 },
    { header: '연락처', key: 'phone', width: 15 },
    { header: '인원', key: 'guests', width: 6 },
    { header: '구성', key: 'comp', width: 30 },
    { header: '금액(원)', key: 'amount', width: 13 },
    { header: kind === 'online' ? '결제일시' : '메모', key: 'extra', width: 20 },
  ];

  for (const r of rows) {
    ws.addRow({
      date: r.date,
      part: r.part ? PART_LABEL[r.part] : '',
      facility: r.facilityName,
      no: r.bookingNumber,
      name: r.guestName,
      phone: r.guestPhone,
      guests: r.guestCount,
      comp: r.composition,
      amount: r.amount,
      extra: kind === 'online' ? kstDateTime(r.paidAt) : (r.note ?? ''),
    });
  }

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const totalRow = ws.addRow({
    name: `${rows.length}건`,
    comp: '합계',
    amount: total,
    extra: kind === 'online' ? '토스 온라인' : '유선(현금)',
  });

  // 스타일: 헤더·합계 굵게, 금액 천단위, 헤더 배경
  ws.getColumn('amount').numFmt = '#,##0';
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F3F5' } };
    c.alignment = { vertical: 'middle' };
  });
  totalRow.font = { bold: true };
  ws.views = [{ state: 'frozen', ySplit: 1 }]; // 헤더 고정
}

export async function GET(req: Request): Promise<Response> {
  await requireAdmin();

  const { searchParams } = new URL(req.url);
  const def = defaultReportRange();
  const from = searchParams.get('from') || def.from;
  const to = searchParams.get('to') || def.to;

  const data = await getMonthReport(from, to);

  const wb = new ExcelJS.Workbook();
  wb.creator = '알펜시아 BBQ';
  buildSheet(wb.addWorksheet('토스 온라인 결제'), data.online, 'online');
  buildSheet(wb.addWorksheet('유선 예약(현금)'), data.offline, 'offline');

  const buf = await wb.xlsx.writeBuffer();
  const filename = `월말보고_${from}_${to}.xlsx`;

  return new Response(buf, {
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      'Cache-Control': 'no-store',
    },
  });
}
