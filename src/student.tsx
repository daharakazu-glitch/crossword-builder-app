import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StudentPlayView } from './components/StudentPlayView';
import { decodeSharedPuzzle } from './utils/shareUtils';
import './index.css';
import './App.css';

function getPuzzleData() {
  try {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p') || params.get('play') || params.get('puzzle');
    if (p) {
      return decodeSharedPuzzle(p);
    }
    const hash = window.location.hash;
    if (hash.includes('play=')) {
      const parts = hash.split('play=');
      const encoded = parts[1]?.split('&')[0];
      if (encoded) return decodeSharedPuzzle(encoded);
    }
    if (hash.includes('p=')) {
      const parts = hash.split('p=');
      const encoded = parts[1]?.split('&')[0];
      if (encoded) return decodeSharedPuzzle(encoded);
    }
  } catch (e) {
    console.error('Failed to parse puzzle in student view:', e);
  }
  return null;
}

const puzzleData = getPuzzleData();
const rootElement = document.getElementById('root');

if (rootElement) {
  if (puzzleData) {
    createRoot(rootElement).render(
      <StrictMode>
        <StudentPlayView
          initialGrid={puzzleData.grid}
          title={puzzleData.title}
          subtitle={puzzleData.subtitle}
          hintStyle={puzzleData.hintStyle}
          theme={puzzleData.theme || 'classic'}
          initialShowFirstLetters={puzzleData.showFirstLetters || false}
          onExitToTeacherMode={() => {
            window.location.href = './index.html';
          }}
        />
      </StrictMode>
    );
  } else {
    createRoot(rootElement).render(
      <StrictMode>
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0f172a',
          color: '#f8fafc',
          padding: '24px',
          fontFamily: 'sans-serif',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🧩</div>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
            生徒用オンラインクロスワード
          </h1>
          <p style={{ color: '#94a3b8', maxWidth: '520px', lineHeight: 1.6, marginBottom: '24px' }}>
            現在パズルデータが指定されていません。<br />
            先生から案内されたURLをもう一度開くか、先生用エディタからパズルを開いてください。
          </p>
          <a
            href="./index.html"
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '10px 20px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: '15px'
            }}
          >
            ← 先生用エディタ（Crossword Builder）を開く
          </a>
        </div>
      </StrictMode>
    );
  }
}

