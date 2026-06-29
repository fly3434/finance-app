const SHEET_ID = '18BjQ3NxbQwqcCFEDkkHsZabWPOeYdxe2ZK6vWjQ3KJA';
const SHEET_VIEW_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwfKJsyy7Vw1I7-Bh7mxoCWo8ObdPdH4QDr72csUl24tI41tu1X266M36oZtaRPNyXLhw/exec';

const $ = (selector) => document.querySelector(selector);
const money = (value) => `NT$ ${Math.abs(Math.round(value || 0)).toLocaleString('zh-TW')}`;
const signedMoney = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  const prefix = Number(value) < 0 ? '-' : '';
  return `${prefix}${money(value)}`;
};

const COLORS = ['#2f6fef', '#19a07f', '#ef8c32', '#d94f70', '#7f62d9', '#2a9db8', '#809f2f', '#c05f33'];
const VIEW_CONFIG = {
  income: {
    tab: '收入',
    label: '本月收入',
    title: '收入結構',
    recordLabel: '筆收入',
    empty: '目前沒有可統計的收入資料',
    higherIsGood: true,
    metricLabel: '資料筆數',
  },
  expense: {
    tab: '開銷',
    label: '本月開銷',
    title: '開銷結構',
    recordLabel: '筆開銷',
    empty: '目前沒有可統計的開銷資料',
    higherIsGood: false,
    metricLabel: '資料筆數',
  },
  loan: {
    tab: '貸款',
    label: '本月貸款餘額',
    title: '貸款結構',
    recordLabel: '筆貸款',
    empty: '目前沒有可統計的貸款資料',
    higherIsGood: false,
    metricLabel: '貸款項目',
  },
  asset: {
    tab: '資產',
    label: '本月資產',
    title: '資產結構',
    recordLabel: '項資產',
    empty: '目前沒有可統計的資產資料',
    higherIsGood: true,
    metricLabel: '資產項目',
  },
  report: {
    tab: '月報',
    label: '本月淨值',
    title: '月報摘要',
    recordLabel: '個摘要',
    empty: '目前沒有可統計的月報資料',
    higherIsGood: true,
    metricLabel: '摘要項目',
  },
};

const STATEMENT_CONFIG = {
  report: {
    tab: '月報',
    label: '本月淨值',
    title: '月報',
    empty: '目前沒有可統計的月報資料',
    periodLabel: '月份',
    primaryLabel: '權益合計(資產淨值(資產-負債))',
    metricLabels: ['資產總計', '負債合計', '權益合計(資產淨值(資產-負債))', '本月淨利(稅前淨利-稅費)'],
    comparisonLabel: '較上月',
  },
  quarterlyReport: {
    tab: '季報',
    label: '季度淨值',
    title: '季報',
    empty: '目前沒有可統計的季報資料',
    periodLabel: '季度',
    primaryLabel: '權益合計(資產淨值(資產-負債))',
    metricLabels: ['資產總計', '負債合計', '權益合計(資產淨值(資產-負債))', '本期淨利(稅前淨利-稅費)(本期淨收入)'],
    comparisonLabel: '較前季',
  },
  quarterlyCashFlow: {
    tab: '季現金流',
    label: '季度期末現金',
    title: '季_現金流量表',
    empty: '目前沒有可統計的季現金流量資料',
    periodLabel: '季度',
    primaryLabel: '期末現金及約當現金餘額',
    metricLabels: ['營業活動之淨現金流入', '投資活動之淨現金流入', '籌資活動之淨現金流入', '現金及約當現金淨增加數 (營業+投資+籌資)'],
    comparisonLabel: '較前季',
  },
  yearlyReport: {
    tab: '年報',
    label: '年度淨值',
    title: '年報',
    empty: '目前沒有可統計的年報資料',
    periodLabel: '年度',
    primaryLabel: '權益合計(資產淨值(資產-負債))',
    metricLabels: ['資產總計', '負債合計', '權益合計(資產淨值(資產-負債))', '本年淨利(稅前淨利-稅費)(年度淨收入)'],
    comparisonLabel: '較前年度',
  },
  yearlyCashFlow: {
    tab: '年現金流',
    label: '年度期末現金',
    title: '年_現金流量表',
    empty: '目前沒有可統計的年現金流量資料',
    periodLabel: '年度',
    primaryLabel: '期末現金及約當現金餘額',
    metricLabels: ['營業活動之淨現金流入', '投資活動之淨現金流入', '籌資活動之淨現金流入', '現金及約當現金淨增加數 (營業+投資+籌資)'],
    comparisonLabel: '較前年度',
  },
};

let activeView = 'income';
let selectedPeriod = 0;
let datasets = createEmptyDatasets('正在讀取 Google Sheet');
let statementDatasets = createEmptyStatementDatasets('正在讀取 Google Sheet');
let detailRecords = [];
let lastSyncStatus = 'pending';

