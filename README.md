# 人生特攻隊：生涯卡任務

此專案建立於 `I:\life-attack-career-game`，目前是可直接開啟的靜態前端原型。

## 目前已匯入的資料

- 生涯價值卡：40 筆，來源為 `life-squad-86-cards.xlsx` 的「生涯卡」工作表。
- 職業憧憬卡：90 筆，其中 86 筆來源為 `life-squad-86-cards.xlsx` 的「職業憧憬卡」工作表，另 4 筆為後續討論新增的新興 AI 輔助職務。
- `richValueId` 與 `strategySkill`：第 87-90 筆已補入；Excel 原始 86 筆多數仍保留待補欄位。

## 開啟方式

直接用瀏覽器開啟：

```text
I:\life-attack-career-game\index.html
```

## 後續資料補齊位置

請編輯：

```text
I:\life-attack-career-game\data\careerData.js
```

每張職業卡都有這些欄位：

```js
richValueId: [],
strategySkill: {
  gameName: '待補特攻技能',
  iepName: '待補正式特教策略',
  description: '...'
}
```

把對話框中尚未進 Excel 的資料補入後，第三關技能樹與 IEP 報告會自動使用正式內容。
