import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import type { CrosswordPuzzlePackage, WordItem, HintStyle } from '../types/crossword';
import { generateCrossword } from './generator';
import { generateSentenceForWord } from './sentenceGenerator';

export interface RestoreResult {
  success: boolean;
  message: string;
  source: 'metadata' | 'text' | 'ocr';
  package?: CrosswordPuzzlePackage;
  words?: WordItem[];
  title?: string;
  hintStyle?: HintStyle;
}

/**
 * Base64エンコードされたパズルパッケージをデコード
 */
export function decodePuzzlePackage(encoded: string): CrosswordPuzzlePackage | null {
  try {
    const jsonStr = decodeURIComponent(escape(atob(encoded)));
    const data = JSON.parse(jsonStr);
    if (data && data.grid && data.words) {
      return data as CrosswordPuzzlePackage;
    }
  } catch (e) {
    console.error('Failed to decode puzzle package:', e);
  }
  return null;
}

/**
 * PDFファイルからクロスワードパズルを完全復元・解析する
 */
export async function restoreCrosswordFromPdf(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<RestoreResult> {
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.(10, 'PDFデータを解析中...');

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
  });
  const pdfDoc = await loadingTask.promise;

  // --- 1. メタデータから完全復元を試みる ---
  try {
    const metadata = await pdfDoc.getMetadata();
    const info = metadata?.info as any;
    const keywords: string = info?.Keywords || '';

    if (keywords.includes('CROSSWORD_DATA:')) {
      const match = keywords.match(/CROSSWORD_DATA:([A-Za-z0-9+/=]+)/);
      if (match && match[1]) {
        const decoded = decodePuzzlePackage(match[1]);
        if (decoded) {
          onProgress?.(100, 'メタデータから100%完全復元しました！');
          return {
            success: true,
            message: 'PDFに埋め込まれたメタデータからパズル配置を完全復元しました。',
            source: 'metadata',
            package: decoded,
            words: decoded.words,
            title: decoded.title,
            hintStyle: decoded.hintStyle,
          };
        }
      }
    }
  } catch (e) {
    console.warn('Metadata check failed, fallback to text parsing:', e);
  }

  // --- 2. ページテキストから解析を試みる ---
  onProgress?.(30, 'PDFテキストレイヤーを抽出中...');
  let fullText = '';
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((it: any) => it.str)
      .join(' ');
    fullText += '\n--- PAGE ' + p + ' ---\n' + pageText;
  }

  // テキスト内に埋め込みキーワードがあるかチェック
  if (fullText.includes('CROSSWORD_DATA:')) {
    const match = fullText.match(/CROSSWORD_DATA:([A-Za-z0-9+/=]+)/);
    if (match && match[1]) {
      const decoded = decodePuzzlePackage(match[1]);
      if (decoded) {
        onProgress?.(100, '完全復元しました！');
        return {
          success: true,
          message: 'PDF内コードからパズル配置を完全復元しました。',
          source: 'metadata',
          package: decoded,
          words: decoded.words,
          title: decoded.title,
          hintStyle: decoded.hintStyle,
        };
      }
    }
  }

  // テキストからの単語＆ヒント抽出
  const extractedFromText = parseCluesAndAnswersFromText(fullText);
  if (extractedFromText.words.length >= 3) {
    onProgress?.(100, 'テキストからクロスワードを再構築しました！');
    const reconstructedGrid = generateCrossword(extractedFromText.words, 20);
    return {
      success: true,
      message: `PDFのテキストから ${extractedFromText.words.length} 語の単語とヒントを復元し、クロスワードを再構築しました。`,
      source: 'text',
      words: extractedFromText.words,
      title: extractedFromText.title || file.name.replace(/\.pdf$/i, ''),
      hintStyle: extractedFromText.hintStyle,
      package: {
        version: '1.0.0',
        title: extractedFromText.title || file.name.replace(/\.pdf$/i, ''),
        gridSize: 20,
        hintStyle: extractedFromText.hintStyle,
        grid: reconstructedGrid,
        words: extractedFromText.words,
      },
    };
  }

  // --- 3. テキストが取れない場合: OCR解析 ---
  onProgress?.(45, '画像PDFを検知。OCR（文字認識）エンジンを起動中...');

  try {
    let ocrFullText = '';
    const worker = await createWorker('eng+jpn');

    for (let p = 1; p <= Math.min(pdfDoc.numPages, 2); p++) {
      onProgress?.(50 + p * 20, `${p}ページ目を文字認識中...`);
      const page = await pdfDoc.getPage(p);
      const viewport = page.getViewport({ scale: 2.0 });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext('2d');

      if (ctx) {
        await (page as any).render({ canvasContext: ctx, viewport }).promise;
        const ret = await worker.recognize(canvas);
        ocrFullText += '\n' + ret.data.text;
      }
    }
    await worker.terminate();

    const extractedFromOcr = parseCluesAndAnswersFromText(ocrFullText);
    if (extractedFromOcr.words.length >= 2) {
      onProgress?.(100, 'OCR解析完了！クロスワードを再構築しました。');
      const reconstructedGrid = generateCrossword(extractedFromOcr.words, 20);
      return {
        success: true,
        message: `OCR文字認識により、PDFから ${extractedFromOcr.words.length} 語の単語とヒントを復元しました。`,
        source: 'ocr',
        words: extractedFromOcr.words,
        title: extractedFromOcr.title || file.name.replace(/\.pdf$/i, ''),
        hintStyle: extractedFromOcr.hintStyle,
        package: {
          version: '1.0.0',
          title: extractedFromOcr.title || file.name.replace(/\.pdf$/i, ''),
          gridSize: 20,
          hintStyle: extractedFromOcr.hintStyle,
          grid: reconstructedGrid,
          words: extractedFromOcr.words,
        },
      };
    }
  } catch (ocrErr) {
    console.error('OCR analysis failed:', ocrErr);
  }

  return {
    success: false,
    message: 'PDFからクロスワードパズルのデータを読み取ることができませんでした。',
    source: 'text',
  };
}

