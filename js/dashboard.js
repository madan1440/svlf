// js/dashboard.js
let VEH = [], EMI = [], FILTERED_LIST = [];
let EMI_BY_VEHICLE = new Map();
let displayedCount = 0;
const PAGE_SIZE = 20;
let CURRENT_TYPE = 'Bike', CURRENT_STATUS = 'ALL', PENDING_MODE = false;

async function loadDashboard() {
  try {
    if (window.loadCSV) {
      VEH = await loadCSV('data/full.csv');
      EMI = await loadCSV('data/emi.csv');
    } else {
      const vRaw = await fetch('data/full.csv').then(r=>r.text());
      const eRaw = await fetch('data/emi.csv').then(r=>r.text());
      VEH = window.parseCSV ? window.parseCSV(vRaw, ",") : [];
      EMI = window.parseCSV ? window.parseCSV(eRaw, ",") : [];
    }
    buildEmiIndex();
    console.info("Loaded vehicles:", VEH.length, "emis:", EMI.length);
    updateSummaryCounts();
    setActiveTypeCard(CURRENT_TYPE);
    setActiveStatCard('ALL');
    applyFilters();
    updateDownloadAccess();
    const scroller = document.getElementById('listScroller');
    if (scroller) scroller.addEventListener('scroll', onScrollerScroll);
    window.addEventListener('resize', ()=> toggleDesktopLoadMore());
    toggleDesktopLoadMore();
  } catch (e) {
    console.error("loadDashboard error:", e);
  }
}

function updateDownloadAccess() {
  const btn = document.querySelector('.top-actions .icon-btn');
  if (!btn) return;
  const u = window.currentUser ? window.currentUser() : null;
  const isAdmin = u && u.role === 'admin';
  btn.disabled = !isAdmin;
  btn.setAttribute('aria-disabled', String(!isAdmin));
  btn.title = isAdmin ? 'Download CSVs' : 'Downloads are disabled for users';
}

function buildEmiIndex() {
  EMI_BY_VEHICLE = new Map();
  if (!Array.isArray(EMI)) return;
  for (const e of EMI) {
    if (!e) continue;
    const vid = String(e.vehicle_id || "");
    if (!vid) continue;
    const list = EMI_BY_VEHICLE.get(vid);
    if (list) list.push(e);
    else EMI_BY_VEHICLE.set(vid, [e]);
  }
}

async function updateSummaryCounts() {
  if (!Array.isArray(VEH)) VEH = [];
  if (!Array.isArray(EMI)) EMI = [];

  const vehiclesForType = CURRENT_TYPE
    ? VEH.filter(v => (v.type || '') === CURRENT_TYPE)
    : VEH.slice();

  const total = vehiclesForType.length;
  const sold = vehiclesForType.filter(v => String((v.status || '')).toLowerCase() === 'sold').length;
  const instock = total - sold;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const vehicleIdsForType = new Set(vehiclesForType.map(v => String(v.vehicle_id || "")).filter(Boolean));
  const pendingSet = new Set();

  for (const e of EMI) {
    if (!e) continue;
    const vid = String(e.vehicle_id || "");
    if (!vid || !vehicleIdsForType.has(vid)) continue;

    const dueStr = e.due_date || e.due || "";
    if (!dueStr) continue;
    const due = window.toDateSafe ? window.toDateSafe(dueStr) : new Date(dueStr);
    if (!due || isNaN(due.getTime())) continue;

    const paidDate = e.paid_date || "";
    const csvStatus = e.status || "";
    const isPaid = (paidDate && paidDate.trim() !== "") || (String(csvStatus).toLowerCase() === 'paid');

    if (!isPaid && due < today) pendingSet.add(vid);
  }

  const pendingVehicles = pendingSet.size;
  const elTotal = document.getElementById('total');
  const elInstock = document.getElementById('instock');
  const elSold = document.getElementById('sold');
  const elPending = document.getElementById('pendingCount');
  if (elTotal) elTotal.innerText = total;
  if (elInstock) elInstock.innerText = instock;
  if (elSold) elSold.innerText = sold;
  if (elPending) elPending.innerText = pendingVehicles;

  return { total, instock, sold, pendingVehicles };
}


function onTypeCardClick(e){
  const btn = e.currentTarget || e.target;
  const t = btn.dataset.type || 'Bike';
  CURRENT_TYPE = t;
  PENDING_MODE = false;
  CURRENT_STATUS = 'ALL';
  setActiveTypeCard(t);
  setActiveStatCard('ALL');
  updateSummaryCounts();
  applyFilters();
}

function setActiveTypeCard(type){
  document.querySelectorAll('.type-card').forEach(el=> el.classList.remove('active'));
  const sel = type === 'Car' ? document.getElementById('typeCar') : document.getElementById('typeBike');
  if (sel) sel.classList.add('active');
}

function onStatCardClick(mode){
  if(mode === 'PENDING'){
    PENDING_MODE = !PENDING_MODE;
    setActiveStatCard(PENDING_MODE ? 'PENDING' : 'ALL');
    if(PENDING_MODE){ CURRENT_STATUS = 'ALL'; }
  } else {
    PENDING_MODE = false;
    CURRENT_STATUS = mode;
    setActiveStatCard(mode);
  }
  applyFilters();
}

