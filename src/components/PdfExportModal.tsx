import React, { useState } from 'react';
import { X, Download, CheckSquare, Printer, Sparkles, Type } from 'lucide-react';
import type { CrosswordGrid, HintStyle } from '../types/crossword';
import { exportCrosswordToPdf, exportBothCrosswordsToPdf, formatClueText } from '../utils/pdfExport';

interface PdfExportModalProps {
  grid: CrosswordGrid;
  hintStyle: HintStyle;
  initialTitle?: string;
  initialShowFirstLetters?: boolean;
  onUpdateTitle?: (title: string) => void;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  grid,
  hintStyle,
  initialTitle = '英単語クロスワードパズル',
  initialShowFirstLetters = false,
  onUpdateTitle,
  onClose,
}) => {
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState('Name: ________________________________');
  const [showFirstLetters, setShowFirstLetters] = useState(initialShowFirstLetters);
  const [exporting, setExporting] = useState(false);

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (onUpdateTitle) {
      onUpdateTitle(newTitle);
    }
  };

  const acrossClues = grid.placedWords.filter((w) => w.direction === 'across');
  const downClues = grid.placedWords.filter((w) => w.direction === 'down');

  const handleDownloadQuestionPdf = async () => {
    setExporting(true);
    try {
      await exportCrosswordToPdf({
        title: `${title}_問題`,
        subtitle,
        hintStyle,
        isAnswerKey: false,
        elementId: 'pdf-print-area-question',
      });
    } catch (err) {
      console.error(err);
      alert('PDFの出力中にエラーが発生しました。');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadAnswerPdf = async () => {
    setExporting(true);
    try {
      await exportCrosswordToPdf({
        title: `${title}_解答`,
        subtitle,
        hintStyle,
        isAnswerKey: true,
        elementId: 'pdf-print-area-answer',
      });
    } catch (err) {
      console.error(err);
      alert('PDFの出力中にエラーが発生しました。');
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadBoth = async () => {
    setExporting(true);
    try {
      await exportBothCrosswordsToPdf({
        title,
        subtitle,
        hintStyle,
        questionElementId: 'pdf-print-area-question',
        answerElementId: 'pdf-print-area-answer',
      });
    } catch (err) {
      console.error(err);
      alert('PDFの出力中にエラーが発生しました。');
    } finally {
      setExporting(false);
    }
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

          <div className="pdf-actions-bar">
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
          </div>

          <p className="pdf-preview-notice">
            ※以下の内容がA4サイズちょうど1枚ずつ印刷用PDFとして出力されます。解答欄の英単語は小文字（例: [soil]）で記載されます。
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
                  className="sheet-grid"
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
                  className="sheet-grid"
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
