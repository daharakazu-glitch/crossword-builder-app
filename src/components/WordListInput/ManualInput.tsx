import React, { useState } from 'react';
import { Plus, ListPlus } from 'lucide-react';
import type { WordItem } from '../../types/crossword';
import { parseTextContentToWords } from '../../utils/fileParsers';

interface ManualInputProps {
  onAddWord: (word: WordItem) => void;
  onAddMultipleWords: (words: WordItem[]) => void;
  currentCount: number;
}

export const ManualInput: React.FC<ManualInputProps> = ({
  onAddWord,
  onAddMultipleWords,
  currentCount,
}) => {
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [word, setWord] = useState('');
  const [japanese, setJapanese] = useState('');
  const [sentence, setSentence] = useState('');

  const [bulkText, setBulkText] = useState('');

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim()) return;
    if (currentCount >= 100) {
      alert('登録できる単語数は最大100個までです。');
      return;
    }

    const cleanWord = word.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (cleanWord.length < 2) {
      alert('英単語は2文字以上で入力してください。');
      return;
    }

    onAddWord({
      id: `manual-${Date.now()}`,
      word: cleanWord,
      japanese: japanese.trim() || '（訳未指定）',
      sentence: sentence.trim() || undefined,
    });

    setWord('');
    setJapanese('');
    setSentence('');
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkText.trim()) return;

    const parsed = parseTextContentToWords(bulkText);
    if (parsed.length === 0) {
      alert('有効な英単語が見つかりませんでした。');
      return;
    }

    onAddMultipleWords(parsed);
    setBulkText('');
  };

  return (
    <div className="input-card">
      <div className="tab-buttons">
        <button
          className={`tab-btn ${mode === 'single' ? 'active' : ''}`}
          onClick={() => setMode('single')}
        >
          <Plus size={16} /> 1文字ずつ追加
        </button>
        <button
          className={`tab-btn ${mode === 'bulk' ? 'active' : ''}`}
          onClick={() => setMode('bulk')}
        >
          <ListPlus size={16} /> 一括コピペ入力
        </button>
      </div>

      {mode === 'single' ? (
        <form onSubmit={handleSingleSubmit} className="single-input-form">
          <div className="form-grid">
            <div className="form-group">
              <label>英単語 (必修)</label>
              <input
                type="text"
                placeholder="例: APPLE"
                value={word}
                onChange={(e) => setWord(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>日本語訳</label>
              <input
                type="text"
                placeholder="例: りんご"
                value={japanese}
                onChange={(e) => setJapanese(e.target.value)}
              />
            </div>
            <div className="form-group full-width">
              <label>英文かっこ穴埋め用例文 (任意)</label>
              <input
                type="text"
                placeholder="例: An APPLE a day keeps the doctor away."
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
              />
              <small className="form-help">
                ※例文中の単語は自動的に穴埋め「____」に変換されます。
              </small>
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={currentCount >= 100}>
            <Plus size={18} /> 単語リストに追加
          </button>
        </form>
      ) : (
        <form onSubmit={handleBulkSubmit} className="bulk-input-form">
          <div className="form-group">
            <label>テキスト一括貼り付け</label>
            <textarea
              rows={5}
              placeholder={`以下の形式で複数行コピペ可能です:
APPLE, りんご, An APPLE a day...
BANANA - バナナ
CAT : 猫`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={currentCount >= 100}>
            <ListPlus size={18} /> 一括抽出して追加
          </button>
        </form>
      )}
    </div>
  );
};
