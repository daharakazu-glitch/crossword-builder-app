import React, { useState } from 'react';
import { X, Download, CheckSquare, Printer, Sparkles, Type, Droplets } from 'lucide-react';
import type { CrosswordGrid, HintStyle, GridTheme, WordItem, CrosswordPuzzlePackage, PlacedWord } from '../types/crossword';
import { exportCrosswordToPdf, exportBothCrosswordsToPdf, formatClueText } from '../utils/pdfExport';

interface PdfExportModalProps {
  grid: CrosswordGrid;
  words?: WordItem[];
  hintStyle: HintStyle;
  initialTitle?: string;
  initialShowFirstLetters?: boolean;
  initialTheme?: GridTheme;
  onUpdateTitle?: (title: string) => void;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  grid,
  words = [],
  hintStyle,
  initialTitle = '英単語クロスワードパズル',
  initialShowFirstLetters = false,
  initialTheme = 'ink-saver',
  onUpdateTitle,
  onClose,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState('Name: ________________________________');
  const [showFirstLetters, setShowFirstLetters] = useState(initialShowFirstLetters);
  const [theme, setTheme] = useState<GridTheme>(initialTheme);
  const [exporting, setExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (onUpdateTitle) {
      onUpdateTitle(newTitle);
    }
  };

  const acrossClues = grid.placedWords.filter((w) => w.direction === 'across');
  const downClues = grid.placedWords.filter((w) => w.direction === 'down');
  const totalClues = acrossClues.length + downClues.length;

