import ExcelJS from 'exceljs';
import {
  computeRange,
  getOverview,
  getCustomerStats,
  getTopProducts,
  getTopCategories,
  getCouponStats,
  getLoyaltyStats,
  getCashbackStats,
  getDeliveryStats,
  getAttributionStats,
  getDailyTrend,
  getOrdersList,
  PeriodKey,
} from './reports-service.js';

// ── Excel export service ─────────────────────────────────────────────────────
// "Reports calcula. Excel exporta." — every sheet is fed by the SAME
// reports-service functions the API uses. No duplicated calculations.

const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1A1A1A' } };
const HEADER_FONT = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
const ALT_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF5F5F5' } };

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
  });
}

/** Freeze panes below header + add autofilter across the header range. */
function finalizeTable(ws: ExcelJS.Worksheet, headerRow = 1) {
  ws.views = [{ state: 'frozen', ySplit: headerRow }];
  const colCount = ws.columnCount || 1;
  const lastCol = ws.getCell(headerRow, colCount).address.replace(/\d+$/, '');
  ws.autoFilter = `A${headerRow}:${lastCol}${headerRow}`;
}

/** Apply currency format to a range of cells. */
function moneyFormat(ws: ExcelJS.Worksheet, col: string, startRow: number, endRow: number) {
  for (let r = startRow; r <= endRow; r++) {
    const cell = ws.getCell(`${col}${r}`);
    if (typeof cell.value === 'number') cell.numFmt = '$#,##0.00';
  }
}

/** Apply percentage format to a range of cells. */
function pctFormat(ws: ExcelJS.Worksheet, col: string, startRow: number, endRow: number) {
  for (let r = startRow; r <= endRow; r++) {
    const cell = ws.getCell(`${col}${r}`);
    if (typeof cell.value === 'number') cell.numFmt = '0.0%';
  }
}

function addTitleRow(ws: ExcelJS.Worksheet, title: string, sub: string) {
  ws.mergeCells('A1:C1');
  const cell = ws.getCell('A1');
  cell.value = title;
  cell.font = { bold: true, size: 14 };
  ws.mergeCells('A2:C2');
  const subCell = ws.getCell('A2');
  subCell.value = sub;
  subCell.font = { size: 10, color: { argb: 'FF666666' } };
}

function addRow(ws: ExcelJS.Worksheet, values: (string | number | null | undefined)[]) {
  return ws.addRow(values.map((v) => (v === undefined ? null : v)));
}

