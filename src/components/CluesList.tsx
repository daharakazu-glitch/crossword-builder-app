import React from 'react';
import type { PlacedWord, HintStyle } from '../types/crossword';
import { formatClueText } from '../utils/pdfExport';
import { ArrowRight, ArrowDown } from 'lucide-react';

interface CluesListProps {
  placedWords: PlacedWord[];
  hintStyle: HintStyle;
  selectedWordId: string | null;
  onSelectWord: (word: PlacedWord) => void;
}

export const CluesList: React.FC<CluesListProps> = ({
  placedWords,
  hintStyle,
  selectedWordId,
  onSelectWord,
}) => {
  const acrossClues = placedWords.filter((w) => w.direction === 'across');
  const downClues = placedWords.filter((w) => w.direction === 'down');

  return (
    <div className="clues-container">
      <div className="clues-column">
        <h3 className="clues-header across">
          <ArrowRight size={18} /> ヨコ (Across)
        </h3>
        <ul className="clues-list">
          {acrossClues.map((word) => {
            const isSelected = selectedWordId === word.id;
            return (
              <li
                key={word.id}
                className={`clue-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectWord(word)}
              >
                <span className="clue-number">{word.number}.</span>
                <span className="clue-text">{formatClueText(word, hintStyle)}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="clues-column">
        <h3 className="clues-header down">
          <ArrowDown size={18} /> タテ (Down)
        </h3>
        <ul className="clues-list">
          {downClues.map((word) => {
            const isSelected = selectedWordId === word.id;
            return (
              <li
                key={word.id}
                className={`clue-item ${isSelected ? 'selected' : ''}`}
                onClick={() => onSelectWord(word)}
              >
                <span className="clue-number">{word.number}.</span>
                <span className="clue-text">{formatClueText(word, hintStyle)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};
