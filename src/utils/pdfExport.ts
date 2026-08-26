import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { HintStyle, PlacedWord } from '../types/crossword';

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

interface ExportPdfOptions {
  title: string;
  subtitle?: string;
  hintStyle: HintStyle;
  isAnswerKey: boolean; // 解答用紙かどうか
  elementId: string;    // PDF化対象のDOM要素ID
}

/**
 * 単一ページPDF (問題用紙 または 解答用紙) のエクスポート
 */
export async function exportCrosswordToPdf(options: ExportPdfOptions): Promise<void> {
  const element = document.getElementById(options.elementId);
  if (!element) {
    throw new Error('PDF生成対象の要素が見つかりませんでした。');
  }

  // キャンバスを高解像度で生成
  const canvas = await html2canvas(element, {
    scale: 2.5, // 高解像度
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

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

  const filename = `${options.title}.pdf`;
  pdf.save(filename);
}

interface ExportBothPdfOptions {
  title: string;
  subtitle?: string;
  hintStyle: HintStyle;
  questionElementId: string;
  answerElementId: string;
}

/**
 * 2ページPDF (1ページ目: 問題用紙, 2ページ目: 解答用紙) の一括エクスポート
 * ブラウザの複数ダウンロードブロックを回避し、両方を1ファイルとして確実に出力
 */
export async function exportBothCrosswordsToPdf(options: ExportBothPdfOptions): Promise<void> {
  const qElement = document.getElementById(options.questionElementId);
  const aElement = document.getElementById(options.answerElementId);

  if (!qElement || !aElement) {
    throw new Error('PDF生成対象の要素が見つかりませんでした。');
  }

  // 1. 問題用紙キャンバス
  const canvasQ = await html2canvas(qElement, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  // 2. 解答用紙キャンバス
  const canvasA = await html2canvas(aElement, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

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

  const filename = `${options.title}_問題・解答セット.pdf`;
  pdf.save(filename);
}
