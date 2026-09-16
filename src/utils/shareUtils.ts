import type { HintStyle, GridTheme, PlacedWord, CrosswordGrid } from '../types/crossword';
import { reconstructGridFromPlacedWords } from './generator';

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
 * パズル状態をBase64文字列に変換
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
  const payload: SharedPuzzlePayload = {
    t: title,
    s: subtitle,
    sz: gridSize,
    h: hintStyle,
    th: theme,
    fl: showFirstLetters,
    pw: placedWords.map((w) => ({
      id: w.id,
      w: w.word,
      j: w.japanese,
      s: w.sentence,
      r: w.row,
      c: w.col,
      d: w.direction === 'across' ? 'a' : 'd',
      n: w.number,
    })),
  };

  const jsonStr = JSON.stringify(payload);
  return btoa(unescape(encodeURIComponent(jsonStr)));
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

/**
 * TinyURL API を呼び出し、Google Classroom の2048文字制限を完全にクリアする短縮URLを生成
 */
export async function createShortUrl(longUrl: string): Promise<string> {
  try {
    const apiUrl = `https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`;
    const response = await fetch(apiUrl, { method: 'GET' });
    if (response.ok) {
      const shortUrl = (await response.text()).trim();
      if (shortUrl.startsWith('http')) {
        return shortUrl;
      }
    }
  } catch (e) {
    console.warn('TinyURL API failed, trying fallback...', e);
  }

  // フォールバック: is.gd API
  try {
    const isGdApi = `https://is.gd/create.php?format=json&url=${encodeURIComponent(longUrl)}`;
    const isGdRes = await fetch(isGdApi, { method: 'GET' });
    if (isGdRes.ok) {
      const data = await isGdRes.json();
      if (data.shorturl) {
        return data.shorturl;
      }
    }
  } catch (isGdErr) {
    console.warn('is.gd API fallback failed:', isGdErr);
  }

  // 外部短縮サービスが利用できない場合は元のURLを返す
  return longUrl;
}
