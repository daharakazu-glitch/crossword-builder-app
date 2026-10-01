import jsPDF from 'jspdf';
import type {
  HintStyle,
  PlacedWord,
  CrosswordPuzzlePackage,
  GridTheme,
  CrosswordGrid,
  WordItem,
} from '../types/crossword';

export function formatClueText(word: PlacedWord | WordItem, hintStyle: HintStyle): string {
  const cleanWord = word.word.toUpperCase().replace(/[^A-Z]/g, '');
  const wideBlank = '(　　　　)';
  let sentenceClue = (word.sentence || '').trim();

  if (sentenceClue) {
    sentenceClue = sentenceClue
      .replace(/\([\s\u3000]*\)/g, wideBlank)
      .replace(/（[\s\u3000]*）/g, wideBlank)
      .replace(/\[[\s\u3000]*\]/g, wideBlank)
      .replace(/_{2,}/g, wideBlank);

    const regex = new RegExp(`\\b${cleanWord}\\b`, 'gi');
    sentenceClue = sentenceClue.replace(regex, wideBlank);
  } else {
    sentenceClue = wideBlank;
  }

  switch (hintStyle) {
    case 'sentence_ja':
      return word.japanese ? `${sentenceClue} （${word.japanese}）` : sentenceClue;
    case 'sentence_only':
      return sentenceClue;
    case 'ja_only':
      return word.japanese || sentenceClue;
    default:
      return `${sentenceClue} （${word.japanese}）`;
  }
}

/**
 * ファイル名として使用できない文字を安全な文字に変換
 */
