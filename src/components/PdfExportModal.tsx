import React, { useState } from 'react';
import { X, Download, CheckSquare, Printer, Sparkles } from 'lucide-react';
import type { CrosswordGrid, HintStyle } from '../types/crossword';
import { exportCrosswordToPdf, formatClueText } from '../utils/pdfExport';

interface PdfExportModalProps {
  grid: CrosswordGrid;
  hintStyle: HintStyle;
  onClose: () => void;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  grid,
  hintStyle,
  onClose,
}) => {
  const [title, setTitle] = useState('英単語クロスワードパズル');
  const [subtitle, setSubtitle] = useState('Date: ____________  Name: ____________');
  const [exporting, setExporting] = useState(false);

  const acrossClues = grid.placedWords.filter((w) => w.direction === 'across');
  const downClues = grid.placedWords.filter((w) => w.direction === 'down');

  const handleDownloadQuestionPdf = async () => {
    setExporting(true);
    try {
      await exportCrosswordToPdf({
        title,
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
    await handleDownloadQuestionPdf();
    await handleDownloadAnswerPdf();
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
              <label>タイトル</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 中学英単語クロスワード #1"
              />
            </div>
            <div className="form-group">
              <label>サブタイトル / 名前欄</label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="例: Date: ________  Name: ________"
              />
            </div>
          </div>

          <div className="pdf-actions-bar">
            <button
              className="btn btn-primary"
              onClick={handleDownloadQuestionPdf}
              disabled={exporting}
            >
              <Download size={16} /> 【問題用紙】PDFをダウンロード
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleDownloadAnswerPdf}
              disabled={exporting}
            >
              <CheckSquare size={16} /> 【解答用紙】PDFをダウンロード
            </button>
            <button
              className="btn btn-outline-purple"
              onClick={handleDownloadBoth}
              disabled={exporting}
            >
              <Sparkles size={16} /> 両方をまとめて出力
            </button>
          </div>

          <p className="pdf-preview-notice">
            ※以下の領域がそのままA4サイズのPDFとして出力されます。
          </p>

          {/* 印刷用プレビューエリア (隠しレンダリング / プレビュー表示) */}
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
                    row.map((cell, cIdx) => (
                      <div
                        key={`pdf-q-${cell.row}-${cIdx}`}
                        className={`sheet-cell ${cell.isBlack ? 'black' : 'white'}`}
                      >
                        {(cell.acrossNumber || cell.downNumber) && (
                          <span className="sheet-cell-num">
                            {cell.acrossNumber || cell.downNumber}
                          </span>
                        )}
                      </div>
                    ))
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
                        <strong>{w.number}.</strong> [{w.word}] - {formatClueText(w, hintStyle)}
                      </li>
                    ))}
                  </ol>
                </div>
                <div className="sheet-clues-col">
                  <h3>タテ (Down) 解答付きヒント</h3>
                  <ol className="sheet-clues-list">
                    {downClues.map((w) => (
                      <li key={`pdf-a-down-${w.id}`}>
                        <strong>{w.number}.</strong> [{w.word}] - {formatClueText(w, hintStyle)}
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