export async function buildReportWorkbook(
  period: PeriodKey,
  tz?: string,
  customStart?: string,
  customEnd?: string,
): Promise<ExcelJS.Workbook> {
  const range = computeRange(period, tz, customStart, customEnd);
  const label = `${range.label} (${tz})`;

  // Single data pass — every sheet shares these results
  const [overview, customers, daily, products, categories, coupons, loyalty, cashback, delivery, attribution, ordersList] =
    await Promise.all([
      getOverview(range),
      getCustomerStats(range),
      getDailyTrend(range),
      getTopProducts(range, 50),
      getTopCategories(range, 50),
      getCouponStats(range),
      getLoyaltyStats(range),
      getCashbackStats(range),
      getDeliveryStats(range),
      getAttributionStats(range),
      getOrdersList(range),
    ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'King Food';
  workbook.created = new Date();
  workbook.company = 'King Food';

  const money = (v: number) => Number(v.toFixed(2));

  // ── Summary ────────────────────────────────────────────────────────────────
  const ws = workbook.addWorksheet('Summary', { views: [{ state: 'frozen', ySplit: 4 }] });
  addTitleRow(ws, 'King Food — Report Summary', label);
  const sRows: [string, string | number][] = [
    ['Period', range.label],
    ['Timezone', tz || 'America/New_York'],
    ['Total Orders', overview.orders],
    ['Completed Orders', overview.completed],
    ['Cancelled Orders', overview.cancelled],
    ['Pending Orders', overview.pending],
    ['Gross Sales', money(overview.grossSales)],
    ['Discounts', money(overview.discount)],
    ['Tax', money(overview.tax)],
    ['Delivery Fees', money(overview.deliveryFees)],
    ['Net Revenue', money(overview.revenue)],
    ['Average Order Value', money(overview.aov)],
    ['Items Sold', overview.itemsSold],
    ['Customers (total)', overview.customers],
    ['New Customers', customers.newCustomers],
    ['Repeat Customers', customers.repeatCustomers],
    ['Coupon Usage', coupons.totalUsage],
    ['Coupon Discount', money(coupons.discountGenerated)],
    ['Loyalty Earned', loyalty.earned],
    ['Loyalty Redeemed', loyalty.redeemed],
    ['Cashback Credited', money(cashback.credited)],
    ['Cashback Used', money(cashback.debited)],
    ['Cashback Reversed', money(cashback.reversed)],
    ['Delivery Orders', delivery.deliveryOrders],
    ['Delivered', delivery.delivered],
    ['Cancelled (delivery)', delivery.cancelled],
  ];
  sRows.forEach(([k, v]) => {
    const r = addRow(ws, [k, v]);
    r.eachCell((cell, col) => { if (col === 1) cell.font = { bold: true }; });
  });
  ws.getColumn(1).width = 28;
  ws.getColumn(2).width = 16;

  // ── Sales ──────────────────────────────────────────────────────────────────
  const ws2 = workbook.addWorksheet('Sales');
  ws2.columns = [
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Orders', key: 'orders', width: 10 },
    { header: 'Gross Sales', key: 'gross', width: 14 },
    { header: 'Discounts', key: 'discount', width: 14 },
    { header: 'Net Sales', key: 'net', width: 14 },
    { header: 'AOV', key: 'aov', width: 10 },
  ];
  styleHeader(ws2.getRow(1));
  for (const d of daily) {
    addRow(ws2, [d.date, d.orders, money(d.revenue), money(overview.discount / Math.max(1, daily.length)), money(d.revenue), d.orders > 0 ? money(d.revenue / d.orders) : 0]);
  }

  // ── Orders ─────────────────────────────────────────────────────────────────
  const ws3 = workbook.addWorksheet('Orders');
  ws3.columns = [
    { header: 'Order #', key: 'orderNumber', width: 18 },
    { header: 'Date/Time', key: 'createdAt', width: 20 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Type', key: 'orderType', width: 10 },
    { header: 'Customer', key: 'customerName', width: 20 },
    { header: 'Subtotal', key: 'subtotal', width: 12 },
    { header: 'Discount', key: 'discount', width: 12 },
    { header: 'Delivery Fee', key: 'deliveryFee', width: 12 },
    { header: 'Tax', key: 'tax', width: 10 },
    { header: 'Total', key: 'total', width: 12 },
    { header: 'Coupon', key: 'couponCode', width: 12 },
    { header: 'Attribution', key: 'attributionSource', width: 14 },
    { header: 'Driver', key: 'driverName', width: 16 },
  ];
  styleHeader(ws3.getRow(1));
  for (const o of ordersList) {
    addRow(ws3, [
      o.orderNumber,
      o.createdAt.toISOString().slice(0, 16).replace('T', ' '),
      o.status,
      o.orderType,
      o.customerName,
      money(o.subtotal),
      money(o.discount),
      money(o.deliveryFee),
      money(o.tax),
      money(o.total),
      o.couponCode,
      o.attributionSource,
      o.driverName,
    ]);
  }

  // ── Products ───────────────────────────────────────────────────────────────
  const ws4 = workbook.addWorksheet('Products');
  ws4.columns = [
    { header: 'Product', key: 'name', width: 32 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Sales', key: 'sales', width: 14 },
    { header: 'Orders', key: 'orders', width: 10 },
  ];
  styleHeader(ws4.getRow(1));
  for (const pr of products) addRow(ws4, [pr.name, pr.quantity, money(pr.sales), pr.orders]);

  // ── Categories ─────────────────────────────────────────────────────────────
  const ws5 = workbook.addWorksheet('Categories');
  ws5.columns = [
    { header: 'Category', key: 'name', width: 24 },
    { header: 'Quantity', key: 'quantity', width: 10 },
    { header: 'Sales', key: 'sales', width: 14 },
  ];
  styleHeader(ws5.getRow(1));
  for (const ct of categories) addRow(ws5, [ct.name, ct.quantity, money(ct.sales)]);

  // ── Marketing ──────────────────────────────────────────────────────────────
  const ws6 = workbook.addWorksheet('Marketing');
  addTitleRow(ws6, 'Attribution by Source', label);
  addRow(ws6, ['Source', 'Orders', '%']);
  styleHeader(ws6.getRow(3));
  for (const a of attribution.bySource) {
    addRow(ws6, [a.source, a.count, a.pct]);
  }
  ws6.getColumn(1).width = 16;
  ws6.getColumn(2).width = 10;
  ws6.getColumn(3).width = 10;

  // Coupons section on the same sheet
  const startRow = ws6.rowCount + 2;
  const titleCell = ws6.getCell(`A${startRow}`);
  titleCell.value = 'Coupon Usage';
  titleCell.font = { bold: true, size: 12 };
  addRow(ws6, ['Code', 'Usage', 'Discount']);
  styleHeader(ws6.getRow(startRow + 1));
  for (const cb of coupons.byCoupon) addRow(ws6, [cb.code, cb.usage, money(cb.discount)]);
  addRow(ws6, ['TOTAL', coupons.totalUsage, money(coupons.discountGenerated)]).font = { bold: true };

  // ── Loyalty ────────────────────────────────────────────────────────────────
  const ws7 = workbook.addWorksheet('Loyalty');
  addTitleRow(ws7, 'Loyalty Points', label);
  addRow(ws7, ['Metric', 'Value']);
  styleHeader(ws7.getRow(3));
  addRow(ws7, ['Earned', loyalty.earned]);
  addRow(ws7, ['Earned (transactions)', loyalty.earnedCount]);
  addRow(ws7, ['Redeemed', loyalty.redeemed]);
  addRow(ws7, ['Redeemed (transactions)', loyalty.redeemedCount]);
  addRow(ws7, ['Adjusted', loyalty.adjusted]);
  ws7.getColumn(1).width = 24;
  ws7.getColumn(2).width = 14;

  // ── Cashback ───────────────────────────────────────────────────────────────
  const ws8 = workbook.addWorksheet('Cashback');
  addTitleRow(ws8, 'Cashback (ledger)', label);
  addRow(ws8, ['Metric', 'Amount', 'Transactions']);
  styleHeader(ws8.getRow(3));
  addRow(ws8, ['Credited', money(cashback.credited), cashback.creditedCount]);
  addRow(ws8, ['Used (debit)', money(cashback.debited), cashback.debitedCount]);
  addRow(ws8, ['Reversed', money(cashback.reversed), cashback.reversedCount]);
  addRow(ws8, ['Adjusted', money(cashback.adjusted), 0]);
  ws8.getColumn(1).width = 20;
  ws8.getColumn(2).width = 14;
  ws8.getColumn(3).width = 14;

  // ── Delivery ───────────────────────────────────────────────────────────────
  const ws9 = workbook.addWorksheet('Delivery');
  addTitleRow(ws9, 'Delivery Metrics', label);
  addRow(ws9, ['Metric', 'Value']);
  styleHeader(ws9.getRow(3));
  addRow(ws9, ['Delivery Orders', delivery.deliveryOrders]);
  addRow(ws9, ['Delivered', delivery.delivered]);
  addRow(ws9, ['Cancelled', delivery.cancelled]);
  const dStart = ws9.rowCount + 2;
  const dTitle = ws9.getCell(`A${dStart}`);
  dTitle.value = 'Driver Performance';
  dTitle.font = { bold: true, size: 12 };
  addRow(ws9, ['Driver', 'Assigned', 'Delivered', 'Completion %']);
  styleHeader(ws9.getRow(dStart + 1));
  for (const dp of delivery.driverPerformance) {
    addRow(ws9, [dp.driverName, dp.assigned, dp.delivered, dp.completionRate]);
  }
  ws9.getColumn(1).width = 22;
  ws9.getColumn(2).width = 10;
  ws9.getColumn(3).width = 10;
  ws9.getColumn(4).width = 14;

  // ── Drivers (10th sheet — dedicated driver performance) ────────────────────
  const ws10 = workbook.addWorksheet('Drivers');
  ws10.columns = [
    { header: 'Driver', key: 'driverName', width: 24 },
    { header: 'Assigned', key: 'assigned', width: 12 },
    { header: 'Delivered', key: 'delivered', width: 12 },
    { header: 'Completion %', key: 'completionRate', width: 16 },
  ];
  styleHeader(ws10.getRow(1));
  for (const dp of delivery.driverPerformance) {
    const row = addRow(ws10, [dp.driverName, dp.assigned, dp.delivered, dp.completionRate / 100]);
    if (row) {
      row.getCell(4).numFmt = '0.0%';
      row.getCell(1).font = { bold: true };
    }
  }
  finalizeTable(ws10);

  // ── Professional formatting pass ────────────────────────────────────────────
  // Sales: currency on revenue columns
  finalizeTable(ws2);
  if (ws2.rowCount > 1) {
    moneyFormat(ws2, 'C', 2, ws2.rowCount);
    moneyFormat(ws2, 'D', 2, ws2.rowCount);
    moneyFormat(ws2, 'E', 2, ws2.rowCount);
    moneyFormat(ws2, 'F', 2, ws2.rowCount);
  }
  // Orders: currency on financial columns (F..J = subtotal..total)
  finalizeTable(ws3);
  if (ws3.rowCount > 1) {
    for (const col of ['F', 'G', 'H', 'I', 'J']) moneyFormat(ws3, col, 2, ws3.rowCount);
  }
  // Products / Categories: currency on sales
  finalizeTable(ws4);
  if (ws4.rowCount > 1) moneyFormat(ws4, 'C', 2, ws4.rowCount);
  finalizeTable(ws5);
  if (ws5.rowCount > 1) moneyFormat(ws5, 'C', 2, ws5.rowCount);

  return workbook;
}

export async function workbookToBuffer(workbook: ExcelJS.Workbook): Promise<Buffer> {
  const buf = await workbook.xlsx.writeBuffer();
  return Buffer.from(buf);
}
