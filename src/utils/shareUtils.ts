import type { HintStyle, GridTheme, PlacedWord, CrosswordGrid } from '../types/crossword';
import { reconstructGridFromPlacedWords } from './generator';
import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';

// 圧縮形式（v2）で使うインデックス表
const HINT_STYLES: HintStyle[] = ['sentence_ja', 'sentence_only', 'ja_only'];
const THEMES: GridTheme[] = ['classic', 'ink-saver'];
const COMPACT_VERSION = 2;

/**
 * v2 圧縮ペイロード:
 * [ver, title, subtitle, size, hintIdx, themeIdx, fl(0|1), [[word, ja, sentence, row, col, dir(0=a,1=d), number], ...]]
 */
type CompactWord = [string, string, string, number, number, 0 | 1, number];
type CompactPayload = [number, string, string, number, number, number, 0 | 1, CompactWord[]];

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(str: string): Uint8Array {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) b64 += '=';
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export interface SharedPuzzlePayload {
  t: string;           // title
  s?: string;          // subtitle
  sz: number;          // gridSize
  h: HintStyle;        // hintStyle
  th?: GridTheme;      // theme ('classic' | 'ink-saver')
  fl?: boolean;        // showFirstLetters
  pw: {
    id: string;
    w: string;         // word
    j: string;         // japanese
    s?: string;        // sentence
    r: number;         // row
    c: number;         // col
    d: 'a' | 'd';      // direction: across | down
    n: number;         // number
  }[];
}

/**
 * パズル状態を「配列化 + deflate圧縮 + URLセーフBase64」で短い文字列に変換
 * （旧形式のJSON+Base64と比べて約60%短くなる）
 */
export function encodeSharedPuzzle(
  title: string,
  subtitle: string | undefined,
  gridSize: number,
  hintStyle: HintStyle,
  theme: GridTheme,
  showFirstLetters: boolean,
  placedWords: PlacedWord[]
): string {
  const payload: CompactPayload = [
    COMPACT_VERSION,
    title || '',
    subtitle || '',
    gridSize,
    Math.max(0, HINT_STYLES.indexOf(hintStyle)),
    Math.max(0, THEMES.indexOf(theme)),
    showFirstLetters ? 1 : 0,
    placedWords.map((w): CompactWord => [
      w.word,
      w.japanese || '',
      w.sentence || '',
      w.row,
      w.col,
      w.direction === 'across' ? 0 : 1,
      w.number,
    ]),
  ];

  const compressed = deflateSync(strToU8(JSON.stringify(payload)), { level: 9 });
  return bytesToBase64Url(compressed);
}

/**
 * v2 圧縮形式を展開（失敗時は null）
 */
function decodeCompact(encoded: string) {
  try {
    const json = strFromU8(inflateSync(base64UrlToBytes(encoded)));
    const arr = JSON.parse(json) as CompactPayload;
    if (!Array.isArray(arr) || arr[0] !== COMPACT_VERSION || !Array.isArray(arr[7])) return null;
    const [, t, s, sz, hIdx, thIdx, fl, words] = arr;
    const placedWords: PlacedWord[] = words.map((w, i) => ({
      id: String(i + 1),
      word: w[0],
      japanese: w[1],
      sentence: w[2] || undefined,
      row: w[3],
      col: w[4],
      direction: w[5] === 0 ? 'across' : 'down',
      number: w[6],
    }));
    return {
      title: t || '英単語クロスワードパズル',
      subtitle: s || undefined,
      gridSize: sz || 20,
      hintStyle: HINT_STYLES[hIdx] || 'sentence_ja',
      theme: THEMES[thIdx] || 'ink-saver',
      showFirstLetters: fl === 1,
      grid: reconstructGridFromPlacedWords(placedWords, sz || 20),
    };
  } catch {
    return null;
  }
}

/**
 * URLハッシュやクエリ文字列からパズル状態を展開
 */
