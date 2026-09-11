import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { WordItem, HintStyle, CrosswordGrid, PlacedWord, GridTheme, CrosswordPuzzlePackage } from './types/crossword';
import { INITIAL_SAMPLE_WORDS, PRESET_100_WORDS } from './utils/sampleData';
import { generateCrossword } from './utils/generator';
import { decodeSharedPuzzle } from './utils/shareUtils';
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
import { ShareModal } from './components/ShareModal';
import { StudentPlayView } from './components/StudentPlayView';
import { FileText, Camera, Edit3 } from 'lucide-react';
import './App.css';

export const App: React.FC = () => {
  // 生徒用URL共有パラメータのチェック (#play=... or ?play=...)
  const parseSharedUrl = () => {
    try {
      const hash = window.location.hash;
      if (hash.includes('play=')) {
        const parts = hash.split('play=');
        const encoded = parts[1]?.split('&')[0];
        if (encoded) {
          return decodeSharedPuzzle(encoded);
        }
      }
      const params = new URLSearchParams(window.location.search);
      const playParam = params.get('play');
      if (playParam) {
        return decodeSharedPuzzle(playParam);
      }
    } catch (e) {
      console.error('Failed to parse URL puzzle:', e);
    }
    return null;
  };

  const [studentModeData, setStudentModeData] = useState<ReturnType<typeof decodeSharedPuzzle> | null>(() => parseSharedUrl());

  useEffect(() => {
    const handleHashChange = () => {
      setStudentModeData(parseSharedUrl());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 状態管理
  const [words, setWords] = useState<WordItem[]>(INITIAL_SAMPLE_WORDS);
  const [hintStyle, setHintStyle] = useState<HintStyle>('sentence_ja');
  const [gridSize, setGridSize] = useState<number>(20);
  const [gridTheme, setGridTheme] = useState<GridTheme>('ink-saver'); // 省インク・白背景をデフォルト推奨
  const [grid, setGrid] = useState<CrosswordGrid>(() => generateCrossword(INITIAL_SAMPLE_WORDS, 20));
  const [puzzleTitle, setPuzzleTitle] = useState<string>('英単語クロスワードパズル');

  // パズル復元フラグ（自動再生成による上書きを防ぐ）
  const isRestoredRef = useRef(false);

  // インタラクティブ解答状態
  const [activeCell, setActiveCell] = useState<{ row: number; col: number } | null>(null);
  const [activeDirection, setActiveDirection] = useState<'across' | 'down'>('across');
  const [selectedWordId, setSelectedWordId] = useState<string | null>(null);
  const [showAnswers, setShowAnswers] = useState<boolean>(false);
  const [showFirstLetters, setShowFirstLetters] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // モーダル状態
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [isAudioModalOpen, setIsAudioModalOpen] = useState(false);
  const [inputTab, setInputTab] = useState<'manual' | 'file' | 'ocr'>('manual');

  // クロスワード生成の更新
  const handleRegenerate = useCallback(() => {
    const newGrid = generateCrossword(words, gridSize);
    setGrid(newGrid);
    setActiveCell(null);
    setSelectedWordId(null);
    setIsCompleted(false);
  }, [words, gridSize]);

  useEffect(() => {
    if (isRestoredRef.current) {
      isRestoredRef.current = false;
      return;
    }
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

    const hasAcross = !!cell.acrossWordId;
    const hasDown = !!cell.downWordId;

    if (activeCell?.row === row && activeCell?.col === col) {
      // 同じセルをもう一度クリックした場合は方向をトグル (Across ⇄ Down)
      if (hasAcross && hasDown) {
        const nextDir = activeDirection === 'across' ? 'down' : 'across';
        setActiveDirection(nextDir);
        updateSelectedWordId(row, col, nextDir);
      }
    } else {
      setActiveCell({ row, col });
      let newDir = activeDirection;

      // 横単語にしか属していない場合は 'across'
      if (hasAcross && !hasDown) {
        newDir = 'across';
      } else if (hasDown && !hasAcross) {
        // 縦単語にしか属していない場合は 'down'
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

  // ヒントアイテム選択
  const handleSelectWordClue = (word: PlacedWord) => {
    setSelectedWordId(word.id);
    setActiveDirection(word.direction);
    setActiveCell({ row: word.row, col: word.col });
  };

  // 全角英数を半角大文字A-Zに変換 & 最新の1文字を抽出（二重入力防止）
  const normalizeInputLetter = (raw: string): string => {
    const zenkakuConverted = raw.replace(/[Ａ-Ｚａ-ｚ]/g, (s) =>
      String.fromCharCode(s.charCodeAt(0) - 0xfee0)
    );
    const clean = zenkakuConverted.toUpperCase().replace(/[^A-Z]/g, '');
    return clean.length > 0 ? clean.slice(-1) : '';
  };

  // 指定方向の次の白マスを検索（黒マススキップ）
  const findNextWhiteCell = (
    startRow: number,
    startCol: number,
    dRow: number,
    dCol: number
  ): { row: number; col: number } | null => {
    let r = startRow + dRow;
    let c = startCol + dCol;

    while (r >= 0 && r < gridSize && c >= 0 && c < gridSize) {
      if (!grid.cells[r][c].isBlack) {
        return { row: r, col: c };
      }
      r += dRow;
      c += dCol;
    }
    return null;
  };

  // 文字入力 & フォーカス前進
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

    // 入力成功時に次のマスへ移動
    if (uppercaseLetter) {
      advanceFocus(row, col);
    }
  };

  const advanceFocus = (row: number, col: number) => {
    const nextCell =
      activeDirection === 'across'
        ? findNextWhiteCell(row, col, 0, 1)
        : findNextWhiteCell(row, col, 1, 0);

    if (nextCell) {
      setActiveCell(nextCell);
    }
  };

  // キーボードナビゲーション & ショートカット
  const handleKeyDownNav = (e: React.KeyboardEvent) => {
    if (!activeCell) return;
    const { row, col } = activeCell;

    if (e.key === ' ' || e.code === 'Space') {
      // Space キーで方向切り替え
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
      // 現在の文字を消去し、前の白マスへ戻る
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
    } else if (e.key === 'Tab') {
      // Tabキーで次の単語に移動
      e.preventDefault();
      const placedWords = grid.placedWords;
      if (placedWords.length > 0) {
        const currentIndex = placedWords.findIndex((w) => w.id === selectedWordId);
        const nextIndex = e.shiftKey
          ? (currentIndex - 1 + placedWords.length) % placedWords.length
          : (currentIndex + 1) % placedWords.length;
        const targetWord = placedWords[nextIndex];
        if (targetWord) {
          handleSelectWordClue(targetWord);
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

    if (isAllCorrect) {
      setIsCompleted(true);
    }

    return isAllCorrect;
  };

  // 解答表示トグル
  const handleToggleShowAnswers = () => {
    const nextShow = !showAnswers;
    setShowAnswers(nextShow);
    if (nextShow) {
      // 解答全表示時は音声練習もアンロック
      setIsCompleted(true);
    }
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
    setIsCompleted(false);
  };

  // PDF等からのパズル完全復元ハンドラ
  const handleRestorePuzzlePackage = (pkg: CrosswordPuzzlePackage) => {
    isRestoredRef.current = true;
    if (pkg.title) setPuzzleTitle(pkg.title);
    if (pkg.words && pkg.words.length > 0) setWords(pkg.words);
    if (pkg.gridSize) setGridSize(pkg.gridSize);
    if (pkg.grid) setGrid(pkg.grid);
    if (pkg.hintStyle) setHintStyle(pkg.hintStyle);
    if (pkg.theme) setGridTheme(pkg.theme);
    if (pkg.showFirstLetters !== undefined) setShowFirstLetters(pkg.showFirstLetters);
    setIsCompleted(false);
    setActiveCell(null);
    setSelectedWordId(null);
  };

  // 生徒用プレイモードがURLで指定されている場合
  if (studentModeData) {
    return (
      <StudentPlayView
        initialGrid={studentModeData.grid}
        title={studentModeData.title}
        subtitle={studentModeData.subtitle}
        hintStyle={studentModeData.hintStyle}
        theme={studentModeData.theme}
        initialShowFirstLetters={studentModeData.showFirstLetters}
        onExitToTeacherMode={() => {
          window.location.hash = '';
          setStudentModeData(null);
        }}
      />
    );
  }

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
              <FileUpload
                onAddMultipleWords={handleAddMultipleWords}
                onSetTitle={setPuzzleTitle}
                onRestorePuzzlePackage={handleRestorePuzzlePackage}
              />
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
            puzzleTitle={puzzleTitle}
            onUpdateTitle={setPuzzleTitle}
            theme={gridTheme}
            onChangeTheme={setGridTheme}
            onRegenerate={handleRegenerate}
            onOpenPdfModal={() => setIsPdfModalOpen(true)}
            onOpenShareModal={() => setIsShareModalOpen(true)}
          />

          <div className="crossword-preview-section">
            <InteractiveControls
              showAnswers={showAnswers}
              onToggleShowAnswers={handleToggleShowAnswers}
              onCheckAnswers={handleCheckAnswers}
              onHintOneLetter={handleHintOneLetter}
              onResetUserInputs={handleResetUserInputs}
              isCompleted={isCompleted}
              showFirstLetters={showFirstLetters}
              onToggleFirstLetters={() => setShowFirstLetters(!showFirstLetters)}
              onOpenAudioPractice={() => setIsAudioModalOpen(true)}
            />

            <div className="puzzle-workspace">
              <Board
                cells={grid.cells}
                activeCell={activeCell}
                activeDirection={activeDirection}
                selectedWordId={selectedWordId}
                showAnswers={showAnswers}
                showFirstLetters={showFirstLetters}
                theme={gridTheme}
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

      <footer className="app-footer">
        <div className="footer-content">
          <p className="footer-title">Crossword Builder Pro</p>
          <p className="footer-copyright">® Kazuyuki Harada</p>
        </div>
      </footer>
      {isPdfModalOpen && (
        <PdfExportModal
          grid={grid}
          words={words}
          hintStyle={hintStyle}
          initialTitle={puzzleTitle}
          initialShowFirstLetters={showFirstLetters}
          initialTheme={gridTheme}
          onUpdateTitle={setPuzzleTitle}
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}

      {/* 生徒向けオンライン配信モーダル */}
      {isShareModalOpen && (
        <ShareModal
          grid={grid}
          title={puzzleTitle}
          subtitle="Name: ________________________________"
          hintStyle={hintStyle}
          theme={gridTheme}
          showFirstLetters={showFirstLetters}
          onClose={() => setIsShareModalOpen(false)}
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