function createEmptyDatasets(message) {
  return Object.keys(VIEW_CONFIG).reduce((result, view) => {
    result[view] = createEmptyDataset(view, message);
    return result;
  }, {});
}

function createEmptyDataset(view, message = VIEW_CONFIG[view].empty) {
  const period = getPeriod(new Date());
  const config = VIEW_CONFIG[view];

  return {
    label: config.label,
    title: config.title,
    periods: [formatPeriod(period)],
    periodKeys: [period.key],
    totalsByPeriod: [0],
    total: 0,
    previousTotal: 0,
    change: 0,
    compare: message,
    metrics: [
      [config.metricLabel, 0, 'count', 'neutral'],
      ['月均金額', 0, 'money', 'neutral'],
    ],
    itemsByPeriod: [[]],
    recordsByPeriod: [[]],
    empty: true,
  };
}

function createEmptyStatementDatasets(message) {
  return Object.keys(STATEMENT_CONFIG).reduce((result, key) => {
    result[key] = createEmptyStatementDataset(key, message);
    return result;
  }, {});
}

function createEmptyStatementDataset(key, message = STATEMENT_CONFIG[key].empty) {
  return {
    ...STATEMENT_CONFIG[key],
    periods: [{ key: 'empty', label: '-' }],
    rows: [],
    empty: true,
    emptyMessage: message,
  };
}

async function loadSheetData() {
  const response = await fetch(`${APPS_SCRIPT_URL}?t=${Date.now()}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Apps Script 回應失敗：${response.status}`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error('Apps Script 沒有回傳 JSON，請檢查部署權限或 APPS_SCRIPT_URL');
  }

  const data = await response.json();
  return normalizeSheetPayload(data);
}

function normalizeSheetPayload(data) {
  return {
    records: normalizeRecordsResponse(data),
    details: normalizeDetailRecordsResponse(data?.details || data?.detailRecords || data?.transactions),
    statements: normalizeStatementsResponse(data?.statements),
  };
}

function normalizeRecordsResponse(data) {
  if (Array.isArray(data?.records)) {
    return data.records.map(normalizeRecord).filter(Boolean);
  }

  if (Array.isArray(data?.rows)) {
    return data.rows.map((row) => normalizeRecord(row, data.sheet)).filter(Boolean);
  }

  if (data?.sheets && typeof data.sheets === 'object') {
    return Object.entries(data.sheets).flatMap(([sheetName, rows]) => {
      if (!Array.isArray(rows)) return [];
      return rows.map((row) => normalizeRecord(row, sheetName)).filter(Boolean);
    });
  }

  if (Array.isArray(data)) {
    return data.map(normalizeRecord).filter(Boolean);
  }

  return [];
}

function normalizeStatementsResponse(statements) {
  return Object.keys(STATEMENT_CONFIG).reduce((result, key) => {
    result[key] = normalizeStatement(statements?.[key], key);
    return result;
  }, {});
}

function normalizeDetailRecordsResponse(details) {
  if (!Array.isArray(details)) return [];
  return details.map(normalizeDetailRecord).filter(Boolean);
}

function normalizeDetailRecord(row) {
  if (!row || typeof row !== 'object') return null;

  const sheet = String(pick(row, ['sheet', 'sheetName', '工作表']) || '').trim();
  const rawType = String(pick(row, ['type', 'view', '類別', '收支類型', '類型']) || sheet).trim();
  const type = normalizeType(rawType, sheet);
  if (!['income', 'expense'].includes(type)) return null;

  const amount = parseAmount(pick(row, ['amount', '金額', '金額(NTD)', 'value', '數值']));
  if (!amount) return null;

  const transactionDate = parseFullDate(pick(row, ['date', '日期', '交易日期', '日期(其他請填yyyymmdd, ex:20240808)']));
  if (!transactionDate) return null;

  const period = getPeriod(transactionDate);
  const category = String(pick(row, ['category', '分類', '主分類']) || VIEW_CONFIG[type].tab).trim();
  const subcategory = String(pick(row, ['subcategory', 'item', '項目', '明細', '選項']) || category).trim();

  return {
    type,
    date: transactionDate,
    periodKey: period.key,
    displayDate: String(pick(row, ['displayDate', '日期文字']) || formatDetailDate(transactionDate)).trim(),
    category,
    subcategory,
    amount: Math.abs(amount),
    note: String(pick(row, ['note', '備註']) || '').trim(),
    source: String(pick(row, ['source', '來源']) || sheet).trim(),
    sortTime: transactionDate.getTime(),
  };
}

