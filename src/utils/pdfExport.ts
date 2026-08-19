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

  // キャンバスを高画質で生成
  const canvas = await html2canvas(element, {
    scale: 2, // 高解像度
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pdfWidth - 20; // 左右10mmのマージン
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 10; // 上10mmマージン

  pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  // 複数ページに渡る場合の処理
  while (heightLeft > 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }

  const filename = `${options.title}_${options.isAnswerKey ? '解答' : '問題'}.pdf`;
  pdf.save(filename);
}
