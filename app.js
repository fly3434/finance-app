const SHEET_ID = '18BjQ3NxbQwqcCFEDkkHsZabWPOeYdxe2ZK6vWjQ3KJA';
const SHEET_VIEW_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbnuzJkLIpg2QiLotwUQ_8AkyXRKbiv5f2baUiDPSgb22Ivz7rZraLx27_6w1uoKXZQQ/exec';

const $ = (selector) => document.querySelector(selector);
const money = (value) => `NT$ ${Math.abs(Math.round(value || 0)).toLocaleString('zh-TW')}`;
const signedMoney = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  const prefix = Number(value) < 0 ? '-' : '';
  return `${prefix}${money(value)}`;
};
const investmentMoney = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  if (Number(value) === 0) return money(0);
  return `${Number(value) > 0 ? '+' : '-'} ${money(value)}`;
};

const COLORS = ['#2f6fef', '#19a07f', '#ef8c32', '#d94f70', '#7f62d9', '#2a9db8', '#809f2f', '#c05f33'];
const INVESTMENT_VIEW_KEY = 'quarterlyInvestmentProfitLoss';
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

let activeSection = 'financial-detail';
let activeView = 'income';
let selectedPeriod = 0;
let calendarSelectedPeriod = 0;
let financialDetailSelectedDate = startOfDay(new Date());
let datasets = createEmptyDatasets('正在讀取 Google Sheet');
let statementDatasets = createEmptyStatementDatasets('正在讀取 Google Sheet');
let investmentPerformance = createEmptyInvestmentPerformance('正在讀取 Google Sheet');
let investmentSort = 'profitLoss';
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

