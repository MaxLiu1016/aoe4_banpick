# 參與貢獻 / Contributing

歡迎回報問題與提建議。中文、English、日本語 皆可。
Feedback in any of those languages is welcome.

## 先開 Issue,再送 PR / Open an issue first

**這個專案的原則是「issue 優先」。** 送 PR 之前,請先開一個 issue 把問題或想法講清楚,
等有共識再動手。

原因很實際:很多反饋的最佳解法跟提出者想的不一樣 —— 例如「BP 畫面太小」最後查出來是
地圖池少傳了一個 `kind="map"`,而不是版面要重畫。先討論可以避免你花時間寫了一版、
結果方向要整個換掉。

**Please open an issue before starting work on a pull request.** Unsolicited PRs
may be closed without review, not because they're unwelcome, but because the
right fix often isn't the obvious one and it's unfair to let you write code that
then has to be thrown away.

已經談定方向的 issue,會標上 `accepting-pr`。
Issues that are agreed and ready to be worked on are labelled `accepting-pr`.

## 授權 / Licensing of contributions

送出 PR 即表示你同意你的貢獻依本專案的 **MIT 授權條款**授權,
並且你有權以該條款授權這些內容。

By submitting a pull request, you agree that your contribution is licensed under
the project's MIT Licence, and that you have the right to license it under those
terms.

## 開發環境 / Development setup

```bash
npm install
cp .env.example .env.local   # 填入 MONGODB_URI + AUTH_SECRET
npm run dev                  # 自訂 server + Socket.IO,http://localhost:3000
```

需要一個 MongoDB(本機 mongod 就夠)。`AUTH_SECRET` 沒設的話 server 會拒絕啟動 ——
它同時用來簽 Socket.IO 的 join ticket。

先讀 [`AGENTS.md`](./AGENTS.md):這個專案用的是 **Next.js 16**,很多慣例跟你熟悉的
版本不同,相關文件在 `node_modules/next/dist/docs/`。

## 送出前 / Before you submit

```bash
npx tsc --noEmit
npx eslint <你改動的檔案>
```

BP 規則引擎(`lib/draft/engine.ts`)有幾支純 Node 的測試腳本,改到規則邏輯請跑過:

```bash
npx tsx --env-file=.env.local scripts/test-simulban.ts        # 引擎
npx tsx --env-file=.env.local scripts/test-simulban-socket.ts # 連線層遮蔽
```

後面兩支需要 dev server 開著。

## 幾個容易踩的地方 / Things to know

- **動作紀錄是 append-only。** `MatchAction` 只增不改,狀態一律由 `deriveState()`
  重放算出來。不要在 `Match` 上放衍生欄位。
- **隱藏資訊要在 server 端擋掉。** 同時 ban、匿名模式靠 `redactFor()` 在送出前就把
  資料拿掉,不是靠前端不顯示。前端藏起來的東西在 DevTools 裡是看得到的。
- **翻譯是一個扁平字典**(`lib/i18n.tsx`)。加字串要四個語系都補;簡體是從繁體用
  `T2S` 對照表即時轉的,遇到沒收錄的字要把它加進表裡。
