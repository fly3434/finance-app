const SHEET_ID = '1RFvIsDwqX3Ot1a7WSet3dxpHLsAO0hySz3tRiC0Wzl0';
const SHEET_VIEW_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzU7k2hQe1UlIM1g66XAo1ZUTqHqYx3RP_5Ljy1iZB2Ri-d8tFNlyGZNB-2Opq0iQSyWA/exec';

const $ = (selector) => document.querySelector(selector);
const money = (number) => `$ ${Math.abs(Math.round(number || 0)).toLocaleString('zh-TW')}`;

const colors = ['#6581ec', '#a07ae2', '#f3b64b', '#50c6a4', '#ed7378', '#4fb6d8', '#9ac66e'];
const icons = ['◉', '◈', '✦', '＋', '⌂', '↝', '▢'];

const fallbackDatasets = {
  收入:{label:'本月收入',title:'收入來源',periods:['2026 年 6 月','2026 年 5 月','2026 年 4 月','2026 年 3 月'],total:86200,change:12.8,compare:'比上月增加 $9,800',metrics:[['固定收入',74200,'positive'],['額外收入',12000,'positive']],items:[['薪資',37000,'#6581ec','💼'],['投資配息',22800,'#a07ae2','◈'],['接案收入',15400,'#f3b64b','✦'],['其他',11000,'#50c6a4','＋']]},
  開銷:{label:'本月開銷',title:'開銷分類',periods:['2026 年 6 月','2026 年 5 月','2026 年 4 月','2026 年 3 月'],total:41680,change:-6.4,compare:'比上月減少 $2,850',metrics:[['必要支出',28600,'negative'],['彈性支出',13080,'negative']],items:[['居住',15800,'#ed7378','⌂'],['餐飲',7920,'#f3b64b','◉'],['交通',5650,'#6581ec','↝'],['購物',4310,'#a07ae2','▢'],['其他',2000,'#50c6a4','＋']]},
  貸款:{label:'目前貸款餘額',title:'貸款結構',periods:['2026 年 6 月','2026 年 5 月','2026 年 4 月'],total:1285000,change:-1.2,compare:'較上月償還 $15,000',metrics:[['本月償還',15000,'positive'],['平均利率',2.18,'neutral']],items:[['房屋貸款',1134000,'#6581ec','⌂'],['信用貸款',96000,'#a07ae2','◈'],['車貸',55000,'#f3b64b','↝']]},
  資產:{label:'淨資產',title:'資產配置',periods:['2026 年 6 月','2026 年 5 月','2026 年 4 月'],total:2368400,change:3.7,compare:'比上月增加 $84,800',metrics:[['流動資產',784000,'positive'],['投資資產',1584400,'positive']],items:[['股票與 ETF',1132000,'#6581ec','◈'],['現金存款',784000,'#50c6a4','◉'],['基金',296400,'#a07ae2','✦'],['其他',156000,'#f3b64b','＋']]},
  月報:{label:'本月結餘',title:'月度現金分配',periods:['2026 年 6 月','2026 年 5 月','2026 年 4 月','2026 年 3 月'],total:44520,change:37.2,compare:'收入 $86,200 · 開銷 $41,680',metrics:[['儲蓄率',52,'positive'],['可投資金額',23520,'positive']],items:[['結餘',44520,'#50c6a4','＋'],['生活開銷',28600,'#f3b64b','◉'],['投資',9000,'#6581ec','◈'],['娛樂',4080,'#a07ae2','✦']]},
  季報:{label:'本季結餘',title:'季度收支',periods:['2026 年 Q2','2026 年 Q1','2025 年 Q4'],total:118360,change:18.1,compare:'本季收入 $254,900 · 開銷 $136,540',metrics:[['季收入',254900,'positive'],['季開銷',136540,'negative']],items:[['4 月結餘',32200,'#6581ec','4'],['5 月結餘',41640,'#a07ae2','5'],['6 月結餘',44520,'#50c6a4','6']]},
  季_現金流量表:{label:'本季淨現金流',title:'季度現金流向',periods:['2026 年 Q2','2026 年 Q1','2025 年 Q4'],total:76360,change:9.6,compare:'營運現金流維持正向',metrics:[['營運活動',118360,'positive'],['投資活動',-42000,'negative']],items:[['營運活動',118360,'#50c6a4','↗'],['投資活動',42000,'#6581ec','◈'],['融資活動',0,'#a07ae2','◌']]},
  年報:{label:'年度結餘',title:'年度配置',periods:['2026 年','2025 年','2024 年'],total:286940,change:22.4,compare:'年度目標完成 62%',metrics:[['年度收入',685400,'positive'],['年度開銷',398460,'negative']],items:[['生活支出',274240,'#f3b64b','◉'],['投資',124220,'#6581ec','◈'],['年度結餘',286940,'#50c6a4','＋']]},
  年_現金流量表:{label:'年度淨現金流',title:'年度現金流向',periods:['2026 年','2025 年','2024 年'],total:194520,change:16.5,compare:'截至本月的年度累積',metrics:[['營運現金流',286940,'positive'],['投資現金流',-92420,'negative']],items:[['營運活動',286940,'#50c6a4','↗'],['投資活動',92420,'#6581ec','◈'],['融資活動',0,'#a07ae2','◌']]}
};

