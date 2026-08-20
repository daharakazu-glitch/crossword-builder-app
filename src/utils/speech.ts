/**
 * Web Speech API を利用した英語音声読み上げ・音声認識ユーティリティ
 */

// 高品質なネイティブ英語ボイスを取得する関数
function getBestEnglishVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;

  // 優先度最高: Google US English, Natural, Samantha, Karen, Daniel, Alex などのネイティブボイス
  const preferredVoiceNames = [
    'Google US English',
    'Google UK English Female',
    'Google UK English Male',
    'Samantha',
    'Karen',
    'Daniel',
    'Alex',
    'Fiona',
    'Victoria',
    'Natural',
  ];

  for (const name of preferredVoiceNames) {
    const found = voices.find((v) => v.name.includes(name));
    if (found) return found;
  }

  // 英語(en)かつLocal/Naturalな音声
  const englishVoice = voices.find(
    (v) => v.lang.startsWith('en') && !v.name.includes('Compact')
  );

  return englishVoice || voices.find((v) => v.lang.startsWith('en')) || null;
}

export function speakText(text: string, rate: number = 1.0, onEnd?: () => void): void {
  if (!('speechSynthesis' in window)) {
    alert('お使いのブラウザは音声読み上げ機能に対応していません。');
    return;
  }

  window.speechSynthesis.cancel();

  const playUtterance = () => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = rate * 0.92; // 少し落ち着いた聞き取りやすいスピード
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const voice = getBestEnglishVoice();
    if (voice) {
      utterance.voice = voice;
    }

    if (onEnd) {
      utterance.onend = onEnd;
    }

    window.speechSynthesis.speak(utterance);
  };

  // ボイス非同期ロード時の初期化対応
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.onvoiceschanged = () => {
      window.speechSynthesis.onvoiceschanged = null;
      playUtterance();
    };
  } else {
    playUtterance();
  }
}

export function stopSpeaking(): void {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

/**
 * Speech Recognition (音声認識)
 */
export function createSpeechRecognizer(
  onResult: (recognizedText: string) => void,
  onError?: (err: any) => void
): { start: () => void; stop: () => void } | null {
  const SpeechRecognition =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event: any) => {
    const transcript = event.results[0][0].transcript;
    onResult(transcript);
  };

  if (onError) {
    recognition.onerror = onError;
  }

  return {
    start: () => recognition.start(),
    stop: () => recognition.stop(),
  };
}

export interface EvaluationResult {
  score: number;
  message: string;
  badge: string;
}

/**
 * 生徒のモチベーションを高める発音評価アルゴリズム
 */
export function calculateSimilarity(
  original: string,
  recognized: string,
  targetWord?: string
): EvaluationResult {
  const cleanOrig = original.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const cleanRec = recognized.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (!cleanRec) {
    return {
      score: 0,
      message: '声が認識されませんでした。もう一度大きめの声で試してみましょう！',
      badge: 'TRY AGAIN',
    };
  }

  const origWords = cleanOrig.split(/\s+/);
  const recWords = cleanRec.split(/\s+/);

  let matches = 0;
  origWords.forEach((word) => {
    if (recWords.includes(word)) {
      matches++;
    }
  });

  const rawRatio = matches / origWords.length;

  // モチベーション重視スコアリング: 声を出して発言した時点で 78点 スタート
  let score = 78 + Math.round(rawRatio * 16);

  // ターゲット単語が含まれている場合は加点ボーナス
  if (targetWord && cleanRec.includes(targetWord.toLowerCase())) {
    score += 4;
  }

  // 高い一致度の場合は 90点台後半を付与
  if (rawRatio >= 0.75) {
    score = Math.max(score, 94);
  }

  score = Math.min(98, Math.max(78, score));

  let message = '👍 Good Effort! 自信を持ってこの調子で練習しましょう！';
  let badge = 'GOOD';

  if (score >= 90) {
    message = '🌟 Excellent! ネイティブのような素晴らしい発音です！';
    badge = 'EXCELLENT';
  } else if (score >= 82) {
    message = '🎉 Great Job! とてもクリアで聞き取りやすい英語です！';
    badge = 'GREAT';
  }

  return { score, message, badge };
}
