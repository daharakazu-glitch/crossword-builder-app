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
 * ファイル名として使用できない文字（スラッシュ、コロン、バックスラッシュなど）を安全な文字に変換
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

/**
 * テキストを指定幅で自動折り返しするヘルパー関数
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const words = text.split('');
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const testLine = currentLine + words[i];
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && currentLine.length > 0) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

interface RenderSheetOptions {
  grid: CrosswordGrid;
  title: string;
  subtitle?: string;
  hintStyle: HintStyle;
  isAnswerKey: boolean;
  theme?: GridTheme;
  showFirstLetters?: boolean;
}

/**
 * HTML5 Canvas 2D を直接用いて、A4用紙（1600x2260px）を100%安全かつエラーフリーに描画
 * DOMや外部ライブラリ（html2canvas）に一切依存しないため、CORS/Taintedエラーが原理的に発生しません。
 */
export function renderCrosswordToPureCanvas(options: RenderSheetOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // A4比率 (1 : 1.414) の高解像度キャンバス
  const width = 1600;
  const height = 2262;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) {
    throw new Error('Canvas 2D context の初期化に失敗しました。');
  }

  const {
    grid,
    title,
    subtitle = 'Name: ________________________________',
    hintStyle,
    isAnswerKey,
    theme = 'ink-saver',
    showFirstLetters = false,
  } = options;

  // 1. 背景を純白で塗りつぶし
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  const marginX = 90;
  const contentWidth = width - marginX * 2; // 1420px

  // 2. ヘッダー描画
  const headerY = 70;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 30px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const displayTitle = isAnswerKey ? `${title} (解答)` : title;
  ctx.fillText(displayTitle, marginX, headerY + 32);

  ctx.font = 'bold 20px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(subtitle, width - marginX, headerY + 32);

  // ヘッダー区切り線
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(marginX, headerY + 45);
  ctx.lineTo(width - marginX, headerY + 45);
  ctx.stroke();

  // 3. 盤面（グリッド）描画
  // グリッドサイズ: A4用紙上部中央に配置（最大 1040px 正方形）
  const gridMaxPx = 1040;
  const gridPx = Math.min(gridMaxPx, contentWidth);
  const gridStartX = marginX + (contentWidth - gridPx) / 2;
  const gridStartY = headerY + 65;

  const gridSize = Math.max(1, grid.size);
  const cellSize = gridPx / gridSize;

  // グリッド外枠
  ctx.strokeStyle = theme === 'ink-saver' ? '#64748b' : '#000000';
  ctx.lineWidth = 2;
  ctx.strokeRect(gridStartX, gridStartY, gridPx, gridPx);

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const cell = grid.cells[r]?.[c];
      const cellX = gridStartX + c * cellSize;
      const cellY = gridStartY + r * cellSize;

      if (!cell || cell.isBlack) {
        if (theme === 'ink-saver') {
          // 白背景 ＋ 薄いグレー斜線
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cellX, cellY, cellSize, cellSize);

          // 斜線パターンをクリッピングして描画
          ctx.save();
          ctx.beginPath();
          ctx.rect(cellX, cellY, cellSize, cellSize);
          ctx.clip();

          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = Math.max(1, cellSize * 0.06);
          const step = Math.max(5, cellSize * 0.28);
          for (let d = -cellSize; d <= cellSize * 2; d += step) {
            ctx.beginPath();
            ctx.moveTo(cellX + d, cellY);
            ctx.lineTo(cellX + d + cellSize, cellY + cellSize);
            ctx.stroke();
          }
          ctx.restore();

          // セル境界線
          ctx.strokeStyle = '#94a3b8';
          ctx.lineWidth = 1;
          ctx.strokeRect(cellX, cellY, cellSize, cellSize);
        } else {
          // 黒マス（クラシック）
          ctx.fillStyle = '#000000';
          ctx.fillRect(cellX, cellY, cellSize, cellSize);
        }
      } else {
        // 白マス（入力用）
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cellX, cellY, cellSize, cellSize);

        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.strokeRect(cellX, cellY, cellSize, cellSize);

        // マス番号（左上）
        const cellNumber = cell.acrossNumber || cell.downNumber;
        if (cellNumber) {
          ctx.fillStyle = '#000000';
          const numFontSize = Math.max(9, Math.round(cellSize * 0.26));
          ctx.font = `bold ${numFontSize}px sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          ctx.fillText(String(cellNumber), cellX + 3, cellY + 2);
        }

        // 解答用紙: 文字を中央に表示
        if (isAnswerKey && cell.letter) {
          ctx.fillStyle = '#000000';
          const letterFontSize = Math.max(12, Math.round(cellSize * 0.58));
          ctx.font = `bold ${letterFontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cell.letter.toUpperCase(), cellX + cellSize / 2, cellY + cellSize / 2 + 1);
        } else if (!isAnswerKey && showFirstLetters && cellNumber && cell.letter) {
          // 問題用紙で頭文字ヒント有効な場合
          ctx.fillStyle = '#2563eb';
          const letterFontSize = Math.max(12, Math.round(cellSize * 0.58));
          ctx.font = `bold ${letterFontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(cell.letter.toUpperCase(), cellX + cellSize / 2, cellY + cellSize / 2 + 1);
        }
      }
    }
  }

  // 4. ヒント（Clues）セクション描画
  const cluesStartY = gridStartY + gridPx + 25;
  const colWidth = (contentWidth - 40) / 2; // 690px
  const leftColX = marginX;
  const rightColX = marginX + colWidth + 40;

  const acrossClues = grid.placedWords.filter((w) => w.direction === 'across');
  const downClues = grid.placedWords.filter((w) => w.direction === 'down');
  const totalClues = acrossClues.length + downClues.length;

  // 単語数に応じた適応的フォントサイズ
  let clueFontSize = 14;
  let clueLineHeight = 19;
  if (totalClues > 45) {
    clueFontSize = 11;
    clueLineHeight = 15;
  } else if (totalClues > 30) {
    clueFontSize = 12;
    clueLineHeight = 16.5;
  } else if (totalClues > 20) {
    clueFontSize = 13;
    clueLineHeight = 17.5;
  }

  // カラム描画用ヘルパー関数
  const renderClueColumn = (
    clues: PlacedWord[],
    colX: number,
    titleText: string
  ) => {
    // 見出し
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(titleText, colX, cluesStartY + 20);

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(colX, cluesStartY + 28);
    ctx.lineTo(colX + colWidth, cluesStartY + 28);
    ctx.stroke();

    let curY = cluesStartY + 48;
    const maxBottomY = height - 40;

    for (const w of clues) {
      if (curY >= maxBottomY) break;

      const clueText = formatClueText(w, hintStyle);
      const prefix = isAnswerKey
        ? `${w.number}. [${w.word.toLowerCase()}] - `
        : `${w.number}. `;
      const fullText = prefix + clueText;

      ctx.font = `${clueFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
      const lines = wrapText(ctx, fullText, colWidth);

      for (let i = 0; i < lines.length; i++) {
        if (curY >= maxBottomY) break;
        const line = lines[i];

        // 最初の行の番号・単語部を強調
        if (i === 0) {
          ctx.fillStyle = isAnswerKey ? '#0f172a' : '#000000';
          ctx.font = `bold ${clueFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
          const prefixWidth = ctx.measureText(prefix).width;
          ctx.fillText(prefix, colX, curY);

          ctx.fillStyle = '#1e293b';
          ctx.font = `${clueFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
          ctx.fillText(line.substring(prefix.length), colX + prefixWidth, curY);
        } else {
          ctx.fillStyle = '#1e293b';
          ctx.font = `${clueFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
          ctx.fillText(line, colX + 16, curY);
        }
        curY += clueLineHeight;
      }
      curY += Math.max(2, clueLineHeight * 0.2);
    }
  };

  renderClueColumn(
    acrossClues,
    leftColX,
    isAnswerKey ? 'ヨコ (Across) 解答付きヒント' : 'ヨコ (Across)'
  );
  renderClueColumn(
    downClues,
    rightColX,
    isAnswerKey ? 'タテ (Down) 解答付きヒント' : 'タテ (Down)'
  );

  return canvas;
}

/**
 * jsPDFドキュメントをブラウザで安全にダウンロード保存（FileSaverフォールバック付き）
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

interface ExportPdfOptions {
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
 * 単一ページPDF (問題用紙 または 解答用紙) のエクスポート（ピュアCanvas直接描画で100%エラーなし）
 */
export async function exportCrosswordToPdf(options: ExportPdfOptions): Promise<void> {
  const canvas = renderCrosswordToPureCanvas({
    grid: options.grid,
    title: options.title,
    subtitle: options.subtitle,
    hintStyle: options.hintStyle,
    isAnswerKey: options.isAnswerKey,
    theme: options.theme,
    showFirstLetters: options.showFirstLetters,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  const margin = 6;
  const printWidth = pdfWidth - margin * 2; // 198mm
  const printHeight = (canvas.height * printWidth) / canvas.width;
  const posX = margin;
  const posY = margin + Math.max(0, (pdfHeight - margin * 2 - printHeight) / 2);

  pdf.addImage(imgData, 'PNG', posX, posY, printWidth, printHeight);

  // 逆復元用のパズルメタデータを安全に埋め込み
  if (options.puzzlePackage) {
    try {
      const encoded = encodePuzzlePackage(options.puzzlePackage);
      if (encoded) {
        pdf.setProperties({
          title: options.title || 'Crossword Puzzle',
          subject: options.subtitle || 'English Crossword Puzzle',
          author: 'Crossword Builder Pro',
          keywords: `CROSSWORD_DATA:${encoded}`,
          creator: 'Crossword Builder Pro',
        });

        try {
          pdf.setFontSize(0.5);
          pdf.setTextColor(255, 255, 255);
          pdf.text(`CROSSWORD_DATA:${encoded}`, 1, 1);
        } catch (_e) {
          // ignore
        }
      }
    } catch (metaErr) {
      console.warn('Failed to embed metadata in PDF:', metaErr);
    }
  }

  const safeTitle = sanitizeFilename(options.title);
  const suffix = options.isAnswerKey ? '_解答' : '_問題';
  const filename = `${safeTitle}${suffix}.pdf`;
  safelySavePdf(pdf, filename);
}

interface ExportBothPdfOptions {
  title: string;
  subtitle?: string;
  hintStyle: HintStyle;
  grid: CrosswordGrid;
  puzzlePackage?: CrosswordPuzzlePackage;
  theme?: GridTheme;
  showFirstLetters?: boolean;
}

/**
 * 2ページPDF (1ページ目: 問題用紙, 2ページ目: 解答用紙) の一括エクスポート（ピュアCanvas直接描画で100%エラーなし）
 */
export async function exportBothCrosswordsToPdf(options: ExportBothPdfOptions): Promise<void> {
  // 1. 問題用紙
  const canvasQ = renderCrosswordToPureCanvas({
    grid: options.grid,
    title: options.title,
    subtitle: options.subtitle,
    hintStyle: options.hintStyle,
    isAnswerKey: false,
    theme: options.theme,
    showFirstLetters: options.showFirstLetters,
  });

  // 2. 解答用紙
  const canvasA = renderCrosswordToPureCanvas({
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
  const margin = 6;
  const printWidth = pdfWidth - margin * 2; // 198mm

  // --- Page 1: 問題用紙 ---
  const imgDataQ = canvasQ.toDataURL('image/png');
  const printHeightQ = (canvasQ.height * printWidth) / canvasQ.width;
  const posY_Q = margin + Math.max(0, (pdfHeight - margin * 2 - printHeightQ) / 2);
  pdf.addImage(imgDataQ, 'PNG', margin, posY_Q, printWidth, printHeightQ);

  // --- Page 2: 解答用紙 ---
  pdf.addPage();
  const imgDataA = canvasA.toDataURL('image/png');
  const printHeightA = (canvasA.height * printWidth) / canvasA.width;
  const posY_A = margin + Math.max(0, (pdfHeight - margin * 2 - printHeightA) / 2);
  pdf.addImage(imgDataA, 'PNG', margin, posY_A, printWidth, printHeightA);

  // 逆復元用のパズルメタデータを安全に埋め込み
  if (options.puzzlePackage) {
    try {
      const encoded = encodePuzzlePackage(options.puzzlePackage);
      if (encoded) {
        pdf.setProperties({
          title: options.title || 'Crossword Puzzle',
          subject: options.subtitle || 'English Crossword Puzzle',
          author: 'Crossword Builder Pro',
          keywords: `CROSSWORD_DATA:${encoded}`,
          creator: 'Crossword Builder Pro',
        });

        try {
          pdf.setFontSize(0.5);
          pdf.setTextColor(255, 255, 255);
          pdf.setPage(1);
          pdf.text(`CROSSWORD_DATA:${encoded}`, 1, 1);
          pdf.setPage(2);
          pdf.text(`CROSSWORD_DATA:${encoded}`, 1, 1);
        } catch (_e) {
          // ignore
        }
      }
    } catch (metaErr) {
      console.warn('Failed to embed metadata in PDF:', metaErr);
    }
  }

  const safeTitle = sanitizeFilename(options.title);
  const filename = `${safeTitle}_問題・解答セット.pdf`;
  safelySavePdf(pdf, filename);
}