const cloneDatasets = (data) => JSON.parse(JSON.stringify(data));

let datasets = cloneDatasets(fallbackDatasets);
let active = '收入';
let selectedPeriod = 0;

async function loadSheetData() {
  const response = await fetch(`${APPS_SCRIPT_URL}?t=${Date.now()}`, { cache: 'no-store' });

  if (!response.ok) {
    throw new Error(`Apps Script 回應失敗：${response.status}`);
  }

  const data = await response.json();
  return normalizeSheetResponse(data);
}

function normalizeSheetResponse(data) {
  if (Array.isArray(data)) {
    return data.map((row) => normalizeRow(row));
  }

  if (Array.isArray(data?.rows)) {
    return data.rows.map((row) => normalizeRow(row, data.sheet));
  }

  if (data?.sheets && typeof data.sheets === 'object') {
    return Object.entries(data.sheets).flatMap(([sheetName, rows]) => {
      if (!Array.isArray(rows)) return [];
      return rows.map((row) => normalizeRow(row, sheetName));
    });
  }

  return [];
}

function normalizeRow(row, sheetName = '') {
  const dateValue = pick(row, ['日期', 'date', 'Date', '交易日期', '月份', '年月']);
  const amountValue = pick(row, ['金額', 'amount', 'Amount', '數字', '小計', '總額']);
  const rawType = pick(row, ['類型', '收支類型', '項目類型', 'type', 'Type']) || sheetName;
  const category = pick(row, ['分類', '類別', 'category', 'Category']) || pick(row, ['項目', '名稱', 'name', 'Name']) || '未分類';

  return {
    date: parseDate(dateValue),
    type: normalizeType(rawType, sheetName),
    category: String(category || '未分類').trim(),
    item: String(pick(row, ['項目', '名稱', 'name', 'Name', '備註']) || category || '未命名').trim(),
    amount: parseAmount(amountValue),
    account: String(pick(row, ['帳戶', 'account', 'Account']) || '').trim(),
    source: sheetName,
    raw: row,
  };
}

function pick(row, keys) {
  for (const key of keys) {
    if (row?.[key] !== undefined && row[key] !== null && row[key] !== '') return row[key];
  }

  return '';
}

function normalizeType(value, sheetName = '') {
  const text = `${value || ''} ${sheetName || ''}`.trim();

  if (/收入|入帳|薪資|income/i.test(text)) return '收入';
  if (/開銷|支出|花費|消費|expense|cost/i.test(text)) return '開銷';
  if (/貸款|借款|房貸|車貸|loan/i.test(text)) return '貸款';
  if (/資產|存款|股票|基金|ETF|asset/i.test(text)) return '資產';

  return String(value || sheetName || '其他').trim();
}

function parseAmount(value) {
  if (typeof value === 'number') return value;

  const normalized = String(value || '')
    .replace(/[,$，＄$\s]/g, '')
    .replace(/[()（）]/g, '-');

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const text = String(value || '').trim();
  if (!text) return new Date();

  const normalized = text
    .replace(/[./]/g, '-')
    .replace(/年|月/g, '-')
    .replace(/日/g, '');
  const parsed = new Date(normalized);

  if (!Number.isNaN(parsed.getTime())) return parsed;

  const yearMonth = text.match(/(\d{4}).*?(\d{1,2})/);
  if (yearMonth) return new Date(Number(yearMonth[1]), Number(yearMonth[2]) - 1, 1);

  return new Date();
}

