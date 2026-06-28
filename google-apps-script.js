const SHEET_ID = '1RFvIsDwqX3Ot1a7WSet3dxpHLsAO0hySz3tRiC0Wzl0';

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

function doGet() {
  const payload = getLedgerPayload();
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getLedgerPayload() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const incomeSheet = spreadsheet.getSheetByName('收入');
  const expenseSheet = spreadsheet.getSheetByName('開銷');

  if (!incomeSheet || !expenseSheet) {
    throw new Error('找不到「收入」或「開銷」工作表');
  }

  const records = [
    ...readLedgerSheet(incomeSheet, 'income', INCOME_COLUMNS),
    ...readLedgerSheet(expenseSheet, 'expense', EXPENSE_COLUMNS, { noteCol: 34 }),
  ];

  return {
    updatedAt: new Date().toISOString(),
    spreadsheetId: SHEET_ID,
    records,
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

function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;

  const parsed = Number(String(value || '').replace(/[,\s$NTnt元]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCellText(row, columnNumber) {
  if (!columnNumber) return '';
  const value = row[columnNumber - 1];
  return value === null || value === undefined ? '' : String(value).trim();
}