function normalizeStatement(statement, key) {
  const fallback = createEmptyStatementDataset(key);
  if (!statement || !Array.isArray(statement.periods) || !Array.isArray(statement.rows) || !statement.periods.length) {
    return fallback;
  }

  const order = statement.periods.map((_, index) => index).reverse();
  const periods = order.map((index) => ({
    key: String(statement.periods[index]?.key || index),
    label: String(statement.periods[index]?.label || statement.periods[index]?.rawLabel || '-').trim(),
    rawLabel: String(statement.periods[index]?.rawLabel || statement.periods[index]?.label || '').trim(),
  }));

  const rows = statement.rows.map((row) => ({
    rowNumber: row.rowNumber,
    section: String(row.section || statement.title || STATEMENT_CONFIG[key].title).trim(),
    account: String(row.account || '').trim(),
    item: String(row.item || '').trim(),
    detail: String(row.detail || '').trim(),
    label: String(row.label || row.account || row.item || row.detail || '').trim(),
    values: order.map((index) => normalizeStatementValue(row.values?.[index], periods[order.indexOf(index)]?.key)),
  })).filter((row) => row.label);

  return {
    ...STATEMENT_CONFIG[key],
    sheet: statement.sheet || STATEMENT_CONFIG[key].title,
    kind: statement.kind || 'statement',
    periods,
    rows,
    empty: !rows.length,
    emptyMessage: STATEMENT_CONFIG[key].empty,
  };
}

function normalizeStatementValue(value, periodKey) {
  return {
    periodKey,
    amount: parseNullableNumber(value?.amount),
    ratio: parseNullableNumber(value?.ratio),
  };
}

function parseNullableNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeRecord(row, fallbackSheet = '') {
  if (!row || typeof row !== 'object') return null;

  const sheet = String(pick(row, ['sheet', 'sheetName', '工作表']) || fallbackSheet || '').trim();
  const rawType = String(pick(row, ['type', 'view', '收支類型', '類型']) || sheet).trim();
  const type = normalizeType(rawType, sheet);
  if (!type) return null;

  const amount = parseAmount(pick(row, ['amount', '金額', 'value', '數值']));
  if (!amount) return null;

  const year = parseInteger(pick(row, ['year', '年']));
  const month = parseInteger(pick(row, ['month', '月']));
  const date = parseDate(pick(row, ['date', '日期', 'monthDate', '月份日期']), year, month);
  if (!date) return null;

  const category = String(pick(row, ['category', '分類']) || VIEW_CONFIG[type].tab).trim();
  const subcategory = String(pick(row, ['subcategory', 'item', '項目', '明細']) || category).trim();

  return {
    type,
    date,
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    category,
    subcategory,
    amount: type === 'report' ? amount : Math.abs(amount),
    note: String(pick(row, ['note', '備註']) || '').trim(),
    source: String(pick(row, ['source', '來源']) || sheet).trim(),
    breakdownLabel: String(pick(row, ['breakdownLabel', 'breakdown', '圖表分類']) || '').trim(),
    includeInTotal: parseBooleanFlag(pick(row, ['includeInTotal', '納入總額']), true),
    includeInBreakdown: parseBooleanFlag(pick(row, ['includeInBreakdown', '納入圖表']), true),
  };
}

function pick(row, keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }

  return '';
}

function normalizeType(value, sheetName = '') {
  const text = `${value || ''} ${sheetName || ''}`.toLowerCase();
  if (/收入|income/.test(text)) return 'income';
  if (/開銷|支出|expense|cost/.test(text)) return 'expense';
  if (/貸款|loan|debt/.test(text)) return 'loan';
  if (/資產|asset/.test(text)) return 'asset';
  if (/月報|report|monthly/.test(text)) return 'report';
  return '';
}

function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const text = String(value || '').trim();
  const isParenthesizedNegative = /^[（(].*[）)]$/.test(text);
  const normalized = text.replace(/[,\s$NTnt元()（）]/g, '');
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) return 0;
  return isParenthesizedNegative ? -Math.abs(parsed) : parsed;
}

function parseBooleanFlag(value, fallback) {
  if (value === '' || value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;

  const text = String(value).trim().toLowerCase();
  if (['false', '0', 'no', 'n', '否'].includes(text)) return false;
  if (['true', '1', 'yes', 'y', '是'].includes(text)) return true;
  return fallback;
}

function parseInteger(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function parseDate(value, year, month) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return startOfMonth(value);
  }

  if (typeof value === 'number' && value > 10000) {
    return startOfMonth(excelSerialToDate(value));
  }

  const text = String(value || '').trim();
  if (text) {
    if (/^\d{4}[-/.]\d{1,2}/.test(text)) {
      const parsed = new Date(text.replace(/[.]/g, '-'));
      if (!Number.isNaN(parsed.getTime())) return startOfMonth(parsed);
    }

    const yearMonth = text.match(/(\d{4}).*?(\d{1,2})/);
    if (yearMonth) {
      return new Date(Number(yearMonth[1]), Number(yearMonth[2]) - 1, 1);
    }
  }

  if (year && month && month >= 1 && month <= 12) {
    return new Date(year, month - 1, 1);
  }

  return null;
}

function parseFullDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'number') {
    if (value > 10000) return excelSerialToDate(value);
    return null;
  }

  const text = String(value || '').trim();
  if (!text) return null;

  const compactDate = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactDate) {
    return new Date(Number(compactDate[1]), Number(compactDate[2]) - 1, Number(compactDate[3]));
  }

  const fullDate = text.match(/(\d{4})[-/.年\s]*(\d{1,2})[-/.月\s]*(\d{1,2})/);
  if (fullDate) {
    return new Date(Number(fullDate[1]), Number(fullDate[2]) - 1, Number(fullDate[3]));
  }

  const yearMonth = text.match(/(\d{4}).*?(\d{1,2})/);
  if (yearMonth) {
    return new Date(Number(yearMonth[1]), Number(yearMonth[2]) - 1, 1);
  }

  return null;
}

function excelSerialToDate(serial) {
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  return new Date(utc);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildDatasetsFromRecords(records) {
  const usableRecords = records.filter((record) => record.date && record.amount !== 0);

  if (!usableRecords.length) {
    throw new Error('JSON 中沒有可統計的收支、貸款、資產或月報明細');
  }

  return Object.keys(VIEW_CONFIG).reduce((result, type) => {
    result[type] = buildDataset(type, usableRecords.filter((record) => record.type === type));
    return result;
  }, {});
}

function buildDataset(type, records) {
  const config = VIEW_CONFIG[type];
  const periods = getRecentPeriods(records, 12);

  if (!records.length) {
    return createEmptyDataset(type, config.empty);
  }

  const totalsByPeriod = periods.map((period) => sum(records.filter((record) => isInPeriod(record.date, period) && record.includeInTotal !== false)));
  const rowsByPeriod = periods.map((period) => records.filter((record) => isInPeriod(record.date, period)));
  const currentRows = rowsByPeriod[0];
  const previousRows = rowsByPeriod[1] || [];
  const total = sum(currentRows.filter((record) => record.includeInTotal !== false));
  const previousTotal = sum(previousRows.filter((record) => record.includeInTotal !== false));
  const change = calculateChange(total, previousTotal);
  const average = totalsByPeriod.length ? sum(totalsByPeriod) / totalsByPeriod.length : 0;
  const tone = config.higherIsGood ? changeTone(change) : changeTone(-change);
  const changesByPeriod = totalsByPeriod.map((periodTotal, index) => calculateChange(periodTotal, totalsByPeriod[index + 1] || 0));
  const compareByPeriod = totalsByPeriod.map((periodTotal, index) => formatCompare(periodTotal, totalsByPeriod[index + 1] || 0));
  const trendTonesByPeriod = changesByPeriod.map((periodChange) => (config.higherIsGood ? changeTone(periodChange) : changeTone(-periodChange)));
  const metricsByPeriod = rowsByPeriod.map((periodRows) => [
    [config.metricLabel, periodRows.length, 'count', 'neutral'],
    ['月均金額', average, 'money', 'neutral'],
  ]);

  return {
    label: config.label,
    title: config.title,
    periods: periods.map(formatPeriod),
    periodKeys: periods.map((period) => period.key),
    totalsByPeriod,
    total,
    previousTotal,
    change,
    compare: formatCompare(total, previousTotal),
    metrics: metricsByPeriod[0],
    metricsByPeriod,
    changesByPeriod,
    compareByPeriod,
    trendTonesByPeriod,
    itemsByPeriod: rowsByPeriod.map(buildCategoryItems),
    recordsByPeriod: rowsByPeriod.map(buildTopRecords),
    trendTone: tone,
    empty: !currentRows.length,
  };
}

function getRecentPeriods(records, limit) {
  const unique = new Map();
  records.forEach((record) => {
    const period = getPeriod(record.date);
    unique.set(period.key, period);
  });

  const periods = Array.from(unique.values()).sort((a, b) => b.start - a.start);
  return periods.length ? periods.slice(0, limit) : [getPeriod(new Date())];
}

function getPeriod(date) {
  const year = date.getFullYear();
  const month = date.getMonth();

  return {
    key: `${year}-${String(month + 1).padStart(2, '0')}`,
    year,
    month: month + 1,
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1),
  };
}

function formatPeriod(period) {
  return `${period.year} 年 ${period.month} 月`;
}

function isInPeriod(date, period) {
  return date >= period.start && date < period.end;
}

