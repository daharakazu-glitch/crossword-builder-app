import React, { useState, useEffect } from 'react';
import { X, Copy, Check, QrCode, Share2, Users, GraduationCap, Link2, Loader2 } from 'lucide-react';
import type { CrosswordGrid, HintStyle, GridTheme } from '../types/crossword';
import { encodeSharedPuzzle, buildShareUrl, buildClassroomShareUrl, createShortUrl } from '../utils/shareUtils';

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
  const [copiedShort, setCopiedShort] = useState(false);
  const [copiedDirect, setCopiedDirect] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [shortUrl, setShortUrl] = useState<string>('');
  const [isGeneratingShort, setIsGeneratingShort] = useState(true);
  const [showDirectUrl, setShowDirectUrl] = useState(false);

  // パズルデータをエンコード
  const encoded = encodeSharedPuzzle(
    title,
    subtitle,
    grid.size,
    hintStyle,
    theme,
    showFirstLetters,
    grid.placedWords
  );

  const directShareUrl = buildShareUrl(encoded, true);

  // 初回マウント時に TinyURL 短縮URLを生成（Google Classroom の2048文字制限を完全クリア）
  useEffect(() => {
    let isMounted = true;
    setIsGeneratingShort(true);

    createShortUrl(directShareUrl).then((short) => {
      if (isMounted) {
        setShortUrl(short);
        setIsGeneratingShort(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [directShareUrl]);

  const activeShareUrl = shortUrl || directShareUrl;
  const classroomShareLink = buildClassroomShareUrl(activeShareUrl, `【英単語クロスワード】${title}`);
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activeShareUrl)}`;

  const announcementMessage = `【${title}】\nオンラインで解ける英単語クロスワードパズルです！\n各自の端末（PC・タブレット・スマートフォン）から以下のリンクを開いて挑戦してみましょう：\n${activeShareUrl}`;

  const handleCopyShortUrl = async () => {
    try {
      await navigator.clipboard.writeText(activeShareUrl);
      setCopiedShort(true);
      setTimeout(() => setCopiedShort(false), 2500);
    } catch {
      alert('URLのコピーに失敗しました。手動でコピーしてください。');
    }
  };

  const handleCopyDirectUrl = async () => {
    try {
      await navigator.clipboard.writeText(directShareUrl);
      setCopiedDirect(true);
      setTimeout(() => setCopiedDirect(false), 2500);
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
      <div className="modal-content share-modal" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h2>
            <Share2 size={22} color="var(--primary)" /> 生徒へオンライン配信（Google Classroom対応）
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            <Users size={18} color="var(--primary)" />
            <span>
              生徒各自のPC・iPad・タブレット・スマホで<strong>全く同じクロスワードパズル</strong>を解くことができます（ログイン・登録不要）。
            </span>
          </div>

          {/* ===================================================
              🎓 Google Classroom 最適化共有エリア (推奨)
             =================================================== */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(5, 150, 105, 0.04) 100%)',
            border: '2px solid #10b981',
            borderRadius: '10px',
            padding: '16px',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.95rem', color: '#065f46' }}>
                <GraduationCap size={20} color="#10b981" /> Google Classroom 用リンク（文字数制限クリア済）
              </label>
              <span style={{ fontSize: '0.78rem', background: '#10b981', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>
                推奨・エラー防止
              </span>
            </div>

            <p style={{ margin: '0 0 10px 0', fontSize: '0.82rem', color: '#047857', lineHeight: 1.4 }}>
              ※Google ClassroomのURL文字数制限（2048文字）による<strong>「無効なリンク」エラーを完全に回避</strong>した短縮URLです。Classroomの添付欄に貼り付けて確実に送信できます。
            </p>

            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                readOnly
                value={isGeneratingShort ? '短縮URLを生成中...' : activeShareUrl}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '6px',
                  border: '1px solid #10b981',
                  background: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: '#065f46',
                }}
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                className={`btn ${copiedShort ? 'btn-success' : 'btn-primary'}`}
                onClick={handleCopyShortUrl}
                disabled={isGeneratingShort}
                style={{
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: copiedShort ? '#059669' : '#10b981',
                  borderColor: '#10b981',
                  fontWeight: 'bold',
                }}
              >
                {copiedShort ? <Check size={16} /> : <Copy size={16} />}
                {copiedShort ? 'コピー完了！' : 'URLをコピー'}
              </button>
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {/* Google Classroom 公式直接共有ボタン */}
              <a
                href={classroomShareLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-white"
                style={{
                  fontSize: '0.85rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  textDecoration: 'none',
                  background: '#ffffff',
                  color: '#065f46',
                  border: '1px solid #10b981',
                  fontWeight: 600,
                }}
              >
                <GraduationCap size={16} color="#10b981" /> Google Classroom に直接投稿する
              </a>

              <button
                className="btn btn-secondary"
                onClick={handleCopyMessage}
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {copiedMessage ? <Check size={15} /> : <Copy size={15} />}
                {copiedMessage ? '案内文コピー完了！' : 'Classroom用案内文付きでコピー'}
              </button>
            </div>
          </div>

          {/* ===================================================
              📱 教室プロジェクター用 QR コード
             =================================================== */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            padding: '12px 16px',
            background: 'rgba(99, 102, 241, 0.05)',
            border: '1px dashed var(--primary)',
            borderRadius: '8px',
            marginBottom: '16px',
          }}>
            <div style={{ background: '#fff', padding: '6px', borderRadius: '6px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
              {isGeneratingShort ? (
                <div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Loader2 size={24} className="spin" />
                </div>
              ) : (
                <img
                  src={qrCodeUrl}
                  alt="QR Code"
                  width={100}
                  height={100}
                  style={{ display: 'block' }}
                />
              )}
            </div>
            <div style={{ flex: 1 }}>
              <h4 style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '0 0 6px 0', fontSize: '0.95rem' }}>
                <QrCode size={18} color="var(--primary)" /> 教室・授業用QRコード（短縮URL対応・爆速スキャン）
              </h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                プロジェクターに大きく投影したりプリントに貼ることで、生徒がiPadやスマホのカメラをかざすだけで一瞬でパズル画面が開きます。
              </p>
            </div>
          </div>

          {/* ===================================================
              🔗 直接URL (詳細・上級者向けアコーディオン)
             =================================================== */}
          <div style={{ marginBottom: '12px' }}>
            <button
              onClick={() => setShowDirectUrl(!showDirectUrl)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.82rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: 0,
              }}
            >
              <Link2 size={14} /> {showDirectUrl ? '▼ 直接フルURLを隠す' : '▶ 短縮サービスを経由しない直接フルURLを表示する'}
            </button>

            {showDirectUrl && (
              <div style={{
                marginTop: '8px',
                padding: '12px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
              }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    readOnly
                    value={directShareUrl}
                    style={{
                      flex: 1,
                      padding: '6px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border)',
                      background: 'var(--bg-primary)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                    }}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    className="btn btn-sm btn-outline"
                    onClick={handleCopyDirectUrl}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    {copiedDirect ? 'コピー済' : 'コピー'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            💡 <strong>生徒モードの安心仕様:</strong> ログイン不要でタイマー、文字入力、答え合わせ（自動採点）、全問正解時の紙吹雪演出、音声・発音練習がすべて利用できます。先生用編集画面は生徒側には一切表示されません。
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
