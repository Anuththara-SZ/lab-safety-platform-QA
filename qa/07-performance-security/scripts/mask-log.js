// stdin -> stdout. Used before a raw log is saved in qa/evidence:
// JWTs are cut to 20 characters, local paths become <repo> or <home>, computer name and LAN address are hidden.
const fs = require('fs');
const os = require('os');
const path = require('path');

const repo = path.resolve(__dirname, '..', '..', '..');
const home = os.homedir();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Matches C:\a\b, C:/a/b, C:\\a\\b (inside JSON), /c/a/b (Git Bash) and C:/a%20b (URL).
function anyPath(p) {
  const parts = p.split(path.sep);
  const drive = parts.shift().replace(':', '');
  const sep = '(?:\\\\\\\\|\\\\|/)';
  const rest = parts.map((x) => esc(x).replace(/ /g, '(?: |%20)')).join(sep);
  return new RegExp(`(?:${drive}:|/${drive})${sep}${rest}`, 'gi');
}

const lan = Object.values(os.networkInterfaces())
  .flat()
  .filter((i) => !i.internal)
  .map((i) => i.address.split('%')[0]);

let text = fs
  .readFileSync(0, 'utf8')
  .replace(/eyJ[A-Za-z0-9_-]{17}[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*(?:\.[A-Za-z0-9_-]*)?/g, (t) => `${t.slice(0, 20)}...`)
  .replace(anyPath(repo), '<repo>')
  .replace(anyPath(home), '<home>')
  .replace(/[A-Z]:(?:\\+|\/)Users(?:\\+|\/)[A-Z0-9]{1,6}~\d/gi, '<home>') // short 8.3 form of the path
  .replace(new RegExp(`\\b${esc(os.hostname())}\\b`, 'gi'), '<computer>');
for (const a of lan) text = text.split(a).join('<lan-ip>');
process.stdout.write(text);
