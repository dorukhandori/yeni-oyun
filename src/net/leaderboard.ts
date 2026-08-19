import { NET } from "../constants";

/**
 * K35 "Beş yeter" online speedrun leaderboard client.
 *
 * Design/authority: docs/design/gdd-lotus-island-run.md §10. Schema, RLS and
 * the submit_k35_score RPC: scripts/supabase/k35-leaderboard.sql. Paca LOT-56
 * (@axiom architecture) / LOT-57 (wiring) / LOT-58 (UI).
 *
 * Three rules this module holds, and the reasons:
 *
 * 1. NO @supabase/supabase-js. Two calls do not justify ~40 kB gzip on top of
 *    an already 800+ kB bundle. Raw fetch against PostgREST is ~150 lines and
 *    the whole transport stays in this one file, so swapping backends later is
 *    a single-file change.
 *
 * 2. NOTHING HERE EVER THROWS OR REJECTS. Every exported async function
 *    resolves to a result union. The caller is a fixed-timestep game loop and a
 *    departure cinematic — an unhandled rejection there is a black screen, not
 *    a log line.
 *
 * 3. NO ENV, NO NETWORK. If VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are
 *    absent (every local dev build, every CI build, every build made before
 *    sahip creates the Supabase project) isLeaderboardEnabled() is false and no
 *    fetch is ever issued. The game must stay fully playable and testable with
 *    no backend at all.
 *
 * The anon key living in the bundle is by design, not a leak: it is a JWT with
 * role "anon" meant to be published, and the security boundary is RLS. The only
 * key that must never reach the client is service_role.
 */

// ---------------------------------------------------------------- error model

/**
 * `disabled` — build carried no env, we never left the client.
 * `offline`  — fetch itself threw (no network, DNS, CORS, blocked).
 * `timeout`  — server did not answer within NET.leaderboard.timeoutMs.
 * `rejected` — server understood us and said no (see `reason`).
 * `server`   — 5xx, or a misconfiguration (bad key, missing table/function).
 */
export type LeaderboardErrorKind = "disabled" | "offline" | "timeout" | "rejected" | "server";

/** Only meaningful when kind === "rejected". */
export type LeaderboardRejectReason = "nick_invalid" | "time_invalid" | "rate_limited";

export interface LeaderboardError {
  kind: LeaderboardErrorKind;
  reason?: LeaderboardRejectReason;
  /** Turkish, already user-facing — the UI shows this verbatim next to an icon. */
  message: string;
}

export interface LeaderboardEntry {
  /** 1-based, assigned client-side from the server's ordering. */
  rank: number;
  nick: string;
  timeMs: number;
}

/**
 * `recorded` — the row is now this run's time (new nick, or a new personal best).
 * `kept`     — accepted, but the stored personal best was already faster. This is
 *              a SUCCESS, not an error, and the UI must say so distinctly
 *              (GDD §10.1 H4: one row per nick, best only).
 */
export type SubmitOutcome = "recorded" | "kept";

export type SubmitResult =
  | { ok: true; outcome: SubmitOutcome; nick: string; timeMs: number; bestMs: number }
  | { ok: false; error: LeaderboardError };

export type FetchResult = { ok: true; entries: LeaderboardEntry[] } | { ok: false; error: LeaderboardError };

// ------------------------------------------------------------------- env gate

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

/**
 * True only when this build was given both env vars. Everything else in this
 * module short-circuits on it, so a keyless build makes zero network calls.
 */
export function isLeaderboardEnabled(): boolean {
  return SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;
}

const DISABLED: LeaderboardError = {
  kind: "disabled",
  message: "Çevrimiçi tablo bu sürümde kapalı.",
};

// ------------------------------------------------------------------ nick rule

/**
 * Byte-for-byte the server rule (GDD §10.4): 2–16 chars, first and last
 * alphanumeric, inner set = alphanumeric + space + dot + underscore + hyphen.
 *
 * This is a COURTESY CHECK, NOT THE AUTHORITY. JS `\p{L}\p{N}` and Postgres
 * `[[:alnum:]]` are not the same set, so a nick that passes here can still come
 * back `nick_invalid` — the UI is built to show that.
 */