function buildDatasetsFromRows(rows) {
  const validRows = rows.filter((row) => row.amount !== 0);

  if (!validRows.length) {
    throw new Error('Apps Script 沒有回傳可統計的資料');
  }

  const income = validRows.filter((row) => row.type === '收入');
  const expenses = validRows.filter((row) => row.type === '開銷');
  const loans = validRows.filter((row) => row.type === '貸款');
  const assets = validRows.filter((row) => row.type === '資產');

  const months = getRecentPeriods(validRows, 'month', 6);
  const quarters = getRecentPeriods(validRows, 'quarter', 4);
  const years = getRecentPeriods(validRows, 'year', 4);

  return {
    收入: buildTypeDataset({
      rows: income,
      periods: months,
      label: '本月收入',
      title: '收入來源',
      metricNames: ['收入筆數', '平均收入'],
      emptyFallback: fallbackDatasets.收入,
    }),
    開銷: buildTypeDataset({
      rows: expenses,
      periods: months,
      label: '本月開銷',
      title: '開銷分類',
      metricNames: ['開銷筆數', '平均開銷'],
      emptyFallback: fallbackDatasets.開銷,
      negativeTrendIsGood: true,
    }),
    貸款: buildTypeDataset({
      rows: loans,
      periods: months,
      label: '目前貸款餘額',
      title: '貸款結構',
      metricNames: ['貸款筆數', '平均金額'],
      emptyFallback: fallbackDatasets.貸款,
      negativeTrendIsGood: true,
    }),
    資產: buildTypeDataset({
      rows: assets,
      periods: months,
      label: '淨資產',
      title: '資產配置',
      metricNames: ['資產項目', '平均金額'],
      emptyFallback: fallbackDatasets.資產,
    }),
    月報: buildReportDataset({
      rows: validRows,
      periods: months,
      label: '本月結餘',
      title: '月度現金分配',
      periodType: 'month',
    }),
    季報: buildReportDataset({
      rows: validRows,
      periods: quarters,
      label: '本季結餘',
      title: '季度收支',
      periodType: 'quarter',
    }),
    季_現金流量表: buildCashFlowDataset({
      rows: validRows,
      periods: quarters,
      label: '本季淨現金流',
      title: '季度現金流向',
      periodType: 'quarter',
    }),
    年報: buildReportDataset({
      rows: validRows,
      periods: years,
      label: '年度結餘',
      title: '年度配置',
      periodType: 'year',
    }),
    年_現金流量表: buildCashFlowDataset({
      rows: validRows,
      periods: years,
      label: '年度淨現金流',
      title: '年度現金流向',
      periodType: 'year',
    }),
  };
}

function buildTypeDataset({ rows, periods, label, title, metricNames, emptyFallback, negativeTrendIsGood = false }) {
  if (!rows.length) return emptyFallback;

  const currentPeriod = periods[0];
  const previousPeriod = periods[1];
  const currentRows = rows.filter((row) => isInPeriod(row.date, currentPeriod));
  const previousRows = previousPeriod ? rows.filter((row) => isInPeriod(row.date, previousPeriod)) : [];
  const total = sumRows(currentRows);
  const previousTotal = sumRows(previousRows);
  const change = calculateChange(total, previousTotal);
  const itemRows = currentRows.length ? currentRows : rows;
  const average = itemRows.length ? total / itemRows.length : 0;

  return {
    label,
    title,
    periods: periods.map(formatPeriodLabel),
    periodKeys: periods.map((period) => period.key),
    totalsByPeriod: periods.map((period) => sumRows(rows.filter((row) => isInPeriod(row.date, period)))),
    total,
    change,
    compare: previousPeriod ? `比前一期${total >= previousTotal ? '增加' : '減少'} ${money(total - previousTotal)}` : '已同步 Google Sheet',
    metrics: [
      [metricNames[0], itemRows.length, 'neutral'],
      [metricNames[1], average, negativeTrendIsGood ? 'negative' : 'positive'],
    ],
    items: categoryItems(itemRows),
    itemsByPeriod: periods.map((period) => categoryItems(rows.filter((row) => isInPeriod(row.date, period)))),
    dynamic: true,
  };
}

