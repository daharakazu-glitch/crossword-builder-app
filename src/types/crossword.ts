export interface WordItem {
  id: string;
  word: string;        // 英単語 (例: "APPLE")
  japanese: string;    // 日本語訳 (例: "りんご")
  sentence?: string;   // 英文穴埋め用例文 (例: "I eat an ____ every morning.")
}

export type HintStyle = 'sentence_ja' | 'sentence_only' | 'ja_only';

export interface PlacedWord {
  id: string;
  word: string;
  japanese: string;
  sentence?: string;
  row: number;         // グリッド開始行 (0-indexed)
  col: number;         // グリッド開始列 (0-indexed)
  direction: 'across' | 'down';
  number: number;      // パズルのヒント番号 (1, 2, 3...)
}

export interface CellData {
  row: number;
  col: number;
  letter: string;           // 正解の文字 (アルファベット大文字)
  userLetter: string;       // ユーザー入力文字
  acrossNumber?: number;    // Across単語の番号
  downNumber?: number;      // Down単語の番号
  acrossWordId?: string;
  downWordId?: string;
  isBlack: boolean;         // 黒マス（背景）かどうか
  isCorrect?: boolean;      // 正誤判定状態
}

export interface CrosswordGrid {
  size: number;
  cells: CellData[][];
  placedWords: PlacedWord[];
  unplacedWords: WordItem[];
}
