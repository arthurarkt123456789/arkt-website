import './styles.css';
import './components.css';
import './components2.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { hydrateRoot } from 'react-dom/client';
import App from './app.jsx';

const root = document.getElementById('root');
if (import.meta.env.PROD && root.innerHTML.trim()) {
  hydrateRoot(root, <App />);
} else {
  createRoot(root).render(<App />);
}