function sum(values) {
  return values.reduce((total, item) => total + (typeof item === 'number' ? item : item.amount), 0);
}

function calculateChange(current, previous) {
  if (!previous || current === null || current === undefined) return 0;
  return Number((((current - previous) / Math.abs(previous)) * 100).toFixed(1));
}

function changeTone(value) {
  if (value > 0) return 'positive';
  if (value < 0) return 'negative';
  return 'neutral';
}

function formatCompare(total, previousTotal) {
  if (!previousTotal) return '沒有上月資料可比較';
  const diff = total - previousTotal;
  return `較上月${diff >= 0 ? '增加' : '減少'} ${money(diff)}`;
}

function buildCategoryItems(records) {
  const grouped = records.filter((record) => record.includeInBreakdown !== false).reduce((map, record) => {
    const label = record.breakdownLabel || record.category;
    map.set(label, (map.get(label) || 0) + record.amount);
    return map;
  }, new Map());

  return Array.from(grouped.entries())
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .map(([name, amount], index) => [name, amount, COLORS[index % COLORS.length]]);
}

function buildTopRecords(records) {
  const grouped = records.reduce((map, record) => {
    const key = `${record.category}｜${record.subcategory}`;
    const current = map.get(key) || {
      category: record.category,
      subcategory: record.subcategory,
      amount: 0,
      note: record.note,
    };
    current.amount += record.amount;
    map.set(key, current);
    return map;
  }, new Map());

  return Array.from(grouped.values()).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount)).slice(0, 6);
}

function getSelectedDataset() {
  const data = datasets[activeView] || createEmptyDataset(activeView);
  const safeIndex = Math.min(selectedPeriod, data.periods.length - 1);

  return {
    data,
    index: Math.max(safeIndex, 0),
    periodKey: data.periodKeys?.[safeIndex] || '',
    periodLabel: data.periods?.[safeIndex] || '',
    periodItems: data.itemsByPeriod?.[safeIndex] || [],
    periodRecords: data.recordsByPeriod?.[safeIndex] || [],
    periodTotal: data.totalsByPeriod?.[safeIndex] ?? data.total,
    periodMetrics: data.metricsByPeriod?.[safeIndex] || data.metrics,
    periodChange: data.changesByPeriod?.[safeIndex] ?? data.change,
    periodCompare: data.compareByPeriod?.[safeIndex] || data.compare,
    periodTrendTone: data.trendTonesByPeriod?.[safeIndex] || data.trendTone,
  };
}

function render() {
  if (STATEMENT_CONFIG[activeView]) {
    renderStatement();
    return;
  }

  renderDashboard();
}

function renderDashboard() {
  const config = VIEW_CONFIG[activeView];
  const { data, index, periodKey, periodLabel, periodItems, periodRecords, periodTotal, periodMetrics, periodChange, periodCompare, periodTrendTone } = getSelectedDataset();

  $('#dashboard-view').hidden = false;
  $('#statement-view').hidden = true;
  $('#period-label').textContent = '月份';
  $('#period-select').innerHTML = data.periods
    .map((period, periodIndex) => `<option value="${periodIndex}">${escapeHtml(period)}</option>`)
    .join('');
  $('#period-select').value = index;

  $('#summary-label').textContent = data.label;
  $('#total').textContent = money(periodTotal);
  $('#trend').textContent = `${periodChange >= 0 ? '+' : '-'} ${Math.abs(periodChange)}%`;
  $('#trend').className = `trend ${periodTrendTone === 'negative' ? 'down' : ''}`;
  $('#comparison').textContent = periodCompare;
  $('#chart-title').textContent = data.title;
  $('#donut-total').textContent = money(periodTotal);
  $('#record-count').textContent = `${periodRecords.length} ${config.recordLabel}`;

  $('#insight-row').innerHTML = periodMetrics
    .map(([name, value, format, tone]) => {
      const display = format === 'count' ? `${value.toLocaleString('zh-TW')} 筆` : money(value);
      return `<article class="insight"><p>${escapeHtml(name)}</p><b>${display}</b>${tone !== 'neutral' ? `<i class="${tone}">${tone === 'positive' ? '上升' : '下降'}</i>` : ''}</article>`;
    })
    .join('');

  renderDonut(periodItems, periodTotal);
  renderRecords(periodRecords, config);
  renderDetailRecords(periodKey, periodLabel);
  renderMiniChart(data, index);
}

