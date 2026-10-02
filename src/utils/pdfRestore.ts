import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import type { CrosswordPuzzlePackage, WordItem, HintStyle } from '../types/crossword';
import { generateCrossword } from './generator';
import { generateSentenceForWord } from './sentenceGenerator';

// PDF Worker の確実なロード設定
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
} catch (_e) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

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
 * Base64エンコードされたパズルパッケージをデコード (UTF-8マルチバイト安全)
 */
export function decodePuzzlePackage(encoded: string): CrosswordPuzzlePackage | null {
  try {
    const clean = encoded.replace(/[\r\n\s]/g, '');
    const binary = atob(clean);
    let jsonStr = '';
    if (typeof TextDecoder !== 'undefined') {
      try {
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        jsonStr = new TextDecoder('utf-8').decode(bytes);
      } catch {
        jsonStr = decodeURIComponent(escape(binary));
      }
    } else {
      jsonStr = decodeURIComponent(escape(binary));
    }
    const data = JSON.parse(jsonStr);
    if (data && data.grid && data.words) {
      return data as CrosswordPuzzlePackage;
    }
  } catch (e) {
    try {
      const legacyStr = decodeURIComponent(escape(atob(encoded.replace(/[\r\n\s]/g, ''))));
      const data = JSON.parse(legacyStr);
      if (data && data.grid && data.words) {
        return data as CrosswordPuzzlePackage;
      }
    } catch (e2) {
      console.error('Failed to decode puzzle package:', e, e2);
    }
  }
  return null;
}

/**
 * PDFファイルからクロスワードパズルを完全復元・逆生成する
 */
