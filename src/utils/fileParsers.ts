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

/**
 * テキスト行から英単語・日本語訳・例文をスマートに抽出する汎用関数
 */
export function parseTextContentToWords(text: string): WordItem[] {
  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const entries: { rawWord: string; rawMeaning: string; rawSentence?: string }[] = [];
  let currentEntry: { rawWord: string; rawMeaning: string; rawSentence?: string } | null = null;

  for (const line of rawLines) {
    // 記号（•, ・, ●, ○, ■, ◆, ▶, *, +, -, –, —, 番号 "1.", "(1)", "[1]" など）を先頭からトリム
    const cleanLine = line
      .replace(/^[\u2022\u2023\u25E6\u2043\u2219•・●○■◆▶*+\-–—\s\d\.\)\(\]]+/, '')
      .trim();

    if (!cleanLine) continue;

    // パターン1: "word: 日本語 (例文)" または "word：日本語"
    const colonMatch = cleanLine.match(/^([A-Za-z]{2,})\s*[:：]\s*(.*)$/);
    // パターン2: "word [品詞] 日本語" または "word (品詞) 日本語" または "word 日本語"
    const spaceMatch = cleanLine.match(/^([A-Za-z]{2,})\s+([\[\(（].*|[\u3040-\u30ff\u4e00-\u9faf].*)$/);
    // パターン3: タブまたはカンマ区切り (word\t日本語\t例文)
    const delimiterMatch = cleanLine.match(/^([A-Za-z]{2,})\s*[\t,]\s*(.*)$/);
    // パターン4: 単語単体の行
    const singleWordMatch = cleanLine.match(/^([A-Za-z]{2,})$/);

    const match = colonMatch || delimiterMatch || spaceMatch || singleWordMatch;

    if (match) {
      const wordCandidate = match[1];
      const rest = match[2] || '';
      
      // カンマやタブで例文が分かれている場合のチェック
      let meaning = rest;
      let sentence = '';
      if (rest.includes('\t')) {
        const parts = rest.split('\t');
        meaning = parts[0];
        sentence = parts[1];
      } else if (rest.includes(',')) {
        const parts = rest.split(',');
        meaning = parts[0];
        sentence = parts[1];
      }

      currentEntry = {
        rawWord: wordCandidate.toUpperCase(),
        rawMeaning: meaning.trim(),
        rawSentence: sentence.trim() || undefined,
      };
      entries.push(currentEntry);
    } else if (currentEntry) {
      // 直前の単語エントリの日本語訳の続きとして結合
      currentEntry.rawMeaning += (currentEntry.rawMeaning ? ' ' : '') + cleanLine;
    }
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
    if (!existing || existing.japanese.length < japanese.length) {
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
          let word = row['Word'] || row['word'] || row['英単語'] || row['単語'] || row[keys[0]] || '';
          let japanese = row['Japanese'] || row['japanese'] || row['日本語訳'] || row['日本語'] || row['意味'] || row[keys[1]] || '';
          let sentence = row['Sentence'] || row['sentence'] || row['例文'] || row[keys[2]] || '';

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
    let word = row['Word'] || row['word'] || row['英単語'] || row['単語'] || row[keys[0]] || '';
    let japanese = row['Japanese'] || row['japanese'] || row['日本語訳'] || row['日本語'] || row['意味'] || row[keys[1]] || '';
    let sentence = row['Sentence'] || row['sentence'] || row['例文'] || row[keys[2]] || '';

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

/**
 * PDF (.pdf) ファイルのテキスト＆単語抽出
 */
export async function parsePdfFile(file: File): Promise<WordItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  
  // PDFドキュメントの読み込み
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
  });

  const pdfDoc = await loadingTask.promise;
  let fullText = '';

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    
    // アイテムを行・位置を考慮してテキスト化
    let lastY: number | null = null;
    let pageText = '';

    for (const item of textContent.items as any[]) {
      if (!item.str) continue;
      
      const currentY = item.transform ? item.transform[5] : null;
      if (lastY !== null && currentY !== null && Math.abs(currentY - lastY) > 4) {
        // Y座標が変化したら改行
        pageText += '\n';
      } else if (pageText.length > 0 && !pageText.endsWith(' ') && !pageText.endsWith('\n')) {
        pageText += ' ';
      }
      
      pageText += item.str;
      lastY = currentY;
    }

    fullText += pageText + '\n\n';
  }

  return parseTextContentToWords(fullText);
}

/**
 * Word (.docx) ファイルのテキスト＆単語抽出
 */
export async function parseDocxFile(file: File): Promise<WordItem[]> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return parseTextContentToWords(result.value);
}
