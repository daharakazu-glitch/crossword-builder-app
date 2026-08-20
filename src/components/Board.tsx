import React, { useEffect, useRef } from 'react';
import type { CellData, PlacedWord } from '../types/crossword';

interface BoardProps {
  cells: CellData[][];
  placedWords: PlacedWord[];
  activeCell: { row: number; col: number } | null;
  activeDirection: 'across' | 'down';
  selectedWordId: string | null;
  showAnswers: boolean;
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
  onCellClick,
  onCellInput,
  onKeyDownNav,
}) => {
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeCell) {
      const inputEl = document.getElementById(`cell-input-${activeCell.row}-${activeCell.col}`);
      if (inputEl) {
        inputEl.focus();
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
        className="crossword-grid"
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
                } ${statusClass}`}
                onClick={() => onCellClick(r, c)}
              >
                {/* マス目のナンバリング (Across / Down の開始セル番号) */}
                {(cell.acrossNumber || cell.downNumber) && (
                  <span className="cell-number">
                    {cell.acrossNumber || cell.downNumber}
                  </span>
                )}

                <input
                  id={`cell-input-${r}-${c}`}
                  type="text"
                  maxLength={2} // 全角等の入力判定を許容するため2文字まで受け取り即座に整形
                  value={displayLetter}
                  onChange={(e) => onCellInput(r, c, e.target.value)}
                  onCompositionEnd={(e) => onCellInput(r, c, e.data)}
                  onKeyDown={onKeyDownNav}
                  className="cell-input"
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
