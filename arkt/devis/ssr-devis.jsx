import React from 'react';
import { renderToString } from 'react-dom/server';
import DevisPage from './DevisPage.jsx';

export function renderDevis(devis) {
  return renderToString(<DevisPage devis={devis} />);
}