function renderStatement() {
  const config = STATEMENT_CONFIG[activeView];
  const statement = statementDatasets[activeView] || createEmptyStatementDataset(activeView);
  const index = Math.max(0, Math.min(selectedPeriod, statement.periods.length - 1));
  const primaryRow = findStatementRow(statement, config.primaryLabel) || statement.rows[0];
  const current = getStatementValue(primaryRow, index)?.amount ?? null;
  const previous = getStatementValue(primaryRow, index + 1)?.amount ?? null;
  const change = calculateChange(current, previous);

  $('#dashboard-view').hidden = true;
  $('#statement-view').hidden = false;
  $('#period-label').textContent = config.periodLabel;
  $('#period-select').innerHTML = statement.periods
    .map((period, periodIndex) => `<option value="${periodIndex}">${escapeHtml(period.label)}</option>`)
    .join('');
  $('#period-select').value = index;

  $('#statement-title').textContent = config.title;
  $('#statement-summary-label').textContent = config.label;
  $('#statement-period').textContent = statement.periods[index]?.label || '-';
  $('#statement-total').textContent = signedMoney(current);
  $('#statement-trend').textContent = `${change >= 0 ? '+' : '-'} ${Math.abs(change)}%`;
  $('#statement-trend').className = `trend ${change < 0 ? 'down' : ''}`;
  $('#statement-comparison').textContent = previous === null ? '沒有前期資料可比較' : `${config.comparisonLabel}${current - previous >= 0 ? '增加' : '減少'} ${money(current - previous)}`;

  renderStatementMetrics(statement, index, config);
  renderStatementTrend(primaryRow, index, statement);
  renderStatementRows(statement, index);
}

function renderStatementMetrics(statement, selectedIndex, config) {
  const metrics = config.metricLabels.map((label) => {
    const row = findStatementRow(statement, label);
    const current = getStatementValue(row, selectedIndex)?.amount ?? null;
    const previous = getStatementValue(row, selectedIndex + 1)?.amount ?? null;
    return {
      label: compactMetricLabel(label),
      value: current,
      change: previous === null ? null : calculateChange(current, previous),
    };
  });

  $('#statement-metrics').innerHTML = metrics
    .map((metric) => {
      const tone = metric.change === null ? 'neutral' : changeTone(metric.change);
      const changeText = metric.change === null ? '—' : `${metric.change >= 0 ? '+' : ''}${metric.change}%`;
      return `<article class="statement-metric">
        <p>${escapeHtml(metric.label)}</p>
        <b>${signedMoney(metric.value)}</b>
        <i class="${tone}">${changeText}</i>
      </article>`;
    })
    .join('');
}

function renderStatementTrend(row, selectedIndex, statement) {
  const values = row?.values || [];
  const windowRows = values
    .slice(selectedIndex, selectedIndex + 6)
    .map((value, index) => ({
      value: value.amount ?? 0,
      label: statement.periods?.[selectedIndex + index]?.label || '',
    }))
    .reverse();
  const rows = windowRows.length ? windowRows : [{ value: 0, label: '-' }];
  const max = Math.max(...rows.map((item) => Math.abs(item.value)), 1);
  const yLabels = [max, max / 2, 0].map(formatAxisMoney);

  $('#statement-chart').innerHTML = `
    <div class="statement-y-title">金額</div>
    <div class="statement-y-axis" aria-hidden="true">
      ${yLabels.map((label) => `<span>${label}</span>`).join('')}
    </div>
    <div class="statement-plot">
      ${rows
        .map((item, index) => {
          const height = Math.max(8, Math.min(100, (Math.abs(item.value) / max) * 100));
          const tone = item.value < 0 ? 'negative-bar' : '';
          return `<i class="statement-bar ${tone} ${index === rows.length - 1 ? 'last' : ''}" style="height:${height}%" title="${compactStatementPeriodLabel(item.label)} ${signedMoney(item.value)}"></i>`;
        })
        .join('')}
    </div>
    <div class="statement-x-axis" aria-hidden="true">
      ${rows.map((item) => `<span>${escapeHtml(compactStatementPeriodLabel(item.label))}</span>`).join('')}
    </div>
    <div class="statement-x-title">期間</div>
  `;
}

function renderStatementRows(statement, selectedIndex) {
  if (!statement.rows.length) {
    $('#statement-table').innerHTML = `<div class="empty-state">${escapeHtml(statement.emptyMessage)}</div>`;
    return;
  }

  let currentSection = '';
  const html = statement.rows
    .filter((row) => shouldShowStatementRow(row, selectedIndex))
    .map((row) => {
      const sectionHeader = row.section !== currentSection ? `<h3>${escapeHtml(row.section)}</h3>` : '';
      currentSection = row.section;
      const current = getStatementValue(row, selectedIndex);
      const previous = getStatementValue(row, selectedIndex + 1);
      const change = previous?.amount === null || previous?.amount === undefined ? null : calculateChange(current?.amount, previous.amount);
      const meta = current?.ratio !== null && current?.ratio !== undefined ? formatPercent(current.ratio) : change === null ? '—' : `${change >= 0 ? '+' : ''}${change}%`;
      const totalClass = isImportantStatementRow(row.label) ? ' important' : '';

      return `${sectionHeader}
        <div class="statement-row${totalClass}">
          <div class="statement-name">
            <b>${escapeHtml(compactStatementLabel(row))}</b>
            <span>${escapeHtml(rowSubtitle(row))}</span>
          </div>
          <strong>${signedMoney(current?.amount)}</strong>
          <span>${meta}</span>
          <em>${signedMoney(previous?.amount)}</em>
        </div>`;
    })
    .join('');

  $('#statement-table').innerHTML = html || `<div class="empty-state">${escapeHtml(statement.emptyMessage)}</div>`;
}