function buildReportDataset({ rows, periods, label, title, periodType }) {
  const currentPeriod = periods[0];
  const previousPeriod = periods[1];
  const currentRows = rows.filter((row) => isInPeriod(row.date, currentPeriod));
  const previousRows = previousPeriod ? rows.filter((row) => isInPeriod(row.date, previousPeriod)) : [];
  const income = sumRows(currentRows.filter((row) => row.type === '收入'));
  const expenses = sumRows(currentRows.filter((row) => row.type === '開銷'));
  const loans = sumRows(currentRows.filter((row) => row.type === '貸款'));
  const assets = sumRows(currentRows.filter((row) => row.type === '資產'));
  const total = income - expenses - loans;
  const previousTotal = sumRows(previousRows.filter((row) => row.type === '收入')) - sumRows(previousRows.filter((row) => row.type === '開銷')) - sumRows(previousRows.filter((row) => row.type === '貸款'));
  const savingRate = income ? Math.round((total / income) * 100) : 0;

  return {
    label,
    title,
    periods: periods.map(formatPeriodLabel),
    periodKeys: periods.map((period) => period.key),
    totalsByPeriod: periods.map((period) => {
      const periodRows = rows.filter((row) => isInPeriod(row.date, period));
      return sumRows(periodRows.filter((row) => row.type === '收入')) - sumRows(periodRows.filter((row) => row.type === '開銷')) - sumRows(periodRows.filter((row) => row.type === '貸款'));
    }),
    total,
    change: calculateChange(total, previousTotal),
    compare: `${periodType === 'month' ? '本月' : periodType === 'quarter' ? '本期' : '年度'}收入 ${money(income)} · 開銷 ${money(expenses)}`,
    metrics: [
      ['儲蓄率', savingRate, savingRate >= 0 ? 'positive' : 'negative'],
      ['可投資金額', Math.max(total, 0), total >= 0 ? 'positive' : 'negative'],
    ],
    items: reportItems(currentRows),
    itemsByPeriod: periods.map((period) => reportItems(rows.filter((row) => isInPeriod(row.date, period)))),
    dynamic: true,
  };
}

function reportItems(rows) {
  const income = sumRows(rows.filter((row) => row.type === '收入'));
  const expenses = sumRows(rows.filter((row) => row.type === '開銷'));
  const loans = sumRows(rows.filter((row) => row.type === '貸款'));
  const assets = sumRows(rows.filter((row) => row.type === '資產'));
  const total = income - expenses - loans;

  return [
    ['收入', income, '#50c6a4', '↗'],
    ['開銷', expenses, '#ed7378', '↘'],
    ['貸款', loans, '#f3b64b', '⌂'],
    ['資產', assets, '#6581ec', '◈'],
    ['結餘', Math.abs(total), total >= 0 ? '#50c6a4' : '#ed7378', '＋'],
  ].filter((item) => item[1] !== 0);
}

