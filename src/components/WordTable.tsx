import React, { useState } from 'react';
import { Trash2, Edit2, Check, X, Sparkles, AlertCircle, ListFilter, Wand2 } from 'lucide-react';
import type { WordItem } from '../types/crossword';
import { INITIAL_SAMPLE_WORDS, PRESET_100_WORDS } from '../utils/sampleData';
import { generateSentenceForWord } from '../utils/sentenceGenerator';

interface WordTableProps {
  words: WordItem[];
  unplacedWords: WordItem[];
  onUpdateWord: (id: string, updated: Partial<WordItem>) => void;
  onDeleteWord: (id: string) => void;
  onClearAll: () => void;
  onSetWords: (words: WordItem[]) => void;
}

export const WordTable: React.FC<WordTableProps> = ({
  words,
  unplacedWords,
  onUpdateWord,
  onDeleteWord,
  onClearAll,
  onSetWords,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState('');
  const [editJapanese, setEditJapanese] = useState('');
  const [editSentence, setEditSentence] = useState('');

  const startEditing = (item: WordItem) => {
    setEditingId(item.id);
    setEditWord(item.word);
    setEditJapanese(item.japanese);
    setEditSentence(item.sentence || '');
  };

  const saveEditing = (id: string) => {
    const cleanWord = editWord.trim().toUpperCase().replace(/[^A-Z]/g, '');
    if (!cleanWord) return;

    const generated = generateSentenceForWord(cleanWord, editJapanese);

    onUpdateWord(id, {
      word: cleanWord,
      japanese: editJapanese.trim() || generated.japanese,
      sentence: editSentence.trim() || generated.sentence,
    });
    setEditingId(null);
  };

  const handleGenerateMissingSentences = () => {
    const updatedList = words.map((w) => {
      if (!w.sentence || w.sentence.trim() === '') {
        const generated = generateSentenceForWord(w.word, w.japanese);
        return {
          ...w,
          japanese: w.japanese === '（訳未指定）' ? generated.japanese : w.japanese,
          sentence: generated.sentence,
        };
      }
      return w;
    });
    onSetWords(updatedList);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const progressPercent = Math.min(100, Math.round((words.length / 100) * 100));

  return (
    <div className="word-table-card">
      <div className="table-header">
        <div className="table-title-group">
          <h3>
            登録英単語リスト <span className="word-count-badge">{words.length} / 100 語</span>
          </h3>
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>

        <div className="table-actions">
          <button
            className="btn btn-sm btn-outline-purple"
            onClick={handleGenerateMissingSentences}
            title="例文が空の単語に例文と訳を自動生成"
          >
            <Wand2 size={14} /> 例文を一括自動生成
          </button>
          <button
            className="btn btn-sm btn-outline"
            onClick={() => onSetWords(INITIAL_SAMPLE_WORDS)}
            title="サンプル20語をセット"
          >
            <Sparkles size={14} /> サンプル20語
          </button>
          <button
            className="btn btn-sm btn-outline-purple"
            onClick={() => onSetWords(PRESET_100_WORDS)}
            title="100語プリセットをロード"
          >
            <Sparkles size={14} /> 100語一括ロード
          </button>
          {words.length > 0 && (
            <button className="btn btn-sm btn-danger-outline" onClick={onClearAll}>
              <Trash2 size={14} /> 全削除
            </button>
          )}
        </div>
      </div>

      {unplacedWords.length > 0 && (
        <div className="unplaced-warning">
          <AlertCircle size={16} />
          <span>
            現在の盤面サイズでは入りきらなかった単語が <strong>{unplacedWords.length} 個</strong>{' '}
            あります。（盤面サイズを大きくするか、「再生成」をお試しください）
          </span>
        </div>
      )}

      {words.length === 0 ? (
        <div className="empty-state">
          <ListFilter size={40} />
          <p>登録されている単語はありません。</p>
          <p className="empty-sub">
            フォーム入力、ファイルのドロップ、またはサンプルセットボタンを押して登録してください。
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="word-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>#</th>
                <th style={{ width: '160px' }}>英単語 (Word)</th>
                <th style={{ width: '180px' }}>日本語訳 (Japanese)</th>
                <th>英文かっこ穴埋め用例文 (Sentence)</th>
                <th style={{ width: '90px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {words.map((item, index) => {
                const isEditing = editingId === item.id;
                const isUnplaced = unplacedWords.some((u) => u.id === item.id);

                return (
                  <tr key={item.id} className={isUnplaced ? 'row-unplaced' : ''}>
                    <td>
                      <span className="row-index">{index + 1}</span>
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editWord}
                          onChange={(e) => setEditWord(e.target.value)}
                          className="table-input"
                        />
                      ) : (
                        <strong className="word-text">{item.word}</strong>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editJapanese}
                          onChange={(e) => setEditJapanese(e.target.value)}
                          className="table-input"
                        />
                      ) : (
                        <span>{item.japanese}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="text"
                          value={editSentence}
                          onChange={(e) => setEditSentence(e.target.value)}
                          className="table-input"
                        />
                      ) : (
                        <span className="sentence-text">
                          {item.sentence || <span className="no-sentence">（自動生成）</span>}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="action-buttons">
                        {isEditing ? (
                          <>
                            <button
                              className="btn-icon-sm success"
                              onClick={() => saveEditing(item.id)}
                            >
                              <Check size={14} />
                            </button>
                            <button className="btn-icon-sm cancel" onClick={cancelEditing}>
                              <X size={14} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn-icon-sm edit"
                              onClick={() => startEditing(item)}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              className="btn-icon-sm delete"
                              onClick={() => onDeleteWord(item.id)}
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
