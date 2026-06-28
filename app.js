const SHEET_ID = '1RFvIsDwqX3Ot1a7WSet3dxpHLsAO0hySz3tRiC0Wzl0';
const SHEET_VIEW_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxTjdvqlk33M9HxObJ_Q6BXyMBdxhlLDM15GK9KpMJjocrtvwVLjeQMa5qodyvJ-QHPew/exec';

const $ = (selector) => document.querySelector(selector);
const money = (value) => `NT$ ${Math.abs(Math.round(value || 0)).toLocaleString('zh-TW')}`;

const COLORS = ['#2f6fef', '#19a07f', '#ef8c32', '#d94f70', '#7f62d9', '#2a9db8', '#809f2f', '#c05f33'];
const VIEW_CONFIG = {
  income: {
    tab: '收入',
    label: '本月收入',
    title: '收入結構',
    recordLabel: '筆收入',
    empty: '目前沒有可統計的收入資料',
    higherIsGood: true,
  },
  expense: {
    tab: '開銷',
    label: '本月開銷',
    title: '開銷結構',
    recordLabel: '筆開銷',
    empty: '目前沒有可統計的開銷資料',
    higherIsGood: false,
  },
};

let activeView = 'income';
let selectedPeriod = 0;
let datasets = createEmptyDatasets('正在讀取 Google Sheet');
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
      ['資料筆數', 0, 'count', 'neutral'],
      ['月均金額', 0, 'money', 'neutral'],
    ],
    itemsByPeriod: [[]],
    recordsByPeriod: [[]],
    empty: true,
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
  return normalizeSheetResponse(data);
}

function normalizeSheetResponse(data) {
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

function normalizeRecord(row, fallbackSheet = '') {
  if (!row || typeof row !== 'object') return null;

  const sheet = String(pick(row, ['sheet', 'sheetName', '工作表']) || fallbackSheet || '').trim();
  const rawType = String(pick(row, ['type', '收支類型', '類型']) || sheet).trim();
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
    amount: Math.abs(amount),
    note: String(pick(row, ['note', '備註']) || '').trim(),
    source: String(pick(row, ['source', '來源']) || sheet).trim(),
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
  return '';
}

function parseAmount(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const normalized = String(value || '')
    .replace(/[,\s$NTnt元]/g, '')
    .replace(/[()（）]/g, '-');
  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : 0;
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

function excelSerialToDate(serial) {
  const utc = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
  return new Date(utc);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function buildDatasetsFromRecords(records) {
  const usableRecords = records.filter((record) => record.date && record.amount > 0);

  if (!usableRecords.length) {
    throw new Error('JSON 中沒有可統計的收入或開銷明細');
  }

  return {
    income: buildDataset('income', usableRecords.filter((record) => record.type === 'income')),
    expense: buildDataset('expense', usableRecords.filter((record) => record.type === 'expense')),
  };
}

function buildDataset(type, records) {
  const config = VIEW_CONFIG[type];
  const periods = getRecentPeriods(records, 12);

  if (!records.length) {
    return createEmptyDataset(type, config.empty);
  }

  const totalsByPeriod = periods.map((period) => sum(records.filter((record) => isInPeriod(record.date, period))));
  const rowsByPeriod = periods.map((period) => records.filter((record) => isInPeriod(record.date, period)));
  const currentRows = rowsByPeriod[0];
  const previousRows = rowsByPeriod[1] || [];
  const total = sum(currentRows);
  const previousTotal = sum(previousRows);
  const change = calculateChange(total, previousTotal);
  const average = totalsByPeriod.length ? sum(totalsByPeriod) / totalsByPeriod.length : 0;
  const tone = config.higherIsGood ? changeTone(change) : changeTone(-change);
  const changesByPeriod = totalsByPeriod.map((periodTotal, index) => calculateChange(periodTotal, totalsByPeriod[index + 1] || 0));
  const compareByPeriod = totalsByPeriod.map((periodTotal, index) => formatCompare(periodTotal, totalsByPeriod[index + 1] || 0));
  const trendTonesByPeriod = changesByPeriod.map((periodChange) => (config.higherIsGood ? changeTone(periodChange) : changeTone(-periodChange)));
  const metricsByPeriod = rowsByPeriod.map((periodRows) => [
    ['資料筆數', periodRows.length, 'count', 'neutral'],
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
  if (!previous) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
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
  const grouped = records.reduce((map, record) => {
    map.set(record.category, (map.get(record.category) || 0) + record.amount);
    return map;
  }, new Map());

  return Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
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

  return Array.from(grouped.values()).sort((a, b) => b.amount - a.amount).slice(0, 6);
}

function getSelectedDataset() {
  const data = datasets[activeView] || createEmptyDataset(activeView);
  const safeIndex = Math.min(selectedPeriod, data.periods.length - 1);

  return {
    data,
    index: Math.max(safeIndex, 0),
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
  const config = VIEW_CONFIG[activeView];
  const { data, index, periodItems, periodRecords, periodTotal, periodMetrics, periodChange, periodCompare, periodTrendTone } = getSelectedDataset();

  $('#period-select').innerHTML = data.periods
    .map((period, periodIndex) => `<option value="${periodIndex}">${period}</option>`)
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
      return `<article class="insight"><p>${name}</p><b>${display}</b>${tone !== 'neutral' ? `<i class="${tone}">${tone === 'positive' ? '上升' : '下降'}</i>` : ''}</article>`;
    })
    .join('');

  renderDonut(periodItems, periodTotal);
  renderRecords(periodRecords, config);
  renderMiniChart(data, index);
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
    .map((item) => `<li><i class="dot" style="background:${item[2]}"></i><span>${item[0]}</span><b>${Math.round((Math.abs(item[1]) / sumItems) * 100)}%</b></li>`)
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
      return `<div class="record"><div class="record-icon" style="background:${color}19;color:${color}">${index + 1}</div><div class="record-main"><b>${record.subcategory}</b><span>${record.category}${record.note ? `｜${record.note}` : ''}</span></div><strong>${activeView === 'expense' ? '- ' : ''}${money(record.amount)}</strong></div>`;
    })
    .join('');
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
        ${rows.map((row) => `<span>${row.label}</span>`).join('')}
      </div>
    </div>
  `;
}

function compactPeriodLabel(label) {
  const match = String(label).match(/(\d{4})\s*年\s*(\d{1,2})\s*月/);
  if (!match) return String(label || '-');
  return `${match[1].slice(2)}/${match[2].padStart(2, '0')}`;
}

function formatAxisMoney(value) {
  const amount = Math.round(Math.abs(value));
  if (amount >= 10000) return `${Math.round(amount / 1000) / 10}萬`;
  if (amount >= 1000) return `${Math.round(amount / 100) / 10}千`;
  return String(amount);
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 3000);
}

async function syncSheetData({ silent = false } = {}) {
  try {
    const records = await loadSheetData();
    datasets = buildDatasetsFromRecords(records);
    selectedPeriod = 0;
    lastSyncStatus = 'success';
    render();

    if (!silent) toast('已同步 Google Sheet 資料');
  } catch (error) {
    console.error(error);
    datasets = createEmptyDatasets(error.message || '請確認 Apps Script 已部署為 Web App');
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
$('#sync-button').addEventListener('click', () => syncSheetData());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  });
}

render();
syncSheetData({ silent: true });
