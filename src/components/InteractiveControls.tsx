import React from 'react';
import { CheckCircle, Eye, EyeOff, RotateCcw, Lightbulb, Volume2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface InteractiveControlsProps {
  showAnswers: boolean;
  onToggleShowAnswers: () => void;
  onCheckAnswers: () => boolean;
  onHintOneLetter: () => void;
  onResetUserInputs: () => void;
  onOpenAudioPractice: () => void;
}

export const InteractiveControls: React.FC<InteractiveControlsProps> = ({
  showAnswers,
  onToggleShowAnswers,
  onCheckAnswers,
  onHintOneLetter,
  onResetUserInputs,
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
      if (window.confirm('🎉 おめでとうございます！全問大正解です！\n英語例文の音声リスニング＆発音録音練習を開始しますか？')) {
        onOpenAudioPractice();
      }
    }
  };

  return (
    <div className="interactive-controls">
      <div className="control-group">
        <button className="btn btn-outline" onClick={handleCheck}>
          <CheckCircle size={16} color="#10b981" /> 正誤チェック
        </button>

        <button className="btn btn-outline" onClick={onHintOneLetter}>
          <Lightbulb size={16} color="#f59e0b" /> 1文字ヒント
        </button>

        <button className="btn btn-outline-purple" onClick={onOpenAudioPractice}>
          <Volume2 size={16} /> 🎧 例文の音声＆録音練習
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