/**
 * 抽出テキストからタイトル、ヒント、単語リストを構造化パースする
 */
function parseCluesAndAnswersFromText(text: string): {
  words: WordItem[];
  title?: string;
  hintStyle: HintStyle;
} {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const wordMap = new Map<string, WordItem>();
  let title = '';
  let hintStyle: HintStyle = 'sentence_ja';

  // 1. タイトルの抽出
  for (const line of lines.slice(0, 10)) {
    if (line.includes('クロスワード') || line.includes('確認テスト') || line.includes('Crossword')) {
      title = line.replace(/(\(解答\)|（解答）|_問題|_解答)/g, '').trim();
      break;
    }
  }

  // 2. 解答用紙形式の検出: "1. [soil] ( ) （土壌）" または "[apple] ..."
  const answerPattern = /(?:(\d+)\.\s*)?\[([A-Za-z]{2,})\]\s*(.*?)(?:[（\(]([^）\)]+)[）\)])?$/;

  // 3. 一般的なヒント形式の検出: "1. I eat an ( ) . （りんご）" または "1. ( ) （りんご）"
  const clueWithJaPattern = /(?:(\d+)\.\s*)?(.*?)\s*[（\(]([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\s]+)[）\)]$/;

  for (const line of lines) {
    // パターンA: 解答付き "[apple] 例文 (りんご)"
    const ansMatch = line.match(answerPattern);
    if (ansMatch) {
      const rawWord = ansMatch[2].toUpperCase();
      const sentence = ansMatch[3]?.trim();
      const japanese = ansMatch[4]?.trim() || '';

      const generated = generateSentenceForWord(rawWord, japanese);
      wordMap.set(rawWord, {
        id: `restored-${Date.now()}-${wordMap.size}`,
        word: rawWord,
        japanese: japanese || generated.japanese,
        sentence: sentence && sentence.length > 5 ? sentence : generated.sentence,
      });
      continue;
    }

    // パターンB: ヒント行 "1. ... (日本語)"
    const clueMatch = line.match(clueWithJaPattern);
    if (clueMatch) {
      const sentence = clueMatch[2]?.trim();
      const japanese = clueMatch[3]?.trim();

      // 文中に大文字単語やカッコがある場合
      const wordInSentence = sentence.match(/\b([A-Za-z]{3,})\b/);
      if (wordInSentence && !['AN', 'THE', 'AND', 'FOR'].includes(wordInSentence[1].toUpperCase())) {
        const rawWord = wordInSentence[1].toUpperCase();
        if (!wordMap.has(rawWord)) {
          const generated = generateSentenceForWord(rawWord, japanese);
          wordMap.set(rawWord, {
            id: `restored-${Date.now()}-${wordMap.size}`,
            word: rawWord,
            japanese: japanese || generated.japanese,
            sentence: sentence || generated.sentence,
          });
        }
      }
    }
  }

  // もしヒントから直接単語が取れなかった場合、通常の単語抽出器をフォールバック実行
  if (wordMap.size === 0) {
    const extractedWords = lines.flatMap((l) => {
      const m = l.match(/^[A-Za-z]{2,}$/);
      return m ? [m[0].toUpperCase()] : [];
    });
    for (const w of extractedWords) {
      if (!wordMap.has(w)) {
        const gen = generateSentenceForWord(w);
        wordMap.set(w, {
          id: `restored-${Date.now()}-${wordMap.size}`,
          word: w,
          japanese: gen.japanese,
          sentence: gen.sentence,
        });
      }
    }
  }

  return {
    words: Array.from(wordMap.values()),
    title,
    hintStyle,
  };
}
