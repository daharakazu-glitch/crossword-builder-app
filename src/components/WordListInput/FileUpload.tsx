import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { WordItem, CrosswordPuzzlePackage } from '../../types/crossword';
import {
  parseCsvFile,
  parseExcelFile,
  parseDocxFile,
  parseTextContentToWords,
} from '../../utils/fileParsers';
import { restoreCrosswordFromPdf } from '../../utils/pdfRestore';

interface FileUploadProps {
  onAddMultipleWords: (words: WordItem[]) => void;
  onSetTitle?: (title: string) => void;
  onRestorePuzzlePackage?: (pkg: CrosswordPuzzlePackage) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onAddMultipleWords,
  onSetTitle,
  onRestorePuzzlePackage,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = async (file: File) => {
    setLoading(true);
    setStatusMessage(`「${file.name}」を解析中...`);

    try {
      let words: WordItem[] = [];
      const ext = file.name.split('.').pop()?.toLowerCase();

      if (ext === 'pdf') {
        // PDFからのクロスワード逆復元・単語抽出
        const result = await restoreCrosswordFromPdf(file, (_progress, msg) => {
          setStatusMessage(msg);
        });

        if (result.success && result.package && onRestorePuzzlePackage) {
          onRestorePuzzlePackage(result.package);
          setStatusMessage(`✨ ${result.message}（タイトル: ${result.package.title || '英単語クロスワード'}）`);
          return;
        } else if (result.success && result.words && result.words.length > 0) {
          onAddMultipleWords(result.words);
          if (result.title && onSetTitle) {
            onSetTitle(result.title);
          }
          setStatusMessage(`✅ ${result.message}`);
          return;
        } else {
          setStatusMessage(`⚠️ 「${file.name}」からクロスワード情報を復元できませんでした。`);
          return;
        }
      } else if (ext === 'csv' || ext === 'tsv') {
        words = await parseCsvFile(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        words = await parseExcelFile(file);
      } else if (ext === 'docx') {
        words = await parseDocxFile(file);
      } else if (ext === 'txt') {
        const text = await file.text();
        words = parseTextContentToWords(text);
      } else {
        alert('サポートされている拡張子: .pdf, .csv, .xlsx, .docx, .txt');
        setLoading(false);
        setStatusMessage(null);
        return;
      }

      if (words.length === 0) {
        setStatusMessage(`⚠️ 「${file.name}」から英単語を抽出できませんでした。`);
      } else {
        onAddMultipleWords(words);
        const cleanName = file.name
          .replace(/\.[^/.]+$/, '')
          .replace(/[・\-_]解答リスト.*$/i, '')
          .replace(/[・\-_]問題.*$/i, '')
          .trim();
        if (cleanName && onSetTitle) {
          onSetTitle(`${cleanName} 英単語クロスワード`);
        }
        setStatusMessage(`✅ 「${file.name}」から ${words.length} 件の単語を追加しました！`);
      }
    } catch (err: any) {
      console.error('File parsing error:', err);
      setStatusMessage(`❌ ファイル解析エラー: ${err?.message || '形式を読み取れませんでした。'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="file-upload-card">
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${loading ? 'loading' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden-file-input"
          accept=".csv,.tsv,.xlsx,.xls,.pdf,.docx,.txt"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
            }
          }}
        />
        <div className="drop-icon-group">
          <FileSpreadsheet className="icon-excel" size={32} />
          <Upload className="icon-upload" size={32} />
          <FileText className="icon-pdf" size={32} />
        </div>
        <p className="drop-title">
          Excel / CSV / PDF / Word / TXT ファイルをドロップ
        </p>
        <p className="drop-subtitle">
          ※作成済みPDFをドロップすると<strong>全く同じクロスワードを自動復元・再編集</strong>できます
        </p>

        {statusMessage && (
          <div className="status-banner">
            {statusMessage.includes('✅') ? (
              <CheckCircle2 size={16} className="success" />
            ) : (
              <AlertCircle size={16} className="warning" />
            )}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