function createEmptyInvestmentPerformance(message = '目前沒有可統計的季投資盈虧資料') {
  return {
    sheet: '季_投資盈虧表',
    title: '季投資盈虧',
    periods: [{ key: 'empty', label: '-', rawLabel: '' }],
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
    investmentPerformance: normalizeInvestmentPerformance(data?.statements?.[INVESTMENT_VIEW_KEY]),
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

  const amount = Math.abs(parseAmount(pick(row, ['amount', 'signedAmount', '金額', '金額(NTD)', 'value', '數值'])));
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
    dayKey: String(pick(row, ['dayKey', 'dateKey']) || formatDateKey(transactionDate)).trim(),
    displayDate: String(pick(row, ['displayDate', '日期文字']) || formatDetailDate(transactionDate)).trim(),
    category,
    subcategory,
    amount,
    signedAmount: type === 'expense' ? -amount : amount,
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

function normalizeInvestmentPerformance(statement) {
  if (!statement || !Array.isArray(statement.periods) || !statement.periods.length) {
    return createEmptyInvestmentPerformance();
  }

  const periods = statement.periods
    .map((period, index) => ({
      key: String(period?.key || index),
      label: String(period?.label || period?.rawLabel || '-').trim(),
      rawLabel: String(period?.rawLabel || period?.label || '').trim(),
      opening: parseNullableNumber(period?.opening) ?? 0,
      contribution: parseNullableNumber(period?.contribution) ?? 0,
      redemption: parseNullableNumber(period?.redemption) ?? 0,
      closing: parseNullableNumber(period?.closing) ?? 0,
      profitLoss: parseNullableNumber(period?.profitLoss) ?? 0,
      returnRate: parseNullableNumber(period?.returnRate),
      cumulativeProfitLoss: parseNullableNumber(period?.cumulativeProfitLoss) ?? 0,
      validation: parseNullableNumber(period?.validation) ?? 0,
      items: Array.isArray(period?.items)
        ? period.items.map(normalizeInvestmentItem).filter((item) => item.item)
        : [],
    }))
    .reverse();

  return {
    sheet: String(statement.sheet || '季_投資盈虧表'),
    title: String(statement.title || '季投資盈虧'),
    periods,
    empty: !periods.length,
    emptyMessage: '目前沒有可統計的季投資盈虧資料',
  };
}

function normalizeInvestmentItem(item) {
  return {
    rowNumber: item?.rowNumber,
    category: String(item?.category || '投資').trim(),
    item: String(item?.item || '').trim(),
    note: String(item?.note || '').trim(),
    opening: parseNullableNumber(item?.opening) ?? 0,
    contribution: parseNullableNumber(item?.contribution) ?? 0,
    redemption: parseNullableNumber(item?.redemption) ?? 0,
    closing: parseNullableNumber(item?.closing) ?? 0,
    profitLoss: parseNullableNumber(item?.profitLoss) ?? 0,
    returnRate: parseNullableNumber(item?.returnRate),
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
    return normalizeFullDateObject(value);
  }

  if (typeof value === 'number') {
    const compactDate = parseCompactFullDate(value);
    if (compactDate) return compactDate;
    if (value > 10000) return excelSerialToDate(value);
    return null;
  }

  const text = String(value || '').trim();
  if (!text) return null;

  const compactDate = parseCompactFullDate(text);
  if (compactDate) return compactDate;

  const farFutureDate = text.match(/^(\d{5,})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (farFutureDate) {
    return recoverCompactDateFromFarFutureDate(new Date(Number(farFutureDate[1]), Number(farFutureDate[2]) - 1, Number(farFutureDate[3])));
  }

  const fullDate = text.match(/^(\d{4})[-/.年\s]+(\d{1,2})[-/.月\s]+(\d{1,2})日?$/);
  if (fullDate) {
    return createValidFullDate(Number(fullDate[1]), Number(fullDate[2]), Number(fullDate[3]));
  }

  const yearMonth = text.match(/^(\d{4})[-/.年\s]+(\d{1,2})月?$/);
  if (yearMonth) {
    return createValidFullDate(Number(yearMonth[1]), Number(yearMonth[2]), 1);
  }

  return null;
}

function normalizeFullDateObject(date) {
  const recovered = recoverCompactDateFromFarFutureDate(date);
  if (recovered) return recovered;
  return createValidFullDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function recoverCompactDateFromFarFutureDate(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime()) || date.getFullYear() <= 9999) return null;
  return parseCompactFullDate(dateToExcelSerial(date));
}

function parseCompactFullDate(value) {
  const text = String(Math.trunc(Number(value))).trim();
  const compactDate = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (!compactDate) return null;
  return createValidFullDate(Number(compactDate[1]), Number(compactDate[2]), Number(compactDate[3]));
}

function createValidFullDate(year, month, day) {
  if (year < 2000 || year > 2200 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date;
}

function excelSerialToDate(serial) {
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  return normalizeFullDateObject(new Date(utc));
}

function dateToExcelSerial(date) {
  const utc = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc - Date.UTC(1899, 11, 30)) / 86400000);
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

function sumByType(records, type) {
  return sum(records.filter((record) => record.type === type));
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

function getCalendarPeriods(records) {
  const unique = new Map();
  const currentPeriod = getPeriod(new Date());

  unique.set(currentPeriod.key, currentPeriod);

  records.forEach((record) => {
    if (!record.date || !['income', 'expense'].includes(record.type)) return;
    const period = getPeriod(record.date);
    unique.set(period.key, period);
  });

  const periods = Array.from(unique.values()).sort((a, b) => b.start - a.start);
  return periods.length ? periods : [getPeriod(new Date())];
}

function getCurrentCalendarPeriodIndex(periods) {
  const currentKey = getPeriod(new Date()).key;
  const index = periods.findIndex((period) => period.key === currentKey);
  return index >= 0 ? index : 0;
}

function renderFinancialDetail() {
  $('#financial-detail-view').hidden = false;
  $('#transaction-records-view').hidden = true;

  renderFinancialDetailStatus();

  const records = detailRecords.filter((record) => ['income', 'expense'].includes(record.type));
  const periods = getCalendarPeriods(records);
  const index = Math.max(0, Math.min(calendarSelectedPeriod, periods.length - 1));
  const period = periods[index] || getPeriod(new Date());

  $('#calendar-title').textContent = formatPeriod(period);
  $('#calendar-period-select').innerHTML = periods
    .map((item, periodIndex) => `<option value="${periodIndex}">${escapeHtml(formatPeriod(item))}</option>`)
    .join('');
  $('#calendar-period-select').value = index;

  const selectedDate = resolveFinancialDetailSelectedDate(records, period);
  renderCalendar(records, period, selectedDate);
  renderRangeSummaries(records, period);
  renderDailyDetails(records, selectedDate);
}

function renderFinancialDetailStatus() {
  const status = $('#financial-detail-status');

  if (lastSyncStatus === 'pending') {
    status.hidden = false;
    status.textContent = '正在讀取 Google Sheet';
    status.className = 'sheet-status';
    return;
  }

  if (lastSyncStatus === 'failed') {
    status.hidden = false;
    status.textContent = '讀取 Google Sheet 失敗，請檢查 Apps Script';
    status.className = 'sheet-status error';
    return;
  }

  status.hidden = true;
}

function renderCalendar(records, period, selectedDate) {
  const days = getCalendarDays(period);

  $('#calendar-grid').innerHTML = days
    .map((date) => {
      const inCurrentMonth = date.getMonth() + 1 === period.month;
      const dayRecords = records.filter((record) => sameDay(record.date, date));
      const income = sumByType(dayRecords, 'income');
      const expense = sumByType(dayRecords, 'expense');
      const net = income - expense;
      const tone = net > 0 ? 'positive' : net < 0 ? 'negative' : '';
      const todayClass = sameDay(date, new Date()) ? ' today' : '';
      const selectedClass = sameDay(date, selectedDate) ? ' selected' : '';
      const mutedClass = inCurrentMonth ? '' : ' muted';
      const amount = net ? `<b class="${tone}">${formatNetAmount(net)}</b>` : '';
      const label = `${formatFullDate(date)} ${net ? formatNetAmount(net) : '無收支資料'}`;
      const dateKey = formatDateKey(date);

      return `<button class="calendar-day${mutedClass}${todayClass}${selectedClass}" type="button" data-date="${dateKey}" aria-label="${escapeHtml(label)}">
        <time>${date.getDate()}</time>
        ${amount}
      </button>`;
    })
    .join('');
}

function resolveFinancialDetailSelectedDate(records, period) {
  if (isInPeriod(financialDetailSelectedDate, period)) return financialDetailSelectedDate;

  const today = startOfDay(new Date());
  if (isInPeriod(today, period)) {
    financialDetailSelectedDate = today;
    return financialDetailSelectedDate;
  }

  const firstRecordDate = records
    .filter((record) => isInPeriod(record.date, period))
    .map((record) => startOfDay(record.date))
    .sort((a, b) => a - b)[0];

  financialDetailSelectedDate = firstRecordDate || period.start;
  return financialDetailSelectedDate;
}

function renderDailyDetails(records, selectedDate) {
  const dailyRecords = records
    .filter((record) => sameDay(record.date, selectedDate));
  const income = sumByType(dailyRecords, 'income');
  const expense = sumByType(dailyRecords, 'expense');

  $('#daily-details-title').textContent = `${formatFullDate(selectedDate)} 收入支出明細`;
  $('#daily-details-count').textContent = `${dailyRecords.length.toLocaleString('zh-TW')} 筆｜收入 ${money(income)}｜支出 ${money(expense)}`;

  if (!dailyRecords.length) {
    const emptyText = lastSyncStatus === 'failed'
      ? '讀取失敗，請檢查 Apps Script'
      : '當日沒有從「收支紀錄」取得明細';
    $('#daily-details-list').innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
    return;
  }

  $('#daily-details-list').innerHTML = dailyRecords
    .map((record) => {
      const note = record.note ? `｜${escapeHtml(record.note)}` : '';
      const typeLabel = record.type === 'income' ? '收入' : '支出';
      return `<div class="detail-row daily-detail-row ${record.type}">
        <time>${typeLabel}</time>
        <div class="detail-main">
          <b>${escapeHtml(record.subcategory)}</b>
          <span>${escapeHtml(record.category)}${note}</span>
        </div>
        <strong>${formatRecordAmount(record.amount, record.type)}</strong>
      </div>`;
    })
    .join('');
}

function selectFinancialDetailDate(date) {
  financialDetailSelectedDate = startOfDay(date);

  const records = detailRecords.filter((record) => ['income', 'expense'].includes(record.type));
  const periods = getCalendarPeriods(records);
  const selectedPeriodKey = getPeriod(financialDetailSelectedDate).key;
  const selectedPeriodIndex = periods.findIndex((period) => period.key === selectedPeriodKey);

  if (selectedPeriodIndex >= 0) {
    calendarSelectedPeriod = selectedPeriodIndex;
  }
}

function renderRangeSummaries(records, period) {
  const today = startOfDay(new Date());
  const weekStart = startOfWeek(today);
  const ranges = [
    { label: '本日', start: today, end: addDays(today, 1) },
    { label: '本週', start: weekStart, end: addDays(weekStart, 7) },
    { label: '本月', start: period.start, end: period.end },
    { label: '本年', start: new Date(period.year, 0, 1), end: new Date(period.year + 1, 0, 1) },
  ];

  $('#range-summary-grid').innerHTML = ranges
    .map((range) => {
      const rangeRecords = records.filter((record) => record.date >= range.start && record.date < range.end);
      const income = sumByType(rangeRecords, 'income');
      const expense = sumByType(rangeRecords, 'expense');

      return `<article class="range-summary">
        <p>${escapeHtml(range.label)}</p>
        <div>
          <span>收入</span>
          <b class="positive">${money(income)}</b>
        </div>
        <div>
          <span>支出</span>
          <b class="negative">${money(expense)}</b>
        </div>
      </article>`;
    })
    .join('');
}

function getCalendarDays(period) {
  const firstDay = period.start;
  const start = startOfWeek(firstDay);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date) {
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(startOfDay(date), offset);
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function sameDay(left, right) {
  return left instanceof Date
    && right instanceof Date
    && left.getFullYear() === right.getFullYear()
    && left.getMonth() === right.getMonth()
    && left.getDate() === right.getDate();
}

function formatFullDate(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
}

function formatDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseDateKey(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return createValidFullDate(Number(match[1]), Number(match[2]), Number(match[3]));
}

function formatNetAmount(value) {
  if (!value) return '';
  return `${value > 0 ? '+' : '-'}${money(value)}`;
}

function render() {
  if (activeSection === 'financial-detail') {
    renderFinancialDetail();
    return;
  }

  $('#financial-detail-view').hidden = true;
  $('#transaction-records-view').hidden = false;

  if (activeView === INVESTMENT_VIEW_KEY) {
    renderInvestmentPerformance();
    return;
  }

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
  $('#investment-view').hidden = true;
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
  $('#investment-view').hidden = true;
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

function renderInvestmentPerformance() {
  const data = investmentPerformance || createEmptyInvestmentPerformance();
  const index = Math.max(0, Math.min(selectedPeriod, data.periods.length - 1));
  const period = data.periods[index] || createEmptyInvestmentPerformance().periods[0];
  const items = [...(period.items || [])].sort(compareInvestmentItems);
  const hasOverallBasis = period.opening + period.contribution !== 0;
  const overallNoBasis = !hasOverallBasis && (period.closing !== 0 || period.profitLoss !== 0);

  $('#dashboard-view').hidden = true;
  $('#statement-view').hidden = true;
  $('#investment-view').hidden = false;
  $('#period-label').textContent = '季度';
  $('#period-select').innerHTML = data.periods
    .map((item, periodIndex) => `<option value="${periodIndex}">${escapeHtml(item.label)}</option>`)
    .join('');
  $('#period-select').value = index;

  $('#investment-period').textContent = period.label || '-';
  $('#investment-total').textContent = investmentMoney(period.profitLoss);
  $('#investment-total').className = period.profitLoss > 0 ? 'positive' : period.profitLoss < 0 ? 'negative' : '';
  $('#investment-rate').textContent = formatInvestmentRate(period.returnRate, overallNoBasis);
  $('#investment-rate').className = `investment-rate ${period.profitLoss < 0 ? 'negative-rate' : ''}`;
  $('#investment-closing').textContent = signedMoney(period.closing);

  renderInvestmentNotices(period);
  renderInvestmentMetrics(period);
  renderInvestmentEquation(period);
  renderInvestmentContributions(period.items || []);
  renderInvestmentItems(items, data.emptyMessage);
}

function renderInvestmentNotices(period) {
  const messages = [];
  if (Math.abs(period.validation || 0) > 0.5) {
    messages.push(`資料檢核差額為 ${investmentMoney(period.validation)}，請回到試算表確認本季數字。`);
  }

  const noBasisCount = (period.items || []).filter(hasNoInvestmentBasis).length;
  if (noBasisCount) {
    messages.push(`${noBasisCount} 個項目缺少期初或投入基準，個別報酬率改顯示為「無比較基準」。`);
  }

  const element = $('#investment-notice');
  element.hidden = !messages.length;
  element.innerHTML = messages.map((message) => `<p>${escapeHtml(message)}</p>`).join('');
  element.classList.toggle('warning', Math.abs(period.validation || 0) > 0.5);
}

function renderInvestmentMetrics(period) {
  const metrics = [
    ['上季結算', period.opening],
    ['本季投入', period.contribution],
    ['本季贖回', period.redemption],
    ['累計損益', period.cumulativeProfitLoss],
  ];

  $('#investment-metrics').innerHTML = metrics
    .map(([label, value]) => `<article class="investment-metric">
      <p>${escapeHtml(label)}</p>
      <b class="${label === '累計損益' ? investmentTone(value) : ''}">${label === '累計損益' ? investmentMoney(value) : signedMoney(value)}</b>
    </article>`)
    .join('');
}

function renderInvestmentEquation(period) {
  const rows = [
    ['期初資產', period.opening, ''],
    ['本季投入', period.contribution, '+'],
    ['本季贖回', period.redemption, '−'],
    ['投資損益', period.profitLoss, period.profitLoss < 0 ? '−' : '+'],
  ];

  $('#investment-equation').innerHTML = rows
    .map(([label, value, operator]) => `<div class="investment-equation-row">
      <span class="investment-equation-operator">${operator}</span>
      <span>${escapeHtml(label)}</span>
      <b class="${label === '投資損益' ? investmentTone(value) : ''}">${money(value)}</b>
    </div>`)
    .join('') + `<div class="investment-equation-row total-row">
      <span class="investment-equation-operator">=</span>
      <span>期末資產</span>
      <b>${signedMoney(period.closing)}</b>
    </div>`;
}

function renderInvestmentContributions(items) {
  const ordered = [...items].sort((left, right) => Math.abs(right.profitLoss) - Math.abs(left.profitLoss));
  const max = Math.max(...ordered.map((item) => Math.abs(item.profitLoss)), 1);

  $('#investment-contributions').innerHTML = ordered.length
    ? ordered.map((item) => {
        const width = item.profitLoss === 0 ? 0 : Math.max(2, (Math.abs(item.profitLoss) / max) * 50);
        const tone = item.profitLoss < 0 ? 'loss' : 'gain';
        return `<div class="investment-contribution-row">
          <span title="${escapeHtml(item.item)}">${escapeHtml(item.item)}</span>
          <div class="investment-bar-track" aria-hidden="true">
            ${width ? `<i class="${tone}" style="width:${width}%"></i>` : ''}
          </div>
          <b class="${investmentTone(item.profitLoss)}">${investmentMoney(item.profitLoss)}</b>
        </div>`;
      }).join('')
    : '<div class="empty-state">所選季度沒有投資項目</div>';
}

function renderInvestmentItems(items, emptyMessage) {
  $('#investment-item-count').textContent = `${items.length} 項`;
  $('#investment-items').innerHTML = items.length
    ? items.map((item) => {
        const noBasis = hasNoInvestmentBasis(item);
        return `<article class="investment-item-card">
          <div class="investment-item-head">
            <div>
              <p>${escapeHtml(item.category)}</p>
              <h3>${escapeHtml(item.item)}</h3>
              <span>${escapeHtml(item.note || '未提供備註')}</span>
            </div>
            ${noBasis ? '<em>無比較基準</em>' : ''}
          </div>
          <div class="investment-item-result">
            <div>
              <span>本季損益</span>
              <strong class="${investmentTone(item.profitLoss)}">${investmentMoney(item.profitLoss)}</strong>
            </div>
            <div>
              <span>報酬率</span>
              <strong class="${investmentTone(item.profitLoss)}">${formatInvestmentRate(item.returnRate, noBasis)}</strong>
            </div>
          </div>
          <div class="investment-item-values">
            <span>期初<b>${signedMoney(item.opening)}</b></span>
            <span>投入<b>${signedMoney(item.contribution)}</b></span>
            <span>贖回<b>${signedMoney(item.redemption)}</b></span>
            <span>期末<b>${signedMoney(item.closing)}</b></span>
          </div>
        </article>`;
      }).join('')
    : `<div class="empty-state">${escapeHtml(emptyMessage || '所選季度沒有投資資料')}</div>`;
}

function compareInvestmentItems(left, right) {
  if (investmentSort === 'returnRate') {
    const leftRate = hasNoInvestmentBasis(left) || left.returnRate === null ? -Infinity : left.returnRate;
    const rightRate = hasNoInvestmentBasis(right) || right.returnRate === null ? -Infinity : right.returnRate;
    return rightRate - leftRate || right.profitLoss - left.profitLoss;
  }

  if (investmentSort === 'closing') return right.closing - left.closing || right.profitLoss - left.profitLoss;
  return right.profitLoss - left.profitLoss;
}

function hasNoInvestmentBasis(item) {
  return item.opening + item.contribution === 0 && (item.closing !== 0 || item.profitLoss !== 0);
}

function formatInvestmentRate(value, noBasis = false) {
  if (noBasis) return '無比較基準';
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  return `${Number(value) > 0 ? '+' : ''}${(Number(value) * 100).toFixed(2)}%`;
}

function investmentTone(value) {
  return Number(value) > 0 ? 'positive' : Number(value) < 0 ? 'negative' : '';
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
  lastSyncStatus = 'pending';
  render();

  try {
    const payload = await loadSheetData();
    statementDatasets = payload.statements;
    investmentPerformance = payload.investmentPerformance;
    detailRecords = payload.details;

    try {
      datasets = buildDatasetsFromRecords(payload.records);
    } catch (recordsError) {
      datasets = createEmptyDatasets(recordsError.message);
    }

    selectedPeriod = 0;
    calendarSelectedPeriod = getCurrentCalendarPeriodIndex(getCalendarPeriods(detailRecords));
    lastSyncStatus = 'success';
    render();

    if (!silent) toast('已同步 Google Sheet 資料');
  } catch (error) {
    console.error(error);
    datasets = createEmptyDatasets(error.message || '請確認 Apps Script 已部署為 Web App');
    statementDatasets = createEmptyStatementDatasets(error.message || '請確認 Apps Script 已部署為 Web App');
    investmentPerformance = createEmptyInvestmentPerformance(error.message || '請確認 Apps Script 已部署為 Web App');
    detailRecords = [];
    lastSyncStatus = 'failed';
    render();

    if (!silent) toast('讀取失敗，請檢查 Apps Script');
  }
}

document.querySelectorAll('.section-tab').forEach((button) => {
  button.addEventListener('click', () => {
    activeSection = button.dataset.section;
    document.querySelector('.section-tab.active')?.classList.remove('active');
    button.classList.add('active');
    render();
  });
});

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

$('#investment-sort').addEventListener('change', (event) => {
  investmentSort = event.target.value;
  if (activeView === INVESTMENT_VIEW_KEY) render();
});

$('#calendar-period-select').addEventListener('change', (event) => {
  calendarSelectedPeriod = Number(event.target.value);
  render();
});

$('#calendar-grid').addEventListener('click', (event) => {
  const dayButton = event.target.closest('.calendar-day');
  if (!dayButton) return;

  const selectedDate = parseDateKey(dayButton.dataset.date);
  if (!selectedDate) return;

  selectFinancialDetailDate(selectedDate);
  render();
});

$('#view-sheet').addEventListener('click', () => window.open(SHEET_VIEW_URL, '_blank', 'noopener'));
$('#statement-view-sheet').addEventListener('click', () => window.open(SHEET_VIEW_URL, '_blank', 'noopener'));
$('#investment-view-sheet').addEventListener('click', () => window.open(SHEET_VIEW_URL, '_blank', 'noopener'));
$('#sync-button').addEventListener('click', () => syncSheetData());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

render();
syncSheetData({ silent: true });
