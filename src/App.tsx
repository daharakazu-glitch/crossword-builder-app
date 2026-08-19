import React, { useState, useEffect, useCallback } from 'react';
import type { WordItem, HintStyle, CrosswordGrid, PlacedWord } from './types/crossword';
import { INITIAL_SAMPLE_WORDS, PRESET_100_WORDS } from './utils/sampleData';
import { generateCrossword } from './utils/generator';
import { Header } from './components/Header';
import { ManualInput } from './components/WordListInput/ManualInput';
import { FileUpload } from './components/WordListInput/FileUpload';
import { ImageOCRUpload } from './components/WordListInput/ImageOCRUpload';
import { WordTable } from './components/WordTable';
import { HintStyleSelector } from './components/HintStyleSelector';
import { Board } from './components/Board';
import { CluesList } from './components/CluesList';
import { InteractiveControls } from './components/InteractiveControls';
import { PdfExportModal } from './components/PdfExportModal';
import { HelpModal } from './components/HelpModal';
import { AudioPracticeModal } from './components/AudioPracticeModal';
import { FileText, Camera, Edit3 } from 'lucide-react';
import './App.css';

export const App: React.FC = () => {
  // 状態管理
  const [words, setWords] = useState<WordItem[]>(INITIAL_SAMPLE_WORDS);
  const [hintStyle, setHintStyle] = useState<HintStyle>('sentence_ja');
  const [gridSize, setGridSize] = useState<number>(20);
  const [grid, setGrid] = useState<CrosswordGrid>(() => generateCrossword(INITIAL_SAMPLE_WORDS, 20));

  // インタラクティブ解答状態
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [activeDirection, setActiveDirection] = useState<'across' | 'down'>('across');
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);

  // モーダル状態
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [inputTab, setInputTab] = useState<'manual' | 'file' | 'ocr'>('manual');

  // クロスワード生成の更新
  const handleRegenerate = useCallback(() => {
    const newGrid = generateCrossword(words, gridSize);
    setGrid(newGrid);
    setActiveCell(null);
    setSelectedWordId(null);
  }, [words, gridSize]);

  useEffect(() => {
    handleRegenerate();
  }, [words, gridSize, handleRegenerate]);

  // 単語リスト操作
  const handleAddWord = (word: WordItem) => {
    if (words.length >= 100) return;
    setWords((prev) => [...prev, word]);
  };

  const handleAddMultipleWords = (newWords: WordItem[]) => {
    setWords((prev) => {
      const combined = [...prev];
      for (const item of newWords) {
        if (combined.length >= 100) break;
        // 重複チェック (同一単語は除外)
        if (!combined.some((w) => w.word === item.word)) {
          combined.push(item);
        }
      }
      return combined;
    });
  };

  const handleUpdateWord = (id: string, updated: Partial<WordItem>) => {
    setWords((prev) => prev.map((w) => (w.id === id ? { ...w, ...updated } : w)));
  };

  const handleDeleteWord = (id: string) => {
    setWords((prev) => prev.filter((w) => w.id !== id));
  };

  const handleClearAll = () => {
    if (window.confirm('すべての単語をクリアしますか？')) {
      setWords([]);
    }
  };

  // セルクリック操作
  const handleCellClick = (row: number, col: number) => {
    const cell = grid.cells[row][col];
    if (cell.isBlack) return;

    if (activeCell?.row === row && activeCell?.col === col) {
      // 同じセルをクリックしたら Across ⇄ Down 切り替え
      const nextDir = activeDirection === 'across' ? 'down' : 'across';
      setActiveDirection(nextDir);
      updateSelectedWordId(row, col, nextDir);
    } else {
      setActiveCell({ row, col });
      updateSelectedWordId(row, col, activeDirection);
    }
  };

  const updateSelectedWordId = (row: number, col: number, direction: 'across' | 'down') => {
    const cell = grid.cells[row][col];
    const wordId = direction === 'across' ? cell.acrossWordId : cell.downWordId;
    setSelectedWordId(wordId || cell.acrossWordId || cell.downWordId || null);
  };

  // ヒントアイテム選択
  const handleSelectWordClue = (word: PlacedWord) => {
    setSelectedWordId(word.id);
    setActiveDirection(word.direction);
    setActiveCell({ row: word.row, col: word.col });
  };

  // 文字入力 & フォーカス前進
  const handleCellInput = (row: number, col: number, letter: string) => {
    const uppercaseLetter = letter.toUpperCase().replace(/[^A-Z]/g, '');

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

    // 入力成功時に次のマスへ移動
    if (uppercaseLetter) {
      advanceFocus(row, col);
    }
  };

  const advanceFocus = (row: number, col: number) => {
    if (activeDirection === 'across') {
      if (col + 1 < gridSize && !grid.cells[row][col + 1].isBlack) {
        setActiveCell({ row, col: col + 1 });
      }
    } else {
      if (row + 1 < gridSize && !grid.cells[row + 1][col].isBlack) {
        setActiveCell({ row: row + 1, col });
      }
    }
  };

  // キーボードナビゲーション
  const handleKeyDownNav = (e: React.KeyboardEvent) => {
    if (!activeCell) return;
    const { row, col } = activeCell;

    if (e.key === 'ArrowRight' && col + 1 < gridSize && !grid.cells[row][col + 1].isBlack) {
      setActiveCell({ row, col: col + 1 });
    } else if (e.key === 'ArrowLeft' && col - 1 >= 0 && !grid.cells[row][col - 1].isBlack) {
      setActiveCell({ row, col: col - 1 });
    } else if (e.key === 'ArrowDown' && row + 1 < gridSize && !grid.cells[row + 1][col].isBlack) {
      setActiveCell({ row: row + 1, col });
    } else if (e.key === 'ArrowUp' && row - 1 >= 0 && !grid.cells[row - 1][col].isBlack) {
      setActiveCell({ row: row - 1, col });
    } else if (e.key === 'Backspace') {
      if (!grid.cells[row][col].userLetter) {
        // 現在のマスが空なら前のマスに戻る
        if (activeDirection === 'across' && col - 1 >= 0) {
          setActiveCell({ row, col: col - 1 });
        } else if (activeDirection === 'down' && row - 1 >= 0) {
          setActiveCell({ row: row - 1, col });
        }
      }
    }
  };

  // 正誤判定
  const handleCheckAnswers = (): boolean => {
    let isAllCorrect = true;

    setGrid((prevGrid) => {
      const newCells = prevGrid.cells.map((row) =>
        row.map((cell) => {
          if (cell.isBlack) return cell;
          const isCorrect = cell.userLetter === cell.letter;
          if (!isCorrect) isAllCorrect = false;
          return { ...cell, isCorrect };
        })
      );
      return { ...prevGrid, cells: newCells };
    });

    return isAllCorrect;
  };

  // 1文字ヒント表示
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

  // 入力クリア
  const handleResetUserInputs = () => {
    setGrid((prevGrid) => {
      const newCells = prevGrid.cells.map((row) =>
        row.map((cell) => ({ ...cell, userLetter: '', isCorrect: undefined }))
      );
      return { ...prevGrid, cells: newCells };
    });
  };

  return (
    <div className="app-layout">
      <Header
        onOpenHelp={() => setIsHelpModalOpen(true)}
        onLoad100Preset={() => setWords(PRESET_100_WORDS)}
      />

      <main className="main-content">
        {/* 左側: 単語登録＆リスト管理パネル */}
        <section className="left-panel">
          <div className="input-method-tabs">
            <button
              className={`input-tab ${inputTab === 'manual' ? 'active' : ''}`}
              onClick={() => setInputTab('manual')}
            >
              <Edit3 size={16} /> 手入力・コピペ
            </button>
            <button
              className={`input-tab ${inputTab === 'file' ? 'active' : ''}`}
              onClick={() => setInputTab('file')}
            >
              <FileText size={16} /> ファイル (Excel/PDF)
            </button>
            <button
              className={`input-tab ${inputTab === 'ocr' ? 'active' : ''}`}
              onClick={() => setInputTab('ocr')}
            >
              <Camera size={16} /> 写真・画像 (OCR)
            </button>
          </div>

          <div className="input-component-wrapper">
            {inputTab === 'manual' && (
              <ManualInput
                onAddWord={handleAddWord}
                onAddMultipleWords={handleAddMultipleWords}
                currentCount={words.length}
              />
            )}
            {inputTab === 'file' && (
              <FileUpload onAddMultipleWords={handleAddMultipleWords} />
            )}
            {inputTab === 'ocr' && (
              <ImageOCRUpload onAddMultipleWords={handleAddMultipleWords} />
            )}
          </div>

          <WordTable
            words={words}
            unplacedWords={grid.unplacedWords}
            onUpdateWord={handleUpdateWord}
            onDeleteWord={handleDeleteWord}
            onClearAll={handleClearAll}
            onSetWords={(wList) => setWords(wList)}
          />
        </section>

        {/* 右側: クロスワードパズルプレビュー＆操作パネル */}
        <section className="right-panel">
          <HintStyleSelector
            hintStyle={hintStyle}
            onSelectHintStyle={setHintStyle}
            gridSize={gridSize}
            onChangeGridSize={setGridSize}
            onRegenerate={handleRegenerate}
            onOpenPdfModal={() => setIsPdfModalOpen(true)}
          />

          <div className="crossword-preview-section">
            <InteractiveControls
              showAnswers={showAnswers}
              onToggleShowAnswers={() => setShowAnswers(!showAnswers)}
              onCheckAnswers={handleCheckAnswers}
              onHintOneLetter={handleHintOneLetter}
              onResetUserInputs={handleResetUserInputs}
              onOpenAudioPractice={() => setIsAudioModalOpen(true)}
            />

            <div className="puzzle-workspace">
              <Board
                cells={grid.cells}
                placedWords={grid.placedWords}
                activeCell={activeCell}
                activeDirection={activeDirection}
                selectedWordId={selectedWordId}
                showAnswers={showAnswers}
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
          </div>
        </section>
      </main>

      {/* PDFダウンロードモーダル */}
      {isPdfModalOpen && (
        <PdfExportModal
          grid={grid}
          hintStyle={hintStyle}
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}

      {/* 使い方ヘルプモーダル */}
      {isHelpModalOpen && <HelpModal onClose={() => setIsHelpModalOpen(false)} />}

      {/* 音声・録音練習モーダル */}
      {isAudioModalOpen && (
        <AudioPracticeModal
          placedWords={grid.placedWords}
          onClose={() => setIsAudioModalOpen(false)}
        />
      )}
    </div>
  );
};
export default App;
