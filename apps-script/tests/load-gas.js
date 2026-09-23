/** Loads the real Apps Script sources into a Node VM with mocked Google services. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createEnv } = require('./gas-mock');

const SRC = path.join(__dirname, '..', 'src');
const EXPORTS = ['handleRequest', 'runSetup', 'dailyMaintenance', 'onSheetEdit', 'deleteSampleData', 'Db', 'todayKey', 'addDays', 'toDateKey',
  'toDateTimeKey', 'getEventLifecycleStatus', 'getRegistrationState', 'parseAgeGroup', 'sanitizeCell', 'clearCache', 'processMembershipExpiry',
  'pbkdf2Hex', 'generateID', 'formatInTz'];

function loadGas(opts) {
  const env = createEnv(opts);
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.gs'))
    .sort((a, b) => (a === 'Config.gs' ? -1 : b === 'Config.gs' ? 1 : a.localeCompare(b)));
  const source = files.map((f) => fs.readFileSync(path.join(SRC, f), 'utf8')).join('\n;\n') +
    '\n;globalThis.G = { ' + EXPORTS.join(', ') + ' };';
  vm.createContext(env.ctx);
  vm.runInContext(source, env.ctx, { filename: 'apps-script.js' });
  return { G: env.ctx.G, env };
}

module.exports = { loadGas };
