import { renderToString } from 'react-dom/server';
import App from './app.jsx';

export function render() {
  return renderToString(<App />);
}