  // 印刷プレビュー用ヒント分割レンダリング（単語数に応じて2列または3列に綺麗に分配）
  const renderCluesSection = (isAnswerKey: boolean) => {
    const is3Col = totalClues >= 26;

    const renderItem = (w: PlacedWord) => (
      <li key={`pdf-${isAnswerKey ? 'a' : 'q'}-${w.direction}-${w.id}`}>
        <strong>{w.number}.</strong>{' '}
        {isAnswerKey && (
          <span style={{ fontWeight: 'bold', color: '#1e293b' }}>
            [{w.word.toLowerCase()}] -{' '}
          </span>
        )}
        {formatClueText(w, hintStyle)}
      </li>
    );

    if (!is3Col) {
      return (
        <div className="sheet-clues-section">
          <div className="sheet-clues-col">
            <h3>ヨコ (Across){isAnswerKey ? ' 解答付きヒント' : ''}</h3>
            <ol className="sheet-clues-list">{acrossClues.map(renderItem)}</ol>
          </div>
          <div className="sheet-clues-col">
            <h3>タテ (Down){isAnswerKey ? ' 解答付きヒント' : ''}</h3>
            <ol className="sheet-clues-list">{downClues.map(renderItem)}</ol>
          </div>
        </div>
      );
    }

    // 3カラム均等分割
    type ClueEntry =
      | { type: 'heading'; title: string; key: string }
      | { type: 'clue'; word: PlacedWord; key: string };

    const allEntries: ClueEntry[] = [
      { type: 'heading', title: `ヨコ (Across)${isAnswerKey ? ' 解答付きヒント' : ''}`, key: 'h-across' },
      ...acrossClues.map((w) => ({ type: 'clue' as const, word: w, key: `clue-${w.id}` })),
      { type: 'heading', title: `タテ (Down)${isAnswerKey ? ' 解答付きヒント' : ''}`, key: 'h-down' },
      ...downClues.map((w) => ({ type: 'clue' as const, word: w, key: `clue-${w.id}` })),
    ];

    const perCol = Math.ceil(allEntries.length / 3);
    const cols = [
      allEntries.slice(0, perCol),
      allEntries.slice(perCol, perCol * 2),
      allEntries.slice(perCol * 2),
    ];

    return (
      <div className="sheet-clues-section col-3">
        {cols.map((colItems, cIdx) => (
          <div key={`col-${cIdx}`} className="sheet-clues-col">
            {colItems.map((item) => {
              if (item.type === 'heading') {
                return <h3 key={item.key}>{item.title}</h3>;
              }
              return (
                <ol key={item.key} className="sheet-clues-list" style={{ marginBottom: '4px' }}>
                  {renderItem(item.word)}
                </ol>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  // 復元用パッケージ
  const puzzlePackage: CrosswordPuzzlePackage = {
    version: '1.0.0',
    title,
    subtitle,
    gridSize: grid.size,
    hintStyle,
    theme,
    showFirstLetters,
    grid,
    words: words.length > 0 ? words : grid.placedWords.map((w) => ({
      id: w.id,
      word: w.word,
      japanese: w.japanese,
      sentence: w.sentence,
    })),
  };

  const handleDownloadQuestionPdf = async () => {
    setExporting(true);
    setErrorMessage(null);
    setExportStatus('問題用紙（2枚組PDF: 盤面＋ヒント）を生成中...');
    try {
      await exportCrosswordToPdf({
        title,
        subtitle,
        hintStyle,
        isAnswerKey: false,
        grid,
        puzzlePackage,
        theme,
        showFirstLetters,
      });
    } catch (err: any) {
      console.error('PDF export error (Question):', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`PDFの生成中にエラーが発生しました: ${msg}`);
    } finally {
      setExporting(false);
      setExportStatus('');
    }
  };

  const handleDownloadAnswerPdf = async () => {
    setExporting(true);
    setErrorMessage(null);
    setExportStatus('解答用紙（2枚組PDF: 解答盤面＋解答ヒント）を生成中...');
    try {
      await exportCrosswordToPdf({
        title,
        subtitle,
        hintStyle,
        isAnswerKey: true,
        grid,
        puzzlePackage,
        theme,
        showFirstLetters,
      });
    } catch (err: any) {
      console.error('PDF export error (Answer):', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`PDFの生成中にエラーが発生しました: ${msg}`);
    } finally {
      setExporting(false);
      setExportStatus('');
    }
  };

  const handleDownloadBoth = async () => {
    setExporting(true);
    setErrorMessage(null);
    setExportStatus('問題・解答セット（全4枚組PDF）を一括生成中...');
    try {
      await exportBothCrosswordsToPdf({
        title,
        subtitle,
        hintStyle,
        grid,
        puzzlePackage,
        theme,
        showFirstLetters,
      });
    } catch (err: any) {
      console.error('PDF export error (Both):', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`PDFの生成中にエラーが発生しました: ${msg}`);
    } finally {
      setExporting(false);
      setExportStatus('');
    }
  };

  const handleNativePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content pdf-modal">
        <div className="modal-header">
          <h2>
            <Printer size={22} /> PDFダウンロード設定・プレビュー（盤面・ヒント2枚組仕様）
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="pdf-config-form">
            <div className="form-group">
              <label>
                <Type size={15} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                PDFタイトル（自由に入力・変更できます）
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="例: 711～755確認テスト⑦ 英単語クロスワード"
                className="pdf-title-input"
              />
            </div>
            <div className="form-group">
              <label>名前欄（日付なし・ワイド表記）</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="例: Name: ____________________"
              />
            </div>

            {/* 背景・インク節約スタイル選択 */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                <Droplets size={16} /> 印刷テーマ（省インク設定）
              </label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="printTheme"
                    value="ink-saver"
                    checked={theme === 'ink-saver'}
                    onChange={() => setTheme('ink-saver')}
                  />
                  <span>🌱 白背景・省インク（推奨：黒ベタなし、薄い斜線でインクを90%節約）</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="printTheme"
                    value="classic"
                    checked={theme === 'classic'}
                    onChange={() => setTheme('classic')}
                  />
                  <span>⬛ クラシック（通常の黒マス塗りつぶし）</span>
                </label>
              </div>
            </div>

            {/* 頭文字ヒント印字 */}
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={showFirstLetters}
                  onChange={(e) => setShowFirstLetters(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span>🔤 各単語の頭文字を盤面に印字する（難易度を下げて初級者向けにする）</span>
              </label>
            </div>
          </div>

          {/* エラーメッセージ表示 */}
          {errorMessage && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #ef4444',
              color: '#991b1b',
              padding: '12px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.88rem',
              lineHeight: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <span>⚠️ {errorMessage}</span>
              <button
                className="btn btn-sm btn-primary"
                onClick={handleNativePrint}
                style={{ whiteSpace: 'nowrap' }}
              >
                🖨️ ブラウザ印刷でPDF保存
              </button>
            </div>
          )}

          {/* 処理中ステータス表示 */}
          {exporting && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              padding: '10px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <span className="spinner" style={{
                display: 'inline-block',
                width: '16px',
                height: '16px',
                border: '2px solid var(--primary)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
              <span>{exportStatus || 'PDFを生成中...しばらくお待ちください'}</span>
            </div>
          )}

          <div className="pdf-actions-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
            <button
              className="btn btn-outline-purple"
              onClick={handleDownloadBoth}
              disabled={exporting}
              style={{ fontWeight: 'bold' }}
            >
              <Sparkles size={16} /> 【推奨】問題＋解答セット (全4枚組PDF) をダウンロード
            </button>
            <button
              className="btn btn-primary"
              onClick={handleDownloadQuestionPdf}
              disabled={exporting}
            >
              <Download size={16} /> 📄 【問題用紙のみ】(2枚組PDF)
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleDownloadAnswerPdf}
              disabled={exporting}
            >
              <CheckSquare size={16} /> ✅ 【解答用紙のみ】(2枚組PDF)
            </button>
            <button
              className="btn btn-outline"
              onClick={handleNativePrint}
              disabled={exporting}
              title="ブラウザ標準の印刷機能を使って、高品質なA4ベクターPDFとして保存またはプリンター印刷します"
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Printer size={16} /> 🖨️ ブラウザで直接印刷 / PDF保存
            </button>
          </div>

          <div style={{
            background: 'rgba(59, 130, 246, 0.08)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            borderRadius: '6px',
            padding: '8px 12px',
            fontSize: '0.86rem',
            color: '#93c5fd',
            margin: '10px 0 16px 0'
          }}>
            💡 <strong>2枚組独立レイアウト仕様:</strong> 1ページ目に特大クロスワード盤面、2ページ目に特大フォントのヒント一覧が印刷されます。盤面も手書きしやすく、ヒントも大きな文字でゆったり読めます。
          </div>

          {/* 印刷用プレビューエリア */}
          <div className="pdf-preview-scroll">
            {/* ====== 問題用紙 第1ページ: 盤面 ====== */}
            <div className="preview-page-divider">
              <span className="badge">問題用紙 1ページ目 (特大クロスワード盤面)</span>
            </div>
            <div id="pdf-print-area-question-grid" className="pdf-print-sheet">
              <div className="sheet-header">
                <h2 className="sheet-title">{title}</h2>
                <div className="sheet-subtitle">{subtitle}</div>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 8px 0' }}>
                ※ヒント・問題英文は2ページ目に掲載されています。
              </div>

              <div className="sheet-grid-wrapper large-grid">
                <div
                  className={`sheet-grid theme-${theme}`}
                  style={{
                    gridTemplateColumns: `repeat(${grid.size}, minmax(0, 1fr))`,
                  }}
                >
                  {grid.cells.map((row) =>
                    row.map((cell, cIdx) => {
                      const isStartCell = Boolean(cell.acrossNumber || cell.downNumber);
                      return (
                        <div
                          key={`pdf-q-${cell.row}-${cIdx}`}
                          className={`sheet-cell ${cell.isBlack ? 'black' : 'white'}`}
                        >
                          {isStartCell && (
                            <span className="sheet-cell-num">
                              {cell.acrossNumber || cell.downNumber}
                            </span>
                          )}
                          {!cell.isBlack && showFirstLetters && isStartCell && (
                            <span className="sheet-cell-first-letter">
                              {cell.letter}
                            </span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="sheet-footer">1 / 2 ページ （クロスワード盤面）</div>
            </div>

            {/* ====== 問題用紙 第2ページ: ヒント一覧 ====== */}
            <div className="preview-page-divider">
              <span className="badge">問題用紙 2ページ目 (特大フォント ヒント一覧)</span>
            </div>
            <div id="pdf-print-area-question-clues" className="pdf-print-sheet">
              <div className="sheet-header">
                <h2 className="sheet-title">{title} - ヒント一覧</h2>
                <div className="sheet-subtitle">ヨコ (Across) & タテ (Down)</div>
              </div>

              {renderCluesSection(false)}

              <div className="sheet-footer">2 / 2 ページ （ヒント一覧）</div>
            </div>

            {/* ====== 解答用紙 第1ページ: 解答盤面 ====== */}
            <div className="preview-page-divider">
              <span className="badge">解答用紙 1ページ目 (解答盤面)</span>
            </div>
            <div id="pdf-print-area-answer-grid" className="pdf-print-sheet answer-sheet">
              <div className="sheet-header">
                <h2 className="sheet-title">{title} (解答)</h2>
                <div className="sheet-subtitle">Answer Sheet</div>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#64748b', margin: '4px 0 8px 0' }}>
                ※解答付きヒント・全英文は2ページ目に掲載されています。
              </div>

              <div className="sheet-grid-wrapper large-grid">
                <div
                  className={`sheet-grid theme-${theme}`}
                  style={{
                    gridTemplateColumns: `repeat(${grid.size}, minmax(0, 1fr))`,
                  }}
                >
                  {grid.cells.map((row) =>
                    row.map((cell, cIdx) => (
                      <div
                        key={`pdf-a-${cell.row}-${cIdx}`}
                        className={`sheet-cell ${cell.isBlack ? 'black' : 'white'}`}
                      >
                        {(cell.acrossNumber || cell.downNumber) && (
                          <span className="sheet-cell-num">
                            {cell.acrossNumber || cell.downNumber}
                          </span>
                        )}
                        {!cell.isBlack && (
                          <span className="sheet-cell-letter">{cell.letter}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="sheet-footer">1 / 2 ページ （解答盤面）</div>
            </div>

            {/* ====== 解答用紙 第2ページ: 解答付きヒント一覧 ====== */}
            <div className="preview-page-divider">
              <span className="badge">解答用紙 2ページ目 (解答付きヒント一覧)</span>
            </div>
            <div id="pdf-print-area-answer-clues" className="pdf-print-sheet answer-sheet">
              <div className="sheet-header">
                <h2 className="sheet-title">{title} - 解答付きヒント</h2>
                <div className="sheet-subtitle">ヨコ (Across) & タテ (Down)</div>
              </div>

              {renderCluesSection(true)}

              <div className="sheet-footer">2 / 2 ページ （解答付きヒント一覧）</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
