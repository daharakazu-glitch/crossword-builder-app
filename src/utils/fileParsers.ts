import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { WordItem } from '../types/crossword';
import { generateSentenceForWord } from './sentenceGenerator';

// PDF Worker の確実なロード設定 (Vite ESM & CDN フォールバック)
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (_e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

// ヘッダーや不要行の判定
const IGNORED_HEADER_PATTERNS = [
  /^(解答|問題|英単語|単語|日本語訳|日本語|意味|例文|訳|No\.?|番号|テスト|確認テスト|解答リスト|リスト|Word|Meaning|Japanese|Sentence|Answer|Question)/i,
  /^[\d～\-\s]+確認テスト/i,
  /英単語・解答リスト/i,
];

function isHeaderOrIgnoredLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return true;
  return IGNORED_HEADER_PATTERNS.some((pat) => pat.test(trimmed));
}

// 日本語文字を含むかチェック
function hasJapanese(str: string): boolean {
  return /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/.test(str);
}

// アルファベットのみで構成される単語かチェック
function isEnglishWord(str: string): boolean {
  return /^[A-Za-z]{2,}$/.test(str.trim());
}

/**
 * テキスト行から英単語・日本語訳・例文をスマートに抽出する汎用関数
 */
export function parseTextContentToWords(text: string): WordItem[] {
  const rawLines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const cleanedLines: string[] = [];
  for (const line of rawLines) {
    if (isHeaderOrIgnoredLine(line)) continue;
    // 先頭の箇条書き記号や番号 "1.", "(1)", "[1]" などをトリム
    const clean = line
      .replace(/^[\u2022\u2023\u25E6\u2043\u2219•・●○■◆▶*+\-–—\s\d\.\)\(\]]+/, '')
      .trim();
    if (clean && !isHeaderOrIgnoredLine(clean)) {
      cleanedLines.push(clean);
    }
  }

  const entries: { rawWord: string; rawMeaning: string; rawSentence?: string }[] = [];
  let i = 0;

  while (i < cleanedLines.length) {
    const line = cleanedLines[i];

    // パターン1A: タブ区切り (Word \t Sentence \t Japanese または Word \t Japanese \t Sentence)
    if (line.includes('\t')) {
      const parts = line.split('\t').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const first = parts[0].replace(/[^A-Za-z]/g, '');
        if (isEnglishWord(first)) {
          let meaning = '';
          let sentence = '';

          if (parts.length >= 3) {
            if (hasJapanese(parts[1])) {
              meaning = parts[1];
              sentence = parts[2];
            } else {
              sentence = parts[1];
              meaning = parts[2];
            }
          } else {
            if (hasJapanese(parts[1])) {
              meaning = parts[1];
            } else {
              sentence = parts[1];
            }
          }

          entries.push({
            rawWord: first.toUpperCase(),
            rawMeaning: meaning,
            rawSentence: sentence || undefined,
          });
          i++;
          continue;
        }
      }
    }

    // パターン1B: カンマ区切り (第1要素が単一の英単語である場合のみCSV行とみなす)
    if (line.includes(',')) {
      const parts = line.split(',').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2 && isEnglishWord(parts[0])) {
        let meaning = '';
        let sentence = '';
        if (parts.length >= 3) {
          if (hasJapanese(parts[1])) {
            meaning = parts[1];
            sentence = parts.slice(2).join(', ');
          } else {
            sentence = parts[1];
            meaning = parts.slice(2).join(', ');
          }
        } else {
          meaning = parts[1];
        }

        entries.push({
          rawWord: parts[0].toUpperCase(),
          rawMeaning: meaning,
          rawSentence: sentence || undefined,
        });
        i++;
        continue;
      }
    }

    // パターン2: "word: 日本語 (例文)" または "word：日本語"
    const colonMatch = line.match(/^([A-Za-z]{2,})\s*[:：]\s*(.*)$/);
    if (colonMatch) {
      const wordCandidate = colonMatch[1];
      const rest = colonMatch[2] || '';
      let meaning = rest;
      let sentence = '';

      // 括弧内の例文抽出
      const parenMatch = rest.match(/^(.*?)[（\(](.*?)[）\)](.*)$/);
      if (parenMatch) {
        meaning = (parenMatch[1] + parenMatch[3]).trim();
        sentence = parenMatch[2].trim();
      }

      entries.push({
        rawWord: wordCandidate.toUpperCase(),
        rawMeaning: meaning,
        rawSentence: sentence || undefined,
      });
      i++;
      continue;
    }

    // パターン3: "Word [品詞] 日本語" または "Word 日本語 [例文]" (同一行に英語単語と日本語が存在)
    const wordWithJaMatch = line.match(/^([A-Za-z]{2,})\s+([\[\(（]?[\u3040-\u30ff\u4e00-\u9faf].*)$/);
    if (wordWithJaMatch) {
      const wordCandidate = wordWithJaMatch[1];
      const rest = wordWithJaMatch[2];
      entries.push({
        rawWord: wordCandidate.toUpperCase(),
        rawMeaning: rest.trim(),
      });
      i++;
      continue;
    }

    // パターン4: 単語 + 穴埋め英文 (例: "soil cultivate the ( )", "pollen ( ) levels are high today.", "drowned He almost ( ), but luckily he was saved.")
    // 行頭が英単語1語で、その後に英語の例文が続き、行内に日本語を含まない場合
    const wordPlusSentenceMatch = line.match(/^([A-Za-z]{2,})\s+([A-Za-z0-9\s,\.'"\?!;\(\)\[\]_\-—–]+)$/);
    if (wordPlusSentenceMatch && !hasJapanese(line)) {
      const wordCandidate = wordPlusSentenceMatch[1];
      const sentenceCandidate = wordPlusSentenceMatch[2].trim();

      let nextJa = '';
      if (i + 1 < cleanedLines.length && hasJapanese(cleanedLines[i + 1])) {
        nextJa = cleanedLines[i + 1];
        i++; // 日本語行を消費
      }

      entries.push({
        rawWord: wordCandidate.toUpperCase(),
        rawMeaning: nextJa,
        rawSentence: sentenceCandidate || undefined,
      });
      i++;
      continue;
    }

    // パターン5: 単語単体行 (例: "soil")
    const singleWordMatch = line.match(/^([A-Za-z]{2,})$/);
    if (singleWordMatch) {
      const wordCandidate = singleWordMatch[1];
      let sentenceCandidate = '';
      let meaningCandidate = '';

      if (i + 1 < cleanedLines.length) {
        const nextLine = cleanedLines[i + 1];
        if (!hasJapanese(nextLine) && nextLine.length > 2) {
          sentenceCandidate = nextLine;
          i++;
          if (i + 1 < cleanedLines.length && hasJapanese(cleanedLines[i + 1])) {
            meaningCandidate = cleanedLines[i + 1];
            i++;
          }
        } else if (hasJapanese(nextLine)) {
          meaningCandidate = nextLine;
          i++;
        }
      }

      entries.push({
        rawWord: wordCandidate.toUpperCase(),
        rawMeaning: meaningCandidate,
        rawSentence: sentenceCandidate || undefined,
      });
      i++;
      continue;
    }

    // いずれにも当てはまらない場合（直前のエントリへの追記またはスキップ）
    if (entries.length > 0 && hasJapanese(line)) {
      entries[entries.length - 1].rawMeaning += ' ' + line;
    }
    i++;
  }

  // 重複の除去と整形
  const wordMap = new Map<string, WordItem>();

  entries.forEach((entry, index) => {
    const word = entry.rawWord.toUpperCase().replace(/[^A-Z]/g, '');
    if (word.length < 2) return;

    let japanese = entry.rawMeaning.replace(/\s+/g, ' ').trim();
    if (!japanese) japanese = '（訳未指定）';

    // 既に登録されている場合、より長い/詳しい日本語訳を採用
    const existing = wordMap.get(word);
    if (!existing || existing.japanese.length < japanese.length || (!existing.sentence && entry.rawSentence)) {
      const generated = generateSentenceForWord(word, japanese);
      wordMap.set(word, {
        id: `extracted-${Date.now()}-${index}`,
        word,
        japanese: japanese !== '（訳未指定）' ? japanese : generated.japanese,
        sentence: entry.rawSentence || generated.sentence,
      });
    }
  });

  return Array.from(wordMap.values());
}

/**
 * CSV / TSV ファイルのパース
 */
export async function parseCsvFile(file: File): Promise<WordItem[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data as any[];
        const items: WordItem[] = [];

        data.forEach((row, idx) => {
          const keys = Object.keys(row);
          let word = row['Word'] || row['word'] || row['英単語'] || row['単語'] || row['解答'] || row[keys[0]] || '';
          let japanese = row['Japanese'] || row['japanese'] || row['日本語訳'] || row['日本語'] || row['意味'] || row[keys[1]] || '';
          let sentence = row['Sentence'] || row['sentence'] || row['例文'] || row['問題'] || row[keys[2]] || '';

          // 日本語と例文の位置が逆の場合の補正
          if (!hasJapanese(japanese) && hasJapanese(sentence)) {
            const temp = japanese;
            japanese = sentence;
            sentence = temp;
          }

          word = String(word).trim().toUpperCase().replace(/[^A-Z]/g, '');
          japanese = String(japanese).trim();
          sentence = String(sentence).trim();

          if (word && word.length >= 2) {
            const generated = generateSentenceForWord(word, japanese);
            items.push({
              id: `csv-${Date.now()}-${idx}`,
              word,
              japanese: japanese || generated.japanese,
              sentence: sentence || generated.sentence,
            });
          }
        });

        resolve(items);
      },
      error: (err) => reject(err),
    });
  });
}

