"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Thumb } from "@/components/Thumb";
import type { ClientPreset } from "@/lib/presets";
import { isSimultaneousStep } from "@/lib/draft/schema";
import type { PresetConfig, Step, StepType, Actor, Pool, PoolEntry } from "@/lib/draft/schema";
import { buildDefaultConfig } from "@/lib/draft/defaultPreset";
import { gameIndexOfSteps } from "@/lib/draft/engine";
import { validatePreset } from "@/lib/draft/validate";
import { defaultStepLabel } from "@/lib/draft/stepLabel";
import { ClonePresetButton } from "@/components/preset/ClonePresetButton";
import { useI18n } from "@/lib/i18n";
import { CIVS } from "@/data/civs";
import { DEFAULT_MAPS } from "@/data/maps";

const STEP_TYPES: StepType[] = [
  "MAP_BAN", "MAP_PICK", "CIV_BAN", "CIV_PICK", "MAP_SELECT", "SYNC_CONFIRM", "CIV_OFFER", "CIV_SNIPE_OPPONENT", "GAME_RESULT",
];
const ACTORS: Actor[] = ["HOST_DRAW", "PLAYER1", "PLAYER2", "LOSER", "WINNER"];
// No POOLS list any more: a step's pool is fully determined by its type
// (see poolForType), so offering it as a dropdown only let you build presets
// whose pool contradicted their type.

// The pool a step operates on, derived from its type.
function poolForType(type: StepType): Pool {
  if (type === "MAP_BAN" || type === "MAP_PICK" || type === "MAP_SELECT" || type === "GAME_RESULT") return "map";
  if (type === "CIV_BAN" || type === "CIV_PICK" || type === "SYNC_CONFIRM") return "civ"; // SYNC_CONFIRM has no pool; value unused
  return "drafted_civ"; // CIV_OFFER / CIV_SNIPE_OPPONENT
}

/**
 * Which controls actually mean anything for a given step type.
 *
 * The engine already ignores the rest: `schema.ts` says the actor "is ignored"
 * for simultaneous steps, and a GAME_RESULT winner comes from
 * `options.resultMode` (vote or host), not from a seat or a pool. The editor
 * used to render every control for every type anyway — which is what made a
 * simultaneous step look like it belonged to player 1, and left "who decides
 * the result?" as a question with no correct answer.
 */
type StepFields = {
  actor: boolean;
  count: boolean;
  timer: boolean;
  excludeUsedCivs: boolean;
  // "always" = simultaneity is inherent to the type, so it can't be switched off.
  simultaneous: false | "editable" | "always";
};

function fieldsFor(s: Step): StepFields {
  switch (s.type) {
    case "MAP_BAN":
      return { actor: !s.simultaneous, count: true, timer: true, excludeUsedCivs: false, simultaneous: "editable" };
    case "CIV_BAN":
      return { actor: !s.simultaneous, count: true, timer: true, excludeUsedCivs: true, simultaneous: "editable" };
    case "MAP_PICK":
      return { actor: true, count: true, timer: true, excludeUsedCivs: false, simultaneous: false };
    case "CIV_PICK":
      return { actor: true, count: true, timer: true, excludeUsedCivs: true, simultaneous: false };
    case "MAP_SELECT":
      // Selects the single map played this game, so a count would mean nothing.
      return { actor: true, count: false, timer: true, excludeUsedCivs: false, simultaneous: false };
    case "CIV_OFFER":
      // Classically both sides choose blind at once, but a format may instead
      // draft the fielded civs in the open, one seat at a time — so this one is
      // the reverse of a ban: simultaneous unless you switch it off.
      return { actor: !isSimultaneousStep(s), count: true, timer: true, excludeUsedCivs: true, simultaneous: "editable" };
    case "CIV_SNIPE_OPPONENT":
      return { actor: false, count: true, timer: true, excludeUsedCivs: true, simultaneous: "always" };
    case "SYNC_CONFIRM":
      return { actor: false, count: false, timer: true, excludeUsedCivs: false, simultaneous: "always" };
    case "GAME_RESULT":
      return { actor: false, count: false, timer: false, excludeUsedCivs: false, simultaneous: false };
  }
}

// A simultaneous step's edge is player 1's blue running into player 2's rose —
// literally "both of them". Gold was the obvious pick but the palette already
// spends amber on prev-game winner/loser and on the game result, and a third
// yellow next to those two reads as the same colour.
const EDGE_BOTH =
  "border-l-transparent before:absolute before:inset-y-0 before:-left-1 before:w-1 " +
  "before:bg-gradient-to-b before:from-sky-500/80 before:to-rose-500/80";

