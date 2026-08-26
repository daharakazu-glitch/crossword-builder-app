import React from 'react';
import { HelpCircle, Shuffle, LayoutGrid, FileCheck, Type } from 'lucide-react';
import type { HintStyle } from '../types/crossword';

interface HintStyleSelectorProps {
  hintStyle: HintStyle;
  onSelectHintStyle: (style: HintStyle) => void;
  gridSize: number;
  onChangeGridSize: (size: number) => void;
  puzzleTitle: string;
  onUpdateTitle: (title: string) => void;
  onRegenerate: () => void;
  onOpenPdfModal: () => void;
}

export const HintStyleSelector: React.FC<HintStyleSelectorProps> = ({
  hintStyle,
  onSelectHintStyle,
  gridSize,
  onChangeGridSize,
  puzzleTitle,
  onUpdateTitle,
  onRegenerate,
  onOpenPdfModal,
}) => {
  return (
    <div className="config-card">
      {/* タイトル設定バー */}
      <div className="puzzle-title-bar">
        <label className="title-label">
          <Type size={16} /> タイトル:
        </label>
        <input
          type="text"
          className="puzzle-title-input"
          value={puzzleTitle}
          onChange={(e) => onUpdateTitle(e.target.value)}
          placeholder="例: 711～755確認テスト⑦ 英単語クロスワード"
        />
      </div>

      <div className="config-section">
        <h3 className="section-title">
          <HelpCircle size={18} /> ヒント表示スタイルの選択
        </h3>
        <p className="section-desc">問題用紙やパズル一覧に表示するヒント形式をセレクトしてください。</p>

        <div className="hint-options-grid">
          <label className={`hint-card ${hintStyle === 'sentence_ja' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="hintStyle"
              value="sentence_ja"
              checked={hintStyle === 'sentence_ja'}
              onChange={() => onSelectHintStyle('sentence_ja')}
            />
            <div className="hint-card-content">
              <span className="hint-title">① 英文穴埋め ＋ 日本語訳</span>
              <span className="hint-preview">例: I eat an (　　　　). (私はりんごを食べます)</span>
            </div>
          </label>

          <label className={`hint-card ${hintStyle === 'sentence_only' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="hintStyle"
              value="sentence_only"
              checked={hintStyle === 'sentence_only'}
              onChange={() => onSelectHintStyle('sentence_only')}
            />
            <div className="hint-card-content">
              <span className="hint-title">② 英文穴埋めのみ</span>
              <span className="hint-preview">例: I eat an (　　　　).</span>
            </div>
          </label>

          <label className={`hint-card ${hintStyle === 'ja_only' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="hintStyle"
              value="ja_only"
              checked={hintStyle === 'ja_only'}
              onChange={() => onSelectHintStyle('ja_only')}
            />
            <div className="hint-card-content">
              <span className="hint-title">③ 単純な日本語訳のみ</span>
              <span className="hint-preview">例: りんご</span>
            </div>
          </label>
        </div>
      </div>

      <div className="config-footer">
        <div className="grid-size-selector">
          <LayoutGrid size={16} />
          <span>盤面サイズ:</span>
          <select value={gridSize} onChange={(e) => onChangeGridSize(Number(e.target.value))}>
            <option value={15}>15 × 15 (小)</option>
            <option value={20}>20 × 20 (標準)</option>
            <option value={25}>25 × 25 (大 - 50〜100語向け)</option>
            <option value={30}>30 × 30 (特大)</option>
          </select>
        </div>

        <div className="footer-btns">
          <button className="btn btn-secondary" onClick={onRegenerate}>
            <Shuffle size={16} /> パズル配置を再生成
          </button>
          <button className="btn btn-pdf-primary" onClick={onOpenPdfModal}>
            <FileCheck size={18} /> PDFダウンロード
          </button>
        </div>
      </div>
    </div>
  );
};