function findStatementRow(statement, label) {
  const target = normalizeLabel(label);
  return statement?.rows?.find((row) => normalizeLabel(row.label) === target || normalizeLabel(row.label).includes(target));
}

function getStatementValue(row, index) {
  if (!row || index < 0) return null;
  return row.values?.[index] || null;
}

function shouldShowStatementRow(row, index) {
  const current = getStatementValue(row, index);
  const previous = getStatementValue(row, index + 1);
  return current?.amount !== null || current?.ratio !== null || previous?.amount !== null;
}

function compactMetricLabel(label) {
  return label
    .replace(/\(.+?\)/g, '')
    .replace('現金及約當現金', '現金')
    .replace('之淨現金流入', '')
    .slice(0, 14);
}

function compactStatementLabel(row) {
  return row.detail || row.item || row.account || row.label;
}

function rowSubtitle(row) {
  const compact = compactStatementLabel(row);
  return row.label === compact ? row.section : row.label.replaceAll('｜', ' / ');
}

function isImportantStatementRow(label) {
  return /合計|總計|淨利|淨現金|淨增加|餘額|綜合損益總額/.test(label);
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${(Number(value) * 100).toFixed(Math.abs(value) >= 1 ? 0 : 1)}%`;
}

function renderDonut(items, total) {
  const sumItems = items.reduce((amount, item) => amount + Math.abs(item[1]), 0);

  if (!items.length || !sumItems) {
    $('#donut').style.background = '#e6e9f2';
    $('#legend').innerHTML = '<li><i class="dot" style="background:#c8cedf"></i><span>尚無資料</span><b>0%</b></li>';
    $('#donut-total').textContent = money(total);
    return;
  }

  let cursor = 0;
  const stops = items.map((item) => {
    const from = cursor;
    cursor += (Math.abs(item[1]) / sumItems) * 100;
    return `${item[2]} ${from.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });

  $('#donut').style.background = `conic-gradient(${stops.join(',')})`;
  $('#legend').innerHTML = items
    .map((item) => `<li><i class="dot" style="background:${item[2]}"></i><span>${escapeHtml(item[0])}</span><b>${Math.round((Math.abs(item[1]) / sumItems) * 100)}%</b></li>`)
    .join('');
}

function renderRecords(records, config) {
  if (!records.length) {
    $('#records').innerHTML = `<div class="record"><div class="record-icon">!</div><div class="record-main"><b>${lastSyncStatus === 'failed' ? '讀取失敗' : '尚無資料'}</b><span>${config.empty}</span></div><strong>${money(0)}</strong></div>`;
    return;
  }

  $('#records').innerHTML = records
    .map((record, index) => {
      const color = COLORS[index % COLORS.length];
      return `<div class="record"><div class="record-icon" style="background:${color}19;color:${color}">${index + 1}</div><div class="record-main"><b>${escapeHtml(record.subcategory)}</b><span>${escapeHtml(record.category)}${record.note ? `｜${escapeHtml(record.note)}` : ''}</span></div><strong>${formatRecordAmount(record.amount, activeView)}</strong></div>`;
    })
    .join('');
}

function renderDetailRecords(periodKey, periodLabel) {
  const card = $('#details-card');
  if (!['income', 'expense'].includes(activeView)) {
    card.hidden = true;
    return;
  }

  const title = activeView === 'income' ? '收入明細' : '消費明細';
  const records = detailRecords
    .filter((record) => record.type === activeView && record.periodKey === periodKey)
    .sort((a, b) => b.sortTime - a.sortTime || b.amount - a.amount);

  card.hidden = false;
  $('#details-title').textContent = title;
  $('#details-count').textContent = `${records.length.toLocaleString('zh-TW')} 筆`;

  if (!records.length) {
    const emptyText = lastSyncStatus === 'failed'
      ? '讀取失敗，請檢查 Apps Script'
      : `${periodLabel || '所選月份'}沒有從「收支紀錄」取得明細`;
    $('#details-list').innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
    return;
  }

  $('#details-list').innerHTML = records
    .map((record) => {
      const note = record.note ? `｜${escapeHtml(record.note)}` : '';
      return `<div class="detail-row">
        <time>${escapeHtml(record.displayDate)}</time>
        <div class="detail-main">
          <b>${escapeHtml(record.subcategory)}</b>
          <span>${escapeHtml(record.category)}${note}</span>
        </div>
        <strong>${formatRecordAmount(record.amount, activeView)}</strong>
      </div>`;
    })
    .join('');
}

