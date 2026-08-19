import React from 'react';
import { Grid, Sparkles, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onOpenHelp: () => void;
  onLoad100Preset: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenHelp, onLoad100Preset }) => {
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
          <button className="btn btn-secondary btn-sm" onClick={onLoad100Preset}>
            <Sparkles size={16} /> 100語サンプルを一括ロード
          </button>
          <button className="btn btn-icon" onClick={onOpenHelp} title="使い方とヒント">
            <HelpCircle size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};
