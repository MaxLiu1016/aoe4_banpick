"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

// "zh" = Traditional Chinese (the authored strings); "cn" = Simplified, derived
// from "zh" at runtime via the char map below. "ja" = Japanese (hand-authored).
export type Locale = "en" | "zh" | "cn" | "ja";

// Traditional → Simplified character map (covers the chars used in the dictionary).
// Lets the "cn" locale reuse the "zh" strings without a second hand-translation.
const T2S: Record<string, string> = { "規": "规", "則": "则", "組": "组", "揮": "挥", "個": "个", "資": "资", "顯": "显", "稱": "称", "這": "这", "裡": "里", "儲": "储", "紀": "纪", "國": "国", "運": "运", "籌": "筹", "決": "决", "勝": "胜", "開": "开", "與": "与", "圖": "图", "對": "对", "戰": "战", "瀏": "浏", "覽": "览", "訂": "订", "輪": "轮", "數": "数", "擊": "击", "驟": "骤", "計": "计", "時": "时", "暫": "暂", "賽": "赛", "觀": "观", "選": "选", "標": "标", "雙": "双", "約": "约", "負": "负", "兩": "两", "邊": "边", "點": "点", "誤": "误", "陣": "阵", "為": "为", "術": "术", "來": "来", "進": "进", "廳": "厅", "帳": "帐", "號": "号", "電": "电", "郵": "邮", "碼": "码", "請": "请", "註": "注", "冊": "册", "採": "采", "員": "员", "還": "还", "沒": "没", "經": "经", "錯": "错", "敗": "败", "後": "后", "編": "编", "輯": "辑", "複": "复", "製": "制", "換": "换", "尋": "寻", "頁": "页", "刪": "删", "範": "范", "內": "内", "無": "无", "愛": "爱", "間": "间", "連": "连", "結": "结", "線": "线", "當": "当", "隊": "队", "長": "长", "準": "准", "備": "备", "傳": "传", "給": "给", "會": "会", "強": "强", "繼": "继", "續": "续", "獲": "获", "場": "场", "隨": "随", "機": "机", "隱": "隐", "鎖": "锁", "擇": "择", "緒": "绪", "張": "张", "僅": "仅", "誰": "谁", "贏": "赢", "寫": "写", "確": "确", "認": "认", "舊": "旧", "從": "从", "餘": "余", "說": "说", "項": "项", "幾": "几", "總": "总", "預": "预", "設": "设", "許": "许", "產": "产", "執": "执", "統": "统", "動": "动", "調": "调", "順": "顺", "嗎": "吗", "單": "单", "錄": "录", "種": "种", "關": "关", "閉": "闭", "東": "东", "須": "须", "現": "现", "況": "况", "於": "于", "夠": "够", "靜": "静", "練": "练", "習": "习", "滿": "满", "參": "参", "過": "过", "純": "纯", "斷": "断", "曉": "晓", "眾": "众", "欄": "栏", "訪": "访", "遊": "游", "記": "记", "條": "条", "麼": "么", "腦": "脑", "讓": "让", "幫": "帮" };
function toSimplified(s: string): string {
  let out = "";
  for (const ch of s) out += T2S[ch] ?? ch;
  return out;
}

