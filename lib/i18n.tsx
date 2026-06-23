"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Locale = "en" | "zh";

// Flat dictionary. {var} placeholders are interpolated by t().
const DICT: Record<string, { en: string; zh: string }> = {
  // nav / header
  "nav.presets": { en: "Presets", zh: "規則組" },
  "nav.signin": { en: "Sign in", zh: "登入" },
  "nav.signout": { en: "Sign out", zh: "登出" },
  "nav.commander": { en: "Commander", zh: "指揮官" },
  "account.title": { en: "Profile", zh: "個人資料" },
  "account.username": { en: "Display name", zh: "顯示名稱" },
  "account.hint": { en: "Your display name is the only thing you can change here.", zh: "這裡唯一能修改的就是你的顯示名稱。" },
  "account.save": { en: "Save", zh: "儲存" },
  "account.saving": { en: "Saving…", zh: "儲存中…" },
  "account.saved": { en: "Saved ✓", zh: "已儲存 ✓" },
  // home
  "home.kicker": { en: "Age of Empires IV", zh: "世紀帝國 IV" },
  "home.title": { en: "Ban. Pick. Conquer.", zh: "運籌帷幄，決勝開局" },
  "home.subtitle": { en: "Tournament drafting for Age of Empires IV.", zh: "世紀帝國 IV · 文明與地圖 Ban/Pick" },
  "home.createDraft": { en: "Start a draft", zh: "開始對戰" },
  "home.browse": { en: "Browse presets", zh: "瀏覽規則組" },
  "home.f1t": { en: "Fully Configurable", zh: "完全可自訂" },
  "home.f1d": { en: "Rounds, civ pools, snipe rules, per-step timers, pauses — your format, your rules.", zh: "輪數、文明池、狙擊規則、每步驟計時、暫停——你的賽制由你定。" },
  "home.f2t": { en: "Live Spectating", zh: "即時觀戰" },
  "home.f2d": { en: "Watch bans, picks and (optionally) live civ hovers in real time.", zh: "即時觀看 ban、pick，以及（可選）選手游標停留的文明。" },
  "home.f3t": { en: "Honor-System Results", zh: "雙方約定勝負" },
  "home.f3d": { en: "Either side marks the winner; the host can revert a misclick.", zh: "兩邊都能點選勝方；房主可修正誤點。" },
  "home.roster": { en: "The Roster", zh: "文明陣容" },
  "home.civs": { en: "{n} civilizations", zh: "{n} 個文明" },
  "home.footer": { en: "Built for the community · Civ art © Relic/Microsoft, via the Age of Empires Wiki", zh: "為社群打造 · 文明美術 © Relic/Microsoft，來源 Age of Empires Wiki" },
  // login
  "login.enter": { en: "Enter the Hall", zh: "進入大廳" },
  "login.forge": { en: "Forge Your Banner", zh: "建立帳號" },
  "login.username": { en: "Username", zh: "使用者名稱" },
  "login.email": { en: "Email or username", zh: "電子郵件 / 使用者名稱" },
  "login.password": { en: "Password", zh: "密碼" },
  "login.inviteCode": { en: "Invite code", zh: "邀請碼" },
  "login.inviteHint": { en: "Registration is invite-only — ask an admin for a code.", zh: "註冊採邀請制——請向管理員索取邀請碼。" },
  "login.signin": { en: "Sign in", zh: "登入" },
  "login.create": { en: "Create account", zh: "建立帳號" },
  "login.noBanner": { en: "No banner yet? ", zh: "還沒有帳號？" },
  "login.enlisted": { en: "Already enlisted? ", zh: "已經有帳號？" },
  "login.register": { en: "Register", zh: "註冊" },
  "login.invalid": { en: "Invalid email or password", zh: "電子郵件或密碼錯誤" },
  "login.failed": { en: "Registration failed", zh: "註冊失敗" },
  // presets
  "presets.title": { en: "Presets", zh: "規則組" },
  "presets.subtitle": { en: "Your draft formats.", zh: "你的 ban/pick 賽制。" },
  "presets.new": { en: "+ New Preset", zh: "+ 新規則組" },
  "presets.forging": { en: "Forging…", zh: "建立中…" },
  "presets.signinCreate": { en: "Sign in to create", zh: "登入以建立" },
  "presets.none": { en: "No presets yet. Forge your first one.", zh: "還沒有規則組，建立第一個吧。" },
  "presets.noneSignin": { en: "No presets yet. Sign in to get started.", zh: "還沒有規則組，登入後開始。" },
  "presets.start": { en: "Start match", zh: "開始對戰" },
  "presets.edit": { en: "Edit", zh: "編輯" },
  "presets.clone": { en: "Clone", zh: "複製" },
  "presets.cloning": { en: "Cloning…", zh: "複製中…" },
  "presets.togglePublicHint": { en: "Toggle public — others can browse & clone it", zh: "切換公開——他人可瀏覽與複製" },
  "presets.tabMine": { en: "My presets", zh: "我的規則" },
  "presets.tabPublic": { en: "All public", zh: "所有公開" },
  "presets.search": { en: "Search by name…", zh: "依名稱搜尋…" },
  "presets.prev": { en: "← Prev", zh: "← 上一頁" },
  "presets.next": { en: "Next →", zh: "下一頁 →" },
  "presets.pageOf": { en: "Page {p} / {n}", zh: "第 {p} / {n} 頁" },
  "presets.none2": { en: "No presets found.", zh: "找不到規則。" },
  "presets.limitReached": { en: "You can have at most 2 presets — delete one first.", zh: "最多只能有 2 個規則，請先刪除一個。" },
  "presets.demo": { en: "demo", zh: "範例" },
  "presets.demoLockedHint": { en: "Built-in demo — always public, can't be edited or deleted. Clone it to customize.", zh: "內建範例——固定公開，無法編輯或刪除。複製一份即可自訂。" },
  "common.public": { en: "Public", zh: "公開" },
  "common.private": { en: "Private", zh: "私人" },
  "presets.yours": { en: "yours", zh: "你的" },
  "presets.steps": { en: "{n} steps", zh: "{n} 步驟" },
  // match room
  "match.room": { en: "Draft Room", zh: "對戰房間" },
  "match.spectatorLink": { en: "Spectator link ↗", zh: "觀戰連結 ↗" },
  "match.spectating": { en: "Spectating", zh: "觀戰中" },
  "match.connecting": { en: "Connecting to the draft…", zh: "連線中…" },
  "match.bestOf": { en: "Best of {n} · first to {t}", zh: "{n} 戰 {t} 勝制" },
  "match.lobby": { en: "LOBBY", zh: "大廳" },
  "match.boTitle": { en: "Best of {n}", zh: "{n} 戰制" },
  "match.youAre": { en: "You are", zh: "你的身分" },
  "match.host": { en: "host", zh: "房主" },
  "match.referee": { en: "Host / Referee", zh: "房主 / 裁判" },
  "match.hostHint": { en: "You're the host. Take a seat to play, or stay as referee.", zh: "你是房主。可入座當隊長，或保持裁判身分。" },
  "match.p1": { en: "Player 1", zh: "玩家 1" },
  "match.p2": { en: "Player 2", zh: "玩家 2" },
  "match.spectator": { en: "Spectator", zh: "觀戰者" },
  "match.you": { en: "you", zh: "你" },
  "match.open": { en: "— open —", zh: "— 空位 —" },
  "match.ready": { en: "Ready ✓", zh: "已準備 ✓" },
  "match.notReady": { en: "Not ready", zh: "未準備" },
  "match.readyUp": { en: "Ready up", zh: "準備" },
  "match.unready": { en: "Unready", zh: "取消準備" },
  "match.rename": { en: "Rename", zh: "改名" },
  "match.save": { en: "Save", zh: "儲存" },
  "match.takeSeat": { en: "Take this seat", zh: "坐這個位子" },
  "match.waitingPlayer": { en: "Waiting for a player…", zh: "等待玩家…" },
  "match.invite": { en: "Invite your opponent", zh: "邀請對手" },
  "match.copyLink": { en: "Copy link", zh: "複製連結" },
  "match.copied": { en: "Copied!", zh: "已複製！" },
  "match.shareHint": { en: "Share this link; they sign in and take the open seat.", zh: "把連結傳給對手；他登入後坐空位即可。" },
  "match.waitSeats": { en: "Waiting for both seats to be filled…", zh: "等待雙方就座…" },
  "match.starting": { en: "Starting…", zh: "開始中…" },
  "match.readyToBegin": { en: "Both players must ready up to begin.", zh: "雙方都按準備才會開始。" },
  "match.forceStart": { en: "Force start (host)", zh: "強制開始（房主）" },
  "match.pause": { en: "Pause", zh: "暫停" },
  "match.resume": { en: "Resume", zh: "繼續" },
  "match.paused": { en: "PAUSED", zh: "已暫停" },
  "match.p1wins": { en: "Player 1 wins!", zh: "玩家 1 獲勝！" },
  "match.p2wins": { en: "Player 2 wins!", zh: "玩家 2 獲勝！" },
  "match.yourMove": { en: "Your move.", zh: "輪到你。" },
  "match.currentMap": { en: "Current map:", zh: "本局地圖：" },
  "match.maps": { en: "Maps", zh: "地圖" },
  "match.civs": { en: "Civilizations", zh: "文明" },
  "match.handP1": { en: "Player 1 · civ pool", zh: "玩家 1 · 文明池" },
  "match.handP2": { en: "Player 2 · civ pool", zh: "玩家 2 · 文明池" },
  "match.mapsP1": { en: "Player 1 · map pool", zh: "玩家 1 · 地圖池" },
  "match.mapsP2": { en: "Player 2 · map pool", zh: "玩家 2 · 地圖池" },
  "match.bannedP1": { en: "Player 1 · banned", zh: "玩家 1 · 已 ban" },
  "match.bannedP2": { en: "Player 2 · banned", zh: "玩家 2 · 已 ban" },
  "match.used": { en: "used", zh: "已用" },
  "match.games": { en: "Games", zh: "對局" },
  "match.colMap": { en: "Map", zh: "地圖" },
  "match.colWinner": { en: "Winner", zh: "勝方" },
  // turn labels
  "turn.offerBoth": { en: "Both players: secretly pick civs to field", zh: "雙方：秘密選文明出戰" },
  "turn.snipeBoth": { en: "Both players: secretly snipe opponent", zh: "雙方：秘密狙擊對手" },
  "turn.randomDraw": { en: "Random draw…", zh: "隨機抽選中…" },
  "turn.awaitResult": { en: "Awaiting previous result", zh: "等待上一局結果" },
  "turn.toBan": { en: "{p} to ban", zh: "{p} 進行 ban" },
  "turn.toPick": { en: "{p} to pick", zh: "{p} 進行 pick" },
  "turn.toSelect": { en: "{p} to select", zh: "{p} 選圖" },
  // offer phase
  "offer.title": { en: "Pick {n} civs to field — hidden until both reveal", zh: "選 {n} 個文明出戰——雙方亮牌前隱藏" },
  "offer.yourOffer": { en: "Your picks", zh: "你的出戰文明" },
  "offer.locked": { en: "· locked ✓", zh: "· 已鎖定 ✓" },
  "offer.oppChoosing": { en: "Opponent · choosing…", zh: "對手 · 選擇中…" },
  "offer.oppReady": { en: "Opponent · ready ✓", zh: "對手 · 已就緒 ✓" },
  "offer.chooseHand": { en: "Your hand — choose {n}:", zh: "你的手牌——選 {n} 張：" },
  "offer.lockedWait": { en: "Offer locked. Waiting for opponent to reveal…", zh: "出牌已鎖定，等待對手亮牌…" },
  "offer.secret": { en: "Both players are secretly offering civs…", zh: "雙方正在秘密出牌…" },
  // snipe phase
  "snipe.title": { en: "Snipe {n} of the opponent's offer (this game only)", zh: "狙擊對手出牌中的 {n} 張（僅限本局）" },
  "snipe.hint": { en: "Sniped civs return to the hand for later games — this is not a permanent ban.", zh: "被狙的文明會回到手牌、之後可再用——這不是永久 ban。" },
  "snipe.oppOffered": { en: "Opponent offered — snipe {n}", zh: "對手出牌——狙擊 {n} 張" },
  "snipe.yourOfferSurvivor": { en: "Your offer (the un-sniped one becomes your civ)", zh: "你的出牌（沒被狙的成為本局文明）" },
  "snipe.lockedWait": { en: "Snipe locked. Waiting for opponent…", zh: "狙擊已鎖定，等待對手…" },
  "snipe.secret": { en: "Both players are secretly sniping…", zh: "雙方正在秘密狙擊…" },
  "snipe.p1offered": { en: "Player 1 offered", zh: "玩家 1 出牌" },
  "snipe.p2offered": { en: "Player 2 offered", zh: "玩家 2 出牌" },
  // result
  "result.title": { en: "Game {n} — who won?", zh: "第 {n} 局——誰贏？" },
  "result.hostCall": { en: "You're the host — call the result (you can change it later).", zh: "你是房主——直接點選勝方（之後可修改）。" },
  "result.waitingHost": { en: "Waiting for the host to call the result…", zh: "等待房主裁定勝負…" },
  "result.p1won": { en: "Player 1 won", zh: "玩家 1 獲勝" },
  "result.p2won": { en: "Player 2 won", zh: "玩家 2 獲勝" },
  // preset editor — step types
  "step.MAP_BAN": { en: "Ban map", zh: "禁地圖" },
  "step.MAP_PICK": { en: "Pick map (into pool)", zh: "選地圖進池" },
  "step.CIV_BAN": { en: "Ban civ", zh: "禁文明" },
  "step.CIV_PICK": { en: "Pick civ into pool", zh: "選文明進池" },
  "step.MAP_SELECT": { en: "Select map", zh: "選圖開打" },
  "step.CIV_OFFER": { en: "Pick civ to field (simultaneous)", zh: "選文明出戰（同時）" },
  "step.CIV_SNIPE_OPPONENT": { en: "Snipe opponent (simultaneous)", zh: "狙擊對手（同時）" },
  "step.CIV_SNIPE_DRAFT": { en: "Snipe civ (legacy)", zh: "狙擊文明（舊版）" },
  "step.GAME_RESULT": { en: "Game result", zh: "對局結果" },
  // actors
  "actor.HOST_DRAW": { en: "🎲 Random (from remaining)", zh: "🎲 隨機（從剩餘）" },
  "actor.PLAYER1": { en: "Player 1", zh: "玩家 1" },
  "actor.PLAYER2": { en: "Player 2", zh: "玩家 2" },
  "actor.LOSER": { en: "Loser of prev game", zh: "上一局敗方" },
  "actor.WINNER": { en: "Winner of prev game", zh: "上一局勝方" },
  "actorShort.HOST_DRAW": { en: "Random", zh: "隨機" },
  "actorShort.PLAYER1": { en: "P1", zh: "P1" },
  "actorShort.PLAYER2": { en: "P2", zh: "P2" },
  "actorShort.LOSER": { en: "Loser", zh: "敗方" },
  "actorShort.WINNER": { en: "Winner", zh: "勝方" },
  // pools
  "pool.map": { en: "map", zh: "地圖" },
  "pool.civ": { en: "civ", zh: "文明" },
  "pool.drafted_civ": { en: "drafted", zh: "已抽池" },
  // editor UI
  "editor.save": { en: "Save", zh: "儲存" },
  "editor.saving": { en: "Saving…", zh: "儲存中…" },
  "editor.saved": { en: "Saved ✓", zh: "已儲存 ✓" },
  "editor.delete": { en: "Delete", zh: "刪除" },
  "editor.publicToggle": { en: "Public (others can browse & use)", zh: "公開（他人可瀏覽與使用）" },
  "editor.descPh": { en: "Description (optional)", zh: "說明（選填）" },
  "editor.notReady": { en: "Not ready for play:", zh: "尚不可開戰：" },
  "editor.formatOptions": { en: "Format Options", zh: "賽制選項" },
  "editor.bestOf": { en: "Best of", zh: "幾戰幾勝（總局數）" },
  "editor.defaultTimer": { en: "Default timer (sec, 0=∞)", zh: "預設計時（秒，0=無限）" },
  "editor.publicHover": { en: "Public hover", zh: "公開游標" },
  "editor.publicHoverHint": { en: "Spectators see live civ hovers", zh: "觀戰者可看到游標停留的文明" },
  "editor.pausable": { en: "Pausable", zh: "可暫停" },
  "editor.pausableHint": { en: "Allow pausing the draft", zh: "允許暫停" },
  "editor.civPool": { en: "Civ Pool", zh: "文明池" },
  "editor.mapPool": { en: "Map Pool", zh: "地圖池" },
  "editor.quickAdd": { en: "Quick add:", zh: "快速加入：" },
  "editor.addCustomMap": { en: "Custom map name…", zh: "自訂地圖名稱…" },
  "editor.mapImageUrl": { en: "Image URL (optional)…", zh: "圖片連結（選填）…" },
  "editor.urlHint": { en: "Images aren't stored — your link is used directly; a broken link just shows the name.", zh: "圖片不會被保存，直接用你的連結顯示；連不到時只顯示名稱。" },
  "editor.add": { en: "Add", zh: "加入" },
  "editor.steps": { en: "Steps", zh: "步驟" },
  "editor.regenerate": { en: "Regenerate from Bo{n}", zh: "依 Bo{n} 重新產生" },
  "editor.addStep": { en: "+ Add step", zh: "+ 新增步驟" },
  "editor.tip": { en: "Tip: a Select map step with the 🎲 Random actor auto-picks a random pool map — no one has to choose.", zh: "提示：把「選圖開打」步驟的執行者設為 🎲 隨機，系統會自動從池中隨機抽圖，不需要有人選。" },
  "editor.banPool": { en: "ban: civ pool (global)", zh: "ban 文明池（全域）" },
  "editor.banOpponent": { en: "ban: opponent only", zh: "ban 對方選手" },
  "editor.showCurrentMap": { en: "show current map", zh: "顯示當前地圖" },
  "editor.excludeUsedCivs": { en: "exclude used civs", zh: "排除已用文明" },
  "editor.pausableShort": { en: "pausable", zh: "可暫停" },
  "editor.insert": { en: "Insert step below", zh: "在下方插入步驟" },
  "editor.dragHint": { en: "drag ⠿ to reorder", zh: "拖曳 ⠿ 調整順序" },
  "editor.regenConfirm": { en: "Regenerate steps from the default flow? This replaces the current step list.", zh: "要依預設流程重新產生步驟嗎？這會取代目前的步驟清單。" },
  "editor.deleteConfirm": { en: "Delete this preset permanently?", zh: "確定永久刪除此規則組？" },
};

interface I18nCtx { locale: Locale; setLocale: (l: Locale) => void; t: (key: string, vars?: Record<string, string | number>) => string; }
const Ctx = createContext<I18nCtx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("zh");

  useEffect(() => {
    const saved = (typeof localStorage !== "undefined" && localStorage.getItem("locale")) as Locale | null;
    if (saved === "en" || saved === "zh") setLocaleState(saved);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try { localStorage.setItem("locale", l); } catch { /* ignore */ }
  }, []);

  const t = useCallback((key: string, vars?: Record<string, string | number>) => {
    const entry = DICT[key];
    let str = entry ? entry[locale] : key;
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

export function LanguageToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <button
      onClick={() => setLocale(locale === "en" ? "zh" : "en")}
      className="rounded border border-border px-2 py-1 text-xs text-muted hover:text-gold-bright"
      title="Switch language"
    >
      {locale === "en" ? "中文" : "EN"}
    </button>
  );
}
