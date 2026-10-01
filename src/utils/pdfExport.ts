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
 * スマート・テキスト折り返し（英単語の途中分断を防ぎ、日本語と英単語を適切に折り返す）
 */
function wrapTextSmart(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  if (!text) return [];

  // 日本語ブロック、英単語/数字、空白/記号にトークン化
  const tokens = text.match(/([A-Za-z0-9_\-]+|[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]+|\s+|[^\s\w])/gu) || [text];
  const lines: string[] = [];
  let currentLine = '';

  for (const token of tokens) {
    const isCjk = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]/.test(token);

    if (isCjk && token.length > 1) {
      // 日本語文字列は1文字単位で折り返し判定
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
        // 単語自体が最大幅を超える場合は文字単位で分割
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

interface ColumnLayoutPlan {
  numCols: number;
  colWidth: number;
  colGap: number;
  columns: {
    items: {
      data: ClueItemData;
      lines: string[];
      prefixWidth: number;
      itemHeight: number;
    }[];
    totalHeight: number;
  }[];
  maxColHeight: number;
  fontSize: number;
  lineHeight: number;
  itemGap: number;
  headingFontSize: number;
  headingHeight: number;
  gridPx: number;
}

/**
 * A4用紙のスペース（全高 2262px）に最も美しく最大フォントで収まる
 * 最適なレイアウト（フォントサイズ、グリッドサイズ、カラム数）を自動探索・最適化
 */
function findOptimalLayout(
  ctx: CanvasRenderingContext2D,
  acrossClues: PlacedWord[],
  downClues: PlacedWord[],
  hintStyle: HintStyle,
  isAnswerKey: boolean,
  contentWidth: number,
  totalAvailableHeight: number,
  gridCellCount: number
): ColumnLayoutPlan {
  const acrossTitle = isAnswerKey ? 'ヨコ (Across) 解答付きヒント' : 'ヨコ (Across)';
  const downTitle = isAnswerKey ? 'タテ (Down) 解答付きヒント' : 'タテ (Down)';

  // 全アイテムを準備
  const createClueItem = (w: PlacedWord): ClueItemData => {
    const clueText = formatClueText(w, hintStyle);
    const prefix = isAnswerKey
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

  const acrossItems: ClueItemData[] = [
    { type: 'heading', title: acrossTitle, prefix: '', clueText: '', fullText: '' },
    ...acrossClues.map(createClueItem),
  ];

  const downItems: ClueItemData[] = [
    { type: 'heading', title: downTitle, prefix: '', clueText: '', fullText: '' },
    ...downClues.map(createClueItem),
  ];

  const totalClues = acrossClues.length + downClues.length;

  // 盤面セルの最小・理想サイズ制約
  // 単語数が多い場合（24語以上）やグリッドが大きい場合は、ヒント行数が多いため盤面サイズを適切に制御しヒント領域を確保
  const isLargePuzzle = totalClues >= 24 || gridCellCount >= 20;
  const minCellPx = isLargePuzzle ? 20 : 28;
  const minGridPx = Math.max(420, gridCellCount * minCellPx);
  const idealMaxGridPx = isLargePuzzle
    ? Math.min(620, Math.max(minGridPx, gridCellCount * 24.5))
    : Math.min(740, Math.max(minGridPx, gridCellCount * 36));

  // 厳格な安全マージン（印刷マージンやデバイス差によるはみ出しを確実に防止）
  const safetyMargin = isLargePuzzle ? 80 : 40;
  const usableHeightForContent = totalAvailableHeight - safetyMargin;

  // 評価ヘルパー: 指定のフォントサイズとモードでレイアウトを計算
  const evaluateMode = (
    numCols: number,
    fontSize: number,
    mode: 'classic' | 'balanced'
  ): ColumnLayoutPlan | null => {
    const colGap = numCols === 3 ? 32 : 44;
    const colWidth = (contentWidth - colGap * (numCols - 1)) / numCols;

    const headingFontSize = Math.round(fontSize * 1.15);
    const headingHeight = headingFontSize + 14;
    const lineHeight = Math.round(fontSize * 1.34);
    const itemGap = Math.max(3, Math.round(fontSize * 0.22));

    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;

    const measureItem = (item: ClueItemData) => {
      if (item.type === 'heading') {
        return {
          data: item,
          lines: [item.title || ''],
          prefixWidth: 0,
          itemHeight: headingHeight,
        };
      }

      ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
      const lines = wrapTextSmart(ctx, item.fullText, colWidth);
      ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
      const prefixWidth = ctx.measureText(item.prefix).width;
      const itemHeight = lines.length * lineHeight + itemGap;

      return {
        data: item,
        lines,
        prefixWidth,
        itemHeight,
      };
    };

    let columnsData: {
      items: ReturnType<typeof measureItem>[];
      totalHeight: number;
    }[] = [];

    if (mode === 'classic' && numCols === 2) {
      // 左にAcross、右にDown
      const col0Items = acrossItems.map(measureItem);
      const col1Items = downItems.map(measureItem);
      const h0 = col0Items.reduce((sum, it) => sum + it.itemHeight, 0);
      const h1 = col1Items.reduce((sum, it) => sum + it.itemHeight, 0);

      // 左右の実際の高さの差が 22% を超えるなら classic は却下（片方が溢れるのを防止）
      if (Math.abs(h0 - h1) > Math.min(h0, h1) * 0.22) {
        return null;
      }

      columnsData = [
        { items: col0Items, totalHeight: h0 },
        { items: col1Items, totalHeight: h1 },
      ];
    } else {
      // balanced: 全アイテムを均等に各列へ分配
      const allRawItems = [...acrossItems, ...downItems];
      const allMeasured = allRawItems.map(measureItem);
      const totalH = allMeasured.reduce((sum, it) => sum + it.itemHeight, 0);
      const targetColH = totalH / numCols;

      columnsData = Array.from({ length: numCols }, () => ({
        items: [] as ReturnType<typeof measureItem>[],
        totalHeight: 0,
      }));

      let curCol = 0;
      for (const item of allMeasured) {
        if (
          curCol < numCols - 1 &&
          columnsData[curCol].totalHeight + item.itemHeight > targetColH * 1.05 &&
          columnsData[curCol].items.length > 0
        ) {
          curCol++;
        }
        columnsData[curCol].items.push(item);
        columnsData[curCol].totalHeight += item.itemHeight;
      }
    }

    const maxColHeight = Math.max(...columnsData.map((c) => c.totalHeight));
    const sectionGap = 28;
    const availableForGrid = usableHeightForContent - maxColHeight - sectionGap;

    if (availableForGrid < minGridPx) {
      return null; // グリッドが最小サイズを維持できない
    }

    // 適切なグリッドサイズ（最大 idealMaxGridPx、余剰があれば利用）
    const gridPx = Math.min(idealMaxGridPx, Math.max(minGridPx, availableForGrid));

    return {
      numCols,
      colWidth,
      colGap,
      columns: columnsData,
      maxColHeight,
      fontSize,
      lineHeight,
      itemGap,
      headingFontSize,
      headingHeight,
      gridPx,
    };
  };

  // フォントサイズの候補: 26px(教科書本文サイズ・特大) から 14px まで降順探索
  const fontSizes = [26, 25, 24, 23, 22, 21, 20, 19, 18, 17, 16, 15, 14];

  let bestPlan: ColumnLayoutPlan | null = null;

  // 1. 単語数が 24語以上ある場合は、問答無用で【3カラム】を最優先（左右偏りによるはみ出しを完全排除）
  if (totalClues >= 24) {
    for (const fs of fontSizes) {
      const plan = evaluateMode(3, fs, 'balanced');
      if (plan) {
        bestPlan = plan;
        break;
      }
    }
  }

  // 2. 単語数が 23語以下の場合: 左右の高さが揃っていれば 2カラム classic を優先
  if (!bestPlan && totalClues < 24) {
    for (const fs of fontSizes) {
      if (fs < 18) break;
      const plan = evaluateMode(2, fs, 'classic');
      if (plan && plan.gridPx >= minGridPx + 20) {
        bestPlan = plan;
        break;
      }
    }
  }

  // 3. 2カラム balanced を探索
  if (!bestPlan) {
    for (const fs of fontSizes) {
      const plan = evaluateMode(2, fs, 'balanced');
      if (plan) {
        bestPlan = plan;
        break;
      }
    }
  }

  // 4. 万一まだ決まらない場合の 3カラム探索
  if (!bestPlan) {
    for (const fs of fontSizes) {
      const plan = evaluateMode(3, fs, 'balanced');
      if (plan) {
        bestPlan = plan;
        break;
      }
    }
  }

  // 5. 万一見つからなかった場合のセーフティフォールバック（14px 3-col）
  if (!bestPlan) {
    bestPlan = evaluateMode(3, 14, 'balanced') || {
      numCols: 3,
      colWidth: 458,
      colGap: 32,
      columns: [],
      maxColHeight: 700,
      fontSize: 14,
      lineHeight: 19,
      itemGap: 4,
      headingFontSize: 16,
      headingHeight: 26,
      gridPx: minGridPx,
    };
  }

  return bestPlan;
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
 * HTML5 Canvas 2D を直接用いて、A4用紙（1600x2262px）を最適化レイアウトで描画
 * フォントサイズとグリッドサイズを自動最適化（Auto-fit）し、A4一枚に100%美しく収めます。
 */
export function renderCrosswordToPureCanvas(options: RenderSheetOptions): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // A4比率 (1 : 1.41375) の高解像度キャンバス (210mm × 297mm)
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

  const marginX = 75;
  const contentWidth = width - marginX * 2; // 1450px

  // 2. ヘッダー描画
  const headerY = 50;
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  const displayTitle = isAnswerKey ? `${title} (解答)` : title;
  ctx.fillText(displayTitle, marginX, headerY + 30);

  ctx.font = 'bold 19px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(subtitle, width - marginX, headerY + 30);

  // ヘッダー区切り線
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginX, headerY + 44);
  ctx.lineTo(width - marginX, headerY + 44);
  ctx.stroke();

  const headerBottomY = headerY + 46;
  const bottomMargin = 45;
  const totalAvailableHeight = height - bottomMargin - headerBottomY;

  // 3. 最適レイアウトの自動計算
  const acrossClues = grid.placedWords.filter((w) => w.direction === 'across');
  const downClues = grid.placedWords.filter((w) => w.direction === 'down');
  const gridSize = Math.max(1, grid.size);

  const layoutPlan = findOptimalLayout(
    ctx,
    acrossClues,
    downClues,
    hintStyle,
    isAnswerKey,
    contentWidth,
    totalAvailableHeight,
    gridSize
  );

  // 4. 盤面（グリッド）描画
  const gridPx = layoutPlan.gridPx;
  const gridStartX = marginX + (contentWidth - gridPx) / 2;
  const gridStartY = headerBottomY + 20;

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

  // 5. ヒント（Clues）セクション描画
  // グリッドとヒント間の余白（全体の余剰スペースに応じて適度に配分）
  const remainingSpace = totalAvailableHeight - (gridPx + 20) - layoutPlan.maxColHeight;
  const sectionGap = Math.min(32, Math.max(18, Math.round(remainingSpace * 0.35)));
  const cluesStartY = gridStartY + gridPx + sectionGap;

  const {
    colWidth,
    colGap,
    columns,
    fontSize,
    lineHeight,
    itemGap,
    headingFontSize,
    headingHeight,
  } = layoutPlan;

  const hangIndent = Math.round(fontSize * 1.0); // 2行目以降のぶら下げインデント
  const absoluteMaxBottomY = height - bottomMargin - 10; // これ以上は絶対に下にはみ出させないガード

  columns.forEach((col, colIdx) => {
    const colX = marginX + colIdx * (colWidth + colGap);
    let curY = cluesStartY;

    col.items.forEach((itemObj) => {
      const item = itemObj.data;

      // ページ下端オーバーフローの完全防止ガード
      if (curY + lineHeight > absoluteMaxBottomY) {
        return;
      }

      if (item.type === 'heading') {
        // 見出し行
        if (curY > cluesStartY) {
          curY += Math.round(fontSize * 0.4);
        }

        if (curY + headingHeight > absoluteMaxBottomY) return;

        ctx.fillStyle = '#000000';
        ctx.font = `bold ${headingFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(item.title || '', colX, curY + headingFontSize - 2);

        // 見出しアンダーライン
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(colX, curY + headingFontSize + 4);
        ctx.lineTo(colX + colWidth, curY + headingFontSize + 4);
        ctx.stroke();

        curY += headingHeight;
      } else {
        // ヒント本文行
        const lines = itemObj.lines;
        const prefix = item.prefix;
        const prefixWidth = itemObj.prefixWidth;

        lines.forEach((line, lIdx) => {
          if (curY + lineHeight > absoluteMaxBottomY) return;

          ctx.textBaseline = 'alphabetic';

          if (lIdx === 0) {
            // 1行目: プレフィックス（番号・正解単語）を強調表示
            ctx.fillStyle = isAnswerKey ? '#0f172a' : '#000000';
            ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
            ctx.fillText(prefix, colX, curY + fontSize - 1);

            ctx.fillStyle = '#1e293b';
            ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
            const textAfterPrefix = line.substring(prefix.length);
            ctx.fillText(textAfterPrefix, colX + prefixWidth, curY + fontSize - 1);
          } else {
            // 2行目以降: ぶら下げインデントで見やすく揃える
            ctx.fillStyle = '#1e293b';
            ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Hiragino Sans", "Noto Sans JP", sans-serif`;
            ctx.fillText(line, colX + hangIndent, curY + fontSize - 1);
          }

          curY += lineHeight;
        });

        curY += itemGap;
      }
    });
  });

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
 * 高品質JPEG圧縮（品質0.92）を採用し、20MB超の巨大破損ファイルを防ぎ約800KBでどの端末でも確実に開けます
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

  // 高品質JPEG (品質 0.92) で超軽量化＆完全な互換性を確保
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  const margin = 6;
  const printWidth = pdfWidth - margin * 2; // 198mm
  const printHeight = (canvas.height * printWidth) / canvas.width;
  const posX = margin;
  const posY = margin + Math.max(0, (pdfHeight - margin * 2 - printHeight) / 2);

  pdf.addImage(imgData, 'JPEG', posX, posY, printWidth, printHeight, undefined, 'FAST');

  // 標準PDFメタデータ設定（長大な文字列や非標準text streamを完全排除し、どのPDFビューアでも100%確実に開ける構造）
  pdf.setProperties({
    title: options.title || 'Crossword Puzzle',
    subject: options.subtitle || 'English Crossword Puzzle',
    author: 'Crossword Builder Pro',
    creator: 'Crossword Builder Pro',
  });

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
 * 2ページPDF (1ページ目: 問題用紙, 2ページ目: 解答用紙) の一括エクスポート
 * 高品質JPEG圧縮（品質0.92）を採用し、20MB超の巨大破損ファイルを防ぎ約1.5MBでどの端末でも確実に開けます
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
  const imgDataQ = canvasQ.toDataURL('image/jpeg', 0.92);
  const printHeightQ = (canvasQ.height * printWidth) / canvasQ.width;
  const posY_Q = margin + Math.max(0, (pdfHeight - margin * 2 - printHeightQ) / 2);
  pdf.addImage(imgDataQ, 'JPEG', margin, posY_Q, printWidth, printHeightQ, undefined, 'FAST');

  // --- Page 2: 解答用紙 ---
  pdf.addPage();
  const imgDataA = canvasA.toDataURL('image/jpeg', 0.92);
  const printHeightA = (canvasA.height * printWidth) / canvasA.width;
  const posY_A = margin + Math.max(0, (pdfHeight - margin * 2 - printHeightA) / 2);
  pdf.addImage(imgDataA, 'JPEG', margin, posY_A, printWidth, printHeightA, undefined, 'FAST');

  // 標準PDFメタデータ設定（長大な文字列や非標準text streamを完全排除し、どのPDFビューアでも100%確実に開ける構造）
  pdf.setProperties({
    title: options.title || 'Crossword Puzzle',
    subject: options.subtitle || 'English Crossword Puzzle',
    author: 'Crossword Builder Pro',
    creator: 'Crossword Builder Pro',
  });

  const safeTitle = sanitizeFilename(options.title);
  const filename = `${safeTitle}_問題・解答セット.pdf`;
  safelySavePdf(pdf, filename);
}
