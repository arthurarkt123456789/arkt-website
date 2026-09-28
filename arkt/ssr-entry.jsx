import { renderToString } from 'react-dom/server';
import App from './app.jsx';
import { LEGAL_PAGES } from './legal.jsx';

export function render(path = "/") {
  return renderToString(<App path={path} />);
}

export const legalRoutes = Object.entries(LEGAL_PAGES).map(([path, p]) => ({ path, title: p.title }));