export function decodeSharedPuzzle(encoded: string): {
  title: string;
  subtitle?: string;
  gridSize: number;
  hintStyle: HintStyle;
  theme: GridTheme;
  showFirstLetters: boolean;
  grid: CrosswordGrid;
} | null {
  // 新形式（v2 圧縮）を優先して試す
  try {
    const compact = decodeCompact(decodeURIComponent(encoded.trim()));
    if (compact) return compact;
  } catch {
    // fallthrough to legacy
  }

  // 旧形式（JSON + Base64）: 以前配信したリンクも引き続き開けるようにする
  try {
    let clean = decodeURIComponent(encoded.trim());
    // URLセーフBase64への対応
    clean = clean.replace(/-/g, '+').replace(/_/g, '/');
    while (clean.length % 4 !== 0) {
      clean += '=';
    }

    const jsonStr = decodeURIComponent(escape(atob(clean)));
    const payload: SharedPuzzlePayload = JSON.parse(jsonStr);

    if (!payload.pw || !Array.isArray(payload.pw)) {
      return null;
    }

    const placedWords: PlacedWord[] = payload.pw.map((item) => ({
      id: item.id,
      word: item.w,
      japanese: item.j,
      sentence: item.s,
      row: item.r,
      col: item.c,
      direction: item.d === 'a' ? 'across' : 'down',
      number: item.n,
    }));

    const grid = reconstructGridFromPlacedWords(placedWords, payload.sz || 20);

    return {
      title: payload.t || '英単語クロスワードパズル',
      subtitle: payload.s,
      gridSize: payload.sz || 20,
      hintStyle: payload.h || 'sentence_ja',
      theme: payload.th || 'ink-saver',
      showFirstLetters: Boolean(payload.fl),
      grid,
    };
  } catch (err) {
    console.error('Failed to decode shared puzzle:', err);
    return null;
  }
}

/**
 * 現在のページのオリジンとパスから完全な共有URLを構築（ハッシュ形式とクエリ形式の両方を作成可能）
 */
export function buildShareUrl(encodedData: string, useQueryParam = true): string {
  // 本番環境のGitHub Pages URLを優先（ローカルで開いている場合も生徒がアクセスできる公開URLを生成）
  let baseUrl = window.location.origin + window.location.pathname;
  if (baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) {
    baseUrl = 'https://daharakazu-glitch.github.io/crossword-builder-app/';
  }

  if (useQueryParam) {
    return `${baseUrl}?p=${encodeURIComponent(encodedData)}`;
  }
  return `${baseUrl}#play=${encodedData}`;
}

/**
 * Google Classroom の公式「リンクを共有」URLを生成
 */
export function buildClassroomShareUrl(targetUrl: string, title: string): string {
  return `https://classroom.google.com/share?url=${encodeURIComponent(targetUrl)}&title=${encodeURIComponent(title)}`;
}

/** Google Classroom で安全に貼り付けられるURL長の目安 */
export const CLASSROOM_SAFE_URL_LENGTH = 2000;

export interface ShortUrlResult {
  url: string;
  shortened: boolean;
  error?: string;
}

async function fetchWithTimeout(url: string, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { method: 'GET', signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 短縮URLを生成する。
 * ※TinyURL の API はブラウザからの呼び出し(CORS)を許可していないため使用しない。
 *   is.gd / v.gd は CORS (Access-Control-Allow-Origin: *) に対応しており、ブラウザから直接呼べる。
 */
export async function createShortUrl(longUrl: string): Promise<ShortUrlResult> {
  const services = ['https://is.gd/create.php', 'https://v.gd/create.php'];
  let lastError = '';

  for (const endpoint of services) {
    try {
      const res = await fetchWithTimeout(
        `${endpoint}?format=json&url=${encodeURIComponent(longUrl)}`,
        8000
      );
      if (res.ok) {
        const data = await res.json();
        if (typeof data.shorturl === 'string' && data.shorturl.startsWith('http')) {
          return { url: data.shorturl, shortened: true };
        }
        lastError = data.errormessage || 'unknown error';
      } else {
        lastError = `HTTP ${res.status}`;
      }
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    console.warn(`URL shortener failed (${endpoint}):`, lastError);
  }

  // 外部短縮サービスが利用できない場合は元のURLを返す（呼び出し側で警告表示）
  return { url: longUrl, shortened: false, error: lastError };
}
