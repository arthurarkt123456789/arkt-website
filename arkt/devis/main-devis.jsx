import '../fonts.css';
import '../styles.css';
import '../components.css';
import '../components2.css';
import './devis.css';
import React from 'react';
import { hydrateRoot } from 'react-dom/client';
import DevisPage from './DevisPage.jsx';

document.documentElement.classList.add('js');

const data = window.__DEVIS__;
const root = document.getElementById('root');

if (data) {
  hydrateRoot(root, <DevisPage devis={data} />);
} else {
  root.innerHTML = '<p style="padding:48px 24px;font-family:Inter,sans-serif">Proposition introuvable.</p>';
}
