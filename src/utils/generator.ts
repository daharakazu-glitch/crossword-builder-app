import type { WordItem, PlacedWord, CellData, CrosswordGrid } from '../types/crossword';

/**
 * 入力された単語リストから最適なクロスワードパズル盤面を生成するエンジン
 */
export function generateCrossword(words: WordItem[], gridSize: number = 20): CrosswordGrid {
  // 1. 空のグリッドを作成
  let grid: (string | null)[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(null)
  );

  // 単語を標準化（英字のみ、大文字変換）＆ 長い順に並び替え
  const cleanWords = words
    .map((w) => ({
      ...w,
      cleanWord: w.word.toUpperCase().replace(/[^A-Z]/g, ''),
    }))
    .filter((w) => w.cleanWord.length >= 2)
    .sort((a, b) => b.cleanWord.length - a.cleanWord.length);

  if (cleanWords.length === 0) {
    return createEmptyGrid(gridSize);
  }

  const placedWords: PlacedWord[] = [];
  const unplacedWords: WordItem[] = [];

  // 2. 最初の単語をグリッド中央付近に配置
  const firstWord = cleanWords[0];
  const startRow = Math.floor(gridSize / 2);
  const startCol = Math.max(0, Math.floor((gridSize - firstWord.cleanWord.length) / 2));

  placeWordOnGrid(grid, firstWord.cleanWord, startRow, startCol, 'across');
  placedWords.push({
    id: firstWord.id,
    word: firstWord.word,
    japanese: firstWord.japanese,
    sentence: firstWord.sentence,
    row: startRow,
    col: startCol,
    direction: 'across',
    number: 0, // 後で一括ナンバリング
  });

  // 3. 残りの単語を交点を探しながら最適配置
  for (let i = 1; i < cleanWords.length; i++) {
    const item = cleanWords[i];
    const bestPosition = findBestPosition(grid, item.cleanWord, gridSize);

    if (bestPosition) {
      placeWordOnGrid(
        grid,
        item.cleanWord,
        bestPosition.row,
        bestPosition.col,
        bestPosition.direction
      );
      placedWords.push({
        id: item.id,
        word: item.word,
        japanese: item.japanese,
        sentence: item.sentence,
        row: bestPosition.row,
        col: bestPosition.col,
        direction: bestPosition.direction,
        number: 0,
      });
    } else {
      unplacedWords.push(item);
    }
  }

  // 4. ナンバリングと最終 CellData[][] の構築
  return buildFinalGrid(grid, placedWords, unplacedWords, gridSize);
}

function placeWordOnGrid(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down'
) {
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    grid[r][c] = word[i];
  }
}

interface PlacementCandidate {
  row: number;
  col: number;
  direction: 'across' | 'down';
  score: number;
}

function findBestPosition(
  grid: (string | null)[][],
  word: string,
  gridSize: number
): PlacementCandidate | null {
  const candidates: PlacementCandidate[] = [];

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      // Acrossのチェック
      if (canPlaceWord(grid, word, r, c, 'across', gridSize)) {
        const score = calculatePlacementScore(grid, word, r, c, 'across');
        candidates.push({ row: r, col: c, direction: 'across', score });
      }
      // Downのチェック
      if (canPlaceWord(grid, word, r, c, 'down', gridSize)) {
        const score = calculatePlacementScore(grid, word, r, c, 'down');
        candidates.push({ row: r, col: c, direction: 'down', score });
      }
    }
  }

  if (candidates.length === 0) return null;

  // スコアが一番高く、かつグリッド中心に近い候補を優先
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const centerDistA = Math.abs(a.row - gridSize / 2) + Math.abs(a.col - gridSize / 2);
    const centerDistB = Math.abs(b.row - gridSize / 2) + Math.abs(b.col - gridSize / 2);
    return centerDistA - centerDistB;
  });

  return candidates[0];
}

function canPlaceWord(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down',
  gridSize: number
): boolean {
  const len = word.length;

  if (direction === 'across') {
    if (col + len > gridSize) return false;
    // 前後の1マスが文字でないかチェック
    if (col > 0 && grid[row][col - 1] !== null) return false;
    if (col + len < gridSize && grid[row][col + len] !== null) return false;

    let hasIntersection = false;

    for (let i = 0; i < len; i++) {
      const r = row;
      const c = col + i;
      const currentCell = grid[r][c];

      if (currentCell !== null) {
        if (currentCell !== word[i]) return false; // 文字の衝突
        hasIntersection = true;
      } else {
        // 空白マスの上下に隣接する文字がないかチェック（交差していない箇所の隣接結合を防ぐ）
        if (r > 0 && grid[r - 1][c] !== null) return false;
        if (r < gridSize - 1 && grid[r + 1][c] !== null) return false;
      }
    }

    return hasIntersection;
  } else {
    // direction === 'down'
    if (row + len > gridSize) return false;
    // 上下の1マスが文字でないかチェック
    if (row > 0 && grid[row - 1][col] !== null) return false;
    if (row + len < gridSize && grid[row + len][col] !== null) return false;

    let hasIntersection = false;

    for (let i = 0; i < len; i++) {
      const r = row + i;
      const c = col;
      const currentCell = grid[r][c];

      if (currentCell !== null) {
        if (currentCell !== word[i]) return false;
        hasIntersection = true;
      } else {
        // 空白マスの左右に隣接する文字がないかチェック
        if (c > 0 && grid[r][c - 1] !== null) return false;
        if (c < gridSize - 1 && grid[r][c + 1] !== null) return false;
      }
    }

    return hasIntersection;
  }
}

