// js/auth.js
const STATIC_USERS = [
  { username: "9492126272", password: "Madan@1440", role: "admin", name: "Admin One" },
  { username: "9490479284", password: "Laxmi@6799", role: "user", name: "User Two" },
  { username: "9492146644", password: "Rupa@0642", role: "user", name: "User One" },
  { username: "9492948661", password: "Venky@8661", role: "user", name: "User Two" }
];

const STORAGE_KEY = "vf_user";
function currentUser() {
  try {
    const s = sessionStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) { return null; }
}
function setCurrentUser(u) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u)); }
function clearCurrentUser() { sessionStorage.removeItem(STORAGE_KEY); }
function validateCredentials(username, password) {
  const found = STATIC_USERS.find(u => u.username === username && u.password === password);
  if (!found) return null;
  return { username: found.username, role: found.role, name: found.name || found.username };
}
function redirectToLogin(next) {
  const target = "login.html" + (next ? "?next=" + encodeURIComponent(next) : "");
  location.href = target;
}
function requireAuth(allowedRoles = null) {
  const u = currentUser();
  if (!u) {
    const next = location.pathname + location.search;
    redirectToLogin(next);
    return false;
  }
  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.indexOf(u.role) === -1) {
    alert("You do not have permission to view this page.");
    clearCurrentUser();
    redirectToLogin();
    return false;
  }
  return true;
}
function renderTopbarAuth() {
  const parent = document.querySelector('.topbar .topbar-inner');
  if (!parent) return;
  let actions = parent.querySelector('.top-actions');
  if (!actions) {
    actions = document.createElement('div');
    actions.className = 'top-actions';
    parent.appendChild(actions);
  }
  let authWrap = actions.querySelector('.auth-actions');
  if (!authWrap) {
    authWrap = document.createElement('div');
    authWrap.className = 'auth-actions';
    actions.appendChild(authWrap);
  }
  const u = currentUser();
  authWrap.innerHTML = '';
  if (u) {
    const span = document.createElement('div');
    span.style.display = 'flex';
    span.style.alignItems = 'center';
    span.style.gap = '10px';
    span.innerHTML = `<div style="font-weight:700;color:rgba(255,255,255,0.95)">${escapeHtml(u.username)} (${escapeHtml(u.role)})</div>
                      <button class="btn small" id="btnLogout">Logout</button>`;
    authWrap.appendChild(span);
    const btn = document.getElementById('btnLogout');
    if (btn) btn.addEventListener('click', logout);
  } else {
    const a = document.createElement('a');
    a.href = 'login.html';
    a.className = 'btn small';
    a.innerText = 'Login';
    authWrap.appendChild(a);
  }
}
function doLogin(username, password, next) {
  const user = validateCredentials(username, password);
  if (!user) {
    return { ok: false, message: "Invalid username or password" };
  }
  setCurrentUser(user);
  return { ok: true, user, next };
}
function logout() {
  clearCurrentUser();
  location.href = 'login.html';
}
function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}
window.requireAuth = requireAuth;
window.renderTopbarAuth = renderTopbarAuth;
window.doLogin = doLogin;
window.logout = logout;
window.currentUser = currentUser;
