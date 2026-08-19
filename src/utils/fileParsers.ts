import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { WordItem } from '../types/crossword';
import { generateSentenceForWord } from './sentenceGenerator';

// PDF Worker の設定
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

/**
 * テキスト行から英単語・日本語訳・例文をパースする汎用関数
 */
export function parseTextContentToWords(text: string): WordItem[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const items: WordItem[] = [];

  lines.forEach((line, index) => {
    // 形式例:
    // 1. APPLE: りんご (An apple a day...)
    // APPLE - りんご
    // APPLE, りんご, 例文
    // APPLE\tりんご
    let word = '';
    let japanese = '';
    let sentence = '';

    const tabParts = line.split('\t');
    const commaParts = line.split(',');
    const colonParts = line.split(/[:：]/);
    const hyphenParts = line.split(/[-–—]/);

    if (tabParts.length >= 2) {
      word = tabParts[0];
      japanese = tabParts[1];
      sentence = tabParts[2] || '';
    } else if (commaParts.length >= 2) {
      word = commaParts[0];
      japanese = commaParts[1];
      sentence = commaParts[2] || '';
    } else if (colonParts.length >= 2) {
      word = colonParts[0];
      japanese = colonParts[1];
    } else if (hyphenParts.length >= 2) {
      word = hyphenParts[0];
      japanese = hyphenParts[1];
    } else {
      // 英文中の単語を正規表現で抽出
      const match = line.match(/^([A-Za-z]+)\s+[\(（](.+?)[\)）]/);
      if (match) {
        word = match[1];
        japanese = match[2];
      } else {
        const cleanLine = line.replace(/^\d+[\.\s)]*/, '').trim();
        const singleWordMatch = cleanLine.match(/^[A-Za-z]{2,}/);
        if (singleWordMatch) {
          word = singleWordMatch[0];
          japanese = cleanLine.replace(word, '').trim();
        }
      }
    }

    // 単語の整形 (先頭番号削除・記号除去)
    word = word.replace(/^\d+[\.\s)]*/, '').trim().toUpperCase();
    japanese = japanese.trim();

    if (word && /^[A-Z]{2,}$/.test(word)) {
      const generated = generateSentenceForWord(word, japanese);
      items.push({
        id: `extracted-${Date.now()}-${index}`,
        word,
        japanese: japanese || generated.japanese,
        sentence: sentence || generated.sentence,
      });
    }
  });

  return items;
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

          word = String(word).trim().toUpperCase();
          japanese = String(japanese).trim();
          sentence = String(sentence).trim();

          if (word && /^[A-Z]{2,}$/.test(word)) {
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

    word = String(word).trim().toUpperCase();
    japanese = String(japanese).trim();
    sentence = String(sentence).trim();

    if (word && /^[A-Z]{2,}$/.test(word)) {
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
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n';
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
