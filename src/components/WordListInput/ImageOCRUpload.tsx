import React, { useState, useRef } from 'react';
import { Camera, Image as ImageIcon, Loader2, CheckCircle2 } from 'lucide-react';
import type { WordItem } from '../../types/crossword';
import { recognizeImageText } from '../../utils/ocr';

interface ImageOCRUploadProps {
  onAddMultipleWords: (words: WordItem[]) => void;
}

export const ImageOCRUpload: React.FC<ImageOCRUploadProps> = ({ onAddMultipleWords }) => {
  const [loading, setLoading] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [extractedText, setExtractedText] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('画像ファイル (JPG, PNG, WebPなど) を選択してください。');
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    setLoading(true);
    setExtractedText(null);

    try {
      const { text, words } = await recognizeImageText(file, (_progress, status) => {
        setProgressText(status);
      });

      setExtractedText(text);

      if (words.length > 0) {
        onAddMultipleWords(words);
      } else {
        alert('画像から単語を自動検出できませんでした。テキストプレビューをご確認ください。');
      }
    } catch (err) {
      console.error(err);
      alert('画像文字認識(OCR)中にエラーが発生しました。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ocr-upload-card">
      <div className="ocr-header">
        <Camera className="icon" size={24} />
        <div>
          <h3>写真・画像から単語を取り込み (AI OCR)</h3>
          <p>単語帳やプリントの写真・スクリーンショットを認識して自動リストアップします。</p>
        </div>
      </div>

      <div className="ocr-body">
        <div
          className="ocr-dropzone"
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            type="file"
            ref={fileInputRef}
            className="hidden-file-input"
            accept="image/*"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleImageProcess(e.target.files[0]);
              }
            }}
          />

          {previewUrl ? (
            <div className="preview-container">
              <img src={previewUrl} alt="OCR Preview" className="image-preview" />
              {loading && (
                <div className="ocr-overlay">
                  <Loader2 className="spinner" size={32} />
                  <span>{progressText || 'AI文字認識を実行中...'}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="placeholder">
              <ImageIcon size={40} />
              <p>画像をアップロードまたはドロップ</p>
              <small>単語帳、プリント、黒板の写真など</small>
            </div>
          )}
        </div>

        {extractedText && (
          <div className="extracted-result">
            <h4>
              <CheckCircle2 size={16} color="#10b981" /> 抽出されたテキスト
            </h4>
            <pre className="text-preview">{extractedText}</pre>
          </div>
        )}
      </div>
    </div>
  );
};
