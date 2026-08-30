import React, { useState, useRef } from 'react';
import { X, Volume2, Mic, Square, Play, Sparkles, Award, VolumeX } from 'lucide-react';
import type { PlacedWord } from '../types/crossword';
import { speakText, stopSpeaking, createSpeechRecognizer, calculateSimilarity } from '../utils/speech';
import { getCompleteSentence } from '../utils/sentenceUtils';

interface AudioPracticeModalProps {
  placedWords: PlacedWord[];
  onClose: () => void;
}

export const AudioPracticeModal: React.FC<AudioPracticeModalProps> = ({
  placedWords,
  onClose,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  // 録音状態管理
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [recognitionResults, setRecognitionResults] = useState<
    Record<string, { transcript: string; evalResult: { score: number; message: string; badge: string } }>
  >({});

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // 音声読み上げ
  const handlePlayAudio = (id: string, text: string) => {
    if (playingId === id) {
      stopSpeaking();
      setPlayingId(null);
      return;
    }

    setPlayingId(id);
    speakText(text, playbackRate, () => {
      setPlayingId(null);
    });
  };

  // 録音開始
  const handleStartRecording = async (item: PlacedWord, text: string) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrls((prev) => ({ ...prev, [item.id]: url }));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setRecordingId(item.id);

      // 同時に音声認識
      const recognizer = createSpeechRecognizer((recognizedText) => {
        const evalResult = calculateSimilarity(text, recognizedText, item.word);
        setRecognitionResults((prev) => ({
          ...prev,
          [item.id]: { transcript: recognizedText, evalResult },
        }));
      });

      if (recognizer) {
        recognizer.start();
      }
    } catch (err) {
      console.error(err);
      alert('マイクへのアクセスが拒否されたか、マイクが見つかりませんでした。');
    }
  };

  // 録音停止
  const handleStopRecording = () => {
    if (mediaRecorderRef.current && recordingId) {
      mediaRecorderRef.current.stop();
      setRecordingId(null);
    }
  };

  // 自分の声を再生
  const handlePlayRecordedVoice = (url: string) => {
    const audio = new Audio(url);
    audio.play();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content audio-practice-modal">
        <div className="modal-header">
          <h2>
            <Award className="gold-icon" size={24} /> 全問クリア！英語例文の音声リスニング＆録音練習
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="practice-banner">
            <Sparkles size={20} className="sparkle-icon" />
            <span>
              パズル完成おめでとうございます！使用された単語の例文をネイティブ音声で聴き、自分の声で発音録音練習してみましょう。
            </span>
          </div>

          <div className="speed-control-bar">
            <span>🔊 読み上げスピード:</span>
            <button
              className={`btn btn-sm ${playbackRate === 0.8 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPlaybackRate(0.8)}
            >
              0.8x (ゆっくり)
            </button>
            <button
              className={`btn btn-sm ${playbackRate === 1.0 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPlaybackRate(1.0)}
            >
              1.0x (標準)
            </button>
            <button
              className={`btn btn-sm ${playbackRate === 1.2 ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setPlaybackRate(1.2)}
            >
              1.2x (速め)
            </button>
          </div>

          <div className="practice-list">
            {placedWords.map((item) => {
              const fullText = getCompleteSentence(item.sentence, item.word);

              const isPlaying = playingId === item.id;
              const isRecording = recordingId === item.id;
              const recordedUrl = audioUrls[item.id];
              const scoreInfo = recognitionResults[item.id];

              return (
                <div key={item.id} className="practice-card">
                  <div className="practice-card-main">
                    <div className="practice-word-badge">{item.word}</div>
                    <div className="practice-text-group">
                      <p className="sentence-en">{fullText}</p>
                      <p className="sentence-ja">{item.japanese}</p>
                    </div>
                  </div>

                  <div className="practice-actions">
                    {/* 1. 音声聴くボタン */}
                    <button
                      className={`btn btn-sm ${isPlaying ? 'btn-outline-purple' : 'btn-secondary'}`}
                      onClick={() => handlePlayAudio(item.id, fullText)}
                    >
                      {isPlaying ? <VolumeX size={16} /> : <Volume2 size={16} />}
                      {isPlaying ? '停止' : '音声を聴く'}
                    </button>

                    {/* 2. マイク録音ボタン */}
                    {isRecording ? (
                      <button className="btn btn-sm btn-danger-outline recording-pulse" onClick={handleStopRecording}>
                        <Square size={16} /> 録音停止
                      </button>
                    ) : (
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => handleStartRecording(item, fullText)}
                      >
                        <Mic size={16} /> 発音録音
                      </button>
                    )}

                    {/* 3. 録音再生ボタン */}
                    {recordedUrl && (
                      <button
                        className="btn btn-sm btn-pdf-primary"
                        onClick={() => handlePlayRecordedVoice(recordedUrl)}
                      >
                        <Play size={16} /> 自分の声を聴く
                      </button>
                    )}
                  </div>

                  {/* 4. スコアフィードバック */}
                  {scoreInfo && (
                    <div className="score-feedback">
                      <span className="score-badge">
                        ⭐ {scoreInfo.evalResult.score}点 [{scoreInfo.evalResult.badge}]
                      </span>
                      <span className="score-message">{scoreInfo.evalResult.message}</span>
                      <span className="recognized-transcript">
                        (認識結果: "{scoreInfo.transcript}")
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