// Flat dictionary. {var} placeholders are interpolated by t().
const DICT: Record<string, { en: string; zh: string; ja: string }> = {
  // nav / header
  "nav.presets": { en: "Presets", zh: "規則組", ja: "プリセット" },
  "nav.signin": { en: "Sign in", zh: "登入", ja: "ログイン" },
  "nav.signout": { en: "Sign out", zh: "登出", ja: "ログアウト" },
  "nav.commander": { en: "Commander", zh: "指揮官", ja: "指揮官" },
  "account.title": { en: "Profile", zh: "個人資料", ja: "プロフィール" },
  "account.username": { en: "Display name", zh: "顯示名稱", ja: "表示名" },
  "account.hint": { en: "Your display name is the only thing you can change here.", zh: "這裡唯一能修改的就是你的顯示名稱。", ja: "ここで変更できるのは表示名だけです。" },
  "account.save": { en: "Save", zh: "儲存", ja: "保存" },
  "account.saving": { en: "Saving…", zh: "儲存中…", ja: "保存中…" },
  "account.saved": { en: "Saved ✓", zh: "已儲存 ✓", ja: "保存しました ✓" },
  // home
  "home.kicker": { en: "Age of Empires IV", zh: "世紀帝國 IV", ja: "Age of Empires IV" },
  "home.title": { en: "Ban. Pick. Conquer.", zh: "運籌帷幄，決勝開局", ja: "BAN、PICK、そして勝利へ。" },
  "home.subtitle": { en: "Tournament drafting for Age of Empires IV.", zh: "世紀帝國 IV · 文明與地圖 Ban/Pick", ja: "Age of Empires IV · 文明とマップの BAN/PICK" },
  "home.createDraft": { en: "Start a draft", zh: "開始對戰", ja: "ドラフトを始める" },
  "home.browse": { en: "Browse presets", zh: "瀏覽規則組", ja: "プリセットを見る" },
  "home.f1t": { en: "Fully Configurable", zh: "完全可自訂", ja: "完全カスタマイズ" },
  "home.f1d": { en: "Rounds, civ pools, snipe rules, per-step timers, pauses — your format, your rules.", zh: "輪數、文明池、狙擊規則、每步驟計時、暫停——你的賽制由你定。", ja: "ラウンド数、文明プール、スナイプ規則、ステップごとの制限時間、一時停止——大会形式もルールもあなた次第。" },
  "home.f2t": { en: "Live Spectating", zh: "即時觀戰", ja: "リアルタイム観戦" },
  "home.f2d": { en: "Watch bans, picks and (optionally) live civ hovers in real time.", zh: "即時觀看 ban、pick，以及（可選）選手游標停留的文明。", ja: "BAN・PICK、さらに（任意で）選手のカーソルが乗っている文明までリアルタイムで観戦。" },
  "home.f3t": { en: "Honor-System Results", zh: "雙方約定勝負", ja: "自己申告の勝敗" },
  "home.f3d": { en: "Either side marks the winner; the host can revert a misclick.", zh: "兩邊都能點選勝方；房主可修正誤點。", ja: "どちらの側でも勝者を記録でき、ホストは誤クリックを修正できます。" },
  "home.roster": { en: "The Roster", zh: "文明陣容", ja: "文明一覧" },
  "home.civs": { en: "{n} civilizations", zh: "{n} 個文明", ja: "{n} 文明" },
  "home.footer": { en: "Built for the community · Civ art © Relic/Microsoft, via the Age of Empires Wiki", zh: "為社群打造 · 文明美術 © Relic/Microsoft，來源 Age of Empires Wiki", ja: "コミュニティのために · 文明アート © Relic/Microsoft（出典：Age of Empires Wiki）" },
  // login
  "login.enter": { en: "Enter the Hall", zh: "進入大廳", ja: "ホールに入る" },
  "login.forge": { en: "Forge Your Banner", zh: "建立帳號", ja: "アカウントを作成" },
  "login.username": { en: "Username", zh: "使用者名稱", ja: "ユーザー名" },
  "login.email": { en: "Email or username", zh: "電子郵件 / 使用者名稱", ja: "メールアドレス / ユーザー名" },
  "login.account": { en: "Account", zh: "帳號", ja: "アカウント" },
  "login.password": { en: "Password", zh: "密碼", ja: "パスワード" },
  "login.passwordHint": { en: "At least 8 characters.", zh: "密碼至少 8 個字。", ja: "8 文字以上で入力してください。" },
  "login.passwordTooShort": { en: "Password must be at least 8 characters.", zh: "密碼至少需要 8 個字。", ja: "パスワードは 8 文字以上必要です。" },
  "login.inviteCode": { en: "Invite code", zh: "邀請碼", ja: "招待コード" },
  "login.inviteHint": { en: "Registration is invite-only — ask an admin for a code.", zh: "註冊採邀請制——請向管理員索取邀請碼。", ja: "登録は招待制です——管理者にコードを問い合わせてください。" },
  "login.signin": { en: "Sign in", zh: "登入", ja: "ログイン" },
  "login.create": { en: "Create account", zh: "建立帳號", ja: "アカウント作成" },
  "login.noBanner": { en: "Don't have an account? ", zh: "還沒有帳號？", ja: "アカウントをお持ちでないですか？" },
  "login.enlisted": { en: "Already have an account? ", zh: "已經有帳號？", ja: "すでにアカウントをお持ちですか？" },
  "login.register": { en: "Register", zh: "註冊", ja: "新規登録" },
  "login.invalid": { en: "Invalid account or password", zh: "帳號或密碼錯誤", ja: "アカウントまたはパスワードが違います" },
  "login.failed": { en: "Registration failed", zh: "註冊失敗", ja: "登録に失敗しました" },
  // presets
  "presets.title": { en: "Presets", zh: "規則組", ja: "プリセット" },
  "presets.subtitle": { en: "Your draft formats.", zh: "你的 ban/pick 賽制。", ja: "あなたの BAN/PICK 形式。" },
  "presets.new": { en: "+ New Preset", zh: "+ 新規則組", ja: "+ 新しいプリセット" },
  "presets.forging": { en: "Forging…", zh: "建立中…", ja: "作成中…" },
  "presets.signinCreate": { en: "Sign in to create", zh: "登入以建立", ja: "ログインして作成" },
  "presets.none": { en: "No presets yet. Forge your first one.", zh: "還沒有規則組，建立第一個吧。", ja: "プリセットがまだありません。最初の 1 つを作りましょう。" },
  "presets.noneSignin": { en: "No presets yet. Sign in to get started.", zh: "還沒有規則組，登入後開始。", ja: "プリセットがまだありません。ログインして始めましょう。" },
  "presets.start": { en: "Start match", zh: "開始對戰", ja: "対戦を開始" },
  "presets.startFailed": { en: "Failed to start match", zh: "無法開始對戰", ja: "対戦を開始できませんでした" },
  "presets.edit": { en: "Edit", zh: "編輯", ja: "編集" },
  "presets.history": { en: "History", zh: "對戰紀錄", ja: "対戦履歴" },
  "presets.clone": { en: "Clone", zh: "複製", ja: "複製" },
  "presets.cloning": { en: "Cloning…", zh: "複製中…", ja: "複製中…" },
  "presets.togglePublicHint": { en: "Toggle public — others can browse & clone it", zh: "切換公開——他人可瀏覽與複製", ja: "公開を切り替え——他の人が閲覧・複製できます" },
  "presets.tabMine": { en: "My presets", zh: "我的規則", ja: "自分のプリセット" },
  "presets.tabPublic": { en: "All public", zh: "所有公開", ja: "すべての公開" },
  "presets.search": { en: "Search by name…", zh: "依名稱搜尋…", ja: "名前で検索…" },
  "presets.prev": { en: "← Prev", zh: "← 上一頁", ja: "← 前へ" },
  "presets.next": { en: "Next →", zh: "下一頁 →", ja: "次へ →" },
  "presets.pageOf": { en: "Page {p} / {n}", zh: "第 {p} / {n} 頁", ja: "{p} / {n} ページ" },
  "presets.none2": { en: "No presets found.", zh: "找不到規則。", ja: "プリセットが見つかりません。" },
  "presets.limitReached": { en: "You can have at most 2 presets — delete one first.", zh: "最多只能有 2 個規則，請先刪除一個。", ja: "プリセットは最大 2 つまでです。先にどれか削除してください。" },
  "presets.demo": { en: "demo", zh: "範例", ja: "サンプル" },
  "presets.demoLockedHint": { en: "Built-in demo — always public, can't be edited or deleted. Clone it to customize.", zh: "內建範例——固定公開，無法編輯或刪除。複製一份即可自訂。", ja: "組み込みサンプル——常に公開で、編集も削除もできません。複製すればカスタマイズできます。" },
  "common.public": { en: "Public", zh: "公開", ja: "公開" },
  "common.private": { en: "Private", zh: "私人", ja: "非公開" },
  "presets.yours": { en: "yours", zh: "你的", ja: "あなたの" },
  "presets.by": { en: "by {name}", zh: "作者：{name}", ja: "作成者：{name}" },
  "presets.favorite": { en: "Favorite", zh: "加入最愛", ja: "お気に入りに追加" },
  "presets.favorited": { en: "Favorited", zh: "已收藏", ja: "お気に入り済み" },
  "presets.unfavorite": { en: "Remove from favorites", zh: "移除收藏", ja: "お気に入りから削除" },
  "presets.steps": { en: "{n} steps", zh: "{n} 步驟", ja: "{n} ステップ" },
  // draft history
  "history.title": { en: "Draft history", zh: "對戰紀錄", ja: "ドラフト履歴" },
  "history.subtitle": { en: "Drafts you played in, or rooms you opened. Just watching doesn't count.", zh: "你打過的、或你開的房。只是在旁邊看不算。", ja: "あなたが対戦した、または開いた部屋。見ていただけのものは含まれません。" },
  "history.subtitleGlobal": { en: "The 20 most recent public drafts. Anonymous ones are never listed.", zh: "最近 20 場公開對戰。匿名對戰不會列入。", ja: "直近 20 件の公開ドラフト。匿名の対戦は表示されません。" },
  "history.none": { en: "No drafts yet. Start one from a preset.", zh: "還沒有紀錄，從規則組開一場吧。", ja: "まだ履歴がありません。プリセットから始めましょう。" },
  "history.tab.mine": { en: "My drafts", zh: "我的紀錄", ja: "自分の履歴" },
  "history.tab.global": { en: "Recent worldwide", zh: "全球近期對戰", ja: "最近の対戦（全体）" },
  "history.noneGlobal": { en: "No public drafts yet.", zh: "目前還沒有公開的對戰紀錄。", ja: "公開されている対戦はまだありません。" },
  "history.search": { en: "Search format or player…", zh: "搜尋賽制或選手…", ja: "形式や選手を検索…" },
  "history.noneFiltered": { en: "Nothing matches that.", zh: "沒有符合的紀錄。", ja: "該当する記録はありません。" },
  "history.filteredBy": { en: "Format: {name}", zh: "賽制：{name}", ja: "形式：{name}" },
  "history.filteredPreset": { en: "this preset", zh: "這個規則組", ja: "このプリセット" },
  "history.won": { en: "You won", zh: "你獲勝", ja: "あなたの勝ち" },
  "history.lost": { en: "You lost", zh: "你落敗", ja: "あなたの負け" },
  "history.done": { en: "Finished", zh: "完成", ja: "終了" },
  "history.role.player1": { en: "you were P1", zh: "你是 P1", ja: "あなたは P1" },
  "history.role.player2": { en: "you were P2", zh: "你是 P2", ja: "あなたは P2" },
  "history.role.host": { en: "you hosted", zh: "你是房主", ja: "あなたが主催" },
  "history.status.lobby": { en: "In lobby", zh: "大廳中", ja: "ロビー" },
  "history.status.running": { en: "In progress", zh: "進行中", ja: "進行中" },
  "history.status.paused": { en: "Paused", zh: "已暫停", ja: "一時停止中" },
  "history.status.finished": { en: "Finished", zh: "已結束", ja: "終了" },
  "history.status.abandoned": { en: "Abandoned", zh: "已中止", ja: "中断" },
  "nav.history": { en: "History", zh: "紀錄", ja: "履歴" },
  // match room
  "match.room": { en: "Draft Room", zh: "對戰房間", ja: "ドラフトルーム" },
  "match.spectatorLink": { en: "Spectator link ↗", zh: "觀戰連結 ↗", ja: "観戦リンク ↗" },
  "match.spectating": { en: "Spectating", zh: "觀戰中", ja: "観戦中" },
  "match.connecting": { en: "Connecting to the draft…", zh: "連線中…", ja: "接続中…" },
  "match.reconnecting": { en: "Connection lost — reconnecting…", zh: "連線中斷，重新連線中…", ja: "接続が切れました——再接続中…" },
  "match.bestOf": { en: "Best of {n} · first to {t}", zh: "{n} 戰 {t} 勝制", ja: "{n} 本勝負 · 先取 {t} 勝" },
  "match.bestOfAll": { en: "Playing all {n} games", zh: "打滿 {n} 場", ja: "全 {n} 戦を消化" },
  "match.lobby": { en: "LOBBY", zh: "大廳", ja: "ロビー" },
  "match.boTitle": { en: "Best of {n}", zh: "{n} 戰制", ja: "{n} 本勝負" },
  "match.youAre": { en: "You are", zh: "你的身分", ja: "あなたの役割" },
  "match.host": { en: "host", zh: "房主", ja: "ホスト" },
  "match.referee": { en: "Host / Referee", zh: "房主 / 裁判", ja: "ホスト / 審判" },
  "match.hostHint": { en: "You're the host. You can play as well, or just referee.", zh: "你是房主。可以自己下場打，也可以只當裁判。", ja: "あなたはホストです。自分で対戦してもいいですし、審判だけでもかまいません。" },
  "match.p1": { en: "Player 1", zh: "玩家 1", ja: "プレイヤー 1" },
  "match.p2": { en: "Player 2", zh: "玩家 2", ja: "プレイヤー 2" },
  "match.spectator": { en: "Spectator", zh: "觀戰者", ja: "観戦者" },
  "match.you": { en: "you", zh: "你", ja: "あなた" },
  "match.open": { en: "— open —", zh: "— 空位 —", ja: "— 空席 —" },
  "match.ready": { en: "Ready ✓", zh: "已準備 ✓", ja: "準備完了 ✓" },
  "match.notReady": { en: "Not ready", zh: "未準備", ja: "未準備" },
  "match.readyUp": { en: "Ready up", zh: "準備", ja: "準備する" },
  "match.unready": { en: "Unready", zh: "取消準備", ja: "準備を解除" },
  "match.rename": { en: "Rename", zh: "改名", ja: "名前を変更" },
  "match.save": { en: "Save", zh: "儲存", ja: "保存" },
  "match.takeSeat": { en: "Take this seat", zh: "坐這個位子", ja: "この席につく" },
  "match.guestName": { en: "Your name", zh: "你的名字", ja: "あなたの名前" },
  "match.addBot": { en: "🤖 Practise against a bot", zh: "🤖 找機器人對打", ja: "🤖 ボットと練習する" },
  "match.autoPickSoon": { en: "About to pick for you at random", zh: "再不選就幫你隨機選", ja: "まもなくランダムに自動選択します" },
  "match.botHint": {
    en: "The bot picks at random — it's here so you can walk a whole format through on your own. You call each game's winner and it agrees.",
    zh: "機器人是隨機選的，用途是讓你一個人把整套賽制走一遍。每局誰贏由你點，它照單全收。",
    ja: "ボットはランダムに選びます。ひとりで形式を最後まで通すためのものです。各ゲームの勝者はあなたが決め、ボットはそれに従います。",
  },
  "match.guestMode": {
    en: "Don't swap phone or computer partway through — only this one remembers your seat.",
    zh: "位子只記在這一台，中途不要換手機或電腦。",
    ja: "席を覚えているのはこの端末だけです。途中でスマホやパソコンを変えないでください。",
  },
  "match.waitingPlayer": { en: "Waiting for a player…", zh: "等待玩家…", ja: "プレイヤーを待っています…" },
  "match.invite": { en: "Invite your opponent", zh: "邀請對手", ja: "対戦相手を招待" },
  "match.copyLink": { en: "Copy link", zh: "複製連結", ja: "リンクをコピー" },
  "match.copied": { en: "Copied!", zh: "已複製！", ja: "コピーしました！" },
  "match.shareHint": { en: "Send this link to your opponent — they open it and take the empty seat.", zh: "把這條連結傳給對手，他點開、坐上空位就能開始。", ja: "このリンクを相手に送ってください。開いて空席につけば始められます。" },
  "match.waitSeats": { en: "Waiting for both seats to be filled…", zh: "等待雙方就座…", ja: "両方の席が埋まるのを待っています…" },
  "match.starting": { en: "Starting…", zh: "開始中…", ja: "開始中…" },
  "match.readyToBegin": { en: "Both players must ready up to begin.", zh: "雙方都按準備才會開始。", ja: "両プレイヤーが準備完了にすると開始します。" },
  "match.forceStart": { en: "Force start (host)", zh: "強制開始（房主）", ja: "強制開始（ホスト）" },
  "match.pause": { en: "Pause", zh: "暫停", ja: "一時停止" },
  "match.resume": { en: "Resume", zh: "繼續", ja: "再開" },
  "match.paused": { en: "PAUSED", zh: "已暫停", ja: "一時停止中" },
  "match.p1wins": { en: "Player 1 wins!", zh: "玩家 1 獲勝！", ja: "プレイヤー 1 の勝利！" },
  "match.p2wins": { en: "Player 2 wins!", zh: "玩家 2 獲勝！", ja: "プレイヤー 2 の勝利！" },
  "match.winner": { en: "{name} wins!", zh: "{name} 獲勝！", ja: "{name} の勝利！" },
  "match.matchWinner": { en: "Match winner", zh: "本場勝者", ja: "マッチ勝者" },
  "match.gameN": { en: "Game {n}", zh: "第 {n} 局", ja: "第 {n} ゲーム" },
  "match.yourMove": { en: "Your move.", zh: "輪到你。", ja: "あなたの番です。" },
  "match.confirm": { en: "Confirm", zh: "確認", ja: "確認" },
  "match.confirmed": { en: "Confirmed", zh: "已確認", ja: "確認済み" },
  "match.confirmWaitingOpp": { en: "Waiting for your opponent…", zh: "等待對手確認…", ja: "相手の確認を待っています…" },
  "match.confirmWaitingYou": { en: "Press confirm when you're ready", zh: "準備好了就按確認", ja: "準備ができたら確認を押してください" },
  "match.currentMap": { en: "Current map:", zh: "本局地圖：", ja: "このゲームのマップ：" },
  "match.maps": { en: "Maps", zh: "地圖", ja: "マップ" },
  "match.civs": { en: "Civilizations", zh: "文明", ja: "文明" },
  "match.handP1": { en: "Player 1 · civ pool", zh: "玩家 1 · 文明池", ja: "プレイヤー 1 · 文明プール" },
  "match.handP2": { en: "Player 2 · civ pool", zh: "玩家 2 · 文明池", ja: "プレイヤー 2 · 文明プール" },
  "match.mapsP1": { en: "Player 1 · map pool", zh: "玩家 1 · 地圖池", ja: "プレイヤー 1 · マッププール" },
  "match.mapsP2": { en: "Player 2 · map pool", zh: "玩家 2 · 地圖池", ja: "プレイヤー 2 · マッププール" },
  "match.bannedP1": { en: "Player 1 · banned", zh: "玩家 1 · 已 ban", ja: "プレイヤー 1 · BAN 済み" },
  "match.bannedP2": { en: "Player 2 · banned", zh: "玩家 2 · 已 ban", ja: "プレイヤー 2 · BAN 済み" },
  "match.scoreboard": { en: "Scoreboard", zh: "計分板", ja: "スコアボード" },
  "match.settings": { en: "Settings for this draft", zh: "本場對戰設定", ja: "この対戦の設定" },
  "match.privacyGuestHint": { en: "Host only, before the draft starts.", zh: "僅房主可改，且限開賽前。", ja: "ホストのみ・開始前まで。" },
  "match.playAll": { en: "Play all {n} games", zh: "打滿 {n} 場", ja: "全 {n} 戦を消化" },
  "match.playAllHint": { en: "Don't stop once it's decided", zh: "分出勝負後不提前結束", ja: "勝敗が決まっても終了しない" },
  "match.drawn": { en: "Drawn series", zh: "平手", ja: "引き分け" },
  "match.anonymous": { en: "Anonymous", zh: "匿名", ja: "匿名" },
  "match.anonymousHint": { en: "Spectators can't see the players' names in this match.", zh: "本場對戰的觀眾看不到雙方的名字。", ja: "この試合では観戦者にプレイヤー名が表示されません。" },
  "match.minimize": { en: "Minimize", zh: "最小化", ja: "最小化" },
  "match.expand": { en: "Expand", zh: "展開", ja: "展開" },
  "match.civPoolTitle": { en: "Civ pools (P1 · P2)", zh: "文明池（P1 · P2）", ja: "文明プール（P1 · P2）" },
  "match.mapPoolTitle": { en: "Map pools (P1 · P2)", zh: "地圖池（P1 · P2）", ja: "マッププール（P1 · P2）" },
  "match.bannedTitle": { en: "Banned civs (P1 · P2)", zh: "已 ban 文明（P1 · P2）", ja: "BAN された文明（P1 · P2）" },
  "match.mapPickedTitle": { en: "Picked", zh: "選的圖", ja: "選んだマップ" },
  "match.mapBannedTitle": { en: "Banned", zh: "Ban 掉的圖", ja: "BAN したマップ" },
  "match.used": { en: "used", zh: "已用", ja: "使用済み" },
  "match.games": { en: "Games", zh: "對局", ja: "ゲーム" },
  "match.colMap": { en: "Map", zh: "地圖", ja: "マップ" },
  "match.colWinner": { en: "Winner", zh: "勝方", ja: "勝者" },
  // turn labels
  "turn.offerBoth": { en: "Both players: secretly pick civs to field", zh: "雙方：秘密選文明出戰", ja: "両プレイヤー：出場する文明を秘密裏に選択" },
  "turn.snipeBoth": { en: "Both players: secretly snipe opponent", zh: "雙方：秘密狙擊對手", ja: "両プレイヤー：相手を秘密裏にスナイプ" },
  "turn.confirmBoth": { en: "Waiting for both players to confirm", zh: "等待雙方確認", ja: "両プレイヤーの確認待ち" },
  "turn.randomDraw": { en: "Random draw…", zh: "隨機抽選中…", ja: "ランダム抽選中…" },
  "turn.awaitResult": { en: "Awaiting previous result", zh: "等待上一局結果", ja: "前ゲームの結果待ち" },
  "turn.banBoth": { en: "Both players: secretly ban", zh: "雙方：秘密進行 ban", ja: "両プレイヤー：秘密裏に BAN" },
  "turn.toBan": { en: "{p} to ban", zh: "{p} 進行 ban", ja: "{p} が BAN" },
  "turn.toPick": { en: "{p} to pick", zh: "{p} 進行 pick", ja: "{p} が PICK" },
  "turn.toSelect": { en: "{p} to select", zh: "{p} 選圖", ja: "{p} がマップ選択" },
  // offer phase
  "offer.title": { en: "Pick {n} civs to field — hidden until both reveal", zh: "選 {n} 個文明出戰——雙方亮牌前隱藏", ja: "出場する文明を {n} つ選択——両者が公開するまで非表示" },
  "offer.titleOpen": { en: "Pick {n} civs to field — in the open, taking turns", zh: "選 {n} 個文明出戰——公開輪流選", ja: "出場する文明を {n} つ選択——公開・交互に選択" },
  "offer.yourOffer": { en: "Your picks", zh: "你的出戰文明", ja: "あなたの出場文明" },
  "offer.locked": { en: "· locked ✓", zh: "· 已鎖定 ✓", ja: "· ロック済み ✓" },
  "offer.oppChoosing": { en: "Opponent · choosing…", zh: "對手 · 選擇中…", ja: "相手 · 選択中…" },
  "offer.oppReady": { en: "Opponent · ready ✓", zh: "對手 · 已就緒 ✓", ja: "相手 · 準備完了 ✓" },
  "offer.chooseHand": { en: "Your hand — choose {n}:", zh: "你的手牌——選 {n} 張：", ja: "あなたの手札——{n} つ選択：" },
  "offer.lockedWait": { en: "Offer locked. Waiting for opponent to reveal…", zh: "出牌已鎖定，等待對手亮牌…", ja: "提示をロックしました。相手の公開を待っています…" },
  "offer.secret": { en: "Both players are secretly offering civs…", zh: "雙方正在秘密出牌…", ja: "両プレイヤーが秘密裏に文明を提示中…" },
  // simultaneous ban phase
  "simulban.title": { en: "Ban {n} — both players at once", zh: "雙方同時各 ban {n} 個", ja: "両プレイヤーが同時に {n} つ BAN" },
  "simulban.hint": { en: "Neither of you can see the other's ban until you have both chosen. Then they show at the same time.", zh: "兩邊都選完之前，誰都看不到對方 ban 了什麼，選完才一起公開。", ja: "両方が選び終わるまで、相手が何を BAN したかは見えません。選び終わると同時に公開されます。" },
  "simulban.yours": { en: "Your bans", zh: "你的 ban", ja: "あなたの BAN" },
  "simulban.lockedWait": { en: "Locked in. Waiting for your opponent…", zh: "已鎖定，等待對手…", ja: "確定しました。相手を待っています…" },
  "simulban.secret": { en: "Both players are secretly banning…", zh: "雙方正在秘密 ban…", ja: "両プレイヤーが秘密裏に BAN 中…" },
  // snipe phase
  "snipe.title": { en: "Snipe {n} of the opponent's offer (this game only)", zh: "狙擊對手出牌中的 {n} 張（僅限本局）", ja: "相手の提示から {n} つスナイプ（このゲームのみ）" },
  "snipe.hint": { en: "A sniped civ only misses this game. It comes back and can be used in a later one.", zh: "被狙掉的文明只是這一局不能用，下一局還可以再拿出來。", ja: "スナイプされた文明はこのゲームで使えないだけです。次のゲームではまた出せます。" },
  "snipe.oppOffered": { en: "Opponent offered — snipe {n}", zh: "對手出牌——狙擊 {n} 張", ja: "相手の提示——{n} つスナイプ" },
  "snipe.yourOfferSurvivor": { en: "Your offer (the un-sniped one becomes your civ)", zh: "你的出牌（沒被狙的成為本局文明）", ja: "あなたの提示（スナイプされなかった方が今ゲームの文明になります）" },
  "snipe.lockedWait": { en: "Snipe locked. Waiting for opponent…", zh: "狙擊已鎖定，等待對手…", ja: "スナイプをロックしました。相手を待っています…" },
  "snipe.secret": { en: "Both players are secretly sniping…", zh: "雙方正在秘密狙擊…", ja: "両プレイヤーが秘密裏にスナイプ中…" },
  "snipe.p1offered": { en: "Player 1 offered", zh: "玩家 1 出牌", ja: "プレイヤー 1 の提示" },
  "snipe.p2offered": { en: "Player 2 offered", zh: "玩家 2 出牌", ja: "プレイヤー 2 の提示" },
  // result
  "result.title": { en: "Game {n} — who won?", zh: "第 {n} 局——誰贏？", ja: "第 {n} ゲーム——勝ったのは？" },
  "result.hostCall": { en: "You're the host — call the result (you can change it later).", zh: "你是房主——直接點選勝方（之後可修改）。", ja: "あなたはホストです——勝者を選んでください（後から変更できます）。" },
  "result.waitingHost": { en: "Waiting for the host to call the result…", zh: "等待房主裁定勝負…", ja: "ホストの判定を待っています…" },
  "result.p1won": { en: "Player 1 won", zh: "玩家 1 獲勝", ja: "プレイヤー 1 の勝ち" },
  "result.p2won": { en: "Player 2 won", zh: "玩家 2 獲勝", ja: "プレイヤー 2 の勝ち" },
  "result.won": { en: "{name} won", zh: "{name} 獲勝", ja: "{name} の勝ち" },
  "result.voteHint": { en: "Pick the winner — it counts once both players agree.", zh: "點選勝方——雙方一致才算數。", ja: "勝者を選んでください——両者の投票が一致すると確定します。" },
  "result.voteWatch": { en: "Players are voting on the winner…", zh: "雙方投票決定勝方中…", ja: "両プレイヤーが勝者を投票中…" },
  "result.votedFor": { en: "voted {name}", zh: "投給 {name}", ja: "{name} に投票" },
  "result.noVote": { en: "no vote yet", zh: "尚未投票", ja: "未投票" },
  "result.disagree": { en: "Votes disagree — the host can resolve it.", zh: "雙方投票不一致——房主可裁定。", ja: "投票が一致しません——ホストが判定できます。" },
  "result.hostResolve": { en: "Host override (referee)", zh: "房主裁定（覆寫）", ja: "ホスト判定（上書き）" },
  // between-games acknowledgement gate
  "ack.title": { en: "{name} won game {n}", zh: "{name} 拿下第 {n} 局", ja: "{name} が第 {n} ゲームを制しました" },
  "ack.prompt": { en: "The next game starts once both players have pressed Got it. Nothing is timed until then.", zh: "兩邊都按過「收到」才會進下一局，在那之前不會開始計時。", ja: "両方が「了解」を押すと次のゲームが始まります。それまで時間は進みません。" },
  "ack.gotIt": { en: "Got it — I'm ready", zh: "收到，我準備好了", ja: "了解——準備できました" },
  "ack.youReady": { en: "You're ready — waiting for the other player…", zh: "你已就緒——等待另一位玩家…", ja: "準備完了——もう一方のプレイヤーを待っています…" },
  "ack.waiting": { en: "Waiting for both players to confirm…", zh: "等待雙方確認…", ja: "両プレイヤーの確認を待っています…" },
  // spectator broadcast view. Labels are short and upper-case in English because
  // they are read at a glance from a stream, not studied.
  "spec.live": { en: "LIVE", zh: "直播中", ja: "配信中" },
  "spec.paused": { en: "PAUSED", zh: "已暫停", ja: "一時停止" },
  "spec.format": { en: "BEST OF {n} · GAME {g}", zh: "{n} 戰制 · 第 {g} 局", ja: "BO{n} · 第 {g} ゲーム" },
  "spec.hand": { en: "HAND · {n} LEFT", zh: "手牌 · 剩 {n}", ja: "手札 · 残り {n}" },
  "spec.handPicking": { en: "PICKING NOW · {n} LEFT", zh: "選擇中 · 剩 {n}", ja: "選択中 · 残り {n}" },
  "spec.civsBanned": { en: "CIVS BANNED", zh: "已 ban 的文明", ja: "BAN した文明" },
  "spec.mapsBanned": { en: "MAPS BANNED", zh: "已 ban 的地圖", ja: "BAN したマップ" },
  "spec.used": { en: "used", zh: "已用", ja: "使用済" },
  "spec.legendPool": { en: "In the pool", zh: "還在池子裡", ja: "プールに残っている" },
  "spec.legendBanned": { en: "Banned", zh: "已被 ban", ja: "BAN 済み" },
  "spec.legendHeld": { en: "{name} holds", zh: "{name} 持有", ja: "{name} が保持" },
  "spec.turnOf": { en: "{name} · {step}", zh: "{name} · {step}", ja: "{name} · {step}" },
  "spec.bothTurn": { en: "Both players · {step}", zh: "雙方 · {step}", ja: "両者 · {step}" },
  "spec.gameMap": { en: "GAME {n} · {map}", zh: "第 {n} 局 · {map}", ja: "第 {n} ゲーム · {map}" },
  "spec.drafting": { en: "DRAFTING", zh: "抽選中", ja: "ドラフト中" },
  "spec.draftOf": { en: "{name} · DRAFT", zh: "{name} · 抽選", ja: "{name} · ドラフト" },
  "spec.banned": { en: "BANNED", zh: "已 ban", ja: "BAN" },
  "spec.locked": { en: "LOCKED IN", zh: "已鎖定", ja: "確定済み" },
  "spec.choosing": { en: "CHOOSING", zh: "選擇中", ja: "選択中" },
  // preset editor — step types
  "step.MAP_BAN": { en: "Ban map", zh: "禁地圖", ja: "マップを BAN" },
  "step.MAP_PICK": { en: "Pick map (into pool)", zh: "選地圖進池", ja: "マップを PICK（プールへ）" },
  "step.CIV_BAN": { en: "Ban civ", zh: "禁文明", ja: "文明を BAN" },
  "step.CIV_PICK": { en: "Pick civ into pool", zh: "選文明進池", ja: "文明を PICK（プールへ）" },
  "step.MAP_SELECT": { en: "Select map", zh: "選圖開打", ja: "対戦マップを選択" },
  "step.SYNC_CONFIRM": { en: "Both players confirm", zh: "雙方確認", ja: "両プレイヤーが確認" },
  // No "(simultaneous)" suffix: the locked 同時進行 checkbox on the row says it,
  // and having it in two places was the reason "simultaneous" looked like two
  // different features depending on the step type.
  "step.CIV_OFFER": { en: "Pick civ to field", zh: "選文明出戰", ja: "出場文明を選択" },
  "step.CIV_SNIPE_OPPONENT": { en: "Snipe opponent", zh: "狙擊對手", ja: "相手をスナイプ" },
  "step.CIV_SNIPE_DRAFT": { en: "Snipe civ (legacy)", zh: "狙擊文明（舊版）", ja: "文明をスナイプ（旧仕様）" },
  "step.GAME_RESULT": { en: "Game result", zh: "對局結果", ja: "ゲーム結果" },
  // actors
  "actor.HOST_DRAW": { en: "🎲 Random (from remaining)", zh: "🎲 隨機（從剩餘）", ja: "🎲 ランダム（残りから）" },
  "actor.PLAYER1": { en: "Player 1", zh: "玩家 1", ja: "プレイヤー 1" },
  "actor.PLAYER2": { en: "Player 2", zh: "玩家 2", ja: "プレイヤー 2" },
  "actor.LOSER": { en: "Loser of prev game", zh: "上一局敗方", ja: "前ゲームの敗者" },
  "actor.WINNER": { en: "Winner of prev game", zh: "上一局勝方", ja: "前ゲームの勝者" },
  "actorShort.HOST_DRAW": { en: "Random", zh: "隨機", ja: "ランダム" },
  "actorShort.PLAYER1": { en: "P1", zh: "P1", ja: "P1" },
  "actorShort.PLAYER2": { en: "P2", zh: "P2", ja: "P2" },
  "actorShort.LOSER": { en: "Loser", zh: "敗方", ja: "敗者" },
  "actorShort.WINNER": { en: "Winner", zh: "勝方", ja: "勝者" },
  // pools
  "pool.map": { en: "map", zh: "地圖", ja: "マップ" },
  "pool.civ": { en: "civ", zh: "文明", ja: "文明" },
  "pool.drafted_civ": { en: "drafted", zh: "已抽池", ja: "ドラフト済み" },
  // editor UI
  "editor.save": { en: "Save", zh: "儲存", ja: "保存" },
  "editor.saving": { en: "Saving…", zh: "儲存中…", ja: "保存中…" },
  "editor.saved": { en: "Saved ✓", zh: "已儲存 ✓", ja: "保存しました ✓" },
  "editor.delete": { en: "Delete", zh: "刪除", ja: "削除" },
  "editor.publicToggle": { en: "Public (others can browse & use)", zh: "公開（他人可瀏覽與使用）", ja: "公開（他の人が閲覧・使用できます）" },
  "editor.descPh": { en: "Description (optional)", zh: "說明（選填）", ja: "説明（任意）" },
  "editor.notReady": { en: "Not ready for play:", zh: "尚不可開戰：", ja: "まだ対戦できません：" },
  "editor.formatOptions": { en: "Format Options", zh: "賽制選項", ja: "形式オプション" },
  "editor.bestOf": { en: "Best of", zh: "幾戰幾勝（總局數）", ja: "総ゲーム数（Best of）" },
  "editor.defaultTimer": { en: "Default timer (sec, 0=∞)", zh: "預設計時（秒，0=無限）", ja: "既定の制限時間（秒、0=無制限）" },
  "editor.publicHover": { en: "Public hover", zh: "公開游標", ja: "カーソル公開" },
  "editor.publicHoverHint": { en: "Spectators see live civ hovers", zh: "觀戰者可看到游標停留的文明", ja: "観戦者にカーソルが乗っている文明を表示" },
  "editor.pausable": { en: "Pausable", zh: "可暫停", ja: "一時停止可" },
  "editor.pausableHint": { en: "Allow pausing the draft", zh: "允許暫停", ja: "ドラフトの一時停止を許可" },
  "editor.anonymous": { en: "Anonymous", zh: "匿名對戰", ja: "匿名モード" },
  "editor.anonymousHint": { en: "Hide player names from spectators (players and host still see them)", zh: "對觀眾隱藏雙方名字（選手與房主仍看得到）", ja: "観戦者にプレイヤー名を隠す（対戦者とホストには表示）" },
  "editor.resultMode": { en: "Winner decided by", zh: "勝負判定方式", ja: "勝敗の決定方法" },
  "editor.resultVote": { en: "Both players vote", zh: "雙方投票", ja: "両プレイヤーの投票" },
  "editor.resultHost": { en: "Host decides", zh: "房主決定", ja: "ホストが決定" },
  "editor.civPool": { en: "Civ Pool", zh: "文明池", ja: "文明プール" },
  "editor.mapPool": { en: "Map Pool", zh: "地圖池", ja: "マッププール" },
  "editor.quickAdd": { en: "Quick add:", zh: "快速加入：", ja: "クイック追加：" },
  "editor.addCustomMap": { en: "Custom map name…", zh: "自訂地圖名稱…", ja: "カスタムマップ名…" },
  "editor.mapImageUrl": { en: "Image URL (optional)…", zh: "圖片連結（選填）…", ja: "画像 URL（任意）…" },
  "editor.urlHint": { en: "Images aren't stored — your link is used directly; a broken link just shows the name.", zh: "圖片不會被保存，直接用你的連結顯示；連不到時只顯示名稱。", ja: "画像は保存されず、リンクをそのまま表示に使います。リンク切れの場合は名前だけが表示されます。" },
  "editor.add": { en: "Add", zh: "加入", ja: "追加" },
  "editor.steps": { en: "Steps", zh: "步驟", ja: "ステップ" },
  "editor.regenerate": { en: "Regenerate from Bo{n}", zh: "依 Bo{n} 重新產生", ja: "Bo{n} から再生成" },
  "editor.addStep": { en: "+ Add step", zh: "+ 新增步驟", ja: "+ ステップを追加" },
  "editor.tip": { en: "Tip: a Select map step with the 🎲 Random actor auto-picks a random pool map — no one has to choose.", zh: "提示：把「選圖開打」步驟的執行者設為 🎲 隨機，系統會自動從池中隨機抽圖，不需要有人選。", ja: "ヒント：「対戦マップを選択」ステップの実行者を 🎲 ランダムにすると、プールから自動で抽選されるので誰も選ぶ必要がありません。" },
  "editor.banPool": { en: "ban: civ pool (global)", zh: "ban 文明池（全域）", ja: "BAN 対象：文明プール（全体）" },
  "editor.banOpponent": { en: "ban: opponent only", zh: "ban 對方選手", ja: "BAN 対象：相手のみ" },
  "editor.mapOwn": { en: "pick from: own map pool", zh: "選圖：自己的池", ja: "選択元：自分のマッププール" },
  "editor.mapShared": { en: "pick from: both players' pools", zh: "選圖：雙方的池", ja: "選択元：両プレイヤーのプール" },
  "editor.showCurrentMap": { en: "show current map", zh: "顯示當前地圖", ja: "現在のマップを表示" },
  "editor.excludeUsedCivs": { en: "exclude used civs", zh: "排除已用文明", ja: "使用済みの文明を除外" },
  "editor.simultaneous": { en: "simultaneous", zh: "同時進行", ja: "同時進行" },
  "editor.simultaneousAlwaysHint": { en: "Always simultaneous. One row covers both players — the count is per player.", zh: "這種步驟一定同時進行。一列就代表雙方，數量是每人各幾個。", ja: "常に同時進行。1 行で両プレイヤー分を表し、数は各プレイヤーあたりです。" },
  "editor.both": { en: "Both", zh: "雙方", ja: "両者" },
  "editor.resultByVote": { en: "by player vote", zh: "由雙方投票", ja: "両プレイヤーの投票" },
  "editor.resultByHost": { en: "by the host", zh: "由房主裁定", ja: "ホストが判定" },
  "editor.resultByHint": { en: "Set in Options above, for the whole preset.", zh: "在上方「選項」統一設定，這個步驟沒有東西要選。", ja: "上の「オプション」でプリセット全体に設定します。" },
  "editor.bothHint": { en: "Both players act at once — one row covers both.", zh: "雙方同時進行，一列就代表兩個人。", ja: "両プレイヤーが同時に行い、1 行で両者を表します。" },
  "editor.simultaneousHint": { en: "On: both act at once, hidden until both submit — no actor, and the count is per player. Off: one seat acts on its turn, in the open.", zh: "勾起來：雙方同時做，互相隱藏到都送出才揭曉，沒有執行者，數量是每人各幾個。不勾：由指定的一方輪流做，公開進行。", ja: "オン：両者が同時に行い、両者が送信するまで伏せられます（実行者なし・数は各プレイヤーあたり）。オフ：指定した側が自分の番に公開で行います。" },
  "editor.pausableShort": { en: "pausable", zh: "可暫停", ja: "一時停止可" },
  "editor.stepNo": { en: "Step order — the draft runs top to bottom", zh: "步驟順序——由上往下依序執行", ja: "ステップ順 — 上から順に実行されます" },
  "editor.countHint": { en: "How many to ban / pick in this step", zh: "這個步驟要 ban / pick 幾個", ja: "このステップで BAN / PICK する数" },
  "editor.timerHint": { en: "Time limit for this step (seconds, 0 = no limit)", zh: "這個步驟的計時（秒，0 = 無限）", ja: "このステップの制限時間（秒、0 = 無制限）" },
  "editor.insert": { en: "Insert step below", zh: "在下方插入步驟", ja: "下にステップを挿入" },
  "editor.dragHint": { en: "drag ⠿ to reorder", zh: "拖曳 ⠿ 調整順序", ja: "⠿ をドラッグして並べ替え" },
  "editor.regenConfirm": { en: "Regenerate steps from the default flow? This replaces the current step list.", zh: "要依預設流程重新產生步驟嗎？這會取代目前的步驟清單。", ja: "既定のフローからステップを再生成しますか？現在のステップ一覧は置き換えられます。" },
  "editor.deleteConfirm": { en: "Delete this preset permanently?", zh: "確定永久刪除此規則組？", ja: "このプリセットを完全に削除しますか？" },
  // Preset validation. Keys match the `code` values in lib/draft/validate.ts;
  // {placeholders} are the numbers that made the rule fail, so the reader can see
  // what to change without counting steps by hand.
  "validate.noMaps": { en: "The map pool needs at least 1 map.", zh: "地圖池至少要有 1 張地圖。", ja: "マッププールにはマップが最低 1 つ必要です。" },
  "validate.noCivs": { en: "The civ pool needs at least 2 civilizations to choose from.", zh: "文明池至少要有 2 個文明可選。", ja: "文明プールには選べる文明が最低 2 つ必要です。" },
  "validate.noGames": { en: "Add at least one game (a “Game result” step).", zh: "至少要有一場比賽（一個「對局結果」步驟）。", ja: "最低 1 ゲーム（「ゲーム結果」ステップ）を追加してください。" },
  "validate.tooFewGames": { en: "Best of {bestOf} needs at least {needed} games (“Game result” steps) so the series can always be decided — there are only {have}.", zh: "Bo{bestOf} 至少需要 {needed} 場比賽（「對局結果」步驟），系列賽才能確保分出勝負 —— 目前只有 {have} 場。", ja: "Bo{bestOf} では必ず決着がつくように「ゲーム結果」ステップが最低 {needed} 個必要ですが、現在は {have} 個しかありません。" },
  "validate.mapOverdraw": { en: "Map bans + picks ({used}) exceed the map pool ({pool}).", zh: "地圖 ban + pick 的數量（{used}）超過地圖池上限（{pool}）。", ja: "マップの BAN + PICK の合計（{used}）がマッププール（{pool}）を超えています。" },
  "validate.mapPoolEmpty": { en: "After bans/picks the map pool would be empty — no map to play.", zh: "ban/pick 之後地圖池會空掉 —— 沒有地圖可以打。", ja: "BAN/PICK の後にマッププールが空になり、プレイするマップがありません。" },
  "validate.civOverdraw": { en: "Civ pool bans + drafts ({used}) exceed the civ pool ({pool}).", zh: "文明 ban + draft 的數量（{used}）超過文明池上限（{pool}）。", ja: "文明の BAN + ドラフトの合計（{used}）が文明プール（{pool}）を超えています。" },
  "validate.gameNoMap": { en: "Game {game}: add a “Select map” step — the game has no map.", zh: "第 {game} 場：需要一個「選擇地圖」步驟 —— 這場沒有地圖。", ja: "ゲーム {game}：「マップを選択」ステップを追加してください。マップがありません。" },
  "validate.gameNoCiv": { en: "Game {game}: add a civ step (offer/snipe) — players have no civ.", zh: "第 {game} 場：需要一個文明步驟（選文明出戰／狙擊）—— 選手沒有文明可用。", ja: "ゲーム {game}：文明ステップ（出場文明の選択／スナイプ）を追加してください。使う文明がありません。" },
  "validate.offerMinusSnipe": { en: "Game {game}: offer ({offer}) minus snipe ({snipe}) must be at least 1, or a player can be left with no civ.", zh: "第 {game} 場：選文明出戰（{offer}）扣掉狙擊（{snipe}）後必須至少剩 1，否則可能出現選手沒有文明可選的情況。", ja: "ゲーム {game}：出場文明の数（{offer}）からスナイプ（{snipe}）を引いた値は 1 以上必要です。さもないと使える文明が無くなる可能性があります。" },
  "validate.handTooSmall": { en: "Each player's hand ({hand}) is smaller than the number of games ({games}); with “exclude used civs” they will run out.", zh: "每位選手的文明池（{hand}）少於比賽場數（{games}），開了「排除已用文明」會不夠用。", ja: "各プレイヤーの手持ち文明（{hand}）がゲーム数（{games}）より少ないため、「使用済み文明を除外」を有効にすると足りなくなります。" },
};

