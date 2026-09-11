import React, { useEffect, useRef } from 'react';
import type { CellData, GridTheme } from '../types/crossword';

interface BoardProps {
  cells: CellData[][];
  activeCell: { row: number; col: number } | null;
  activeDirection: 'across' | 'down';
  selectedWordId: string | null;
  showAnswers: boolean;
  showFirstLetters: boolean;
  theme?: GridTheme;
  onCellClick: (row: number, col: number) => void;
  onCellInput: (row: number, col: number, letter: string) => void;
  onKeyDownNav: (e: React.KeyboardEvent) => void;
}

export const Board: React.FC<BoardProps> = ({
  cells,
  activeCell,
  activeDirection,
  selectedWordId,
  showAnswers,
  showFirstLetters,
  theme = 'classic',
  onCellClick,
  onCellInput,
  onKeyDownNav,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCell) {
      const inputEl = document.getElementById(
        `cell-input-${activeCell.row}-${activeCell.col}`
      ) as HTMLInputElement;
      if (inputEl) {
        inputEl.focus();
        inputEl.select(); // セル内の既存文字を自動全選択して打鍵した文字で即上書き可能にする
        inputEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      }
    }
  }, [activeCell]);

  const gridSize = cells.length;

  return (
    <div
      className="board-container"
      ref={boardRef}
      onKeyDown={onKeyDownNav}
      tabIndex={0}
    >
      <div
        className={`crossword-grid theme-${theme}`}
        style={{
          gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
        }}
      >
        {cells.map((rowCells, r) =>
          rowCells.map((cell, c) => {
            if (cell.isBlack) {
              return <div key={`black-${r}-${c}`} className="cell black-cell" />;
            }

            const isActive = activeCell?.row === r && activeCell?.col === c;
            const isSelectedWord =
              selectedWordId &&
              ((activeDirection === 'across' && cell.acrossWordId === selectedWordId) ||
                (activeDirection === 'down' && cell.downWordId === selectedWordId));

            const isStartCell = Boolean(cell.acrossNumber || cell.downNumber);
            const shouldShowFirstLetter = showFirstLetters && isStartCell && !showAnswers;
            const displayLetter = showAnswers ? cell.letter : cell.userLetter;

            let statusClass = '';
            if (cell.isCorrect !== undefined) {
              statusClass = cell.isCorrect ? 'correct' : 'incorrect';
            }

            return (
              <div
                key={`cell-${r}-${c}`}
                className={`cell white-cell ${isActive ? 'active' : ''} ${
                  isSelectedWord ? 'highlight' : ''
                } ${statusClass} ${shouldShowFirstLetter ? 'has-first-letter' : ''}`}
                onClick={() => onCellClick(r, c)}
              >
                {/* マス目のナンバリング (Across / Down の開始セル番号) */}
                {isStartCell && (
                  <span className="cell-number">
                    {cell.acrossNumber || cell.downNumber}
                  </span>
                )}

                {/* 頭文字ヒント表示 (未入力時に透かし文字で表示) */}
                {shouldShowFirstLetter && !displayLetter && (
                  <span className="cell-first-letter-hint">
                    {cell.letter}
                  </span>
                )}

                <input
                  id={`cell-input-${r}-${c}`}
                  type="text"
                  maxLength={2} // 全角等の入力判定を許容するため2文字まで受け取り即座に整形
                  value={displayLetter}
                  placeholder={shouldShowFirstLetter ? cell.letter : ''}
                  onChange={(e) => onCellInput(r, c, e.target.value)}
                  onCompositionEnd={(e) => onCellInput(r, c, e.data)}
                  onFocus={(e) => e.target.select()}
                  onKeyDown={onKeyDownNav}
                  className={`cell-input ${shouldShowFirstLetter && !displayLetter ? 'hint-placeholder' : ''}`}
                  readOnly={showAnswers}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
