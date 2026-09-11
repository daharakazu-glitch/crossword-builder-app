import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Clock,
  CheckCircle,
  HelpCircle,
  RotateCcw,
  Volume2,
  Trophy,
  ArrowLeft,
  Printer,
} from 'lucide-react';
import type { CrosswordGrid, HintStyle, GridTheme, PlacedWord } from '../types/crossword';
import { Board } from './Board';
import { CluesList } from './CluesList';
import { AudioPracticeModal } from './AudioPracticeModal';
import { PdfExportModal } from './PdfExportModal';

interface StudentPlayViewProps {
  initialGrid: CrosswordGrid;
  title: string;
  subtitle?: string;
  hintStyle: HintStyle;
  theme: GridTheme;
  initialShowFirstLetters: boolean;
  onExitToTeacherMode: () => void;
}

export const StudentPlayView: React.FC<StudentPlayViewProps> = ({
  initialGrid,
  title,
  subtitle,
  hintStyle,
  theme,
  initialShowFirstLetters,
  onExitToTeacherMode,
}) => {
  const [grid, setGrid] = useState<CrosswordGrid>(initialGrid);
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [activeDirection, setActiveDirection] = useState<'across' | 'down'>('across');
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [showFirstLetters, setShowFirstLetters] = useState(initialShowFirstLetters);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // タイマー
  const [seconds, setSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(true);

  useEffect(() => {
    let timer: any;
    if (isTimerRunning && !isCompleted) {
      timer = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, isCompleted]);

  const formatTime = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 全マス数と入力済みマス数の計算
  const whiteCells = grid.cells.flatMap((row) => row.filter((c) => !c.isBlack));
  const filledCount = whiteCells.filter((c) => c.userLetter.length > 0).length;
  const totalCount = whiteCells.length;
  const progressPercent = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  // セルクリック操作
  const handleCellClick = (row: number, col: number) => {
    const cell = grid.cells[row][col];
    if (cell.isBlack) return;

    const hasAcross = !!cell.acrossWordId;
    const hasDown = !!cell.downWordId;

    if (activeCell?.row === row && activeCell?.col === col) {
      if (hasAcross && hasDown) {
        const nextDir = activeDirection === 'across' ? 'down' : 'across';
        setActiveDirection(nextDir);
        updateSelectedWordId(row, col, nextDir);
      }
    } else {
      setActiveCell({ row, col });
      let newDir = activeDirection;
      if (hasAcross && !hasDown) {
        newDir = 'across';
      } else if (hasDown && !hasAcross) {
        newDir = 'down';
      }
      setActiveDirection(newDir);
      updateSelectedWordId(row, col, newDir);
    }
  };

  const updateSelectedWordId = (row: number, col: number, direction: 'across' | 'down') => {
    const cell = grid.cells[row][col];
    const wordId = direction === 'across' ? cell.acrossWordId : cell.downWordId;
    setSelectedWordId(wordId || cell.acrossWordId || cell.downWordId || null);
  };

  const handleSelectWordClue = (word: PlacedWord) => {
    setSelectedWordId(word.id);
    setActiveDirection(word.direction);
    setActiveCell({ row: word.row, col: word.col });
  };

  const normalizeInputLetter = (raw: string): string => {
    const zenkakuConverted = raw.replace(/[Ａ-Ｚａ-ｚ]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    const clean = zenkakuConverted.toUpperCase().replace(/[^A-Z]/g, '');
    return clean.length > 0 ? clean.slice(-1) : '';
  };

  const findNextWhiteCell = (
    startRow: number,
    startCol: number,
    dRow: number,
    dCol: number
  ): { row: number; col: number } | null => {
    let r = startRow + dRow;
    let c = startCol + dCol;

    while (r >= 0 && r < grid.size && c >= 0 && c < grid.size) {
      if (!grid.cells[r][c].isBlack) {
        return { row: r, col: c };
      }
      r += dRow;
      c += dCol;
    }
    return null;
  };

  const handleCellInput = (row: number, col: number, letter: string) => {
    const uppercaseLetter = normalizeInputLetter(letter);

    setGrid((prevGrid) => {
      const newCells = prevGrid.cells.map((r, rIdx) =>
        r.map((c, cIdx) => {
          if (rIdx === row && cIdx === col) {
            return { ...c, userLetter: uppercaseLetter, isCorrect: undefined };
          }
          return c;
        })
      );
      return { ...prevGrid, cells: newCells };
    });

    if (uppercaseLetter) {
      const nextCell =
        activeDirection === 'across'
          ? findNextWhiteCell(row, col, 0, 1)
          : findNextWhiteCell(row, col, 1, 0);
      if (nextCell) {
        setActiveCell(nextCell);
      }
    }
  };

  const handleKeyDownNav = (e: React.KeyboardEvent) => {
    if (!activeCell) return;
    const { row, col } = activeCell;

    if (e.key === ' ' || e.code === 'Space') {
      e.preventDefault();
      const nextDir = activeDirection === 'across' ? 'down' : 'across';
      setActiveDirection(nextDir);
      updateSelectedWordId(row, col, nextDir);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = findNextWhiteCell(row, col, 0, 1);
      if (next) setActiveCell(next);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = findNextWhiteCell(row, col, 0, -1);
      if (next) setActiveCell(next);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = findNextWhiteCell(row, col, 1, 0);
      if (next) setActiveCell(next);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const next = findNextWhiteCell(row, col, -1, 0);
      if (next) setActiveCell(next);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      setGrid((prevGrid) => {
        const newCells = prevGrid.cells.map((r, rIdx) =>
          r.map((c, cIdx) => {
            if (rIdx === row && cIdx === col) {
              return { ...c, userLetter: '', isCorrect: undefined };
            }
            return c;
          })
        );
        return { ...prevGrid, cells: newCells };
      });
      const prevCell =
        activeDirection === 'across'
          ? findNextWhiteCell(row, col, 0, -1)
          : findNextWhiteCell(row, col, -1, 0);
      if (prevCell) {
        setActiveCell(prevCell);
      }
    }
  };

  // 答え合わせ
  const handleCheckAnswers = () => {
    let isAllCorrect = true;
    let anyIncorrect = false;

    setGrid((prevGrid) => {
      const newCells = prevGrid.cells.map((row) =>
        row.map((cell) => {
          if (cell.isBlack) return cell;
          const isCorrect = cell.userLetter === cell.letter;
          if (!isCorrect) isAllCorrect = false;
          if (cell.userLetter && !isCorrect) anyIncorrect = true;
          return { ...cell, isCorrect };
        })
      );
      return { ...prevGrid, cells: newCells };
    });

    if (isAllCorrect) {
      setIsCompleted(true);
      setIsTimerRunning(false);
      triggerConfetti();
    } else {
      if (anyIncorrect) {
        alert('赤色のマスに誤りがあります。もう一度見直してみよう！');
      } else {
        alert('まだ空欄のマスがあります。最後まで埋めてみよう！');
      }
    }
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {}
  };

  const handleHintOneLetter = () => {
    if (!activeCell) return;
    const { row, col } = activeCell;
    const cell = grid.cells[row][col];
    if (cell.isBlack) return;

    setGrid((prevGrid) => {
      const newCells = prevGrid.cells.map((r, rIdx) =>
        r.map((c, cIdx) => {
          if (rIdx === row && cIdx === col) {
            return { ...c, userLetter: c.letter, isCorrect: true };
          }
          return c;
        })
      );
      return { ...prevGrid, cells: newCells };
    });
  };

  const handleReset = () => {
    if (window.confirm('入力した文字をすべてクリアしますか？')) {
      setGrid((prevGrid) => {
        const newCells = prevGrid.cells.map((row) =>
          row.map((cell) => ({ ...cell, userLetter: '', isCorrect: undefined }))
        );
        return { ...prevGrid, cells: newCells };
      });
      setIsCompleted(false);
    }
  };

  return (
    <div className="student-play-layout" style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* 生徒用トップバー */}
      <header className="student-header" style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        flexWrap: 'wrap',
        gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            className="btn btn-outline"
            onClick={onExitToTeacherMode}
            style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="問題の編集・再生成画面へ戻ります"
          >
            <ArrowLeft size={16} /> 先生・編集モードへ
          </button>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', margin: 0, color: 'var(--text-primary)' }}>
              📝 {title}
            </h1>
            {subtitle && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{subtitle}</span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* タイマー */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'var(--bg-primary)',
            padding: '6px 14px',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            fontWeight: 600,
            fontSize: '1rem',
            color: isCompleted ? 'var(--success)' : 'var(--text-primary)',
          }}>
            <Clock size={18} color={isCompleted ? 'var(--success)' : 'var(--primary)'} />
            <span>{formatTime(seconds)}</span>
          </div>

          {/* 進捗メーター */}
          <div style={{ minWidth: '130px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '3px' }}>
              <span>入力進捗</span>
              <strong>{filledCount} / {totalCount}</strong>
            </div>
            <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: progressPercent === 100 ? 'var(--success)' : 'var(--primary)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>

          <button
            className="btn btn-outline"
            onClick={() => setIsPdfModalOpen(true)}
            style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Printer size={15} /> 印刷
          </button>
        </div>
      </header>

      {/* クリアお祝いバナー */}
      {isCompleted && (
        <div style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: '#ffffff',
          padding: '16px 24px',
          textAlign: 'center',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={28} />
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              🎉 おめでとうございます！全問正解クリア！ (クリアタイム: {formatTime(seconds)})
            </span>
          </div>
          <button
            className="btn btn-white"
            onClick={() => setIsAudioModalOpen(true)}
            style={{
              background: '#ffffff',
              color: '#059669',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '20px',
              cursor: 'pointer',
            }}
          >
            <Volume2 size={18} /> 発音練習で声に出して覚えよう！
          </button>
        </div>
      )}

      {/* メイン解答エリア */}
      <main style={{ flex: 1, padding: '20px', maxWidth: '1280px', margin: '0 auto', width: '100%' }}>
        {/* 操作バー */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          flexWrap: 'wrap',
          gap: '10px',
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              onClick={handleCheckAnswers}
              style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <CheckCircle size={18} /> 答え合わせをする
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleHintOneLetter}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <HelpCircle size={16} /> 選択マスを1文字ヒント
            </button>
            <button
              className="btn btn-outline"
              onClick={handleReset}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <RotateCcw size={15} /> やり直す
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showFirstLetters}
                onChange={(e) => setShowFirstLetters(e.target.checked)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>🔤 頭文字ヒントを表示</span>
            </label>

            <button
              className="btn btn-outline-purple"
              onClick={() => setIsAudioModalOpen(true)}
              style={{ fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Volume2 size={16} /> 音声練習
            </button>
          </div>
        </div>

        {/* 盤面とヒントリスト */}
        <div className="puzzle-workspace">
          <Board
            cells={grid.cells}
            activeCell={activeCell}
            activeDirection={activeDirection}
            selectedWordId={selectedWordId}
            showAnswers={false}
            showFirstLetters={showFirstLetters}
            theme={theme}
            onCellClick={handleCellClick}
            onCellInput={handleCellInput}
            onKeyDownNav={handleKeyDownNav}
          />

          <CluesList
            placedWords={grid.placedWords}
            hintStyle={hintStyle}
            selectedWordId={selectedWordId}
            onSelectWord={handleSelectWordClue}
          />
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-title">Crossword Builder Pro</p>
          <p className="footer-copyright">® Kazuyuki Harada</p>
        </div>
      </footer>

      {/* 音声練習モーダル */}
      {isAudioModalOpen && (
        <AudioPracticeModal
          placedWords={grid.placedWords}
          onClose={() => setIsAudioModalOpen(false)}
        />
      )}

      {/* 印刷モーダル */}
      {isPdfModalOpen && (
        <PdfExportModal
          grid={grid}
          hintStyle={hintStyle}
          initialTitle={title}
          initialShowFirstLetters={showFirstLetters}
          initialTheme={theme}
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}
    </div>
  );
};
