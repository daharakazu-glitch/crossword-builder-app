import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { HintStyle, PlacedWord, CrosswordPuzzlePackage, GridTheme } from '../types/crossword';

export function formatClueText(word: PlacedWord, hintStyle: HintStyle): string {
  const cleanWord = word.word.toUpperCase().replace(/[^A-Z]/g, '');
  // 間隔を十分に広げたカッコ (全角空白4文字分の見やすい幅)
  const wideBlank = '(　　　　)';
  let sentenceClue = (word.sentence || '').trim();

  if (sentenceClue) {
    // 1. 既存の狭いカッコ ( ) や （ ） や [ ] や アンダーライン ___ を広めのカッコに置換
    sentenceClue = sentenceClue
      .replace(/\([\s\u3000]*\)/g, wideBlank)
      .replace(/（[\s\u3000]*）/g, wideBlank)
      .replace(/\[[\s\u3000]*\]/g, wideBlank)
      .replace(/_{2,}/g, wideBlank);

    // 2. 例文内に単語そのものが含まれている場合は (　　　　) に置換
    const regex = new RegExp(`\\b${cleanWord}\\b`, 'gi');
    sentenceClue = sentenceClue.replace(regex, wideBlank);
  } else {
    // 例文がない場合のデフォルト
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
  // OS禁止文字: / \ : * ? " < > | および改行・タブ
  let safe = name
    .replace(/[\\/:*?"<>|\r\n\t]+/g, '_')
    .replace(/_+/g, '_')
    .trim();
  // 前後のドットやスペースを除去
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
 * DOM要素を高精度かつ安全にCanvasへレンダリング（Safariや低メモリ環境向けの自動フォールバック付き）
 */
async function renderElementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const scales = [2, 1.5, 1];
  let lastError: any = null;

  for (const scale of scales) {
    try {
      const canvas = await html2canvas(element, {
        scale,
        useCORS: true,
        allowTaint: true,
        foreignObjectRendering: false,
        logging: false,
        backgroundColor: '#ffffff',
        scrollX: 0,
        scrollY: 0,
        windowWidth: element.scrollWidth || 800,
        windowHeight: element.scrollHeight || 1130,
        onclone: (_clonedDoc, clonedElement) => {
          // クローン要素がスクロールや不要なマージンで崩れないように強制スタイル適用
          clonedElement.style.transform = 'none';
          clonedElement.style.margin = '0';
        },
      });
      return canvas;
    } catch (err) {
      console.warn(`html2canvas failed at scale ${scale}, retrying with lower scale...`, err);
      lastError = err;
    }
  }

  throw lastError || new Error('用紙の描画処理に失敗しました。');
}

/**
 * jsPDFドキュメントをブラウザで安全にダウンロード保存（FileSaverフォールバック付き）
 */
function safelySavePdf(pdf: jsPDF, filename: string): void {
  try {
    pdf.save(filename);
  } catch (saveError) {
    console.warn('pdf.save failed, trying blob URL fallback...', saveError);
    // フォールバック: Blobを作成して直接<a>タグでダウンロード
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
  isAnswerKey: boolean; // 解答用紙かどうか
  elementId: string;    // PDF化対象のDOM要素ID
  puzzlePackage?: CrosswordPuzzlePackage;
  theme?: GridTheme;
}

/**
 * 単一ページPDF (問題用紙 または 解答用紙) のエクスポート
 */
export async function exportCrosswordToPdf(options: ExportPdfOptions): Promise<void> {
  const element = document.getElementById(options.elementId);
  if (!element) {
    throw new Error('PDF生成対象のプレビュー要素が見つかりませんでした。モーダルが完全に開いてからお試しください。');
  }

  const canvas = await renderElementToCanvas(element);
  const imgData = canvas.toDataURL('image/png');

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm

  const margin = 8; // 8mm余白
  const maxPrintWidth = pdfWidth - margin * 2; // 194mm
  const maxPrintHeight = pdfHeight - margin * 2; // 281mm

  let printWidth = maxPrintWidth;
  let printHeight = (canvas.height * printWidth) / canvas.width;

  // 1枚に確実に収まるよう縦横比を維持して自動スケール調整
  if (printHeight > maxPrintHeight) {
    const scale = maxPrintHeight / printHeight;
    printHeight = maxPrintHeight;
    printWidth = printWidth * scale;
  }

  const posX = (pdfWidth - printWidth) / 2; // 水平中央
  const posY = margin + (maxPrintHeight - printHeight) / 2; // 垂直中央

  pdf.addImage(imgData, 'PNG', posX, posY, printWidth, printHeight);

  // 逆復元用のパズルメタデータと不可視テキストを埋め込み
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

        // テキストレイヤーにも不可視文字列として直接埋め込み（OCR不要で100%即時復元可能に）
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
  const filename = `${safeTitle}.pdf`;
  safelySavePdf(pdf, filename);
}

interface ExportBothPdfOptions {
  title: string;
  subtitle?: string;
  hintStyle: HintStyle;
  questionElementId: string;
  answerElementId: string;
  puzzlePackage?: CrosswordPuzzlePackage;
  theme?: GridTheme;
}

/**
 * 2ページPDF (1ページ目: 問題用紙, 2ページ目: 解答用紙) の一括エクスポート
 */
export async function exportBothCrosswordsToPdf(options: ExportBothPdfOptions): Promise<void> {
  const qElement = document.getElementById(options.questionElementId);
  const aElement = document.getElementById(options.answerElementId);

  if (!qElement || !aElement) {
    throw new Error('PDF生成対象のプレビュー要素が見つかりませんでした。モーダルが完全に開いてからお試しください。');
  }

  // 1. 問題用紙キャンバス
  const canvasQ = await renderElementToCanvas(qElement);

  // 2. 解答用紙キャンバス
  const canvasA = await renderElementToCanvas(aElement);

  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth(); // 210mm
  const pdfHeight = pdf.internal.pageSize.getHeight(); // 297mm
  const margin = 8;
  const maxPrintWidth = pdfWidth - margin * 2;
  const maxPrintHeight = pdfHeight - margin * 2;

  // --- Page 1: 問題用紙 ---
  const imgDataQ = canvasQ.toDataURL('image/png');
  let printWidthQ = maxPrintWidth;
  let printHeightQ = (canvasQ.height * printWidthQ) / canvasQ.width;
  if (printHeightQ > maxPrintHeight) {
    const scale = maxPrintHeight / printHeightQ;
    printHeightQ = maxPrintHeight;
    printWidthQ = printWidthQ * scale;
  }
  const posX_Q = (pdfWidth - printWidthQ) / 2;
  const posY_Q = margin + (maxPrintHeight - printHeightQ) / 2;
  pdf.addImage(imgDataQ, 'PNG', posX_Q, posY_Q, printWidthQ, printHeightQ);

  // --- Page 2: 解答用紙 ---
  pdf.addPage();
  const imgDataA = canvasA.toDataURL('image/png');
  let printWidthA = maxPrintWidth;
  let printHeightA = (canvasA.height * printWidthA) / canvasA.width;
  if (printHeightA > maxPrintHeight) {
    const scale = maxPrintHeight / printHeightA;
    printHeightA = maxPrintHeight;
    printWidthA = printWidthA * scale;
  }
  const posX_A = (pdfWidth - printWidthA) / 2;
  const posY_A = margin + (maxPrintHeight - printHeightA) / 2;
  pdf.addImage(imgDataA, 'PNG', posX_A, posY_A, printWidthA, printHeightA);

  // 逆復元用のパズルメタデータと不可視テキストを埋め込み
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