function buildCashFlowDataset({ rows, periods, label, title, periodType }) {
  const currentPeriod = periods[0];
  const previousPeriod = periods[1];
  const currentRows = rows.filter((row) => isInPeriod(row.date, currentPeriod));
  const previousRows = previousPeriod ? rows.filter((row) => isInPeriod(row.date, previousPeriod)) : [];
  const operating = sumRows(currentRows.filter((row) => ['收入', '開銷'].includes(row.type) && row.type === '收入')) - sumRows(currentRows.filter((row) => row.type === '開銷'));
  const investing = sumRows(currentRows.filter((row) => row.type === '資產'));
  const financing = sumRows(currentRows.filter((row) => row.type === '貸款'));
  const total = operating - investing - financing;
  const previousOperating = sumRows(previousRows.filter((row) => row.type === '收入')) - sumRows(previousRows.filter((row) => row.type === '開銷'));
  const previousInvesting = sumRows(previousRows.filter((row) => row.type === '資產'));
  const previousFinancing = sumRows(previousRows.filter((row) => row.type === '貸款'));
  const previousTotal = previousOperating - previousInvesting - previousFinancing;

  return {
    label,
    title,
    periods: periods.map(formatPeriodLabel),
    periodKeys: periods.map((period) => period.key),
    totalsByPeriod: periods.map((period) => {
      const periodRows = rows.filter((row) => isInPeriod(row.date, period));
      const periodOperating = sumRows(periodRows.filter((row) => row.type === '收入')) - sumRows(periodRows.filter((row) => row.type === '開銷'));
      const periodInvesting = sumRows(periodRows.filter((row) => row.type === '資產'));
      const periodFinancing = sumRows(periodRows.filter((row) => row.type === '貸款'));
      return periodOperating - periodInvesting - periodFinancing;
    }),
    total,
    change: calculateChange(total, previousTotal),
    compare: `${periodType === 'quarter' ? '本季' : '年度'}現金流已同步`,
    metrics: [
      ['營運活動', operating, operating >= 0 ? 'positive' : 'negative'],
      ['投資活動', -investing, investing ? 'negative' : 'neutral'],
    ],
    items: cashFlowItems(currentRows),
    itemsByPeriod: periods.map((period) => cashFlowItems(rows.filter((row) => isInPeriod(row.date, period)))),
    dynamic: true,
  };
}

function cashFlowItems(rows) {
  const operating = sumRows(rows.filter((row) => row.type === '收入')) - sumRows(rows.filter((row) => row.type === '開銷'));
  const investing = sumRows(rows.filter((row) => row.type === '資產'));
  const financing = sumRows(rows.filter((row) => row.type === '貸款'));

  return [
    ['營運活動', Math.abs(operating), '#50c6a4', '↗'],
    ['投資活動', Math.abs(investing), '#6581ec', '◈'],
    ['融資活動', Math.abs(financing), '#a07ae2', '◌'],
  ].filter((item) => item[1] !== 0);
}

function getRecentPeriods(rows, type, limit) {
  const periods = rows.map((row) => getPeriod(row.date, type));
  const unique = Array.from(new Map(periods.map((period) => [period.key, period])).values());
  unique.sort((a, b) => b.start - a.start);

  if (unique.length) return unique.slice(0, limit);

  const now = new Date();
  return [getPeriod(now, type)];
}

function getPeriod(date, type) {
  const year = date.getFullYear();
  const month = date.getMonth();

  if (type === 'year') {
    return { type, key: `${year}`, year, start: new Date(year, 0, 1), end: new Date(year + 1, 0, 1) };
  }

  if (type === 'quarter') {
    const quarter = Math.floor(month / 3) + 1;
    const startMonth = (quarter - 1) * 3;

    return {
      type,
      key: `${year}-Q${quarter}`,
      year,
      quarter,
      start: new Date(year, startMonth, 1),
      end: new Date(year, startMonth + 3, 1),
    };
  }

  return {
    type,
    key: `${year}-${String(month + 1).padStart(2, '0')}`,
    year,
    month: month + 1,
    start: new Date(year, month, 1),
    end: new Date(year, month + 1, 1),
  };
}

function formatPeriodLabel(period) {
  if (period.type === 'year') return `${period.year} 年`;
  if (period.type === 'quarter') return `${period.year} 年 Q${period.quarter}`;
  return `${period.year} 年 ${period.month} 月`;
}

function isInPeriod(date, period) {
  return date >= period.start && date < period.end;
}

function sumRows(rows) {
  return rows.reduce((sum, row) => sum + Math.abs(row.amount), 0);
}

function calculateChange(current, previous) {
  if (!previous) return 0;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function categoryItems(rows) {
  const grouped = rows.reduce((map, row) => {
    map.set(row.category, (map.get(row.category) || 0) + Math.abs(row.amount));
    return map;
  }, new Map());

  return Array.from(grouped.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount], index) => [name, amount, colors[index % colors.length], icons[index % icons.length]]);
}

function getPeriodAwareData(data) {
  if (!data.periodKeys?.[selectedPeriod] || !data.dynamic) return data;

  const periodTotal = data.totalsByPeriod?.[selectedPeriod] ?? data.total;

  return {
    ...data,
    total: periodTotal,
  };
}

