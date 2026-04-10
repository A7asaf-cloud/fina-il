// ─── Local auth utilities (no external service) ───────────────────────────────
// Credentials are stored in localStorage as a SHA-256 hash — the plain
// password is never persisted.

const CREDS_KEY   = 'finance_app_credentials';
const SESSION_KEY = 'finance_app_session';

// Hash a password with SHA-256 via Web Crypto API
export async function hashPassword(password) {
  const data = new TextEncoder().encode(password);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Returns the stored credentials object, or null if not set up yet
export function getStoredCredentials() {
  try {
    const raw = localStorage.getItem(CREDS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Save new credentials (hashed)
export async function saveCredentials(username, password) {
  const hash = await hashPassword(password);
  localStorage.setItem(CREDS_KEY, JSON.stringify({ username, hash }));
}

// Verify login attempt — returns true on success
export async function verifyCredentials(username, password) {
  const stored = getStoredCredentials();
  if (!stored) return false;
  const hash = await hashPassword(password);
  return stored.username === username && stored.hash === hash;
}

// Session helpers (sessionStorage — cleared when tab/browser closes)
export function startSession() {
  sessionStorage.setItem(SESSION_KEY, '1');
}

export function endSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isSessionActive() {
  return sessionStorage.getItem(SESSION_KEY) === '1';
}

// Delete account (reset everything)
export function deleteCredentials() {
  localStorage.removeItem(CREDS_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}
