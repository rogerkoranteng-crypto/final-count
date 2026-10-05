import { useEffect, useRef, useState, useCallback } from 'react';
import { Icon, Toast } from './ui.jsx';
import Count from './Count.jsx';
import { Records, Evidence, Cases } from './Pages.jsx';
import { get, upload } from './util.js';

const useRoute = () => {
  const [h, setH] = useState(() => location.hash.slice(1) || '/');
  useEffect(() => { const f = () => { setH(location.hash.slice(1) || '/'); window.scrollTo(0, 0); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return h;
};

export default function App() {
  const route = useRoute();
  const [scenes, setScenes] = useState(null);
  const [error, setError] = useState('');
  const [mine, setMine] = useState(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [toastMsg, setToast] = useState('');
  const fileRef = useRef(null);
  const toast = useCallback((m) => { setToast(m || ''); if (m) setTimeout(() => setToast(''), 3800); }, []);

  useEffect(() => { get('/api/scenes').then(setScenes).catch((e) => setError(e.message)); }, []);
  useEffect(() => { setOpen(false); setToast(''); }, [route]);

  async function onFile(e) {
    const f = e.target.files?.[0]; e.target.value = '';
    if (!f) return;
    setBusy(true); location.hash = '/';
    try { const s = await upload('/api/read', f); setMine(s); toast('Photo read. Enter the team count, then reconcile.'); }
    catch (err) { toast(err.message); }
    finally { setBusy(false); }
  }

  const seg = route.split('/').filter(Boolean)[0];
  const cur = (s) => (seg === s || (!seg && s === 'count') ? 'page' : undefined);
  let page;
  if (!seg) page = <Count scenes={scenes} mine={mine} error={error} toast={toast} busy={busy} />;
  else if (seg === 'records') page = <Records />;
  else if (seg === 'evidence') page = <Evidence />;
  else if (seg === 'cases') page = <Cases />;
  else page = <div className="wrap"><div className="empty"><p style={{ fontWeight: 600 }}>That page does not exist.</p><a className="btn primary" href="#/">Back to the count</a></div></div>;

  return (
    <div className="shell">
      <a className="skip" href="#main" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus(); }}>Skip to content</a>
      <aside className={`side ${open ? 'open' : ''}`} aria-label="Sidebar">
        <a className="brand" href="#/"><svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="var(--brand)" /><path d="M9 8v14M14 8v14M19 8v14M24 8v14M6 20L27 10" stroke="var(--brand-ink)" strokeWidth="2.4" strokeLinecap="round" fill="none" /></svg>Final Count</a>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="visually-hidden" onChange={onFile} aria-label="Choose a table photo" tabIndex={-1} />
        <button className="btn primary block" onClick={() => fileRef.current?.click()} disabled={busy}>{busy ? <span className="spin" /> : <Icon n="upload" size={18} />} Count a photo</button>
        <nav aria-label="Main"><ul className="nav">
          <li><a href="#/" aria-current={cur('count')}><Icon n="count" /> Count</a></li>
          <li><a href="#/records" aria-current={cur('records')}><Icon n="log" /> Count records</a></li>
          <li><a href="#/evidence" aria-current={cur('evidence')}><Icon n="book" /> Evidence</a></li>
          <li><a href="#/cases" aria-current={cur('cases')}><Icon n="doc" /> Court cases</a></li>
        </ul></nav>
      </aside>
      <div className={`drawer-back ${open ? 'open' : ''}`} onClick={() => setOpen(false)} aria-hidden="true" />
      <div>
        <header className="topbar mobile-bar">
          <button className="icon-btn menu-btn" onClick={() => setOpen(!open)} aria-label="Open menu" aria-expanded={open}><Icon n="menu" /></button>
          <span className="brand-sm">Final Count</span>
        </header>
        <main id="main" tabIndex={-1} className="main">{page}<p className="foot">Final Count is a second witness to the count, not a replacement for it and not a medical device.</p></main>
      </div>
      <Toast msg={toastMsg} />
    </div>
  );
}
