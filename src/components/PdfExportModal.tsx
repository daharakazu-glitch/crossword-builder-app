import React, { useState } from 'react';
import { X, Download, CheckSquare, Printer, Sparkles, Type, Droplets } from 'lucide-react';
import type { CrosswordGrid, HintStyle, GridTheme, WordItem, CrosswordPuzzlePackage } from '../types/crossword';
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

  // 復元用パッケージの生成
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
    setExportStatus('問題用紙のPDFを生成中...');
    try {
      await exportCrosswordToPdf({
        title: `${title}_問題`,
        subtitle,
        hintStyle,
        isAnswerKey: false,
        elementId: 'pdf-print-area-question',
        puzzlePackage,
        theme,
      });
    } catch (err: any) {
      console.error('PDF export error (Question):', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`PDFの生成中にエラーが発生しました: ${msg}（下の「ブラウザで直接印刷 / PDF保存」ボタンもお試しいただけます）`);
    } finally {
      setExporting(false);
      setExportStatus('');
    }
  };

  const handleDownloadAnswerPdf = async () => {
    setExporting(true);
    setErrorMessage(null);
    setExportStatus('解答用紙のPDFを生成中...');
    try {
      await exportCrosswordToPdf({
        title: `${title}_解答`,
        subtitle,
        hintStyle,
        isAnswerKey: true,
        elementId: 'pdf-print-area-answer',
        puzzlePackage,
        theme,
      });
    } catch (err: any) {
      console.error('PDF export error (Answer):', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`PDFの生成中にエラーが発生しました: ${msg}（下の「ブラウザで直接印刷 / PDF保存」ボタンもお試しいただけます）`);
    } finally {
      setExporting(false);
      setExportStatus('');
    }
  };

  const handleDownloadBoth = async () => {
    setExporting(true);
    setErrorMessage(null);
    setExportStatus('問題と解答の2ページPDFを一括生成中...');
    try {
      await exportBothCrosswordsToPdf({
        title,
        subtitle,
        hintStyle,
        questionElementId: 'pdf-print-area-question',
        answerElementId: 'pdf-print-area-answer',
        puzzlePackage,
        theme,
      });
    } catch (err: any) {
      console.error('PDF export error (Both):', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`PDFの生成中にエラーが発生しました: ${msg}（下の「ブラウザで直接印刷 / PDF保存」ボタンもお試しいただけます）`);
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
            <Printer size={22} /> PDFダウンロード設定・プレビュー
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
                <Droplets size={16} color="var(--primary)" /> 盤面背景スタイル（インク節約設定）
              </label>
              <div style={{ display: 'flex', gap: '16px', marginTop: '6px', flexWrap: 'wrap' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: theme === 'ink-saver' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: theme === 'ink-saver' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  fontWeight: theme === 'ink-saver' ? 600 : 400,
                }}>
                  <input
                    type="radio"
                    name="pdf-theme"
                    checked={theme === 'ink-saver'}
                    onChange={() => setTheme('ink-saver')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>🌱 <strong>白背景・省インク（印刷推奨）</strong>：黒マスを薄い斜線にしてインクくっつきを防止</span>
                </label>

                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: theme === 'classic' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: theme === 'classic' ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-secondary)',
                  cursor: 'pointer',
                  fontWeight: theme === 'classic' ? 600 : 400,
                }}>
                  <input
                    type="radio"
                    name="pdf-theme"
                    checked={theme === 'classic'}
                    onChange={() => setTheme('classic')}
                    style={{ cursor: 'pointer' }}
                  />
                  <span>⬛ <strong>黒マス（クラシック）</strong>：従来の黒ベタ塗りマス</span>
                </label>
              </div>
            </div>

            <div className="form-group checkbox-group" style={{ gridColumn: '1 / -1' }}>
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: 'var(--text-primary)' }}>
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
              <Sparkles size={16} /> 【推奨】問題＋解答セット (1つのPDF) をダウンロード
            </button>
            <button
              className="btn btn-primary"
              onClick={handleDownloadQuestionPdf}
              disabled={exporting}
            >
              <Download size={16} /> 【問題用紙のみ】PDFダウンロード
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleDownloadAnswerPdf}
              disabled={exporting}
            >
              <CheckSquare size={16} /> 【解答用紙のみ】PDFダウンロード
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

          <p className="pdf-preview-notice">
            ※以下の内容がA4サイズちょうど1枚ずつ印刷用PDFとして出力されます。PDFには再編集・完全復元用データが自動埋め込まれます。
          </p>

          {/* 印刷用プレビューエリア */}
          <div className="pdf-preview-scroll">
            {/* 問題用紙プレビュー */}
            <div id="pdf-print-area-question" className="pdf-print-sheet">
              <div className="sheet-header">
                <h2 className="sheet-title">{title}</h2>
                <div className="sheet-subtitle">{subtitle}</div>
              </div>

              <div className="sheet-grid-wrapper">
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
                          {/* 頭文字ヒント印字 */}
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

              <div className="sheet-clues-section">
                <div className="sheet-clues-col">
                  <h3>ヨコ (Across)</h3>
                  <ol className="sheet-clues-list">
                    {acrossClues.map((w) => (
                      <li key={`pdf-q-across-${w.id}`}>
                        <strong>{w.number}.</strong> {formatClueText(w, hintStyle)}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="sheet-clues-col">
                  <h3>タテ (Down)</h3>
                  <ol className="sheet-clues-list">
                    {downClues.map((w) => (
                      <li key={`pdf-q-down-${w.id}`}>
                        <strong>{w.number}.</strong> {formatClueText(w, hintStyle)}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>

            {/* 解答用紙プレビュー */}
            <div id="pdf-print-area-answer" className="pdf-print-sheet answer-sheet">
              <div className="sheet-header">
                <h2 className="sheet-title">{title} (解答)</h2>
                <div className="sheet-subtitle">{subtitle}</div>
              </div>

              <div className="sheet-grid-wrapper">
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

              <div className="sheet-clues-section">
                <div className="sheet-clues-col">
                  <h3>ヨコ (Across) 解答付きヒント</h3>
                  <ol className="sheet-clues-list">
                    {acrossClues.map((w) => (
                      <li key={`pdf-a-across-${w.id}`}>
                        <strong>{w.number}.</strong> <span style={{ fontWeight: 'bold', color: '#1e293b' }}>[{w.word.toLowerCase()}]</span> - {formatClueText(w, hintStyle)}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="sheet-clues-col">
                  <h3>タテ (Down) 解答付きヒント</h3>
                  <ol className="sheet-clues-list">
                    {downClues.map((w) => (
                      <li key={`pdf-a-down-${w.id}`}>
                        <strong>{w.number}.</strong> <span style={{ fontWeight: 'bold', color: '#1e293b' }}>[{w.word.toLowerCase()}]</span> - {formatClueText(w, hintStyle)}
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
