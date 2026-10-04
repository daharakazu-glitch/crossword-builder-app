import React from 'react';
import { Grid, Sparkles, HelpCircle, FileUp, Gamepad2 } from 'lucide-react';

interface HeaderProps {
  onOpenHelp: () => void;
  onLoad100Preset: () => void;
  onOpenPdfRestore?: () => void;
  onOpenStudentView?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenHelp,
  onLoad100Preset,
  onOpenPdfRestore,
  onOpenStudentView,
}) => {
  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo-group">
          <div className="logo-icon">
            <Grid className="icon" />
          </div>
          <div>
            <h1 className="app-title">
              Crossword Builder <span className="badge-pro">Pro</span>
            </h1>
            <p className="app-subtitle">
              最大100語の英単語リストから自動クロスワード生成 & PDF出力
            </p>
          </div>
        </div>

        <div className="header-actions">
          {onOpenPdfRestore && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={onOpenPdfRestore}
              title="本アプリで出力したPDFからパズルを逆復元し、生徒用オンライン版を生成"
              style={{ fontWeight: 600 }}
            >
              <FileUp size={16} /> PDFから復元
            </button>
          )}
          {onOpenStudentView && (
            <button
              className="btn btn-primary btn-sm"
              onClick={onOpenStudentView}
              title="現在のクロスワードを生徒用オンライン解答画面で開く"
              style={{ fontWeight: 600 }}
            >
              <Gamepad2 size={16} /> 生徒用画面
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={onLoad100Preset}>
            <Sparkles size={16} /> 100語サンプル
          </button>
          <button className="btn btn-icon" onClick={onOpenHelp} title="使い方とヒント">
            <HelpCircle size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
