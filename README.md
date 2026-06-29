# 收支紀錄儀表板

這是一個手機優先的靜態 Web App，會從 Google Sheet 透過 Google Apps Script 取得 JSON，並在前端統計「收入」「開銷」「貸款」「資產」與「月報」「季報」「季現金流」「年報」「年現金流」報表分頁。

## 資料流程

```text
Google Sheet
  ↓
Google Apps Script Web App
  ↓
整理成 records + statements JSON
  ↓
app.js 讀取 JSON
  ↓
index.html 顯示月度統計與橫式會計報表
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
      "source": "美光",
      "breakdownLabel": "工作收入",
      "includeInTotal": true,
      "includeInBreakdown": true
    }
  ],
  "statements": {
    "quarterlyReport": {
      "sheet": "季報",
      "title": "季報",
      "kind": "financialReport",
      "periods": [
        { "key": "2024Q3", "label": "2024Q3", "rawLabel": "2024Q3\n(2024/10/09)" }
      ],
      "rows": [
        {
          "section": "流動資產",
          "label": "現金及約當現金｜台幣存款｜台灣銀行",
          "values": [
            { "periodKey": "2024Q3", "amount": 16687, "ratio": 0.1269 }
          ]
        }
      ]
    }
  }
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

貸款表：

- 第 2 列的 C、F 欄讀取貸款名稱，例如 `信貸(連線銀行)`、`信貸(第一銀行)`
- 第 9 列之後讀取還款排程
- D 欄 `貸款本金餘額` 轉成 `loan` 分頁主總額，並用貸款名稱做圓餅圖分類
- E:I 欄轉成貸款明細：應還本息和、應還本金、應還利息、其他費用、貸款利息
- E:I 明細會出現在主要項目，但 `includeInTotal` 為 `false`，不會重複加進貸款餘額

資產表：

- 以第 1 列的大類、第 2 列的來源/子類、第 3 列的項目名稱作為分類資訊
- 每組資產取「淨額」欄：E、H、K、N、Q
- 每個月份的各資產淨額都會納入 `asset` 分頁總額與分類圖

月報表：

- 以第 2 列的月份欄作為時間軸，從 G 欄開始讀取
- 摘要列轉成 `report` 分頁：資產總計、負債合計、權益合計、本月淨利、綜合損益總額、各現金流摘要、當月現金餘額
- `權益合計(資產淨值(資產-負債))` 是月報主總額，其他摘要列用於圓餅圖與主要項目
- `includeInTotal` 控制是否納入主總額，`breakdownLabel` 控制圖表顯示名稱
- 前端目前會優先使用 `statements.report` 顯示月報，版面與季報、年報一致；`records` 中的月報資料保留作為相容資料。

橫式會計報表：

- `月報`：從第 2 列讀月份，從 G 欄開始，每個月份使用一欄金額。
- `季報` / `年報`：從 G 欄開始讀取，每個期間使用兩欄，第一欄是金額、第二欄是比例或 YoY。
- `季_現金流量表` / `年_現金流量表`：從 G 欄開始讀取，每個期間使用一欄金額。
- Apps Script 會保留原始列順序，並將 A:C 欄合併成可讀的 `label`；空白或公式錯誤值會轉成 `null`，前端顯示為 `-`。
- 前端會把期間反轉成最新期間優先，並用 KPI、含 X/Y 軸說明的近期趨勢與明細表呈現。

## 本機檢查

這是純靜態頁面，可以直接開啟 `index.html`。如果瀏覽器擋掉本機 service worker 或跨來源請求，可用任一靜態伺服器開啟專案資料夾。
