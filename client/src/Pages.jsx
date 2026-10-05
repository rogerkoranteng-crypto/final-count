import { useEffect, useState } from 'react';
import { Badge, Icon } from './ui.jsx';
import { get, when, STATUS } from './util.js';

export function Records() {
  const [rows, setRows] = useState(null);
  useEffect(() => { get('/api/records').then(setRows).catch(() => setRows([])); }, []);
  return (
    <div className="wrap">
      <h1 className="page-title">Count records</h1>
      {rows && rows.length === 0 && <div className="empty"><p style={{ fontWeight: 600 }}>No counts logged yet.</p><a className="btn primary" href="#/">Go to the count</a></div>}
      {rows && rows.length > 0 && (
        <div className="tbl-wrap"><table>
          <thead><tr><th>Logged</th><th>Count point</th><th>Table</th><th>Result</th><th className="r">Sponges</th><th className="r">Needles</th><th className="r">Instruments</th><th>Resolution</th></tr></thead>
          <tbody>{rows.map((r) => {
            const l = (k) => r.lines.find((x) => x.item.toLowerCase() === k);
            const cell = (k) => { const x = l(k); return x ? `${x.camera} / ${x.declared}` : ''; };
            return (<tr key={r.id}><td className="num">{when(r.at)}</td><td>{r.point}</td><td>{r.title}</td><td><Badge tone={STATUS[r.status]?.tone}>{STATUS[r.status]?.word}</Badge></td>
              <td className="r num">{cell('sponges')}</td><td className="r num">{cell('needles')}</td><td className="r num">{cell('instruments')}</td><td>{r.resolution}{r.note ? `: ${r.note}` : ''}</td></tr>);
          })}</tbody>
        </table></div>
      )}
      {rows && rows.length > 0 && <p className="src">Counts read as camera / declared.</p>}
    </div>
  );
}

export function Evidence() {
  const [d, setD] = useState(null);
  useEffect(() => { get('/api/evidence').then(setD).catch(() => {}); }, []);
  if (!d) return <div className="wrap"><div className="skeleton" style={{ height: 300 }} /></div>;
  return (
    <div className="wrap">
      <h1 className="page-title">Why the count needs a second witness</h1>
      <div className="facts">
        {d.evidence.map((f) => (
          <div key={f.n} className={`fact ${f.tone}`}>
            <div className="n">{f.n}</div>
            <p style={{ marginTop: 'var(--s2)' }}>{f.text}</p>
            <p className="src">{f.src}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function Cases() {
  const [d, setD] = useState(null);
  useEffect(() => { get('/api/evidence').then(setD).catch(() => {}); }, []);
  if (!d) return <div className="wrap"><div className="skeleton" style={{ height: 300 }} /></div>;
  return (
    <div className="wrap">
      <h1 className="page-title">Retained-sponge cases</h1>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Case</th><th>Court</th><th>What the opinion records</th></tr></thead>
        <tbody>{d.cases.map((c) => (
          <tr key={c.name}><td style={{ minWidth: 200 }}><a href={c.url} target="_blank" rel="noreferrer"><b>{c.name}</b></a><div className="xs muted num">{c.cite}</div></td><td style={{ minWidth: 170 }}>{c.court}</td><td>{c.outcome}</td></tr>
        ))}</tbody>
      </table></div>
      <p className="src"><Icon n="link" size={12} /> Full opinions on CourtListener.</p>
    </div>
  );
}
