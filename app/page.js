'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

const TEST_CUSTOMERS = [
  { name: 'Aisha Khan', phone: '+919800000001' },
  { name: 'Rohan Mehta', phone: '+919800000002' },
  { name: 'Priya Nair', phone: '+919800000003' },
];
const SAMPLES = [
  "Hi, my order #4471 hasn't arrived yet. Can I change the delivery address?",
  'What is your return policy?',
  'Do you deliver to Dubai?',
  'Is cash on delivery available for a ₹3,500 order?',
  "I think I'm allergic to the serum I bought. What should I do?",
];

async function api(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = new Error(data.error || 'Request failed');
    e.status = res.status;
    throw e;
  }
  return data;
}
const when = (t) => new Date(t).toLocaleString();

const card = { background: '#fff', borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,.1)' };
const btn = { padding: '8px 14px', border: 0, borderRadius: 6, background: '#2f6b3a', color: '#fff', cursor: 'pointer', fontSize: 14 };
const input = { padding: 8, border: '1px solid #bbb', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' };

function Bubble({ m, mine }) {
  return (
    <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start', margin: '6px 0' }}>
      <div style={{ maxWidth: '75%', padding: '8px 12px', borderRadius: 12, background: mine ? '#dcf1dc' : '#eceff1', whiteSpace: 'pre-wrap' }}>
        <div>{m.text}</div>
        <div style={{ fontSize: 11, color: '#667', marginTop: 4 }}>{m.sender} · {when(m.created_at)}</div>
      </div>
    </div>
  );
}

/* ---------------- Customer view ---------------- */
function CustomerView() {
  const [pick, setPick] = useState('0');
  const [custom, setCustom] = useState({ name: '', phone: '' });
  const [text, setText] = useState('');
  const [msgs, setMsgs] = useState([]);
  const [err, setErr] = useState('');
  const [sending, setSending] = useState(false);
  const who = pick === 'custom' ? custom : TEST_CUSTOMERS[Number(pick)];

  const load = useCallback(async () => {
    if (!who.phone) return setMsgs([]);
    try {
      setMsgs((await api('/api/customer/messages?phone=' + encodeURIComponent(who.phone))).messages);
    } catch {}
  }, [who.phone]);

  useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  async function send() {
    setErr('');
    setSending(true);
    try {
      await api('/api/customer/send', { method: 'POST', body: JSON.stringify({ ...who, text }) });
      setText('');
      await load();
    } catch (e) {
      setErr(e.message);
    }
    setSending(false);
  }

  return (
    <div style={{ ...card, maxWidth: 640, margin: '0 auto' }}>
      <h3 style={{ marginTop: 0 }}>Customer view (test tool)</h3>
      <select value={pick} onChange={(e) => setPick(e.target.value)} style={input}>
        {TEST_CUSTOMERS.map((c, i) => <option key={i} value={i}>{c.name} ({c.phone})</option>)}
        <option value="custom">Other (type name + phone)…</option>
      </select>
      {pick === 'custom' && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input style={input} placeholder="Name" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} />
          <input style={input} placeholder="+919800000009" value={custom.phone} onChange={(e) => setCustom({ ...custom, phone: e.target.value })} />
        </div>
      )}
      <div style={{ minHeight: 200, maxHeight: 360, overflowY: 'auto', margin: '12px 0', padding: 8, background: '#fafafa', borderRadius: 8 }}>
        {msgs.length === 0 && <div style={{ color: '#888' }}>No messages yet.</div>}
        {msgs.map((m) => <Bubble key={m.id} m={m} mine={m.sender === 'customer'} />)}
      </div>
      <div style={{ marginBottom: 8 }}>
        {SAMPLES.map((s, i) => (
          <button key={i} onClick={() => setText(s)} style={{ ...input, margin: '0 6px 6px 0', background: '#fff', cursor: 'pointer', fontSize: 12 }}>Sample {i + 1}</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input style={{ ...input, flex: 1 }} placeholder="Type a message…" value={text} maxLength={2000}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && text.trim() && !sending && send()} />
        <button style={btn} disabled={sending || !text.trim()} onClick={send}>{sending ? 'Sending…' : 'Send'}</button>
      </div>
      {err && <div style={{ color: '#b00020', marginTop: 8 }}>{err}</div>}
    </div>
  );
}

/* ---------------- Agent view ---------------- */
function Login({ onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  async function go() {
    try {
      await api('/api/agent/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      onDone();
    } catch (e) {
      setErr(e.message);
    }
  }
  return (
    <div style={{ ...card, maxWidth: 340, margin: '40px auto', display: 'grid', gap: 10 }}>
      <h3 style={{ margin: 0 }}>Agent sign in</h3>
      <input style={input} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input style={input} type="password" placeholder="Password" value={password}
        onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} />
      <button style={btn} onClick={go}>Sign in</button>
      {err && <div style={{ color: '#b00020' }}>{err}</div>}
    </div>
  );
}

function AgentView() {
  const [authed, setAuthed] = useState(null);
  const [list, setList] = useState([]);
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const draftKey = useRef('');

  const loadList = useCallback(async () => {
    try {
      setList((await api('/api/agent/conversations')).conversations);
      setAuthed(true);
    } catch (e) {
      if (e.status === 401) setAuthed(false);
    }
  }, []);

  const loadDetail = useCallback(async (id) => {
    if (!id) return;
    try {
      const d = await api('/api/agent/conversations/' + id);
      setDetail(d);
      const key = d.draft ? d.draft.id + ':' + d.draft.status : 'none';
      if (key !== draftKey.current) { // only overwrite the box when the draft itself changed
        draftKey.current = key;
        setText(d.draft?.text || '');
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadList();
    const t = setInterval(() => { loadList(); loadDetail(sel); }, 4000);
    return () => clearInterval(t);
  }, [loadList, loadDetail, sel]);

  function open(id) {
    draftKey.current = '';
    setDetail(null);
    setSel(id);
    setErr('');
    loadDetail(id);
  }

  async function act(path) {
    setBusy(true);
    setErr('');
    try {
      await api(path, { method: 'POST', body: JSON.stringify({ text }) });
      draftKey.current = '';
      await Promise.all([loadList(), loadDetail(sel)]);
    } catch (e) {
      setErr(e.message);
      draftKey.current = '';
      await loadDetail(sel);
    }
    setBusy(false);
  }

  if (authed === null) return <div style={{ textAlign: 'center' }}>Loading…</div>;
  if (!authed) return <Login onDone={loadList} />;

  const d = detail?.draft;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, alignItems: 'start' }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <b>Conversations</b>
          <a href="#" onClick={async (e) => { e.preventDefault(); await api('/api/agent/login', { method: 'DELETE' }); setAuthed(false); }}>Sign out</a>
        </div>
        {list.length === 0 && <div style={{ color: '#888', marginTop: 8 }}>No conversations yet.</div>}
        {list.map((c) => (
          <div key={c.id} onClick={() => open(c.id)}
            style={{ padding: '10px 6px', borderBottom: '1px solid #eee', cursor: 'pointer', background: sel === c.id ? '#eaf4ea' : 'transparent' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <b>{c.name}</b>{c.awaiting_reply && <span title="Awaiting reply" style={{ color: '#d97706' }}>●</span>}
            </div>
            <div style={{ fontSize: 13, color: '#555', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.preview}</div>
            <div style={{ fontSize: 11, color: '#888' }}>{when(c.last_message_at)}</div>
          </div>
        ))}
      </div>

      <div style={card}>
        {!detail && <div style={{ color: '#888' }}>Select a conversation.</div>}
        {detail && (
          <>
            <h3 style={{ marginTop: 0 }}>{detail.customer.name} <span style={{ fontWeight: 400, color: '#666', fontSize: 14 }}>{detail.customer.phone}</span></h3>
            <div style={{ maxHeight: 320, overflowY: 'auto', background: '#fafafa', padding: 8, borderRadius: 8 }}>
              {detail.messages.map((m) => <Bubble key={m.id} m={m} mine={m.sender === 'agent'} />)}
            </div>

            <div style={{ marginTop: 14 }}>
              {!d && <div style={{ color: '#666' }}>No pending draft. Nothing to reply to right now.</div>}
              {d && (
                <>
                  <b>AI draft</b>{' '}
                  <span style={{ fontSize: 12, color: '#666' }}>
                    {d.status === 'pending' && '(generating…)'}
                    {d.status === 'failed' && '(draft unavailable – write a reply yourself or regenerate)'}
                  </span>
                  {d.needs_human && (
                    <div style={{ background: '#fff4e5', border: '1px solid #f0b86e', padding: 8, borderRadius: 6, margin: '8px 0', fontSize: 13 }}>
                      ⚠ Needs your attention: {d.reason || 'the AI was not sure.'}
                    </div>
                  )}
                  <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} disabled={d.status === 'pending'}
                    style={{ ...input, width: '100%', marginTop: 6 }} placeholder={d.status === 'failed' ? 'Type your reply…' : ''} />
                  <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                    <button style={btn} disabled={busy || !text.trim() || d.status === 'pending'} onClick={() => act(`/api/agent/drafts/${d.id}/approve`)}>Approve & send</button>
                    <button style={{ ...btn, background: '#555' }} disabled={busy} onClick={() => act(`/api/agent/drafts/${d.id}/regenerate`)}>Regenerate</button>
                  </div>
                </>
              )}
              {err && <div style={{ color: '#b00020', marginTop: 8 }}>{err}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------- Shell with toggle ---------------- */
export default function Home() {
  const [mode, setMode] = useState('customer');
  const tab = (m) => ({ ...btn, background: mode === m ? '#2f6b3a' : '#9bb59f', marginRight: 8 });
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, flex: 1 }}>🌿 Verdant & Co Support</h2>
        <button style={tab('customer')} onClick={() => setMode('customer')}>Customer</button>
        <button style={tab('agent')} onClick={() => setMode('agent')}>Agent</button>
      </div>
      {mode === 'customer' ? <CustomerView /> : <AgentView />}
    </div>
  );
}
