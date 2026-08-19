/**
 * Web Speech API を利用した英語音声読み上げ・音声認識ユーティリティ
 */

export function speakText(text: string, rate: number = 1.0, onEnd?: () => void): void {
  if (!('speechSynthesis' in window)) {
    alert('お使いのブラウザは音声読み上げ機能に対応していません。');
    return;
  }

  window.speechSynthesis.cancel(); // 既存の読み上げをクリア

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = rate; // 0.8 ~ 1.2

  // 英語の音声ボイスを選択（可能であれば）
  const voices = window.speechSynthesis.getVoices();
  const englishVoice = voices.find(
    (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Karen'))
  ) || voices.find((v) => v.lang.startsWith('en'));

  if (englishVoice) {
    utterance.voice = englishVoice;
  }

  if (onEnd) {
    utterance.onend = onEnd;
  }

  window.speechSynthesis.speak(utterance);
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

/**
 * レーベンシュタイン距離に基づく英文類似度計算 (0 - 100%)
 */
export function calculateSimilarity(original: string, recognized: string): number {
  const cleanOrig = original.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
  const cleanRec = recognized.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();

  if (!cleanOrig || !cleanRec) return 0;
  if (cleanOrig === cleanRec) return 100;

  const origWords = cleanOrig.split(/\s+/);
  const recWords = cleanRec.split(/\s+/);

  let matches = 0;
  origWords.forEach((word) => {
    if (recWords.includes(word)) {
      matches++;
    }
  });

  const score = Math.round((matches / origWords.length) * 100);
  return Math.min(100, Math.max(0, score));
}
