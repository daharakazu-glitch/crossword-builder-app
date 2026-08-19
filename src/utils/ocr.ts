import { createWorker } from 'tesseract.js';
import type { WordItem } from '../types/crossword';
import { parseTextContentToWords } from './fileParsers';

/**
 * 画像ファイルからOCRでテキストを読み取り、英単語リストを抽出する
 */
export async function recognizeImageText(
  file: File,
  onProgress?: (progress: number, status: string) => void
): Promise<{ text: string; words: WordItem[] }> {
  // 日本語と英語の認識をサポート
  const worker = await createWorker('eng+jpn');

  if (onProgress) {
    onProgress(20, '文字を認識中...');
  }

  const ret = await worker.recognize(file);
  const text = ret.data.text;

  if (onProgress) {
    onProgress(80, '単語データを解析中...');
  }

  await worker.terminate();

  const words = parseTextContentToWords(text);

  if (onProgress) {
    onProgress(100, '完了');
  }

  return { text, words };
}
