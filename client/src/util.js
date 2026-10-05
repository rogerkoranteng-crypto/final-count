const j = async (r) => {
  let body = null;
  try { body = await r.json(); } catch { /* not JSON */ }
  if (!r.ok) { const e = new Error(body?.detail || `Request failed (${r.status})`); e.status = r.status; throw e; }
  return body;
};
export const get = (p) => fetch(p).then(j);
export const post = (p, b) => fetch(p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }).then(j);
export const upload = (p, file) => { const f = new FormData(); f.append('file', file); return fetch(p, { method: 'POST', body: f }).then(j); };
export const when = (s) => new Date(s).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
export const CLASSES = [
  { key: 'sponges', label: 'Sponges' },
  { key: 'needles', label: 'Needles' },
  { key: 'instruments', label: 'Instruments' },
];
export const STATUS = {
  hold: { tone: 'risk', word: 'Hold' },
  cannot_vouch: { tone: 'warn', word: 'Camera cannot vouch' },
  reconciled: { tone: 'ok', word: 'Reconciled' },
};
export const STATE_WORD = { match: 'Matches', short: 'Camera sees fewer', over: 'Camera sees more', unverified: 'Matches, not verifiable' };