export function sanitizeFilename(name: string): string {
  if (!name || !name.trim()) return 'Crossword_Puzzle';
  let safe = name
    .replace(/[\\/:*?"<>|\r\n\t]+/g, '_')
    .replace(/_+/g, '_')
    .trim();
  safe = safe.replace(/^[.\s]+|[.\s]+$/g, '');
  return safe || 'Crossword_Puzzle';
}

/**
 * PDF復元用のパズルデータをBase64エンコード
 */
export function encodePuzzlePackage(pkg: CrosswordPuzzlePackage): string {
  try {
    const jsonStr = JSON.stringify(pkg);
    return btoa(unescape(encodeURIComponent(jsonStr)));
  } catch (e) {
    console.warn('Failed to encode puzzle package for PDF metadata:', e);
    return '';
  }
}

export interface RenderSheetOptions {
  grid: CrosswordGrid;
  title: string;
  subtitle?: string;
  hintStyle: HintStyle;
  isAnswerKey: boolean;
  theme?: GridTheme;
  showFirstLetters?: boolean;
}

/**
 * スマート・テキスト折り返し（英単語の途中分断を防ぎ、日本語と英単語を適切に折り返す）
 */
function wrapTextSmart(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];

  const tokens = text.match(/([A-Za-z0-9_\-]+|[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]+|\s+|[^\s\w])/gu) || [text];
  const lines: string[] = [];
  let currentLine = '';

  for (const token of tokens) {
    const isCjk = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]/.test(token);

    if (isCjk && token.length > 1) {
      for (const char of token) {
        const testLine = currentLine + char;
        if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
    } else {
      const testLine = currentLine + token;
      if (ctx.measureText(testLine).width > maxWidth && currentLine.length > 0) {
        if (ctx.measureText(token).width > maxWidth) {
          for (const char of token) {
            if (ctx.measureText(currentLine + char).width > maxWidth && currentLine.length > 0) {
              lines.push(currentLine);
              currentLine = char;
            } else {
              currentLine += char;
            }
          }
        } else {
          lines.push(currentLine);
          currentLine = token.trimStart();
        }
      } else {
        currentLine = testLine;
      }
    }
  }

  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

interface ClueItemData {
  type: 'heading' | 'clue';
  title?: string;
  word?: PlacedWord;
  prefix: string;
  clueText: string;
  fullText: string;
}

/**
 * 【ページ1: 盤面専用ページ】
 * A4縦（1600x2262px）を1枚フルに使って、クロスワード盤面を大迫力・特大サイズ（1マス約45〜65px）で描画。
 * 手書きでゆったり文字を書き込める教育用最適サイズ。
 */
export function renderGridPageCanvas(options: RenderSheetOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = 1600;
  const height = 2262;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context の初期化に失敗しました。');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const marginX = 90;
  const marginTop = 70;
  const marginBottom = 65;
  const contentWidth = width - marginX * 2; // 1420px

  // ヘッダー部
  const title = options.title || '英単語クロスワード';
  const displayTitle = options.isAnswerKey ? `${title} (解答)` : title;

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(displayTitle, marginX, marginTop);

  const subtitle = options.subtitle || (options.isAnswerKey ? 'Answer Sheet' : 'Name: ______________________');
  ctx.font = 'bold 24px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(subtitle, marginX + contentWidth, marginTop + 10);

  // ヘッダー下線
  const headerBottomY = marginTop + 52;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(marginX, headerBottomY);
  ctx.lineTo(marginX + contentWidth, headerBottomY);
  ctx.stroke();

  // サブ注記
  ctx.fillStyle = '#64748b';
  ctx.font = '20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('※ヒント・問題英文は2ページ目に掲載されています。', marginX, headerBottomY + 16);

  // 盤面描画領域
  const gridTopY = headerBottomY + 54;
  const availableGridHeight = height - marginBottom - 50 - gridTopY; // 約 1950px
  const availableGridWidth = contentWidth; // 1420px

  const gridSize = Math.max(1, options.grid.size);
  // A4縦1枚を贅沢に使い、最大1380pxの特大正方形盤面
  const gridPx = Math.min(availableGridWidth, availableGridHeight, 1380);
  const cellSize = gridPx / gridSize;

  const gridStartX = marginX + (contentWidth - gridPx) / 2;
  const gridStartY = gridTopY + (availableGridHeight - gridPx) / 2;

  // 盤面外枠
  ctx.strokeStyle = options.theme === 'ink-saver' ? '#64748b' : '#000000';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(gridStartX, gridStartY, gridPx, gridPx);

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = options.grid.cells[r]?.[c];
      const cellX = gridStartX + c * cellSize;
      const cellY = gridStartY + r * cellSize;

      if (!cell || cell.isBlack) {
        if (options.theme === 'ink-saver') {
          // 省インク（斜線）
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cellX, cellY, cellSize, cellSize);

          ctx.save();
          ctx.beginPath();
          ctx.rect(cellX, cellY, cellSize, cellSize);
          ctx.clip();
          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = Math.max(1, cellSize * 0.05);
          const step = Math.max(6, cellSize * 0.22);
          for (let d = -cellSize; d <= cellSize * 2; d += step) {
            ctx.beginPath();
            ctx.moveTo(cellX + d, cellY);
            ctx.lineTo(cellX + d + cellSize, cellY + cellSize);
            ctx.stroke();
          }
          ctx.restore();

          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.strokeRect(cellX, cellY, cellSize, cellSize);
        } else {
          // クラシック（黒）
          ctx.fillStyle = '#000000';
          ctx.fillRect(cellX, cellY, cellSize, cellSize);
        }
      } else {
        // 白マス（入力用マス）
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cellX, cellY, cellSize, cellSize);
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(cellX, cellY, cellSize, cellSize);

        // マス番号
        const cellNumber = cell.acrossNumber || cell.downNumber;
        if (cellNumber) {
          ctx.fillStyle = '#000000';
          const numFontSize = Math.max(12, Math.round(cellSize * 0.26));
          ctx.font = `bold ${numFontSize}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(String(cellNumber), cellX + 4, cellY + 4);
        }

        // 解答文字
        if (options.isAnswerKey && cell.letter) {
          ctx.fillStyle = '#000000';
          const letterFontSize = Math.round(cellSize * 0.62);
          ctx.font = `bold ${letterFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cell.letter, cellX + cellSize / 2, cellY + cellSize / 2 + 2);
        } else if (!options.isAnswerKey && options.showFirstLetters && cellNumber && cell.letter) {
          // 頭文字ヒント
          ctx.fillStyle = '#64748b';
          const hintFontSize = Math.round(cellSize * 0.45);
          ctx.font = `${hintFontSize}px sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'bottom';
          ctx.fillText(cell.letter, cellX + cellSize - 4, cellY + cellSize - 3);
        }
      }
    }
  }

  // フッター
  ctx.fillStyle = '#64748b';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('1 / 2 ページ （クロスワード盤面）', width / 2, height - marginBottom + 20);

  return canvas;
}

/**
 * 【ページ2: ヒント専用ページ】
 * A4縦（1600x2262px）を1枚フルに使って、ヨコ・タテの全ヒントを特大・明瞭フォント（22〜28px）で描画。
 * はみ出しゼロ、見やすさ抜群のプロ仕様レイアウト。
 */
export function renderCluesPageCanvas(options: RenderSheetOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = 1600;
  const height = 2262;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas 2D context の初期化に失敗しました。');

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const marginX = 90;
  const marginTop = 70;
  const marginBottom = 65;
  const contentWidth = width - marginX * 2; // 1420px

  const title = options.title || '英単語クロスワード';
  const displayTitle = options.isAnswerKey
    ? `${title} - 解答付きヒント`
    : `${title} - ヒント一覧`;

  // ヘッダー部
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(displayTitle, marginX, marginTop);

  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('ヨコ (Across) & タテ (Down)', marginX + contentWidth, marginTop + 12);

  const headerBottomY = marginTop + 52;
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(marginX, headerBottomY);
  ctx.lineTo(marginX + contentWidth, headerBottomY);
  ctx.stroke();

  // ヒントアイテムの作成
  const acrossClues = options.grid.placedWords.filter((w) => w.direction === 'across');
  const downClues = options.grid.placedWords.filter((w) => w.direction === 'down');
  const totalClues = acrossClues.length + downClues.length;

  const createClueItem = (w: PlacedWord): ClueItemData => {
    const clueText = formatClueText(w, options.hintStyle);
    const prefix = options.isAnswerKey
      ? `${w.number}. [${w.word.toLowerCase()}] - `
      : `${w.number}. `;
    return {
      type: 'clue',
      word: w,
      prefix,
      clueText,
      fullText: prefix + clueText,
    };
  };

  const acrossTitle = options.isAnswerKey ? 'ヨコ (Across) 解答付きヒント' : 'ヨコ (Across)';
  const downTitle = options.isAnswerKey ? 'タテ (Down) 解答付きヒント' : 'タテ (Down)';

  const acrossItems: ClueItemData[] = [
    { type: 'heading', title: acrossTitle, prefix: '', clueText: '', fullText: '' },
    ...acrossClues.map(createClueItem),
  ];
  const downItems: ClueItemData[] = [
    { type: 'heading', title: downTitle, prefix: '', clueText: '', fullText: '' },
    ...downClues.map(createClueItem),
  ];

  // ヒント描画領域（約2000pxの広大な領域）
  const cluesStartY = headerBottomY + 28;
  const availableCluesHeight = height - marginBottom - 40 - cluesStartY;

  // 単語数に応じて2列または3列を選択
  const numCols = totalClues >= 26 ? 3 : 2;
  const colGap = numCols === 3 ? 36 : 54;
  const colWidth = (contentWidth - colGap * (numCols - 1)) / numCols;

  // 特大サイズ（28px）から降順で最大フィットするフォントサイズを自動決定
  const fontSizes = [28, 26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16];

  let selectedFontSize = 18;
  let selectedLineHeight = 25;
  let selectedItemGap = 8;
  let selectedHeadingFontSize = 24;
  let selectedHeadingHeight = 36;
  let selectedColumns: {
    items: {
      data: ClueItemData;
      lines: string[];
      prefixWidth: number;
      itemHeight: number;
    }[];
    totalHeight: number;
  }[] = [];

  for (const fs of fontSizes) {
    const headingFontSize = Math.round(fs * 1.15);
    const headingHeight = headingFontSize + 16;
    const lineHeight = Math.round(fs * 1.36);
    const itemGap = Math.max(5, Math.round(fs * 0.28));

    ctx.font = `${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;

    const measure = (item: ClueItemData) => {
      if (item.type === 'heading') {
        return {
          data: item,
          lines: [item.title || ''],
          prefixWidth: 0,
          itemHeight: headingHeight,
        };
      }
      ctx.font = `${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
      const lines = wrapTextSmart(ctx, item.fullText, colWidth);
      ctx.font = `bold ${fs}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
      const prefixWidth = ctx.measureText(item.prefix).width;
      const itemHeight = lines.length * lineHeight + itemGap;
      return { data: item, lines, prefixWidth, itemHeight };
    };

    let colsData: { items: any[]; totalHeight: number }[] = [];

    if (numCols === 2 && totalClues <= 24) {
      const c0 = acrossItems.map(measure);
      const c1 = downItems.map(measure);
      const h0 = c0.reduce((s, it) => s + it.itemHeight, 0);
      const h1 = c1.reduce((s, it) => s + it.itemHeight, 0);
      colsData = [
        { items: c0, totalHeight: h0 },
        { items: c1, totalHeight: h1 },
      ];
    } else {
      const all = [...acrossItems, ...downItems].map(measure);
      const totalH = all.reduce((s, it) => s + it.itemHeight, 0);
      const targetH = totalH / numCols;
      colsData = Array.from({ length: numCols }, () => ({ items: [], totalHeight: 0 }));
      let curCol = 0;
      for (const it of all) {
        if (
          curCol < numCols - 1 &&
          colsData[curCol].totalHeight + it.itemHeight > targetH * 1.05 &&
          colsData[curCol].items.length > 0
        ) {
          curCol++;
        }
        colsData[curCol].items.push(it);
        colsData[curCol].totalHeight += it.itemHeight;
      }
    }

    const maxH = Math.max(...colsData.map((c) => c.totalHeight));
    if (maxH <= availableCluesHeight) {
      selectedFontSize = fs;
      selectedLineHeight = lineHeight;
      selectedItemGap = itemGap;
      selectedHeadingFontSize = headingFontSize;
      selectedHeadingHeight = headingHeight;
      selectedColumns = colsData;
      break;
    }
  }

  // 描画実行
  const hangIndent = Math.round(selectedFontSize * 1.1);

  selectedColumns.forEach((col, colIdx) => {
    const colX = marginX + colIdx * (colWidth + colGap);
    let curY = cluesStartY;

    col.items.forEach((itemObj) => {
      const item = itemObj.data;
      if (item.type === 'heading') {
        if (curY > cluesStartY) curY += Math.round(selectedFontSize * 0.4);
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${selectedHeadingFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(item.title || '', colX, curY + selectedHeadingFontSize - 2);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(colX, curY + selectedHeadingFontSize + 4);
        ctx.lineTo(colX + colWidth, curY + selectedHeadingFontSize + 4);
        ctx.stroke();

        curY += selectedHeadingHeight;
      } else {
        const lines = itemObj.lines;
        const prefix = item.prefix;
        const prefixWidth = itemObj.prefixWidth;

        lines.forEach((line: string, lIdx: number) => {
          ctx.textBaseline = 'alphabetic';
          if (lIdx === 0) {
            ctx.fillStyle = options.isAnswerKey ? '#0f172a' : '#000000';
            ctx.font = `bold ${selectedFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
            ctx.fillText(prefix, colX, curY + selectedFontSize - 1);

            ctx.fillStyle = '#1e293b';
            ctx.font = `${selectedFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
            const afterPrefix = line.substring(prefix.length);
            ctx.fillText(afterPrefix, colX + prefixWidth, curY + selectedFontSize - 1);
          } else {
            ctx.fillStyle = '#1e293b';
            ctx.font = `${selectedFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
            ctx.fillText(line, colX + hangIndent, curY + selectedFontSize - 1);
          }
          curY += selectedLineHeight;
        });
        curY += selectedItemGap;
      }
    });
  });

  // フッター
  ctx.fillStyle = '#64748b';
  ctx.font = '18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('2 / 2 ページ （ヒント一覧）', width / 2, height - marginBottom + 20);

  return canvas;
}

/**
 * jsPDFドキュメントをブラウザで安全にダウンロード保存
 */
function safelySavePdf(pdf: jsPDF, filename: string): void {
  try {
    pdf.save(filename);
  } catch (saveError) {
    console.warn('pdf.save failed, trying blob URL fallback...', saveError);
    const blob = pdf.output('blob');
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  }
}

export interface ExportPdfOptions {
  title: string;
  subtitle?: string;
  hintStyle: HintStyle;
  isAnswerKey: boolean;
  grid: CrosswordGrid;
  puzzlePackage?: CrosswordPuzzlePackage;
  theme?: GridTheme;
  showFirstLetters?: boolean;
}

/**
 * 【問題用紙 または 解答用紙のPDFエクスポート (必ず2枚組)】
 * 1ページ目: 特大クロスワード盤面
 * 2ページ目: 特大フォントヒント一覧
 * 高品質JPEG圧縮（品質0.92）で全PDFビューアで確実に開ける完全規格準拠ファイルを出力。
 */
export async function exportCrosswordToPdf(options: ExportPdfOptions): Promise<void> {
  const canvasGrid = renderGridPageCanvas(options);
  const canvasClues = renderCluesPageCanvas(options);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const margin = 8;
  const printWidth = pdfWidth - margin * 2; // 194mm

  // --- Page 1: 盤面 ---
  const imgGrid = canvasGrid.toDataURL('image/jpeg', 0.92);
  const printHeightGrid = (canvasGrid.height * printWidth) / canvasGrid.width;
  const posY_Grid = margin + Math.max(0, (pdfHeight - margin * 2 - printHeightGrid) / 2);
  pdf.addImage(imgGrid, 'JPEG', margin, posY_Grid, printWidth, printHeightGrid, undefined, 'FAST');

  // --- Page 2: ヒント ---
  pdf.addPage();
  const imgClues = canvasClues.toDataURL('image/jpeg', 0.92);
  const printHeightClues = (canvasClues.height * printWidth) / canvasClues.width;
  const posY_Clues = margin + Math.max(0, (pdfHeight - margin * 2 - printHeightClues) / 2);
  pdf.addImage(imgClues, 'JPEG', margin, posY_Clues, printWidth, printHeightClues, undefined, 'FAST');

  // メタデータ
  pdf.setProperties({
    title: options.title || 'Crossword Puzzle',
    subject: options.subtitle || 'English Crossword Puzzle',
    author: 'Crossword Builder Pro',
    creator: 'Crossword Builder Pro',
  });

  const safeTitle = sanitizeFilename(options.title);
  const suffix = options.isAnswerKey ? '_解答(2枚組)' : '_問題(2枚組)';
  const filename = `${safeTitle}${suffix}.pdf`;
  safelySavePdf(pdf, filename);
}

export interface ExportBothPdfOptions {
  title: string;
  subtitle?: string;
  hintStyle: HintStyle;
  grid: CrosswordGrid;
  puzzlePackage?: CrosswordPuzzlePackage;
  theme?: GridTheme;
  showFirstLetters?: boolean;
}

/**
 * 【問題・解答 一括エクスポート (全4枚組)】
 * 1ページ目: 問題 盤面
 * 2ページ目: 問題 ヒント
 * 3ページ目: 解答 盤面
 * 4ページ目: 解答 ヒント
 */
export async function exportBothCrosswordsToPdf(options: ExportBothPdfOptions): Promise<void> {
  // 1. 問題 盤面 & ヒント
  const canvasQ_Grid = renderGridPageCanvas({
    grid: options.grid,
    title: options.title,
    subtitle: options.subtitle,
    hintStyle: options.hintStyle,
    isAnswerKey: false,
    theme: options.theme,
    showFirstLetters: options.showFirstLetters,
  });
  const canvasQ_Clues = renderCluesPageCanvas({
    grid: options.grid,
    title: options.title,
    subtitle: options.subtitle,
    hintStyle: options.hintStyle,
    isAnswerKey: false,
    theme: options.theme,
    showFirstLetters: options.showFirstLetters,
  });

  // 2. 解答 盤面 & ヒント
  const canvasA_Grid = renderGridPageCanvas({
    grid: options.grid,
    title: options.title,
    subtitle: options.subtitle,
    hintStyle: options.hintStyle,
    isAnswerKey: true,
    theme: options.theme,
    showFirstLetters: options.showFirstLetters,
  });
  const canvasA_Clues = renderCluesPageCanvas({
    grid: options.grid,
    title: options.title,
    subtitle: options.subtitle,
    hintStyle: options.hintStyle,
    isAnswerKey: true,
    theme: options.theme,
    showFirstLetters: options.showFirstLetters,
  });

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const margin = 8;
  const printWidth = pdfWidth - margin * 2; // 194mm

  const addCanvasPage = (canvas: HTMLCanvasElement, isFirst: boolean) => {
    if (!isFirst) pdf.addPage();
    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const printHeight = (canvas.height * printWidth) / canvas.width;
    const posY = margin + Math.max(0, (pdfHeight - margin * 2 - printHeight) / 2);
    pdf.addImage(imgData, 'JPEG', margin, posY, printWidth, printHeight, undefined, 'FAST');
  };

  addCanvasPage(canvasQ_Grid, true);   // Page 1: 問題 盤面
  addCanvasPage(canvasQ_Clues, false);  // Page 2: 問題 ヒント
  addCanvasPage(canvasA_Grid, false);   // Page 3: 解答 盤面
  addCanvasPage(canvasA_Clues, false);  // Page 4: 解答 ヒント

  pdf.setProperties({
    title: options.title || 'Crossword Puzzle Set',
    subject: options.subtitle || 'English Crossword Puzzle Set',
    author: 'Crossword Builder Pro',
    creator: 'Crossword Builder Pro',
  });

  const safeTitle = sanitizeFilename(options.title);
  const filename = `${safeTitle}_問題・解答セット(全4枚).pdf`;
  safelySavePdf(pdf, filename);
}