// BCP-47 tag written to <html lang> for each locale.
const HTML_LANG: Record<Locale, string> = { en: "en", zh: "zh-Hant", cn: "zh-Hans", ja: "ja" };

interface I18nCtx { locale: Locale; setLocale: (l: Locale) => void; t: (key: string, vars?: Record<string, string | number>) => string; }
const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en"); // default English

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("locale")) as Locale | null;
    if (saved === "en" || saved === "zh" || saved === "cn" || saved === "ja") { setLocaleState(saved); return; }
    // No saved preference → follow the browser's language.
    const lang = (typeof navigator !== "undefined" ? navigator.language : "").toLowerCase();
    if (lang.startsWith("zh")) setLocaleState(/(cn|hans|sg|my)/.test(lang) ? "cn" : "zh");
    else if (lang.startsWith("ja")) setLocaleState("ja");
  }, []);

  // Keep <html lang> in sync — browsers pick Han glyph variants from it, so a
  // stale lang="en" renders Japanese text with Chinese-shaped kanji.
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[locale];
  }, [locale]);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem("locale", l); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const entry = DICT[key];
    let str = !entry ? key : locale === "cn" ? toSimplified(entry.zh) : entry[locale];
    if (vars) for (const [k, v] of Object.entries(vars)) str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    return str;
  }, [locale]);

  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  const ctx = useContext(Ctx);
  if (!ctx) return { locale: "en", setLocale: () => {}, t: (k) => DICT[k]?.en ?? k };
  return ctx;
}

// Render a translated string inside server components (which can't call the hook).
export function T({ k, vars }: { k: string; vars?: Record<string, string | number> }) {
  const { t } = useI18n();
  return <>{t(k, vars)}</>;
}

// Every selectable locale, in menu order, with its own-language label.
const LOCALES: { value: Locale; label: string }[] = [
  { value: "en", label: "English" },
  { value: "zh", label: "繁體中文" },
  { value: "cn", label: "简体中文" },
  { value: "ja", label: "日本語" },
];

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value as Locale)}
      aria-label="Language"
      title="Switch language / 切換語言 / 切换语言 / 言語を切り替え"
      className="rounded border border-border bg-surface px-2 py-1 text-xs text-muted outline-none hover:text-gold-bright focus:border-gold"
    >
      {LOCALES.map((l) => (
        <option key={l.value} value={l.value}>{l.label}</option>
      ))}
    </select>
  );
}
