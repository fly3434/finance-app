const SHEET_ID = '1RFvIsDwqX3Ot1a7WSet3dxpHLsAO0hySz3tRiC0Wzl0';

const DETAIL_SHEET_NAME = '收支紀錄';
const DETAIL_INCOME_OPTION_COLUMNS = [6, 7];
const DETAIL_EXPENSE_OPTION_COLUMNS = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const INCOME_COLUMNS = [
  { col: 3, category: '工作收入', subcategory: '底薪', noteCol: 6, sourceCol: 7 },
  { col: 4, category: '工作收入', subcategory: '加班/津貼', noteCol: 6, sourceCol: 7 },
  { col: 5, category: '工作收入', subcategory: '年終/績效', noteCol: 6, sourceCol: 7 },
  { col: 9, category: '業外收入', subcategory: '股票配息', noteCol: 15 },
  { col: 10, category: '業外收入', subcategory: '發票/彩券/中獎', noteCol: 15 },
  { col: 11, category: '業外收入', subcategory: '保險理賠', noteCol: 15 },
  { col: 12, category: '業外收入', subcategory: '租金', noteCol: 15 },
  { col: 13, category: '業外收入', subcategory: '房屋補貼', noteCol: 15 },
  { col: 14, category: '業外收入', subcategory: '其他', noteCol: 15 },
];

const EXPENSE_COLUMNS = [
  { col: 3, category: '生活', subcategory: '生活花費' },
  { col: 4, category: '生活', subcategory: '電話費' },
  { col: 5, category: '汽機車', subcategory: '保險/稅金' },
  { col: 6, category: '汽機車', subcategory: '保養' },
  { col: 7, category: '汽機車', subcategory: '加油' },
  { col: 8, category: '汽機車', subcategory: 'Etag' },
  { col: 9, category: '汽機車', subcategory: '停車' },
  { col: 10, category: '汽機車', subcategory: '其他(洗車,罰單,配件)' },
  { col: 11, category: '保險', subcategory: '勞健保' },
  { col: 12, category: '房屋', subcategory: '房租(含文心1)' },
  { col: 13, category: '房屋', subcategory: '管理費' },
  { col: 14, category: '房屋', subcategory: '水費' },
  { col: 15, category: '房屋', subcategory: '電費' },
  { col: 16, category: '房屋', subcategory: '瓦斯費' },
  { col: 17, category: '折舊', subcategory: '房屋' },
  { col: 18, category: '折舊', subcategory: '汽車-HRV' },
  { col: 19, category: '利息支出', subcategory: '信貸' },
  { col: 20, category: '稅金費用', subcategory: '所得稅' },
];

const LOAN_NAME_COLUMNS = [3, 6];

const LOAN_DETAIL_COLUMNS = [
  { col: 4, category: '本金餘額', label: '貸款本金餘額', includeInTotal: true, includeInBreakdown: true },
  { col: 5, category: '當月還款', label: '應還本息和', includeInTotal: false, includeInBreakdown: false },
  { col: 6, category: '當月還款', label: '應還本金', includeInTotal: false, includeInBreakdown: false },
  { col: 7, category: '利息費用', label: '應還利息', includeInTotal: false, includeInBreakdown: false },
  { col: 8, category: '其他費用', label: '其他費用', includeInTotal: false, includeInBreakdown: false },
  { col: 9, category: '利息費用', label: '貸款利息', includeInTotal: false, includeInBreakdown: false },
];

const ASSET_NET_COLUMNS = [
  { valueCol: 5, categoryCol: 3, subcategoryCol: 3 },
  { valueCol: 8, categoryCol: 6, subcategoryCol: 6 },
  { valueCol: 11, categoryCol: 9, subcategoryCol: 9 },
  { valueCol: 14, categoryCol: 12, subcategoryCol: 12 },
  { valueCol: 17, categoryCol: 15, subcategoryCol: 15 },
];