function setActiveStatCard(mode){
  document.querySelectorAll('.summary-row .stat').forEach(el=> el.classList.remove('active'));
  if(mode === 'ALL') document.getElementById('totalCard').classList.add('active');
  else if(mode === 'Stock') document.getElementById('instockCard').classList.add('active');
  else if(mode === 'Sold') document.getElementById('soldCard').classList.add('active');
  else if(mode === 'PENDING') document.getElementById('pendingCard').classList.add('active');
}

function applyFilters(){
  const q = (document.getElementById('search').value||'').toLowerCase().trim();
  let list = VEH.slice();
  if(CURRENT_TYPE) list = list.filter(v=> (v.type||'')===CURRENT_TYPE);
  if(CURRENT_STATUS && CURRENT_STATUS !== 'ALL') list = list.filter(v=> (v.status||'')===CURRENT_STATUS);
  if(PENDING_MODE){
    const today = new Date(); today.setHours(0,0,0,0);
    list = list.filter(v=>{
      const vid = String(v.vehicle_id || v.id || "");
      const related = EMI_BY_VEHICLE.get(vid) || [];
      return related.some(r => {
        const paid = (r.paid_date && r.paid_date.trim()!=='') || (r.status && String(r.status).toLowerCase()==='paid');
        const due = window.toDateSafe ? window.toDateSafe(r.due_date) : new Date(r.due_date);
        if (!due || isNaN(due.getTime())) return false;
        return !paid && due < today;
      });
    });
  }
  if(q){
    list = list.filter(v=> (
      (v.name||'')+' '+
      (v.brand||'')+' '+
      (v.model||'')+' '+
      (v.number||'')+' '+
      (v.seller_name||'')+' '+
      (v.seller_phone||'')+' '+
      (v.seller_city||'')+' '+
      (v.buyer_name||'')+' '+
      (v.buyer_phone||'')
    ).toLowerCase().includes(q));
  }
  FILTERED_LIST = list;
  displayedCount = Math.min(PAGE_SIZE, FILTERED_LIST.length);
  loadInitialPage();
}

function loadInitialPage(){
  displayedCount = Math.min(PAGE_SIZE, FILTERED_LIST.length);
  renderVisible();
  const scroller = document.getElementById('listScroller');
  if(scroller) scroller.scrollTop = 0;
}

function renderVisible(){
  const wrap = document.getElementById('tableWrap');
  if(!FILTERED_LIST || FILTERED_LIST.length === 0){ wrap.innerHTML = '<div class="muted">No records found</div>'; return; }
  const visible = FILTERED_LIST.slice(0, displayedCount);
  if(window.innerWidth < 720){
    wrap.innerHTML = visible.map(v=>`
      <div class="item" onclick="location='view.html?id=${v.vehicle_id}'">
        <div class="meta">
          <div class="title">${escapeHtml(v.name||'')}</div>
          <div class="sub">${escapeHtml(v.brand||'')} • ${escapeHtml(v.model||'')} • ${escapeHtml(v.color||'')}</div>
        </div>
        <div style="text-align:right">
          <div class="muted"><a class="linknum" href="view.html?id=${v.vehicle_id}">${escapeHtml(v.number||'')}</a></div>
          <div class="badge ${(String((v.status||'')).toLowerCase()==='sold') ? 'sold' : 'stock'}">${escapeHtml(v.status||'')}</div>
        </div>
      </div>`).join('');
  } else {
    let rows = `<table class="table"><thead><tr><th>#</th><th>Type</th><th>Name</th><th>Brand</th><th>Model</th><th>Number</th><th>Status</th></tr></thead><tbody>`;
    visible.forEach((v,i)=> rows += `<tr><td>${i+1}</td><td>${escapeHtml(v.type||'')}</td><td>${escapeHtml(v.name||'')}</td><td>${escapeHtml(v.brand||'')}</td><td>${escapeHtml(v.model||'')}</td><td><a class="linknum" href="view.html?id=${v.vehicle_id}">${escapeHtml(v.number||'')}</a></td><td><span class="badge ${(String((v.status||'')).toLowerCase()==='sold') ? 'sold' : 'stock'}">${escapeHtml(v.status||'')}</span></td></tr>`);
    rows += `</tbody></table>`;
    wrap.innerHTML = rows;
  }
  const btnLoadMore = document.getElementById('btnLoadMore');
  if(btnLoadMore) btnLoadMore.style.display = (displayedCount < FILTERED_LIST.length && window.innerWidth >= 720) ? 'inline-block' : 'none';
}

function loadMore(){
  const remaining = FILTERED_LIST.length - displayedCount;
  if(remaining <= 0) return;
  const add = Math.min(PAGE_SIZE, remaining);
  displayedCount += add;
  renderVisible();
}

function onScrollerScroll(e){
  const el = e.target;
  if(el.scrollTop + el.clientHeight >= el.scrollHeight - 120){
    if(displayedCount < FILTERED_LIST.length){
      loadMore();
    }
  }
}

function toggleDesktopLoadMore(){
  const desktopBox = document.getElementById('desktopLoadMore');
  if(window.innerWidth >= 720){
    desktopBox.style.display = 'block';
  } else {
    desktopBox.style.display = 'none';
  }
}

function triggerDownload(path, filename) {
  const link = document.createElement('a');
  link.href = path;
  link.download = filename || '';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function downloadCSVs() {
  triggerDownload('data/full.csv', 'full.csv');
  triggerDownload('data/emi.csv', 'emi.csv');
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

document.addEventListener("DOMContentLoaded", ()=>{ loadDashboard().catch(e=>console.error(e)); });
