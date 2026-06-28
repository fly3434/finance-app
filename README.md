# 收支紀錄儀表板

這是一個手機優先的靜態 Web App，會從 Google Sheet 透過 Google Apps Script 取得 JSON，並在前端統計「收入」與「開銷」兩個分頁。

## 資料流程

```text
Google Sheet
  ↓
Google Apps Script Web App
  ↓
整理成 records JSON
  ↓
app.js 讀取 JSON
  ↓
index.html 顯示收入、開銷分頁統計
```

## Google Apps Script

1. 開啟 Google Sheet 的 Apps Script。
2. 將本專案的 `google-apps-script.js` 內容貼到 Apps Script。
3. 部署為 Web App。
4. 將部署後的 `/exec` 網址填入 `app.js` 的 `APPS_SCRIPT_URL`。

Apps Script 會輸出：

```json
{
  "updatedAt": "2026-06-28T00:00:00.000Z",
  "spreadsheetId": "...",
  "records": [
    {
      "sheet": "收入",
      "type": "income",
      "date": "2026-06-01",
      "year": 2026,
      "month": 6,
      "category": "工作收入",
      "subcategory": "底薪",
      "amount": 60000,
      "note": "",
      "source": "美光"
    }
  ]
}
```

## 欄位對照

收入表：

- C:E 轉成 `工作收入` 明細：底薪、加班/津貼、年終/績效
- I:N 轉成 `業外收入` 明細：股票配息、發票/彩券/中獎、保險理賠、租金、房屋補貼、其他
- H、P、Q 是小計/總收入欄，Apps Script 不會重複計入

開銷表：

- C:D 轉成 `生活`
- E:J 轉成 `汽機車`
- K 轉成 `保險`
- L:P 轉成 `房屋`
- Q:R 轉成 `折舊`
- S 轉成 `利息支出`
- T 轉成 `稅金費用`
- U:AD 是小計/總計欄，Apps Script 不會重複計入

## 本機檢查

這是純靜態頁面，可以直接開啟 `index.html`。如果瀏覽器擋掉本機 service worker 或跨來源請求，可用任一靜態伺服器開啟專案資料夾。
