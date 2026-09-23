/**
 * Combines apps-script/src/*.gs into ONE file (apps-script/dist/Code.gs) so the
 * backend can be pasted into the Apps Script editor in a single step.
 *   npm run bundle:gas
 */
'use strict';
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'apps-script', 'src');
const outDir = path.join(__dirname, '..', 'apps-script', 'dist');
const files = fs.readdirSync(src).filter((f) => f.endsWith('.gs'))
  .sort((a, b) => (a === 'Config.gs' ? -1 : b === 'Config.gs' ? 1 : a.localeCompare(b)));

const header = `/**
 * Skating Association Platform — Google Apps Script backend (single-file bundle).
 * Generated from apps-script/src by \`npm run bundle:gas\`. Do not edit here; edit the source files.
 *
 * Paste this whole file into Code.gs in your Apps Script project, and paste
 * appsscript.json (in this folder) into the project manifest. Then follow docs/SETUP.md.
 */
`;
const body = files.map((f) => `\n// ===================================================================\n// ${f}\n// ===================================================================\n\n` +
  fs.readFileSync(path.join(src, f), 'utf8')).join('\n');

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'Code.gs'), header + body);
fs.copyFileSync(path.join(src, 'appsscript.json'), path.join(outDir, 'appsscript.json'));
console.log(`Bundled ${files.length} files → apps-script/dist/Code.gs`);
