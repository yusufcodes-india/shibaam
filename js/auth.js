/* SHIBAAM shared auth: single storage helpers, tokens, guards, logout. */
function storeGet(k) {
  try { return sessionStorage.getItem(k) || localStorage.getItem(k) || ''; }
  catch (e) { try { return localStorage.getItem(k) || ''; } catch (e2) { return ''; } }
}

function storeSetSession(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }
function storeSetRemember(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function storeDel(k) {
  try { sessionStorage.removeItem(k); } catch (e) {}
  try { localStorage.removeItem(k); } catch (e) {}
}

function getAdminToken() { return storeGet('shibaam_admin_token'); }
function getCustomerToken() { return storeGet('shibaam_customer_token'); }

const ADMIN_AUTH_KEYS = ['shibaam_admin_key', 'shibaam_admin_token', 'shibaam_admin_role', 'shibaam_admin_name'];
const CUSTOMER_AUTH_KEYS = ['shibaam_customer_jobno', 'shibaam_customer_token'];

function clearAdminAuth() { ADMIN_AUTH_KEYS.forEach(storeDel); }
function clearCustomerAuth() { CUSTOMER_AUTH_KEYS.forEach(storeDel); }

function logoutAdmin() {
  clearAdminAuth();
  window.location.href = './admin-login.html';
}

/* Guarded pages: instant redirect when no key at all; otherwise re-verify
   the stored key with the backend. Revoked key (Invalid Key License) clears
   storage and redirects to login. Network/other errors keep the session
   (offline mode works from cache + outbox). */
async function guardAdmin() {
  const key = storeGet('shibaam_admin_key');
  if (!key) {
    window.location.href = './admin-login.html';
    return false;
  }
  try {
    const res = await api('login_admin', { keyLicense: key });
    storeSetSession('shibaam_admin_token', res.token);
    storeSetSession('shibaam_admin_key', key);
    storeSetSession('shibaam_admin_role', res.role);
    storeSetSession('shibaam_admin_name', res.name);
    return true;
  } catch (err) {
    if (err && /invalid key license/i.test(err.message || '')) {
      clearAdminAuth();
      window.location.href = './admin-login.html';
      return false;
    }
    return true;
  }
}
