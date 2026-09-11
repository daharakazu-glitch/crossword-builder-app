import React, { useState } from 'react';
import { X, Copy, Check, ExternalLink, QrCode, Share2, Users } from 'lucide-react';
import type { CrosswordGrid, HintStyle, GridTheme } from '../types/crossword';
import { encodeSharedPuzzle, buildShareUrl } from '../utils/shareUtils';

interface ShareModalProps {
  grid: CrosswordGrid;
  title: string;
  subtitle?: string;
  hintStyle: HintStyle;
  theme: GridTheme;
  showFirstLetters: boolean;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  grid,
  title,
  subtitle,
  hintStyle,
  theme,
  showFirstLetters,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  const encoded = encodeSharedPuzzle(
    title,
    subtitle,
    grid.size,
    hintStyle,
    theme,
    showFirstLetters,
    grid.placedWords
  );

  const shareUrl = buildShareUrl(encoded);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`;

  const announcementMessage = `【${title}】\nオンラインで解ける英単語クロスワードです！以下のリンクから解いてみよう：\n${shareUrl}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      alert('URLのコピーに失敗しました。手動でコピーしてください。');
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(announcementMessage);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2500);
    } catch {
      alert('メッセージのコピーに失敗しました。');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content share-modal" style={{ maxWidth: '580px' }}>
        <div className="modal-header">
          <h2>
            <Share2 size={22} color="var(--primary)" /> 生徒へオンライン配信（共有リンク）
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--text-secondary)' }}>
            <Users size={18} />
            <span>
              複数の生徒にこのURLを送るだけで、各自のPC・タブレット・スマホで<strong>全く同じクロスワードパズル</strong>を解くことができます（登録・ログイン不要）。
            </span>
          </div>

          <div className="share-box" style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: '8px', fontSize: '0.9rem' }}>
              🌐 生徒用パズルURL
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={shareUrl}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-primary)',
                  fontSize: '0.85rem',
                  color: 'var(--text-primary)',
                }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                className={`btn ${copied ? 'btn-success' : 'btn-primary'}`}
                onClick={handleCopyUrl}
                style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'コピー完了！' : 'URLをコピー'}
              </button>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
                style={{
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  color: 'var(--text-primary)',
                }}
              >
                <ExternalLink size={15} /> 生徒用画面を別タブでプレビュー
              </a>
              <button
                className="btn btn-secondary"
                onClick={handleCopyMessage}
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {copiedMessage ? <Check size={15} /> : <Copy size={15} />}
                {copiedMessage ? '案内文コピー完了！' : '案内文付きでコピー'}
              </button>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 16px',
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px dashed var(--primary)',
            borderRadius: '8px',
          }}>
            <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              <img
                src={qrCodeUrl}
                alt="QR Code"
                width={110}
                height={110}
                style={{ display: 'block' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 6px 0', fontSize: '0.95rem' }}>
                <QrCode size={18} color="var(--primary)" /> 教室・授業用QRコード
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                プロジェクターに投影したりプリントに貼ることで、生徒がiPadやスマホのカメラでかざすだけですぐにパズルを始められます。
              </p>
            </div>
          </div>

          <div style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            💡 <strong>生徒モードの特徴:</strong> タイマー、単語ヒント、文字入力、自動採点（答え合わせ）、全問正解時の紙吹雪演出、音声・発音練習がすべて利用できます。先生用編集パネルは自動的に非表示になります。
          </div>
        </div>

        <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
