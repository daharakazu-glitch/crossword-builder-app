import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { HintStyle, PlacedWord } from '../types/crossword';

export function formatClueText(word: PlacedWord, hintStyle: HintStyle): string {
  // 英文穴埋め処理
  const cleanWord = word.word.toUpperCase().replace(/[^A-Z]/g, '');
  const underline = '____';
  let sentenceClue = word.sentence || '';

  if (sentenceClue) {
    // 例文内の単語を穴埋めアンダーラインに置換
    const regex = new RegExp(`\\b${cleanWord}\\b`, 'gi');
    sentenceClue = sentenceClue.replace(regex, underline);
  } else {
    // 例文がない場合のデフォルト穴埋めテキスト
    sentenceClue = `[ ${underline} ]`;
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

export async function exportCrosswordToPdf(options: ExportPdfOptions): Promise<void> {
  const element = document.getElementById(options.elementId);
  if (!element) {
    throw new Error('PDF生成対象の要素が見つかりませんでした。');
  }

  // キャンバスを高解像度で生成
  const canvas = await html2canvas(element, {
    scale: 2.5, // より鮮明な高解像度
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

  // 1ページのみ出力（複数ページへのあふれを防止）
  pdf.addImage(imgData, 'PNG', posX, posY, printWidth, printHeight);

  const filename = `${options.title}_${options.isAnswerKey ? '解答' : '問題'}.pdf`;
  pdf.save(filename);
}
