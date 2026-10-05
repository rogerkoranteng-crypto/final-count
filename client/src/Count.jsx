import { useEffect, useMemo, useState } from 'react';
import { Badge, Icon, Modal } from './ui.jsx';
import { CLASSES, STATUS, STATE_WORD, post } from './util.js';

const RESOLUTIONS = ['Item found', 'X-ray ordered', 'Accounted for elsewhere', 'Recounted, matches'];

function Stepper({ id, label, value, onChange }) {
  return (
    <div className="stepper" role="group" aria-label={`Declared ${label.toLowerCase()}`}>
      <button type="button" className="btn sm" onClick={() => onChange(Math.max(0, value - 1))} aria-label={`One fewer ${label.toLowerCase()}`} disabled={value <= 0}>&minus;</button>
      <output id={id} className="num stepper-v">{value}</output>
      <button type="button" className="btn sm" onClick={() => onChange(Math.min(200, value + 1))} aria-label={`One more ${label.toLowerCase()}`}>+</button>
    </div>
  );
}

export default function Count({ scenes, mine, error, toast, busy }) {
  const all = useMemo(() => (scenes ? [...scenes, ...(mine ? [mine] : [])] : []), [scenes, mine]);
  const [id, setId] = useState('backtable');
  const [edits, setEdits] = useState({});       // scene id -> declared
  const [results, setResults] = useState({});   // scene id -> reconcile result
  const [signed, setSigned] = useState({});     // scene id -> record
  const [running, setRunning] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [playing, setPlaying] = useState(false);

  useEffect(() => { if (mine) setId(mine.id); }, [mine]);
  useEffect(() => { setPlaying(false); }, [id]);
  if (error) return <div className="wrap"><div className="callout risk"><div><b>The count service is not reachable.</b><p className="small">{error}</p></div></div></div>;
  if (!scenes) return <div className="wrap"><div className="skeleton" style={{ height: 420 }} /></div>;

  const scene = all.find((s) => s.id === id) || all[0];
  const declared = edits[scene.id] || scene.declared;
  const result = results[scene.id] !== undefined ? results[scene.id] : scene.result;
  const dirty = !result || CLASSES.some((c) => declared[c.key] !== (result.lines?.find((l) => l.item.toLowerCase() === c.key)?.declared));
  const done = signed[scene.id];
  const st = result ? STATUS[result.status] : null;
  const setD = (k, v) => setEdits((e) => ({ ...e, [scene.id]: { ...declared, [k]: v } }));

  async function reconcile() {
    setRunning(true);
    try { const r = await post('/api/reconcile', { scene: scene.id, declared }); setResults((x) => ({ ...x, [scene.id]: r })); setSigned((x) => ({ ...x, [scene.id]: undefined })); }
    catch (e) { toast(e.message); }
    finally { setRunning(false); }
  }

  async function log(resolution, note) {
    try {
      const rec = await post('/api/records', { scene: scene.id, title: scene.title, point: scene.point, status: result.status, headline: result.headline, lines: result.lines, resolution, note });
      setSigned((x) => ({ ...x, [scene.id]: rec })); setResolving(false); toast('Count logged. Sign Out is open.');
    } catch (e) { toast(e.message); }
  }

  const lineFor = (k) => result?.lines?.find((l) => l.item.toLowerCase() === k);
  const clean = result?.status === 'reconciled';

  return (
    <div className="wrap">
      <h1 className="page-title">{scene.point}</h1>

      <div className="scenes" role="tablist" aria-label="Tables">
        {all.map((s) => (
          <button key={s.id} role="tab" aria-selected={s.id === scene.id} className="scene-tab" onClick={() => setId(s.id)}>
            <img src={s.image} alt="" loading="lazy" />
            <span><b>{s.title}</b><small>{s.point}</small></span>
          </button>
        ))}
      </div>

      <section className="compare" aria-labelledby="cnt-title">
        <div className="compare-head">
          <div>
            <div className="eyebrow">{scene.title}</div>
            <h2 id="cnt-title">{result ? result.headline : 'Enter the team count'}</h2>
          </div>
          {st && <Badge tone={st.tone}>{st.word}</Badge>}
        </div>

        <div className="count-grid">
          <figure className="media">
            {scene.video && playing
              ? <video src={scene.video} poster={scene.image} controls autoPlay muted playsInline loop onEnded={() => setPlaying(false)} />
              : <img src={scene.image} alt={`${scene.title}, as seen by the camera`} />}
            {scene.video && !playing && <button className="btn sm play" onClick={() => setPlaying(true)}><Icon n="play" size={16} /> Play clip</button>}
            {scene.credit && <figcaption className="xs muted">{scene.credit}</figcaption>}
          </figure>

          <div className="verdict">
            {result ? (
              <div className={`callout ${st.tone}`} role="status">
                <Icon n={result.status === 'reconciled' ? 'check' : 'alert'} size={20} />
                <div><p style={{ fontWeight: 600 }}>{result.reason}</p><p className="small">{result.action}</p></div>
              </div>
            ) : (
              <div className="callout"><Icon n="info" size={20} /><div><p style={{ marginBottom: 0 }}>Set the team count, then reconcile.</p></div></div>
            )}
            <div className="signout">
              <div><div className="eyebrow">Sign Out</div><b>Completion of instrument, sponge and needle counts</b></div>
              {done ? <Badge tone="ok">Open: {done.resolution}</Badge> : <Badge tone="neutral" icon="lock">Locked</Badge>}
            </div>
            <div className="row">
              <button className="btn primary" title={!dirty ? 'No change to reconcile' : undefined} onClick={reconcile} disabled={running || busy || !dirty}>{running ? <span className="spin" /> : null} Reconcile</button>
              <button className="btn" onClick={() => (clean ? log('Reconciled, no discrepancy', '') : setResolving(true))} disabled={!result || dirty || !!done}>{clean ? 'Open Sign Out' : 'Resolve count'}</button>
              {result && !dirty && !done && <span className="xs muted">No change to reconcile</span>}
            </div>
          </div>
        </div>

        <div className="tally">
          {CLASSES.map((c) => {
            const ln = lineFor(c.key); const bad = ln && (ln.state === 'short' || ln.state === 'over');
            const tone = !ln || dirty ? '' : bad ? 'risk' : ln.state === 'unverified' ? 'warn' : 'ok';
            return (
              <div key={c.key} className={`tally-card ${dirty ? '' : tone}`}>
                <div className="eyebrow">{c.label}</div>
                <div className="tally-n num" aria-label={`Camera counts ${scene.seen[c.key]} ${c.label.toLowerCase()}`}>{scene.seen[c.key]}</div>
                <div className="xs muted">on the table</div>
                <div className="tally-decl">
                  <span className="small">Declared</span>
                  <Stepper id={`d-${c.key}`} label={c.label} value={declared[c.key]} onChange={(v) => setD(c.key, v)} />
                </div>
                {ln && !dirty ? <Badge tone={tone}>{STATE_WORD[ln.state]}</Badge> : <span className="xs muted">Not reconciled</span>}
              </div>
            );
          })}
        </div>

        <div className="compare-note">
          <p className="small" style={{ margin: 0 }}>Declared is the count the team entered at this point.</p>
          {scene.seen.hidden_or_stacked && <p className="small" style={{ margin: 'var(--s2) 0 0' }}><b>Not countable: </b>{scene.seen.hidden_or_stacked}</p>}
        </div>
      </section>

      {resolving && <ResolveDialog onClose={() => setResolving(false)} onLog={log} headline={result.headline} />}
    </div>
  );
}

function ResolveDialog({ onClose, onLog, headline }) {
  const [res, setRes] = useState(RESOLUTIONS[0]);
  const [note, setNote] = useState('');
  return (
    <Modal title="Resolve the count" onClose={onClose}>
      <p className="muted small">{headline}. Sign Out stays locked until a person records how it was resolved.</p>
      <fieldset className="hosp-pick" style={{ marginBottom: 'var(--s4)' }}>
        <legend>Resolution</legend>
        {RESOLUTIONS.map((r) => (<label key={r} className="radio-chip"><input type="radio" name="res" checked={res === r} onChange={() => setRes(r)} /><span>{r}</span></label>))}
      </fieldset>
      <div className="field"><label htmlFor="note">Note</label><input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} placeholder="Who checked, and where" /></div>
      <div className="row" style={{ marginTop: 'var(--s5)', justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onClose}>Cancel</button>
        <button className="btn primary" onClick={() => onLog(res, note)}>Log count</button>
      </div>
    </Modal>
  );
}