const MONTHLY_REPORT_ROWS = [
  { label: '資產總計', category: '資產負債表' },
  { label: '負債合計', category: '資產負債表' },
  { label: '權益合計(資產淨值(資產-負債))', category: '資產負債表', includeInTotal: true },
  { label: '本月淨利(稅前淨利-稅費)', category: '綜合損益表' },
  { label: '綜合損益總額(稅後淨利-綜合損益)', category: '綜合損益表' },
  { label: '營業活動之淨現金流入', category: '現金流量表' },
  { label: '投資活動之淨現金流入', category: '現金流量表' },
  { label: '籌資活動之淨現金流入', category: '現金流量表' },
  { label: '現金及約當現金淨增加數 (營業+投資+籌資)', category: '現金流量表' },
  { label: '當月現金及約當現金餘額', category: '現金流量表' },
];

const STATEMENT_SHEETS = {
  report: {
    sheetName: '月報',
    title: '月報',
    kind: 'financialReport',
    periodHeaderRow: 2,
    firstPeriodCol: 7,
    periodStep: 1,
    firstDataRow: 5,
    hasRatioColumn: false,
    periodType: 'month',
  },
  quarterlyReport: {
    sheetName: '季報',
    title: '季報',
    kind: 'financialReport',
    periodHeaderRow: 1,
    firstPeriodCol: 7,
    periodStep: 2,
    firstDataRow: 4,
    hasRatioColumn: true,
  },
  quarterlyCashFlow: {
    sheetName: '季_現金流量表',
    title: '季_現金流量表',
    kind: 'cashFlow',
    periodHeaderRow: 2,
    firstPeriodCol: 7,
    periodStep: 1,
    firstDataRow: 3,
    hasRatioColumn: false,
  },
  yearlyReport: {
    sheetName: '年報',
    title: '年報',
    kind: 'financialReport',
    periodHeaderRow: 1,
    firstPeriodCol: 7,
    periodStep: 2,
    firstDataRow: 4,
    hasRatioColumn: true,
  },
  yearlyCashFlow: {
    sheetName: '年_現金流量表',
    title: '年_現金流量表',
    kind: 'cashFlow',
    periodHeaderRow: 2,
    firstPeriodCol: 7,
    periodStep: 1,
    firstDataRow: 3,
    hasRatioColumn: false,
  },
};

function doGet() {
  const payload = getLedgerPayload();
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getLedgerPayload() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const detailSheet = spreadsheet.getSheetByName(DETAIL_SHEET_NAME);
  const incomeSheet = spreadsheet.getSheetByName('收入');
  const expenseSheet = spreadsheet.getSheetByName('開銷');
  const loanSheet = spreadsheet.getSheetByName('貸款');
  const assetSheet = spreadsheet.getSheetByName('資產');
  const monthlyReportSheet = spreadsheet.getSheetByName('月報');
  const statements = readStatements(spreadsheet);

  if (!incomeSheet || !expenseSheet || !loanSheet || !assetSheet || !monthlyReportSheet) {
    throw new Error('找不到「收入」、「開銷」、「貸款」、「資產」或「月報」工作表');
  }

  const records = [
    ...readLedgerSheet(incomeSheet, 'income', INCOME_COLUMNS),
    ...readLedgerSheet(expenseSheet, 'expense', EXPENSE_COLUMNS, { noteCol: 34 }),
    ...readLoanSheet(loanSheet),
    ...readAssetSheet(assetSheet),
    ...readMonthlyReportSheet(monthlyReportSheet),
  ];

  return {
    updatedAt: new Date().toISOString(),
    spreadsheetId: SHEET_ID,
    records,
    details: detailSheet ? readTransactionDetailSheet(detailSheet) : [],
    statements,
  };
}

function readLedgerSheet(sheet, type, columns, options) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 3) return [];

  const values = sheet.getRange(3, 1, lastRow - 2, lastColumn).getValues();
  const records = [];
  let currentYear = null;

  values.forEach((row) => {
    const yearValue = row[0];
    if (yearValue !== '' && yearValue !== null) {
      currentYear = Number(yearValue);
    }

    const date = parseMonthDate(row[1], currentYear);
    if (!date) return;

    columns.forEach((definition) => {
      const amount = toNumber(row[definition.col - 1]);
      if (!amount) return;

      records.push({
        sheet: sheet.getName(),
        type,
        date: Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        category: definition.category,
        subcategory: definition.subcategory,
        amount: Math.abs(amount),
        note: getCellText(row, definition.noteCol || options?.noteCol),
        source: getCellText(row, definition.sourceCol),
      });
    });
  });

  return records;
}

function readTransactionDetailSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, lastColumn).getValues();
  const records = [];

  values.forEach((row) => {
    const type = normalizeTransactionType(getCellText(row, 2));
    if (!type) return;

    const amount = toNumber(row[2]);
    if (!amount) return;

    const date = parseTransactionDate(row[3]) || parseTransactionDate(row[0]);
    if (!date) return;

    const category = type === 'income'
      ? getCellText(row, 5) || '收入'
      : getCellText(row, 8) || '開銷';
    const subcategory = pickFirstCellText(row, type === 'income' ? DETAIL_INCOME_OPTION_COLUMNS : DETAIL_EXPENSE_OPTION_COLUMNS) || category;
    const timeZone = Session.getScriptTimeZone();

    records.push({
      sheet: sheet.getName(),
      type,
      date: Utilities.formatDate(date, timeZone, 'yyyy-MM-dd'),
      displayDate: Utilities.formatDate(date, timeZone, 'M/d'),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      category,
      subcategory,
      amount: Math.abs(amount),
      note: getCellText(row, 19),
      source: DETAIL_SHEET_NAME,
    });
  });

  return records;
}

function normalizeTransactionType(value) {
  const text = String(value || '').trim().toLowerCase();
  if (/收入|income/.test(text)) return 'income';
  if (/支出|開銷|expense|cost/.test(text)) return 'expense';
  return '';
}

function pickFirstCellText(row, columnNumbers) {
  for (let index = 0; index < columnNumbers.length; index += 1) {
    const text = getCellText(row, columnNumbers[index]);
    if (text) return text;
  }

  return '';
}

function readLoanSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 10) return [];

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const loanNames = LOAN_NAME_COLUMNS
    .map((columnNumber) => getCellText(values[1], columnNumber))
    .filter(Boolean);
  const records = [];
  let currentYear = null;
  let currentLoanIndex = 0;
  let hasStartedLoan = false;
  let previousDate = null;

  values.slice(9).forEach((row) => {
    const yearValue = row[0];
    if (yearValue !== '' && yearValue !== null) {
      currentYear = Number(yearValue);
    }

    const hasLoanValue = LOAN_DETAIL_COLUMNS.some((definition) => toNumber(row[definition.col - 1]));
    if (!hasLoanValue) return;

    let date = parseMonthDate(row[1], currentYear);
    if (!date && previousDate) {
      date = addMonths(previousDate, 1);
    }
    if (!date) return;
    previousDate = date;

    const period = toNumber(row[2]);
    const balance = toNumber(row[3]);
    if (period === 1 && balance && hasStartedLoan) {
      currentLoanIndex = Math.min(currentLoanIndex + 1, loanNames.length - 1);
    }
    if (period === 1 && balance) {
      hasStartedLoan = true;
    }

    const loanName = loanNames[currentLoanIndex] || '貸款';
    const note = getCellText(row, 10);

    LOAN_DETAIL_COLUMNS.forEach((definition) => {
      const amount = toNumber(row[definition.col - 1]);
      if (!amount) return;

      records.push({
        sheet: sheet.getName(),
        type: 'loan',
        date: Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        category: definition.category,
        subcategory: `${loanName} ${definition.label}`,
        amount: Math.abs(amount),
        note,
        source: loanName,
        breakdownLabel: loanName,
        includeInTotal: definition.includeInTotal,
        includeInBreakdown: definition.includeInBreakdown,
      });
    });
  });

  return records;
}

function readAssetSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 5) return [];

  const headerValues = sheet.getRange(1, 1, 4, lastColumn).getValues();
  const values = sheet.getRange(5, 1, lastRow - 4, lastColumn).getValues();
  const records = [];
  let currentYear = null;

  values.forEach((row) => {
    const yearValue = row[0];
    if (yearValue !== '' && yearValue !== null) {
      currentYear = Number(yearValue);
    }

    const date = parseMonthDate(row[1], currentYear);
    if (!date) return;

    ASSET_NET_COLUMNS.forEach((definition) => {
      const amount = toNumber(row[definition.valueCol - 1]);
      if (!amount) return;

      const category = getHeaderText(headerValues, 0, definition.categoryCol) || '資產';
      const source = getHeaderText(headerValues, 1, definition.subcategoryCol);
      const subcategory = getHeaderText(headerValues, 2, definition.subcategoryCol) || source || category;

      records.push({
        sheet: sheet.getName(),
        type: 'asset',
        date: Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        category,
        subcategory,
        amount: Math.abs(amount),
        note: getCellText(row, 18),
        source,
        breakdownLabel: category,
        includeInTotal: true,
        includeInBreakdown: true,
      });
    });
  });

  return records;
}

function readMonthlyReportSheet(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 6 || lastColumn < 7) return [];

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const dateColumns = [];

  for (let col = 7; col <= lastColumn; col += 1) {
    const date = parseMonthDate(values[1][col - 1]);
    if (date) dateColumns.push({ col, date });
  }

  const records = [];

  MONTHLY_REPORT_ROWS.forEach((definition) => {
    const rowIndex = findRowIndexByLabel(values, definition.label);
    if (rowIndex < 0) return;

    dateColumns.forEach(({ col, date }) => {
      const amount = toNumber(values[rowIndex][col - 1]);
      if (!amount) return;

      records.push({
        sheet: sheet.getName(),
        type: 'report',
        date: Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        category: definition.category,
        subcategory: definition.label,
        amount,
        note: '',
        source: sheet.getName(),
        breakdownLabel: definition.label,
        includeInTotal: definition.includeInTotal === true,
        includeInBreakdown: true,
      });
    });
  });

  return records;
}

function readStatements(spreadsheet) {
  return Object.keys(STATEMENT_SHEETS).reduce((result, key) => {
    const config = STATEMENT_SHEETS[key];
    const sheet = spreadsheet.getSheetByName(config.sheetName);
    result[key] = sheet ? readHorizontalStatementSheet(sheet, config) : createEmptyStatement(config);
    return result;
  }, {});
}

function createEmptyStatement(config) {
  return {
    sheet: config.sheetName,
    title: config.title,
    kind: config.kind,
    periods: [],
    rows: [],
  };
}

function readHorizontalStatementSheet(sheet, config) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < config.firstDataRow || lastColumn < config.firstPeriodCol) {
    return createEmptyStatement(config);
  }

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const periodColumns = getStatementPeriodColumns(values, config, lastColumn);
  const rows = [];
  let currentSection = config.title;
  let currentAccount = '';

  for (let rowIndex = config.firstDataRow - 1; rowIndex < values.length; rowIndex += 1) {
    const row = values[rowIndex];
    const account = getCellText(row, 1).replace(/\n/g, '');
    const item = getCellText(row, 2).replace(/\n/g, '');
    const detail = getCellText(row, 3).replace(/\n/g, '');
    const rowLabel = buildStatementLabel(account, item, detail);
    const periodValues = periodColumns.map((period) => {
      const amount = parseStatementNumber(row[period.amountCol - 1]);
      const ratio = config.hasRatioColumn ? parseStatementNumber(row[period.ratioCol - 1]) : null;
      return {
        periodKey: period.key,
        amount,
        ratio,
      };
    });
    const hasPeriodData = periodValues.some((value) => value.amount !== null || value.ratio !== null);

    if (!hasPeriodData) {
      if (rowLabel && !isStatementNoteRow(account)) {
        currentSection = rowLabel;
        if (account) currentAccount = account;
      }
      continue;
    }

    if (!rowLabel || isStatementHeaderLabel(rowLabel) || isStatementNoteRow(account)) continue;
    if (account) currentAccount = account;

    rows.push({
      rowNumber: rowIndex + 1,
      section: currentSection,
      account: account || currentAccount,
      item,
      detail,
      label: rowLabel,
      values: periodValues,
    });
  }

  return {
    sheet: sheet.getName(),
    title: config.title,
    kind: config.kind,
    periods: periodColumns.map((period) => ({
      key: period.key,
      label: period.label,
      rawLabel: period.rawLabel,
    })),
    rows,
  };
}

