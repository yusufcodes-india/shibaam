/* SHIBAAM shared API layer: api + backendCall (await, throws) + toast +
   offline outbox (queue failed writes, flush in order) + error logging. */
async function api(action, payload) {
  payload = payload || {};
  payload.action = action;
  const r = await fetch(SCRIPT_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) });
  const j = await r.json();
  if (!j.success) throw new Error(j.error || 'Request failed');
  return j.data;
}

async function backendCall(action, payload) {
  payload = payload || {};
  try { payload.token = getAdminToken(); } catch (e) { /* auth.js may load later; token '' */ }
  return api(action, payload); // throws on failure — callers decide
}

function toast(msg, ok) {
  let t = document.getElementById('appToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'appToast';
    t.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:1000;max-width:320px;background:#30251f;color:#fff;padding:12px 18px;border-radius:10px;font-size:13px;box-shadow:0 24px 70px rgba(76,48,34,.12);transition:opacity .3s;';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.style.background = ok ? '#2a7d2a' : '#b3261e';
  t.style.opacity = '1';
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.style.opacity = '0'; }, 3500);
}

/* ---------------- offline outbox ---------------- */
const OUTBOX_KEY = 'shibaam_outbox';

function readOutbox() {
  try {
    const v = JSON.parse(localStorage.getItem(OUTBOX_KEY) || '[]');
    return Array.isArray(v) ? v : [];
  } catch (e) { return []; }
}

function writeOutbox(ops) {
  try { localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops)); } catch (e) {}
}

function queueOutbox(action, payload, localId) {
  const clean = Object.assign({}, payload || {});
  delete clean.token; // fresh token is attached at flush time
  delete clean.action;
  const ops = readOutbox();
  ops.push({ action, payload: clean, localId: localId || null, ts: new Date().toISOString() });
  writeOutbox(ops);
  return ops.length;
}

function remapIds(payload, idMap) {
  const p = Object.assign({}, payload);
  if (p.id && idMap[p.id]) p.id = idMap[p.id];
  return p;
}

/* Attempt a write: success -> green toast + optional refetch.
   Failure -> queued in outbox + red toast. Never silent. */
async function saveQueued(action, payload, opts) {
  opts = opts || {};
  try {
    const data = await backendCall(action, payload);
    toast(opts.successMsg || 'Saved to Sheets', true);
    if (opts.refetch) { try { await opts.refetch(); } catch (e) { /* list stays as-is */ } }
    return { ok: true, data };
  } catch (err) {
    const n = queueOutbox(action, payload, opts.localId);
    toast('Offline — change queued (' + n + ' pending): ' + err.message, false);
    logError(action, err);
    return { ok: false, queued: true, error: err };
  }
}

/* Flush queued writes in order. Remaps temp ids from earlier creates. */
async function flushOutbox() {
  let ops = readOutbox();
  if (!ops.length) return 0;
  try { if (!navigator.onLine) return 0; } catch (e) {}
  const idMap = {};
  const remaining = [];
  let done = 0;
  for (const op of ops) {
    try {
      const data = await backendCall(op.action, remapIds(op.payload, idMap));
      const sid = (data && (data.id || (data.job && data.job.id) || data.recordId)) || null;
      if (op.localId && sid) idMap[op.localId] = sid;
      done++;
    } catch (e) {
      remaining.push(op);
    }
  }
  writeOutbox(remaining);
  if (done) toast('Synced ' + done + ' queued change' + (done > 1 ? 's' : ''), true);
  return done;
}

/* ---------------- frontend error log (fire-and-forget, no recursion) ---------------- */
let __loggingError = false;
function logError(action, err) {
  if (__loggingError) return;
  try {
    __loggingError = true;
    const msg = (err && err.message) || String(err);
    let token = '';
    try { token = getAdminToken(); } catch (e) {}
    fetch(SCRIPT_URL, {
      method: 'POST', headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'admin_log_error', token, message: String(action) + ': ' + msg, context: location.pathname })
    }).catch(() => {}).finally(() => { __loggingError = false; });
  } catch (e) { __loggingError = false; }
}

window.addEventListener('error', (ev) => {
  try { logError('frontend', (ev && ev.message) || 'unknown error'); } catch (e) {}
});
window.addEventListener('online', () => { flushOutbox().catch(() => {}); });
window.addEventListener('load', () => { setTimeout(() => { flushOutbox().catch(() => {}); }, 1500); });
