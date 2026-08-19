import React from 'react';
import { X, HelpCircle } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content help-modal">
        <div className="modal-header">
          <h2>
            <HelpCircle size={22} /> クロスワード作成アプリの使い方ガイド
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="help-step-list">
            <div className="help-step">
              <div className="step-badge">Step 1</div>
              <div className="step-content">
                <h3>英単語リストの追加 (最大100個)</h3>
                <p>以下の多様な方法で英単語と日本語訳、英文穴埋め例文を追加できます:</p>
                <ul>
                  <li><strong>手入力 / 一括コピペ:</strong> 1件ずつフォーム入力するか、複数行のテキストをコピペ登録できます。</li>
                  <li><strong>スプレッドシート:</strong> CSV, Excel (`.xlsx`), PDF, Word (`.docx`), TXT ファイルを直接ドロップ！</li>
                  <li><strong>画像AI OCR取り込み:</strong> 単語帳やプリントの写真をアップロードすると、文字認識により自動リストアップします。</li>
                </ul>
              </div>
            </div>

            <div className="help-step">
              <div className="step-badge">Step 2</div>
              <div className="step-content">
                <h3>ヒント表示スタイルの切り替え</h3>
                <p>3つのセレクト形式からお好みの表示を選べます:</p>
                <ul>
                  <li><strong>① 英文穴埋め ＋ 日本語訳:</strong> 例文かっこ穴埋めと日本語訳をセットで表示（初心者・学習者向け）。</li>
                  <li><strong>② 英文穴埋めのみ:</strong> 文脈から単語を推測する本格英語トレーニング向け。</li>
                  <li><strong>③ 単純な日本語訳のみ:</strong> 従来のシンプルな単語クロスワードパズル。</li>
                </ul>
              </div>
            </div>

            <div className="help-step">
              <div className="step-badge">Step 3</div>
              <div className="step-content">
                <h3>パズルの解くモード & PDFダウンロード</h3>
                <p>画面上でキーボード入力して直接パズルを解くことも、問題用紙・解答用紙としてA4 PDFを出力して印刷することも可能です。</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