// Left edge = who acts.
function edgeClass(s: Step): string {
  if (s.type === "GAME_RESULT") return "border-l-amber-500/60";
  if (!fieldsFor(s).actor) return EDGE_BOTH;
  if (s.actor === "PLAYER1") return "border-l-sky-500/70";
  if (s.actor === "PLAYER2") return "border-l-rose-500/70";
  if (s.actor === "LOSER" || s.actor === "WINNER") return "border-l-amber-500/60";
  return "border-l-bronze";
}

function newStep(): Step {
  const base = {
    type: "CIV_BAN" as StepType,
    actor: "PLAYER1" as Actor,
    pool: "civ" as Pool,
    count: 1,
    timeLimitSec: 30,
    showCurrentMap: false,
    excludeUsedCivs: true,
    banScope: "opponent" as const,
    pausable: false,
  };
  return { id: crypto.randomUUID(), ...base, label: defaultStepLabel(base) };
}

export function PresetEditor({ initial }: { initial: ClientPreset }) {
  const router = useRouter();
  const { t } = useI18n();
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [isPublic, setIsPublic] = useState(initial.isPublic);
  const [config, setConfig] = useState<PresetConfig>(initial.config);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const includedCiv = new Set(config.civs.map((c) => c.id));
  const includedMap = new Set(config.maps.map((m) => m.id));
  // Catalog = default maps + any custom maps already in this preset.
  const mapCatalog = [...DEFAULT_MAPS, ...config.maps.filter((m) => !DEFAULT_MAPS.some((d) => d.id === m.id))];

  function patchOptions(p: Partial<PresetConfig["options"]>) {
    setConfig((c) => ({ ...c, options: { ...c.options, ...p } }));
  }

  function toggleCiv(entry: PoolEntry) {
    setConfig((c) => {
      const has = c.civs.some((x) => x.id === entry.id);
      return {
        ...c,
        civs: has ? c.civs.filter((x) => x.id !== entry.id) : [...c.civs, { id: entry.id, name: entry.name, imageUrl: entry.imageUrl }],
      };
    });
  }

  function toggleMap(entry: PoolEntry) {
    setConfig((c) => {
      const has = c.maps.some((x) => x.id === entry.id);
      return {
        ...c,
        maps: has ? c.maps.filter((x) => x.id !== entry.id) : [...c.maps, entry],
      };
    });
  }

  function addCustomMap(rawName: string, imageUrl?: string) {
    const trimmed = rawName.trim();
    if (!trimmed) return;
    const id = trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    if (!id || includedMap.has(id)) return;
    const url = imageUrl?.trim();
    setConfig((c) => ({ ...c, maps: [...c.maps, { id, name: trimmed, ...(url ? { imageUrl: url } : {}) }] }));
  }

  function updateStep(idx: number, patch: Partial<Step>) {
    setConfig((c) => {
      const steps = c.steps.slice();
      steps[idx] = { ...steps[idx], ...patch };
      return { ...c, steps };
    });
  }
  // Like updateStep, but re-generates the label and auto-syncs the pool to the type.
  function updateStepMeta(idx: number, patch: Partial<Step>) {
    setConfig((c) => {
      const steps = c.steps.slice();
      const old = steps[idx];
      const merged = { ...old, ...patch };
      if (patch.type) {
        merged.pool = poolForType(patch.type);
        // Drop the old type's simultaneity so the new type falls back to its own
        // default — otherwise a ban switched to "pick civ to field" would silently
        // arrive turn-based, carrying a flag the previous type meant something
        // else by.
        delete merged.simultaneous;
      }
      const wasAuto = !old.label || old.label === defaultStepLabel(old);
      if (wasAuto) merged.label = defaultStepLabel(merged);
      steps[idx] = merged;
      return { ...c, steps };
    });
  }
  function moveStep(idx: number, dir: -1 | 1) {
    setConfig((c) => {
      const steps = c.steps.slice();
      const j = idx + dir;
      if (j < 0 || j >= steps.length) return c;
      [steps[idx], steps[j]] = [steps[j], steps[idx]];
      return { ...c, steps };
    });
  }
  function removeStep(idx: number) {
    setConfig((c) => ({ ...c, steps: c.steps.filter((_, i) => i !== idx) }));
  }
  // Adding a step duplicates the last one (or a fresh default if the list is empty),
  // so you can keep adding similar steps quickly.
  function addStep() {
    setConfig((c) => ({ ...c, steps: [...c.steps, c.steps.length ? { ...c.steps[c.steps.length - 1], id: crypto.randomUUID() } : newStep()] }));
  }
  // Insert a COPY of the clicked step right after it (a new id keeps React keys unique).
  function insertStep(idx: number) {
    setConfig((c) => {
      const steps = c.steps.slice();
      const src = steps[idx] ?? newStep();
      steps.splice(idx + 1, 0, { ...src, id: crypto.randomUUID() });
      return { ...c, steps };
    });
  }
  // Move a step from one index to another (drag-and-drop reorder).
  function moveTo(from: number, to: number) {
    setConfig((c) => {
      if (from === to || from < 0 || to < 0 || from >= c.steps.length || to >= c.steps.length) return c;
      const steps = c.steps.slice();
      const [m] = steps.splice(from, 1);
      steps.splice(to, 0, m);
      return { ...c, steps };
    });
  }
  function regenerate() {
    if (!confirm(t("editor.regenConfirm"))) return;
    const fresh = buildDefaultConfig(config.options.bestOf);
    setConfig((c) => ({ ...c, steps: fresh.steps }));
  }

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/presets/${initial.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, description, isPublic, config }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "Save failed");
      }
      setStatus(t("editor.saved"));
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!confirm(t("editor.deleteConfirm"))) return;
    const res = await fetch(`/api/presets/${initial.id}`, { method: "DELETE" });
    if (res.ok) router.push("/presets");
  }

  const problems = validatePreset(config);

  return (
    <div className="space-y-6">
      {problems.length > 0 && (
        <div className="rounded-lg border border-danger/60 bg-danger/10 p-4 text-sm">
          <p className="font-display text-danger">{t("editor.notReady")}</p>
          <ul className="mt-1 list-disc pl-5 text-muted">
            {problems.map((p, i) => <li key={i}>{t(`validate.${p.code}`, p.params)}</li>)}
          </ul>
        </div>
      )}

      {/* Header / actions */}
      <div className="aoe-panel rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="min-w-0 flex-1 rounded border border-border bg-surface-2 px-3 py-2 font-display text-xl text-gold-bright outline-none focus:border-gold"
          />
          <div className="flex items-center gap-2">
            <button onClick={save} disabled={busy} className="aoe-btn rounded px-4 py-2 font-display disabled:opacity-50">
              {busy ? t("editor.saving") : t("editor.save")}
            </button>
            <ClonePresetButton presetId={initial.id} className="rounded border border-border px-3 py-2 text-sm text-muted hover:text-gold-bright" />
            <button onClick={remove} className="rounded border border-danger/60 px-3 py-2 text-sm text-danger hover:bg-danger/10">
              {t("editor.delete")}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2 text-muted">
            <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} />
            {t("editor.publicToggle")}
          </label>
          {status && <span className="text-gold-bright">{status}</span>}
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={t("editor.descPh")}
          rows={2}
          className="mt-3 w-full rounded border border-border bg-surface-2 px-3 py-2 text-sm text-foreground outline-none focus:border-gold"
        />
      </div>

      {/* Global options */}
      <Section title={t("editor.formatOptions")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <NumberField label={t("editor.bestOf")} min={1} max={15} value={config.options.bestOf}
            onChange={(v) => patchOptions({ bestOf: v })} />
          <NumberField label={t("editor.defaultTimer")} min={0} max={3600} value={config.options.defaultTimeLimitSec}
            onChange={(v) => patchOptions({ defaultTimeLimitSec: v })} />
          <ToggleField label={t("editor.publicHover")} checked={config.options.publicHover}
            onChange={(v) => patchOptions({ publicHover: v })} hint={t("editor.publicHoverHint")} />
          <ToggleField label={t("editor.pausable")} checked={config.options.pausable}
            onChange={(v) => patchOptions({ pausable: v })} hint={t("editor.pausableHint")} />
          <ToggleField label={t("editor.anonymous")} checked={Boolean(config.options.anonymous)}
            onChange={(v) => patchOptions({ anonymous: v })} hint={t("editor.anonymousHint")} />
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wide text-muted">{t("editor.resultMode")}</span>
            <select value={config.options.resultMode ?? "vote"}
              onChange={(e) => patchOptions({ resultMode: e.target.value as "vote" | "host" })}
              className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold">
              <option value="vote">{t("editor.resultVote")}</option>
              <option value="host">{t("editor.resultHost")}</option>
            </select>
          </label>
        </div>
      </Section>

      {/* Civ pool */}
      <Section title={`${t("editor.civPool")} (${config.civs.length}/${CIVS.length})`}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {CIVS.map((c) => {
            const on = includedCiv.has(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleCiv(c)}
                className={`flex flex-col items-center rounded-lg border p-2 transition ${
                  on ? "border-gold bg-surface-2" : "border-border opacity-40 hover:opacity-80"
                }`}
                title={c.name}
              >
                {c.imageUrl && (
                  <Thumb src={c.imageUrl} alt={c.name} className="h-9 w-9 object-contain" />
                )}
                <span className="mt-1 text-[10px] leading-tight text-muted">{c.name}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Map pool — thumbnail grid, click to toggle in/out (like the civ pool) */}
      <Section title={`${t("editor.mapPool")} (${config.maps.length})`}>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {mapCatalog.map((m) => {
            const on = includedMap.has(m.id);
            return (
              <button
                key={m.id}
                onClick={() => toggleMap(m)}
                className={`flex flex-col items-center rounded-lg border p-2 transition ${
                  on ? "border-emerald-500/70 bg-surface-2" : "border-border opacity-40 hover:opacity-80"
                }`}
                title={m.name}
              >
                <Thumb src={m.imageUrl} alt={m.name} className="h-11 w-11 rounded object-contain" />
                <span className="mt-1 text-[10px] leading-tight text-muted">{m.name}</span>
              </button>
            );
          })}
        </div>
        <CustomMapInput onAdd={addCustomMap} addLabel={t("editor.add")} placeholder={t("editor.addCustomMap")} urlPlaceholder={t("editor.mapImageUrl")} urlHint={t("editor.urlHint")} />
      </Section>

      {/* Steps */}
      <section className="aoe-panel rounded-xl p-5">
        <div className="sticky top-2 z-20 -mx-5 -mt-5 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b border-border bg-surface-2 px-5 py-3">
          <h2 className="font-display text-lg aoe-gold-text">{t("editor.steps")} ({config.steps.length})</h2>
          <div className="flex gap-2">
            <button onClick={regenerate} className="rounded border border-border px-3 py-1.5 text-sm text-muted hover:text-gold-bright">
              {t("editor.regenerate", { n: config.options.bestOf })}
            </button>
            <button onClick={addStep} className="aoe-btn rounded px-3 py-1.5 text-sm">{t("editor.addStep")}</button>
          </div>
        </div>
        <p className="mb-3 text-xs text-muted">{t("editor.tip")} · {t("editor.dragHint")}</p>
        <StepTimeline steps={config.steps} />
        <ol className="space-y-2">
          {config.steps.map((s, i) => {
            const f = fieldsFor(s);
            return (
            <li
              key={s.id}
              id={`step-node-${i}`}
              onDragOver={(e) => { if (dragIdx !== null) e.preventDefault(); }}
              onDrop={() => { if (dragIdx !== null) moveTo(dragIdx, i); setDragIdx(null); }}
              className={`relative rounded-lg border border-l-4 bg-surface-2/60 p-3 transition ${
                dragIdx === i ? "border-gold opacity-60" : `border-border ${edgeClass(s)}`
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  draggable
                  onDragStart={() => setDragIdx(i)}
                  onDragEnd={() => setDragIdx(null)}
                  title={`${t("editor.stepNo")} · ${t("editor.dragHint")}`}
                  className="flex w-8 shrink-0 cursor-grab select-none items-center justify-center gap-0.5 font-display text-gold-bright active:cursor-grabbing"
                >
                  <span className="text-muted">⠿</span>{i + 1}
                </span>
                <select value={s.type} onChange={(e) => updateStepMeta(i, { type: e.target.value as StepType })} className={selectCls}>
                  {STEP_TYPES.map((st) => <option key={st} value={st}>{t(`step.${st}`)}</option>)}
                </select>
                {f.actor ? (
                  <select value={s.actor} onChange={(e) => updateStepMeta(i, { actor: e.target.value as Actor })} className={selectCls}>
                    {ACTORS.map((a) => <option key={a} value={a}>{t(`actor.${a}`)}</option>)}
                  </select>
                ) : f.simultaneous !== false ? (
                  <span
                    title={t("editor.bothHint")}
                    className="rounded border border-sky-500/40 bg-gradient-to-r from-sky-500/20 to-rose-500/20 px-2 py-1 text-xs whitespace-nowrap text-foreground"
                  >
                    {t("editor.both")}
                  </span>
                ) : s.type === "GAME_RESULT" ? (
                  // Not "both at once" — the winner comes from options.resultMode.
                  // Saying which answers "who decides this?" instead of leaving a
                  // dropdown whose value never mattered.
                  <span
                    title={t("editor.resultByHint")}
                    className="rounded border border-border px-2 py-1 text-xs whitespace-nowrap text-muted"
                  >
                    {t(config.options.resultMode === "host" ? "editor.resultByHost" : "editor.resultByVote")}
                  </span>
                ) : null}
                {f.count && (
                  <label className="flex items-center gap-1 text-xs text-muted" title={t("editor.countHint")}>
                    ×<input type="number" min={1} max={50} value={s.count}
                      onChange={(e) => updateStepMeta(i, { count: clamp(+e.target.value, 1, 50) })}
                      className="w-14 rounded border border-border bg-surface px-2 py-1 text-foreground" />
                  </label>
                )}
                {f.timer && (
                  <label className="flex items-center gap-1 text-xs text-muted" title={t("editor.timerHint")}>
                    ⏱<input type="number" min={0} max={3600} value={s.timeLimitSec}
                      onChange={(e) => updateStep(i, { timeLimitSec: clamp(+e.target.value, 0, 3600) })}
                      className="w-16 rounded border border-border bg-surface px-2 py-1 text-foreground" />
                  </label>
                )}
                <div className="ml-auto flex gap-1">
                  <button onClick={() => insertStep(i)} className="rounded border border-bronze px-2 text-gold-bright hover:bg-surface" title={t("editor.insert")}>＋</button>
                  <button onClick={() => moveStep(i, -1)} className="rounded border border-border px-2 text-muted hover:text-gold-bright" title="↑">↑</button>
                  <button onClick={() => moveStep(i, 1)} className="rounded border border-border px-2 text-muted hover:text-gold-bright" title="↓">↓</button>
                  <button onClick={() => removeStep(i)} className="rounded border border-danger/50 px-2 text-danger hover:bg-danger/10" title="×">×</button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 pl-8 text-xs text-muted">
                {s.type === "CIV_BAN" && (
                  <select value={s.banScope ?? "pool"} onChange={(e) => updateStep(i, { banScope: e.target.value as "pool" | "opponent" })} className={selectCls}>
                    <option value="pool">{t("editor.banPool")}</option>
                    <option value="opponent">{t("editor.banOpponent")}</option>
                  </select>
                )}
                {s.type === "MAP_SELECT" && (
                  <select value={s.mapScope ?? "own"} onChange={(e) => updateStep(i, { mapScope: e.target.value as "own" | "shared" })} className={selectCls}>
                    <option value="own">{t("editor.mapOwn")}</option>
                    <option value="shared">{t("editor.mapShared")}</option>
                  </select>
                )}
                {f.simultaneous === "editable" && (
                  <label className="flex items-center gap-1" title={t("editor.simultaneousHint")}>
                    <input type="checkbox" checked={isSimultaneousStep(s)} onChange={(e) => updateStep(i, { simultaneous: e.target.checked })} />
                    {t("editor.simultaneous")}
                  </label>
                )}
                {/* Shown checked-and-locked rather than hidden: this type is always
                    simultaneous, and saying so is what stops "does one row cover
                    both players?" from being a question at all. */}
                {f.simultaneous === "always" && (
                  <label className="flex items-center gap-1 text-gold-bright/80" title={t("editor.simultaneousAlwaysHint")}>
                    <input type="checkbox" checked readOnly disabled />
                    {t("editor.simultaneous")}
                  </label>
                )}
                {f.excludeUsedCivs && (
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={s.excludeUsedCivs} onChange={(e) => updateStep(i, { excludeUsedCivs: e.target.checked })} />
                    {t("editor.excludeUsedCivs")}
                  </label>
                )}
                {/* Per-step pause is redundant once the whole draft is pausable, so hide it then. */}
                {!config.options.pausable && (
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={s.pausable} onChange={(e) => updateStep(i, { pausable: e.target.checked })} />
                    {t("editor.pausableShort")}
                  </label>
                )}
                <input
                  value={s.label ?? ""}
                  onChange={(e) => updateStep(i, { label: e.target.value })}
                  placeholder={defaultStepLabel(s)}
                  className="min-w-40 flex-1 rounded border border-border bg-surface px-2 py-1 text-foreground"
                />
              </div>
            </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}

const selectCls = "rounded border border-border bg-surface px-2 py-1 text-xs text-foreground outline-none focus:border-gold";

// Short tags for the step-timeline nodes — distinguish map vs civ so you can tell
// a map ban from a civ ban at a glance.
const STEP_SHORT: Record<string, string> = {
  MAP_BAN: "Ban map", MAP_PICK: "Pick map", CIV_BAN: "Ban civ", CIV_PICK: "Draft civ",
  MAP_SELECT: "Select map", SYNC_CONFIRM: "Confirm", CIV_OFFER: "Offer civ", CIV_SNIPE_OPPONENT: "Snipe civ", GAME_RESULT: "Result",
};
const ACTOR_SHORT: Record<string, string> = {
  HOST_DRAW: "🎲", PLAYER1: "P1", PLAYER2: "P2", LOSER: "L", WINNER: "W",
};

// Timeline tag for who acts. "⇄" means both players at once; a step that simply
// has no actor at all (the game result) gets nothing rather than a wrong symbol.
function actorShortOf(s: Step): string {
  if (fieldsFor(s).actor) return ACTOR_SHORT[s.actor] ?? "";
  return isSimultaneousStep(s) ? "⇄" : "";
}

// A horizontal node timeline of the steps: each node briefly shows what it does
// and which game it's in; clicking one scrolls that step into view.
function StepTimeline({ steps }: { steps: Step[] }) {
  const gameOf = gameIndexOfSteps(steps);
  return (
    <div className="mb-3 flex items-center gap-1 overflow-x-auto pb-2">
      {steps.map((s, i) => (
        <div key={s.id} className="flex shrink-0 items-center">
          {i > 0 && <span className="h-px w-3 shrink-0 bg-border" />}
          <button
            type="button"
            onClick={() => document.getElementById(`step-node-${i}`)?.scrollIntoView({ behavior: "smooth", block: "center" })}
            title={`#${i + 1} · ${defaultStepLabel(s)}`}
            className={`flex shrink-0 flex-col items-center rounded-md border bg-surface-2/60 px-2 py-1 text-[10px] leading-tight transition hover:brightness-125 ${
              s.type === "GAME_RESULT" ? "border-amber-500/70" :
              // Same "both players" split as the step rows, so the two views agree.
              !fieldsFor(s).actor ? "border-transparent bg-gradient-to-r from-sky-500/25 to-rose-500/25" :
              s.actor === "PLAYER1" ? "border-sky-500/60" :
              s.actor === "PLAYER2" ? "border-rose-500/60" :
              s.actor === "LOSER" || s.actor === "WINNER" ? "border-amber-500/50" : "border-bronze"
            }`}
          >
            <span className="font-display text-gold-bright">{i + 1}</span>
            <span className="whitespace-nowrap text-muted">
              {actorShortOf(s)} {STEP_SHORT[s.type] ?? s.type}
            </span>
            <span className="text-[8px] text-muted/60">G{(gameOf[i] ?? 0) + 1}</span>
          </button>
        </div>
      ))}
    </div>
  );
}

function clamp(n: number, lo: number, hi: number) {
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="aoe-panel rounded-xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg aoe-gold-text">{title}</h2>
        {action}
      </div>
      <div className="aoe-rule my-3" />
      {children}
    </section>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wide text-muted">{label}</span>
      <input type="number" min={min} max={max} value={value}
        onChange={(e) => onChange(clamp(+e.target.value, min, max))}
        className="w-full rounded border border-border bg-surface-2 px-3 py-2 text-foreground outline-none focus:border-gold" />
    </label>
  );
}

function ToggleField({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex cursor-pointer flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      <span className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        {hint && <span className="text-xs text-muted">{hint}</span>}
      </span>
    </label>
  );
}

function CustomMapInput({ onAdd, addLabel, placeholder, urlPlaceholder, urlHint }: {
  onAdd: (name: string, url?: string) => void; addLabel: string; placeholder: string; urlPlaceholder: string; urlHint: string;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const add = () => { onAdd(name, url); setName(""); setUrl(""); };
  return (
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder={placeholder}
          className="w-44 rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-gold"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") add(); }}
          placeholder={urlPlaceholder}
          className="min-w-0 flex-1 rounded border border-border bg-surface-2 px-3 py-1.5 text-sm text-foreground outline-none focus:border-gold"
        />
        <button onClick={add} className="rounded border border-border px-3 py-1.5 text-sm text-muted hover:text-gold-bright">
          {addLabel}
        </button>
      </div>
      <p className="mt-1 text-[11px] text-muted">{urlHint}</p>
    </div>
  );
}