export async function restoreCrosswordFromPdf(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<RestoreResult> {
  const arrayBuffer = await file.arrayBuffer();

  onProgress?.(10, 'PDFデータを解析中...');

  // --- 0. 超高速バイナリスキャン (埋め込みコメント / コードを0.01秒で直接抽出) ---
  try {
    const uint8 = new Uint8Array(arrayBuffer);
    const rawContent = new TextDecoder('latin1').decode(uint8);

    // 新規格: %CROSSWORD_DATA_START%...%CROSSWORD_DATA_END%
    const startIdx = rawContent.indexOf('%CROSSWORD_DATA_START%');
    if (startIdx !== -1) {
      const endIdx = rawContent.indexOf('%CROSSWORD_DATA_END%', startIdx);
      if (endIdx !== -1) {
        const payload = rawContent.slice(startIdx + '%CROSSWORD_DATA_START%'.length, endIdx).trim();
        const decoded = decodePuzzlePackage(payload);
        if (decoded) {
          onProgress?.(100, 'パズル配置を100%完全復元しました！');
          return {
            success: true,
            message: 'PDFからクロスワードパズル配置・単語・ヒントを完全復元しました。',
            source: 'metadata',
            package: decoded,
            words: decoded.words,
            title: decoded.title,
            hintStyle: decoded.hintStyle,
          };
        }
      }
    }

    // 従来規格: CROSSWORD_DATA:Base64
    const legacyMatch = rawContent.match(/CROSSWORD_DATA:([A-Za-z0-9+/=]+)/);
    if (legacyMatch && legacyMatch[1]) {
      const decoded = decodePuzzlePackage(legacyMatch[1]);
      if (decoded) {
        onProgress?.(100, 'パズル配置を100%完全復元しました！');
        return {
          success: true,
          message: 'PDFからクロスワードパズル配置・単語・ヒントを完全復元しました。',
          source: 'metadata',
          package: decoded,
          words: decoded.words,
          title: decoded.title,
          hintStyle: decoded.hintStyle,
        };
      }
    }
  } catch (scanErr) {
    console.warn('Fast binary scan failed, falling back to PDF.js:', scanErr);
  }

  // --- 1. PDF.js による文書読み込み (メタデータ・テキストレイヤー検証) ---
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    useSystemFonts: true,
  });
  const pdfDoc = await loadingTask.promise;

  // メタデータからの完全復元チェック
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

  // --- 2. ページテキストレイヤーからの解析 ---
  onProgress?.(25, 'PDFテキストレイヤーを抽出中...');
  let fullText = '';
  for (let p = 1; p <= pdfDoc.numPages; p++) {
    const page = await pdfDoc.getPage(p);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((it: any) => it.str)
      .join(' ');
    fullText += `\n--- PAGE ${p} ---\n` + pageText;
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
    const gridSize = Math.min(35, Math.max(20, Math.ceil(Math.sqrt(extractedFromText.words.length * 14))));
    const reconstructedGrid = generateCrossword(extractedFromText.words, gridSize);
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
        gridSize,
        hintStyle: extractedFromText.hintStyle,
        grid: reconstructedGrid,
        words: extractedFromText.words,
      },
    };
  }

  // --- 3. 画像PDFの場合: 高速＆高精度分割OCR解析 ---
  onProgress?.(35, '画像PDFを検知。AI文字認識(OCR)エンジンを準備中...');

  try {
    let ocrCombinedText = '';
    const worker = await createWorker('eng+jpn');

    // スキャン対象ページの優先度決定
    // 4枚組: 4(解答ヒント) -> 2(問題ヒント) -> 3 -> 1
    // 2枚組: 2(ヒント) -> 1(盤面)
    const pagesToScan: number[] = [];
    if (pdfDoc.numPages >= 4) {
      pagesToScan.push(4, 2, 3, 1);
    } else if (pdfDoc.numPages >= 2) {
      pagesToScan.push(2, 1);
    } else {
      pagesToScan.push(1);
    }

    for (let idx = 0; idx < pagesToScan.length; idx++) {
      const pageNum = pagesToScan[idx];
      onProgress?.(45 + idx * 20, `${pageNum}ページ目を高精度OCR解析中...`);

      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 2.0 });

      const fullCanvas = document.createElement('canvas');
      fullCanvas.width = viewport.width;
      fullCanvas.height = viewport.height;
      const ctx = fullCanvas.getContext('2d');

      if (ctx) {
        await (page as any).render({ canvasContext: ctx, viewport }).promise;

        const w = fullCanvas.width;
        const h = fullCanvas.height;

        const isDedicatedCluesPage = (pageNum === 2 && pdfDoc.numPages >= 2) || (pageNum === 4 && pdfDoc.numPages >= 4);

        const cropConfigs = isDedicatedCluesPage
          ? [
              // ヒント専用ページ（2ページ目 / 4ページ目）: 全高で左右2分割
              { name: 'left',   x: 0,        y: h * 0.05, width: w * 0.50, height: h * 0.92 },
              { name: 'right',  x: w * 0.48, y: h * 0.05, width: w * 0.52, height: h * 0.92 },
              { name: 'header', x: 0,        y: 0,        width: w,        height: h * 0.12 },
            ]
          : [
              // 1枚形式: 下半分（ヒント欄）
              { name: 'across', x: w * 0.02, y: h * 0.44, width: w * 0.50, height: h * 0.55 },
              { name: 'down',   x: w * 0.48, y: h * 0.44, width: w * 0.50, height: h * 0.55 },
              { name: 'header', x: 0,        y: 0,        width: w,        height: h * 0.20 },
            ];

        for (const crop of cropConfigs) {
          const partCanvas = document.createElement('canvas');
          partCanvas.width = crop.width;
          partCanvas.height = crop.height;
          const partCtx = partCanvas.getContext('2d');
          if (partCtx) {
            partCtx.drawImage(
              fullCanvas,
              crop.x, crop.y, crop.width, crop.height,
              0, 0, crop.width, crop.height
            );
            const res = await worker.recognize(partCanvas);
            ocrCombinedText += '\n' + res.data.text;
          }
        }

        // 解答用紙（2ページ目等）から十分な単語が取れたら、1ページ目の重複認識をスキップして高速化
        const tempCheck = parseCluesAndAnswersFromText(ocrCombinedText);
        if (tempCheck.words.length >= 5) {
          break;
        }
      }
    }

    await worker.terminate();

    // 抽出テキストから構造化パース
    const extractedFromOcr = parseCluesAndAnswersFromText(ocrCombinedText);
    if (extractedFromOcr.words.length >= 2) {
      onProgress?.(100, `OCR解析完了！${extractedFromOcr.words.length}語のクロスワードを再構築しました。`);
      const gridSize = Math.min(35, Math.max(20, Math.ceil(Math.sqrt(extractedFromOcr.words.length * 14))));
      const reconstructedGrid = generateCrossword(extractedFromOcr.words, gridSize);

      const title = extractedFromOcr.title || file.name.replace(/\.pdf$/i, '').replace(/_問題・解答セット.*$/i, '');

      return {
        success: true,
        message: `OCR文字認識により、PDFから ${extractedFromOcr.words.length} 語の単語とヒントを復元しました。`,
        source: 'ocr',
        words: extractedFromOcr.words,
        title,
        hintStyle: extractedFromOcr.hintStyle,
        package: {
          version: '1.0.0',
          title,
          gridSize,
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
    message: 'PDFからクロスワードパズルの単語データを読み取ることができませんでした。',
    source: 'ocr',
  };
}

/**
 * 抽出テキストからタイトル、ヒント、単語リストを構造化パースする
 */
export function parseCluesAndAnswersFromText(text: string): {
  words: WordItem[];
  title?: string;
  hintStyle: HintStyle;
} {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const wordMap = new Map<string, WordItem>();
  let title = '';
  const hintStyle: HintStyle = 'sentence_ja';

  // 1. タイトルの抽出
  for (const line of lines.slice(0, 20)) {
    if (
      line.includes('LEAP') ||
      line.includes('クロスワード') ||
      line.includes('確認テスト') ||
      line.includes('Crossword') ||
      /Part\s*\d/i.test(line)
    ) {
      const candidate = line
        .replace(/(\(解答\)|（解答）|_問題|_解答|No|Class|Name[:：]?|解答付きヒント)/g, '')
        .trim();
      if (candidate.length > 3 && !title) {
        title = candidate;
        break;
      }
    }
  }

  // 2. 解答付きヒントの検出 (例: "3. [flavor] - ice cream ... （抹茶味のアイスクリーム）")
  // 括弧の揺れ [ ], ［ ］, 【 】, I...], |...| に柔軟対応
  const tokenRegex = /(?:(\d{1,3})\s*[\.\:\-]?\s*)?[\[［【I1l\|]\s*([A-Za-z]{2,})\s*[\]］】\)\|\.\-]/g;

  const matches: Array<{
    num?: number;
    word: string;
    startIndex: number;
    fullMatchLength: number;
  }> = [];

  let m: RegExpExecArray | null;
  while ((m = tokenRegex.exec(text)) !== null) {
    const rawWord = m[2].toUpperCase();
    // 誤検出フィルター: 一般的な記号や見出し文字列を除外
    if (['ACROSS', 'DOWN', 'THE', 'AND', 'FOR', 'PAGE', 'NO', 'CLASS', 'NAME'].includes(rawWord)) {
      continue;
    }
    matches.push({
      num: m[1] ? parseInt(m[1], 10) : undefined,
      word: rawWord,
      startIndex: m.index,
      fullMatchLength: m[0].length,
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    if (wordMap.has(current.word)) continue;

    // 現在のトークン終了位置から次のトークンの開始位置までをヒントテキストとする
    const textStart = current.startIndex + current.fullMatchLength;
    const textEnd = i + 1 < matches.length ? matches[i + 1].startIndex : Math.min(textStart + 250, text.length);
    let clueBlock = text.slice(textStart, textEnd).trim();

    // 不要な改行をスペースに置換
    clueBlock = clueBlock.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ');

    let japanese = '';
    let sentence = clueBlock;

    // 日本語カッコ (日本語) または （日本語）: OCRゴミ記号があっても日本語を含んでいれば検出
    const jaRegex = /[（\(]([^）\)]*[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff][^）\)]*)[）\)]/g;
    const jaMatches = [...clueBlock.matchAll(jaRegex)];
    if (jaMatches.length > 0) {
      const bestJa = jaMatches[jaMatches.length - 1];
      japanese = bestJa[1]
        .replace(/[_:：\.\*・\-\|〜~]+/g, '')
        .replace(/\s+/g, '')
        .trim();
      sentence = clueBlock.replace(bestJa[0], '').trim();
    } else {
      const plainJaMatch = clueBlock.match(/([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fffー\s]{2,})/);
      if (plainJaMatch) {
        japanese = plainJaMatch[1].replace(/\s+/g, '').trim();
      }
    }

    sentence = sentence
      .replace(/^[\s\-–—:：_\.\*\|]+/, '')
      .replace(/[\s\-–—:：_\.\*\|]+$/, '')
      .trim();

    const generated = generateSentenceForWord(current.word, japanese);
    wordMap.set(current.word, {
      id: `restored-${Date.now()}-${wordMap.size}`,
      word: current.word,
      japanese: japanese || generated.japanese,
      sentence: sentence && sentence.length > 4 ? sentence : generated.sentence,
    });
  }

  // 3. もし解答付きヒントがなく、問題用紙のみ（例文と日本語訳のみ）の場合のフォールバック
  if (wordMap.size === 0) {
    const clueWithJaPattern = /(?:(\d+)\.\s*)?(.*?)\s*[（\(]([\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\s]+)[）\)]/;
    for (const line of lines) {
      const clueMatch = line.match(clueWithJaPattern);
      if (clueMatch) {
        const sentence = clueMatch[2]?.trim();
        const japanese = clueMatch[3]?.trim();
        // 例文中の英単語（3文字以上）を抽出
        const englishWords = sentence.match(/\b([A-Za-z]{3,})\b/g) || [];
        for (const w of englishWords) {
          const upper = w.toUpperCase();
          if (!['THE', 'AND', 'FOR', 'WITH', 'FROM', 'THAT', 'THIS'].includes(upper) && !wordMap.has(upper)) {
            const gen = generateSentenceForWord(upper, japanese);
            wordMap.set(upper, {
              id: `restored-${Date.now()}-${wordMap.size}`,
              word: upper,
              japanese: japanese || gen.japanese,
              sentence: sentence || gen.sentence,
            });
            break;
          }
        }
      }
    }
  }

  return {
    words: Array.from(wordMap.values()),
    title: title || undefined,
    hintStyle,
  };
}