/**
 * Excel (.xlsx / .xls) ファイルのパース
 */
export async function parseExcelFile(file: File): Promise<WordItem[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData = XLSX.utils.sheet_to_json<any>(worksheet);

  const items: WordItem[] = [];

  jsonData.forEach((row, idx) => {
    const keys = Object.keys(row);
    let word = row['Word'] || row['word'] || row['英単語'] || row['単語'] || row['解答'] || row[keys[0]] || '';
    let japanese = row['Japanese'] || row['japanese'] || row['日本語訳'] || row['日本語'] || row['意味'] || row[keys[1]] || '';
    let sentence = row['Sentence'] || row['sentence'] || row['例文'] || row['問題'] || row[keys[2]] || '';

    if (!hasJapanese(japanese) && hasJapanese(sentence)) {
      const temp = japanese;
      japanese = sentence;
      sentence = temp;
    }

    word = String(word).trim().toUpperCase().replace(/[^A-Z]/g, '');
    japanese = String(japanese).trim();
    sentence = String(sentence).trim();

    if (word && word.length >= 2) {
      const generated = generateSentenceForWord(word, japanese);
      items.push({
        id: `excel-${Date.now()}-${idx}`,
        word,
        japanese: japanese || generated.japanese,
        sentence: sentence || generated.sentence,
      });
    }
  });

  return items;
}

interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * PDF (.pdf) ファイルのテキスト＆単語抽出
 * 2列テーブル（左: 英単語、右: 例文+日本語訳）および通常レイアウトに対応
 */
export async function parsePdfFile(file: File): Promise<WordItem[]> {
  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  let fullStructuredText = '';

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();

    const items: PdfTextItem[] = [];
    for (const item of textContent.items as any[]) {
      if (!item.str || !item.str.trim()) continue;
      const x = item.transform ? item.transform[4] : 0;
      const y = item.transform ? item.transform[5] : 0;
      items.push({
        str: item.str,
        x,
        y,
        width: item.width || 0,
        height: item.height || 0,
      });
    }

    if (items.length === 0) continue;

    // Y座標降順（上から下）にソート
    items.sort((a, b) => b.y - a.y || a.x - b.x);

    // 行ごとにグルーピング (Y座標の差が5pt以内)
    interface RowGroup {
      y: number;
      items: PdfTextItem[];
    }
    const rows: RowGroup[] = [];

    for (const item of items) {
      const matchingRow = rows.find((r) => Math.abs(r.y - item.y) <= 5);
      if (matchingRow) {
        matchingRow.items.push(item);
      } else {
        rows.push({ y: item.y, items: [item] });
      }
    }

    // 各行内のアイテムをX座標昇順（左から右）にソート
    rows.forEach((r) => r.items.sort((a, b) => a.x - b.x));

    // 2列レイアウト判定（左側に英単語、右側に問題・和訳があるかチェック）
    let hasLeftColumnWords = 0;
    const splitX = 180; // 一般的なA4幅(595pt)での左カラム境界目安

    rows.forEach((r) => {
      const leftItems = r.items.filter((it) => it.x < splitX);
      const leftText = leftItems.map((it) => it.str).join(' ').trim();
      if (isEnglishWord(leftText.replace(/[^A-Za-z]/g, ''))) {
        hasLeftColumnWords++;
      }
    });

    if (hasLeftColumnWords >= 2) {
      // 2列テーブル形式として整形
      let pageText = '';
      for (const r of rows) {
        const leftItems = r.items.filter((it) => it.x < splitX);
        const rightItems = r.items.filter((it) => it.x >= splitX);

        const leftStr = leftItems.map((it) => it.str).join(' ').trim();
        const rightStr = rightItems.map((it) => it.str).join(' ').trim();

        if (leftStr && rightStr) {
          pageText += `${leftStr}\t${rightStr}\n`;
        } else if (leftStr) {
          pageText += `${leftStr}\n`;
        } else if (rightStr) {
          pageText += `${rightStr}\n`;
        }
      }
      fullStructuredText += pageText + '\n\n';
    } else {
      // 通常の行テキスト化
      let pageText = '';
      for (const r of rows) {
        const rowStr = r.items.map((it) => it.str).join(' ').trim();
        if (rowStr) {
          pageText += rowStr + '\n';
        }
      }
      fullStructuredText += pageText + '\n\n';
    }
  }

  return parseTextContentToWords(fullStructuredText);
}

/**
 * Word (.docx) ファイルのテキスト＆単語抽出
 */
export async function parseDocxFile(file: File): Promise<WordItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return parseTextContentToWords(result.value);
}