function getStatementPeriodColumns(values, config, lastColumn) {
  const headerRow = values[config.periodHeaderRow - 1] || [];
  const periods = [];

  for (let col = config.firstPeriodCol; col <= lastColumn; col += config.periodStep) {
    const rawValue = headerRow[col - 1];
    const rawLabel = getCellText(headerRow, col);
    if (!rawLabel && config.periodType !== 'month') continue;

    if (config.periodType === 'month') {
      const date = parseMonthDate(rawValue);
      if (!date) continue;

      periods.push({
        key: Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM'),
        label: Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM'),
        rawLabel: rawLabel || Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
        amountCol: col,
        ratioCol: null,
      });
      continue;
    }

    periods.push({
      key: normalizeStatementPeriodKey(rawLabel),
      label: rawLabel.split('\n')[0],
      rawLabel,
      amountCol: col,
      ratioCol: config.hasRatioColumn ? col + 1 : null,
    });
  }

  return periods;
}

function normalizeStatementPeriodKey(rawLabel) {
  return String(rawLabel || '')
    .split('\n')[0]
    .replace(/\s+/g, '')
    .replace(/[^\w\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function buildStatementLabel(account, item, detail) {
  return [account, item, detail].filter(Boolean).join('｜');
}

function isStatementNoteRow(label) {
  return normalizeLabel(label) === '備註';
}

function isStatementHeaderLabel(label) {
  const text = normalizeLabel(label);
  return text === '金額' || text === '%' || text === '金額YOY';
}

function parseStatementNumber(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const text = String(value || '').trim();
  if (!text || ['-', 'NA', '#REF!', '#VALUE!', '#DIV/0!', '#N/A', '金額', '%', 'YOY'].includes(text)) {
    return null;
  }

  const isParenthesizedNegative = /^[（(].*[）)]$/.test(text);
  const parsed = Number(text.replace(/[,\s$NTnt元%()（）]/g, ''));
  if (!Number.isFinite(parsed)) return null;
  return isParenthesizedNegative ? -Math.abs(parsed) : parsed;
}

function parseMonthDate(value, year) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), 1);
  }

  if (typeof value === 'number') {
    if (value > 10000) {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return new Date(date.getUTCFullYear(), date.getUTCMonth(), 1);
    }

    if (year && value >= 1 && value <= 12) {
      return new Date(year, value - 1, 1);
    }
  }

  const text = String(value || '').trim();
  const match = text.match(/(\d{4}).*?(\d{1,2})/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, 1);
  }

  return null;
}

function parseTransactionDate(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }

  if (typeof value === 'number') {
    if (value > 10000) {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
    }

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

  return null;
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const text = String(value || '').trim();
  const isParenthesizedNegative = /^[（(].*[）)]$/.test(text);
  const parsed = Number(text.replace(/[,\s$NTnt元()（）]/g, ''));
  if (!Number.isFinite(parsed)) return 0;
  return isParenthesizedNegative ? -Math.abs(parsed) : parsed;
}

function getCellText(row, columnNumber) {
  if (!columnNumber) return '';
  const value = row[columnNumber - 1];
  return value === null || value === undefined ? '' : String(value).trim();
}

function getHeaderText(headerValues, rowIndex, columnNumber) {
  const value = headerValues[rowIndex][columnNumber - 1];
  return value === null || value === undefined ? '' : String(value).trim();
}

function findRowIndexByLabel(values, label) {
  const target = normalizeLabel(label);

  for (let row = 0; row < values.length; row += 1) {
    if (normalizeLabel(values[row][0]) === target) return row;
  }

  return -1;
}

function normalizeLabel(value) {
  return String(value || '').replace(/\s+/g, '');
}
