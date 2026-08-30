import React from 'react';
import { CheckCircle, Eye, EyeOff, RotateCcw, Lightbulb, Volume2, Lock } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InteractiveControlsProps {
  showAnswers: boolean;
  onToggleShowAnswers: () => void;
  onCheckAnswers: () => boolean;
  onHintOneLetter: () => void;
  onResetUserInputs: () => void;
  isCompleted: boolean;
  showFirstLetters: boolean;
  onToggleFirstLetters: () => void;
  onOpenAudioPractice: () => void;
}

export const InteractiveControls: React.FC<InteractiveControlsProps> = ({
  showAnswers,
  onToggleShowAnswers,
  onCheckAnswers,
  onHintOneLetter,
  onResetUserInputs,
  isCompleted,
  showFirstLetters,
  onToggleFirstLetters,
  onOpenAudioPractice,
}) => {
  const handleCheck = () => {
    const isAllCorrect = onCheckAnswers();
    if (isAllCorrect) {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 },
      });
      if (window.confirm('🎉 おめでとうございます！全問大正解です！\n英語例文の音声リスニング＆発音録音練習がアンロックされました！\n今すぐ練習を開始しますか？')) {
        onOpenAudioPractice();
      }
    } else {
      alert('惜しい！まだ未完成またはスペルが異なるマスがあります。もう一度見直してみましょう！');
    }
  };

  const handleAudioButtonClick = () => {
    if (!isCompleted) {
      alert('🔒 音声練習はロックされています。\nクロスワードを全問正解クリア（または「解答をすべて表示」）するとアンロックされます！');
      return;
    }
    onOpenAudioPractice();
  };

  return (
    <div className="interactive-controls">
      <div className="control-group">
        <button className="btn btn-outline" onClick={handleCheck}>
          <CheckCircle size={16} color="#10b981" /> 正誤チェック
        </button>

        <button
          className={`btn ${showFirstLetters ? 'btn-primary' : 'btn-outline'}`}
          onClick={onToggleFirstLetters}
          title="各単語の先頭マスに頭文字をガイド表示します"
        >
          <span style={{ fontWeight: 'bold' }}>🔤</span> {showFirstLetters ? '頭文字を隠す' : '頭文字を表示'}
        </button>

        <button className="btn btn-outline" onClick={onHintOneLetter}>
          <Lightbulb size={16} color="#f59e0b" /> 1文字ヒント
        </button>

        <button
          className={`btn ${isCompleted ? 'btn-outline-purple audio-unlocked-btn' : 'btn-outline-locked'}`}
          onClick={handleAudioButtonClick}
          title={isCompleted ? '全問クリア達成！音声練習を開始' : '全問クリアするとアンロックされます'}
        >
          {isCompleted ? <Volume2 size={16} /> : <Lock size={16} />}
          {isCompleted ? '🎧 例文の音声＆録音練習 (解放中)' : '🔒 音声＆録音練習 (クリアで解放)'}
        </button>

        <button className="btn btn-outline" onClick={onToggleShowAnswers}>
          {showAnswers ? <EyeOff size={16} /> : <Eye size={16} />}
          {showAnswers ? '解答を隠す' : '解答をすべて表示'}
        </button>

        <button className="btn btn-outline-danger" onClick={onResetUserInputs}>
          <RotateCcw size={16} /> 入力をクリア
        </button>
      </div>
    </div>
  );
};
