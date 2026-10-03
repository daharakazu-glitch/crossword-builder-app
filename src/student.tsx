import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { StudentPlayView } from './components/StudentPlayView';
import { LEAP_PART3_WEEK1_PACKAGE } from './data/leapPart3Preset';
import './index.css';
import './App.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <StudentPlayView
        initialGrid={LEAP_PART3_WEEK1_PACKAGE.grid}
        title={LEAP_PART3_WEEK1_PACKAGE.title}
        subtitle={LEAP_PART3_WEEK1_PACKAGE.subtitle}
        hintStyle={LEAP_PART3_WEEK1_PACKAGE.hintStyle}
        theme="classic"
        initialShowFirstLetters={false}
        onExitToTeacherMode={() => {
          window.location.href = './index.html';
        }}
      />
    </StrictMode>
  );
}