function calculatePlacementScore(
  grid: (string | null)[][],
  word: string,
  row: number,
  col: number,
  direction: 'across' | 'down'
): number {
  let score = 0;
  for (let i = 0; i < word.length; i++) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    if (grid[r][c] !== null) {
      score += 10; // 交点ボーナス
    }
  }
  return score;
}

function buildFinalGrid(
  grid: (string | null)[][],
  placedWords: PlacedWord[],
  unplacedWords: WordItem[],
  gridSize: number
): CrosswordGrid {
  // ナンバリング付与
  // 左上から順に走査し、単語の開始位置に番号を付与
  let currentNumber = 1;
  const wordNumberMap = new Map<string, number>();

  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const startingAcross = placedWords.find(
        (w) => w.row === r && w.col === c && w.direction === 'across'
      );
      const startingDown = placedWords.find(
        (w) => w.row === r && w.col === c && w.direction === 'down'
      );

      if (startingAcross || startingDown) {
        if (startingAcross) {
          startingAcross.number = currentNumber;
          wordNumberMap.set(startingAcross.id, currentNumber);
        }
        if (startingDown) {
          startingDown.number = currentNumber;
          wordNumberMap.set(startingDown.id, currentNumber);
        }
        currentNumber++;
      }
    }
  }

  // CellData 構築
  const cells: CellData[][] = [];

  for (let r = 0; r < gridSize; r++) {
    const rowCells: CellData[] = [];
    for (let c = 0; c < gridSize; c++) {
      const letter = grid[r][c];

      // 当該セルに関わるPlacedWordを探す
      const acrossWord = placedWords.find(
        (w) =>
          w.direction === 'across' &&
          w.row === r &&
          c >= w.col &&
          c < w.col + w.word.replace(/[^A-Z]/gi, '').length
      );
      const downWord = placedWords.find(
        (w) =>
          w.direction === 'down' &&
          w.col === c &&
          r >= w.row &&
          r < w.row + w.word.replace(/[^A-Z]/gi, '').length
      );

      rowCells.push({
        row: r,
        col: c,
        letter: letter ? letter.toUpperCase() : '',
        userLetter: '',
        acrossNumber: acrossWord && acrossWord.row === r && acrossWord.col === c ? acrossWord.number : undefined,
        downNumber: downWord && downWord.row === r && downWord.col === c ? downWord.number : undefined,
        acrossWordId: acrossWord?.id,
        downWordId: downWord?.id,
        isBlack: letter === null,
      });
    }
    cells.push(rowCells);
  }

  return {
    size: gridSize,
    cells,
    placedWords: placedWords.sort((a, b) => a.number - b.number),
    unplacedWords,
  };
}

/**
 * 既存の PlacedWord[] から寸分違わず同じ CrosswordGrid (CellData[][]) を完全再構築
 */
export function reconstructGridFromPlacedWords(
  placedWords: PlacedWord[],
  gridSize: number,
  unplacedWords: WordItem[] = []
): CrosswordGrid {
  const grid: (string | null)[][] = Array.from({ length: gridSize }, () =>
    Array(gridSize).fill(null)
  );

  for (const pw of placedWords) {
    const clean = pw.word.toUpperCase().replace(/[^A-Z]/g, '');
    for (let i = 0; i < clean.length; i++) {
      const r = pw.direction === 'across' ? pw.row : pw.row + i;
      const c = pw.direction === 'across' ? pw.col + i : pw.col;
      if (r < gridSize && c < gridSize) {
        grid[r][c] = clean[i];
      }
    }
  }

  const cells: CellData[][] = [];
  for (let r = 0; r < gridSize; r++) {
    const rowCells: CellData[] = [];
    for (let c = 0; c < gridSize; c++) {
      const letter = grid[r][c];
      const acrossWord = placedWords.find(
        (w) =>
          w.direction === 'across' &&
          w.row === r &&
          c >= w.col &&
          c < w.col + w.word.replace(/[^A-Z]/gi, '').length
      );
      const downWord = placedWords.find(
        (w) =>
          w.direction === 'down' &&
          w.col === c &&
          r >= w.row &&
          r < w.row + w.word.replace(/[^A-Z]/gi, '').length
      );

      rowCells.push({
        row: r,
        col: c,
        letter: letter ? letter.toUpperCase() : '',
        userLetter: '',
        acrossNumber: acrossWord && acrossWord.row === r && acrossWord.col === c ? acrossWord.number : undefined,
        downNumber: downWord && downWord.row === r && downWord.col === c ? downWord.number : undefined,
        acrossWordId: acrossWord?.id,
        downWordId: downWord?.id,
        isBlack: letter === null,
      });
    }
    cells.push(rowCells);
  }

  return {
    size: gridSize,
    cells,
    placedWords: [...placedWords].sort((a, b) => a.number - b.number),
    unplacedWords,
  };
}

function createEmptyGrid(gridSize: number): CrosswordGrid {
  const cells: CellData[][] = Array.from({ length: gridSize }, (_, r) =>
    Array.from({ length: gridSize }, (_, c) => ({
      row: r,
      col: c,
      letter: '',
      userLetter: '',
      isBlack: true,
    }))
  );
  return { size: gridSize, cells, placedWords: [], unplacedWords: [] };
}