function formatRecordAmount(value, type) {
  if (type === 'expense') return `- ${money(value)}`;
  if (type === 'report' && value < 0) return `- ${money(value)}`;
  return money(value);
}

function formatDetailDate(date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function renderMiniChart(data, selectedIndex) {
  const totals = data.totalsByPeriod || [];
  const periods = data.periods || [];
  const start = Math.max(0, selectedIndex);
  const windowRows = totals
    .slice(start, start + 6)
    .map((value, index) => ({
      value,
      label: compactPeriodLabel(periods[start + index] || ''),
    }))
    .reverse();

  const rows = windowRows.length ? windowRows : [{ value: 0, label: '-' }];
  const max = Math.max(...rows.map((row) => Math.abs(row.value)), 1);
  const yLabels = [max, max / 2, 0].map(formatAxisMoney);

  $('#mini-chart').innerHTML = `
    <div class="y-axis" aria-hidden="true">
      ${yLabels.map((label) => `<span>${label}</span>`).join('')}
    </div>
    <div class="chart-panel">
      <div class="plot-area">
        ${rows
          .map((row, rowIndex) => {
            const height = Math.max(10, Math.min(100, (Math.abs(row.value) / max) * 100));
            const isSelected = rowIndex === rows.length - 1;
            return `<i class="bar ${isSelected ? 'last' : ''}" style="height:${height}%" title="${row.label} ${money(row.value)}"></i>`;
          })
          .join('')}
      </div>
      <div class="x-axis" aria-hidden="true">
        ${rows.map((row) => `<span>${escapeHtml(row.label)}</span>`).join('')}
      </div>
    </div>
  `;
}

function compactPeriodLabel(label) {
  const match = String(label).match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
  if (!match) return String(label || '-');
  return `${match[1].slice(2)}/${match[2].padStart(2, '0')}`;
}

function compactStatementPeriodLabel(label) {
  const text = String(label || '-');
  const yearMonth = text.match(/(\d{4})[/-](\d{1,2})/);
  if (yearMonth) return `${yearMonth[1].slice(2)}/${yearMonth[2].padStart(2, '0')}`;
  return text.replace(/\s*\(.+?\)\s*/g, '');
}

function formatAxisMoney(value) {
  const amount = Math.round(Math.abs(value));
  if (amount >= 10000) return `${Math.round(amount / 1000) / 10}萬`;
  if (amount >= 1000) return `${Math.round(amount / 100) / 10}千`;
  return String(amount);
}

function normalizeLabel(value) {
  return String(value || '').replace(/\s+/g, '');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 3000);
}

async function syncSheetData({ silent = false } = {}) {
  try {
    const payload = await loadSheetData();
    statementDatasets = payload.statements;
    detailRecords = payload.details;

    try {
      datasets = buildDatasetsFromRecords(payload.records);
    } catch (recordsError) {
      datasets = createEmptyDatasets(recordsError.message);
    }

    selectedPeriod = 0;
    lastSyncStatus = 'success';
    render();

    if (!silent) toast('已同步 Google Sheet 資料');
  } catch (error) {
    console.error(error);
    datasets = createEmptyDatasets(error.message || '請確認 Apps Script 已部署為 Web App');
    statementDatasets = createEmptyStatementDatasets(error.message || '請確認 Apps Script 已部署為 Web App');
    detailRecords = [];
    lastSyncStatus = 'failed';
    render();

    if (!silent) toast('讀取失敗，請檢查 Apps Script');
  }
}

document.querySelectorAll('.tab').forEach((button) => {
  button.addEventListener('click', () => {
    activeView = button.dataset.view;
    selectedPeriod = 0;
    document.querySelector('.tab.active')?.classList.remove('active');
    button.classList.add('active');
    render();
  });
});

$('#period-select').addEventListener('change', (event) => {
  selectedPeriod = Number(event.target.value);
  render();
});

$('#view-sheet').addEventListener('click', () => window.open(SHEET_VIEW_URL, '_blank', 'noopener'));
$('#statement-view-sheet').addEventListener('click', () => window.open(SHEET_VIEW_URL, '_blank', 'noopener'));
$('#sync-button').addEventListener('click', () => syncSheetData());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

render();
syncSheetData({ silent: true });