const NICK_RE = /^[\p{L}\p{N}][\p{L}\p{N} ._-]*[\p{L}\p{N}]$/u;

export type NickRejectReason = "empty" | "too_short" | "too_long" | "charset";

export type NickCheck = { ok: true; nick: string } | { ok: false; reason: NickRejectReason };

/** Trims, collapses inner whitespace runs, then validates. Never throws. */
export function normalizeNick(raw: string): NickCheck {
  const nick = String(raw ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (nick.length === 0) return { ok: false, reason: "empty" };
  if (nick.length < NET.leaderboard.nickMin) return { ok: false, reason: "too_short" };
  if (nick.length > NET.leaderboard.nickMax) return { ok: false, reason: "too_long" };
  if (!NICK_RE.test(nick)) return { ok: false, reason: "charset" };
  return { ok: true, nick };
}

/** Turkish copy for a local nick rejection — kept next to the rule it explains. */
export function nickRejectMessage(reason: NickRejectReason): string {
  switch (reason) {
    case "empty":
      return "Bir ad yaz.";
    case "too_short":
      return `En az ${NET.leaderboard.nickMin} karakter.`;
    case "too_long":
      return `En çok ${NET.leaderboard.nickMax} karakter.`;
    case "charset":
      return "Harf veya rakamla başlayıp bitmeli. Arada boşluk, nokta, alt çizgi ve tire olabilir.";
  }
}

// ------------------------------------------------------------- nick persistence

/**
 * localStorage access is wrapped on BOTH sides: Safari private mode throws on
 * setItem, and some hardened browsers throw on merely touching localStorage.
 * A remembered nick is a nicety; it may never break the start of a run.
 */
export function loadSavedNick(): string {
  try {
    const raw = window.localStorage.getItem(NET.nickStorageKey);
    if (!raw) return "";
    const check = normalizeNick(raw);
    return check.ok ? check.nick : "";
  } catch {
    return "";
  }
}

export function saveNick(nick: string): void {
  try {
    window.localStorage.setItem(NET.nickStorageKey, nick);
  } catch {
    /* private mode / storage disabled — remembering the nick is optional */
  }
}

// ------------------------------------------------------------------ transport

function headers(): Record<string, string> {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

interface RawResponse {
  status: number;
  body: unknown;
}

/**
 * One fetch with a hard timeout. Resolves to either a response or a classified
 * error — the only place in this file that touches `fetch`.
 */
async function call(
  path: string,
  init: RequestInit,
): Promise<{ ok: true; res: RawResponse } | { ok: false; error: LeaderboardError }> {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, NET.leaderboard.timeoutMs);
  try {
    const res = await fetch(`${SUPABASE_URL}${path}`, {
      ...init,
      headers: headers(),
      signal: ctrl.signal,
      // No credentials: the anon key is the whole auth story here.
      credentials: "omit",
      cache: "no-store",
    });
    let body: unknown = null;
    const text = await res.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    return { ok: true, res: { status: res.status, body } };
  } catch {
    // AbortError vs. everything else. `timedOut` is checked rather than
    // err.name because a caller-side abort would look identical otherwise.
    return timedOut
      ? { ok: false, error: { kind: "timeout", message: "Sunucu yanıt vermedi." } }
      : { ok: false, error: { kind: "offline", message: "Bağlantı yok." } };
  } finally {
    window.clearTimeout(timer);
  }
}

const REJECT_REASONS: readonly LeaderboardRejectReason[] = ["nick_invalid", "time_invalid", "rate_limited"];

function rejectMessage(reason: LeaderboardRejectReason): string {
  switch (reason) {
    case "nick_invalid":
      return "Sunucu bu adı kabul etmedi. Başka bir ad dene.";
    case "time_invalid":
      return "Süre geçersiz görünüyor, kaydedilmedi.";
    case "rate_limited":
      return "Çok sık gönderim. Biraz bekle.";
  }
}

/**
 * Turns a non-2xx PostgREST response into our error model. The RPC signals a
 * refusal by raising with the reason token as the exception MESSAGE (SQLSTATE
 * 22023 → HTTP 400), so the token is read out of `body.message`.
 */
function classify(res: RawResponse): LeaderboardError {
  const body = res.body as { message?: unknown; error?: unknown; hint?: unknown } | null;
  const raw = typeof body?.message === "string" ? body.message : typeof body?.error === "string" ? body.error : "";
  if (res.status === 400 || res.status === 409 || res.status === 422) {
    const hit = REJECT_REASONS.find((r) => raw.includes(r));
    if (hit) return { kind: "rejected", reason: hit, message: rejectMessage(hit) };
    return { kind: "rejected", message: "Sunucu bu kaydı kabul etmedi." };
  }
  if (res.status === 429) {
    return { kind: "rejected", reason: "rate_limited", message: rejectMessage("rate_limited") };
  }
  // 401/403/404 mean the project is misconfigured (bad key, SQL not run yet).
  // That is our problem, not the player's — do not phrase it as their mistake.
  return { kind: "server", message: "Sunucu şu an tabloyu veremiyor." };
}

// -------------------------------------------------------------------- reading

interface RawRow {
  nick?: unknown;
  time_ms?: unknown;
}

/**
 * Top N, fastest first. Ordering is the server's (time_ms asc, updated_at asc —
 * ties go to whoever got there first); ranks are numbered from that order and
 * never recomputed client-side.
 */
export async function fetchTop(limit: number = NET.leaderboard.topLimit): Promise<FetchResult> {
  if (!isLeaderboardEnabled()) return { ok: false, error: DISABLED };
  const n = Math.max(1, Math.min(100, Math.floor(limit)));
  const path = `/rest/v1/k35_leaderboard?select=nick,time_ms&order=time_ms.asc,updated_at.asc&limit=${n}`;
  const out = await call(path, { method: "GET" });
  if (!out.ok) return { ok: false, error: out.error };
  if (out.res.status < 200 || out.res.status >= 300) return { ok: false, error: classify(out.res) };
  const rows = Array.isArray(out.res.body) ? (out.res.body as RawRow[]) : [];
  const entries: LeaderboardEntry[] = [];
  for (const row of rows) {
    const nick = typeof row?.nick === "string" ? row.nick : "";
    const timeMs = typeof row?.time_ms === "number" ? row.time_ms : Number.NaN;
    if (!nick || !Number.isFinite(timeMs)) continue;
    entries.push({ rank: entries.length + 1, nick, timeMs });
  }
  return { ok: true, entries };
}

// -------------------------------------------------------------------- writing

interface RawSubmit {
  outcome?: unknown;
  nick?: unknown;
  time_ms?: unknown;
  best_ms?: unknown;
}

/**
 * Submits one finished run. Called exactly once per run (game.ts guards with a
 * `submitted` flag — the "won" branch re-runs every frame).
 *
 * The local min/max check is an early warning so an obviously broken value does
 * not cost a round trip; the SQL repeats it and that copy is the one that counts.
 */
export async function submitScore(nick: string, timeMs: number): Promise<SubmitResult> {
  if (!isLeaderboardEnabled()) return { ok: false, error: DISABLED };

  const check = normalizeNick(nick);
  if (!check.ok) {
    return {
      ok: false,
      error: { kind: "rejected", reason: "nick_invalid", message: nickRejectMessage(check.reason) },
    };
  }
  const ms = Math.round(timeMs);
  if (!Number.isFinite(ms) || ms < NET.leaderboard.minTimeMs || ms > NET.leaderboard.maxTimeMs) {
    return {
      ok: false,
      error: { kind: "rejected", reason: "time_invalid", message: rejectMessage("time_invalid") },
    };
  }

  const out = await call("/rest/v1/rpc/submit_k35_score", {
    method: "POST",
    body: JSON.stringify({ p_nick: check.nick, p_time_ms: ms }),
  });
  if (!out.ok) return { ok: false, error: out.error };
  if (out.res.status < 200 || out.res.status >= 300) return { ok: false, error: classify(out.res) };

  const body = (out.res.body ?? {}) as RawSubmit;
  const outcome: SubmitOutcome = body.outcome === "kept" ? "kept" : "recorded";
  const bestRaw = typeof body.best_ms === "number" ? body.best_ms : ms;
  return { ok: true, outcome, nick: check.nick, timeMs: ms, bestMs: bestRaw };
}
