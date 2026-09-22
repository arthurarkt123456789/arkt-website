import { cpSync, mkdirSync } from 'fs';

mkdirSync('dist/arkt', { recursive: true });
cpSync('arkt/images', 'dist/arkt/images', { recursive: true });
cpSync('arkt/videos', 'dist/arkt/videos', { recursive: true });
cpSync('arkt/logo-arkt.png', 'dist/arkt/logo-arkt.png');
cpSync('arkt/logo-mark.png', 'dist/arkt/logo-mark.png');

console.log('✓ Assets copiés vers dist/arkt/');
