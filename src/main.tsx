import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const rootEl = document.getElementById('store-root');
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
