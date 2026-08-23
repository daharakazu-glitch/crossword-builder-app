import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { WordItem } from '../../types/crossword';
import {
  parseCsvFile,
  parseExcelFile,
  parsePdfFile,
  parseDocxFile,
  parseTextContentToWords,
} from '../../utils/fileParsers';

interface FileUploadProps {
  onAddMultipleWords: (words: WordItem[]) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onAddMultipleWords }) => {
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

      if (ext === 'csv' || ext === 'tsv') {
        words = await parseCsvFile(file);
      } else if (ext === 'xlsx' || ext === 'xls') {
        words = await parseExcelFile(file);
      } else if (ext === 'pdf') {
        words = await parsePdfFile(file);
      } else if (ext === 'docx') {
        words = await parseDocxFile(file);
      } else if (ext === 'txt') {
        const text = await file.text();
        words = parseTextContentToWords(text);
      } else {
        alert('サポートされている拡張子: .csv, .xlsx, .pdf, .docx, .txt');
        setLoading(false);
        setStatusMessage(null);
        return;
      }

      if (words.length === 0) {
        setStatusMessage(`⚠️ 「${file.name}」から英単語を抽出できませんでした。`);
      } else {
        onAddMultipleWords(words);
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
          スプレッドシート(CSV/Excel), PDF, Word, TXT ファイルをドロップ
        </p>
        <p className="drop-subtitle">またはクリックしてファイルを選択してください</p>

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