function render() {
  const rawData = datasets[active] || fallbackDatasets[active];
  const data = getPeriodAwareData(rawData);
  const total = data.total;
  const periodItems = data.itemsByPeriod?.[selectedPeriod]?.length
    ? data.itemsByPeriod[selectedPeriod]
    : data.items?.length
      ? data.items
      : fallbackDatasets[active].items;

  $('#period-select').innerHTML = data.periods.map((period, index) => `<option value="${index}">${period}</option>`).join('');
  $('#period-select').value = Math.min(selectedPeriod, data.periods.length - 1);
  $('#summary-label').textContent = data.label;
  $('#total').textContent = money(total);
  $('#trend').textContent = `${data.change >= 0 ? '↑' : '↓'} ${Math.abs(data.change)}%`;
  $('#trend').className = `trend ${data.change >= 0 ? '' : 'down'}`;
  $('#comparison').textContent = data.compare;
  $('#chart-title').textContent = data.title;
  $('#donut-total').textContent = money(total);
  $('#record-count').textContent = `${periodItems.length} 筆`;
  $('#insight-row').innerHTML = data.metrics.map(([name, value, tone]) => `<article class="insight"><p>${name}</p><b>${typeof value === 'number' && name.includes('率') ? value + '%' : money(value)}</b>${tone !== 'neutral' ? `<i class="${tone}">${tone === 'positive' ? '●' : '●'}</i>` : ''}</article>`).join('');

  const sum = periodItems.reduce((n, item) => n + Math.abs(item[1]), 0) || 1;
  let cursor = 0;
  const stops = periodItems.map((item) => {
    const from = cursor;
    cursor += Math.abs(item[1]) / sum * 100;
    return `${item[2]} ${from.toFixed(2)}% ${cursor.toFixed(2)}%`;
  });

  $('#donut').style.background = `conic-gradient(${stops.join(',')})`;
  $('#legend').innerHTML = periodItems.map((item) => `<li><i class="dot" style="background:${item[2]}"></i><span>${item[0]}</span><b>${Math.round(Math.abs(item[1]) / sum * 100)}%</b></li>`).join('');
  $('#records').innerHTML = periodItems.slice(0, 4).map((item, index) => `<div class="record"><div class="record-icon" style="background:${item[2]}19;color:${item[2]}">${item[3]}</div><div class="record-main"><b>${item[0]}</b><span>${data.dynamic ? 'Google Sheet 同步' : selectedPeriod ? '該期彙總' : '本期累積'} · ${index + 1} 分類</span></div><strong>${active === '開銷' ? '- ' : ''}${money(item[1])}</strong></div>`).join('');
  $('#mini-chart').innerHTML = (data.totalsByPeriod?.length ? data.totalsByPeriod.slice(0, 6).reverse() : [38, 54, 46, 69, 61, Math.min(92, Math.max(40, total / sum * 82))])
    .map((value, index, values) => {
      const max = Math.max(...values.map(Math.abs), 1);
      const height = Math.max(20, Math.min(92, Math.abs(value) / max * 92));
      return `<i class="bar ${index === values.length - 1 ? 'last' : ''}" style="height:${height}%"></i>`;
    })
    .join('');
}

function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  setTimeout(() => element.classList.remove('show'), 3000);
}

async function syncSheetData({ silent = false } = {}) {
  try {
    const rows = await loadSheetData();
    datasets = buildDatasetsFromRows(rows);
    selectedPeriod = 0;
    render();

    if (!silent) toast('已同步 Google Sheet 資料');
  } catch (error) {
    console.error(error);
    datasets = cloneDatasets(fallbackDatasets);
    render();

    if (!silent) toast('同步失敗，暫時使用示範資料');
  }
}

document.querySelectorAll('.tab').forEach((button) => button.addEventListener('click', () => {
  active = button.dataset.view;
  selectedPeriod = 0;
  document.querySelector('.tab.active').classList.remove('active');
  button.classList.add('active');
  render();
}));

$('#period-select').addEventListener('change', (event) => {
  selectedPeriod = Number(event.target.value);
  render();
});

$('#view-sheet').addEventListener('click', () => window.open(SHEET_VIEW_URL, '_blank', 'noopener'));
$('#sync-button').addEventListener('click', () => syncSheetData());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(() => {}));
}

render();
syncSheetData({ silent: true });
