// js/dashboard.js (incremental loader with mobile scroller)
let VEH = [], EMI = [];
let CURRENT_TYPE='ALL', CURRENT_STATUS='ALL', PENDING_MODE=false;
const PAGE_SIZE = 20;          // initial page size
let displayedCount = 0;       // how many items are currently rendered
let FILTERED_LIST = [];       // current filtered vehicles list

// init loader
async function loadDashboard(){
  VEH = await loadCSV('data/full.csv');
  EMI = await loadCSV('data/emi.csv');
  updateSummaryCounts();
  // defaults
  CURRENT_TYPE = 'ALL';
  CURRENT_STATUS = 'ALL';
  PENDING_MODE = false;
  applyFilters(); // will set FILTERED_LIST and display first page
  // wire scroller (mobile)
  const scroller = document.getElementById('listScroller');
  if(scroller){
    scroller.addEventListener('scroll', onScrollerScroll);
  }
  // desktop: show/hide load more button area
  window.addEventListener('resize', ()=> toggleDesktopLoadMore());
  toggleDesktopLoadMore();
}

function toggleDesktopLoadMore(){
  const desktopBox = document.getElementById('desktopLoadMore');
  if(window.innerWidth >= 720){
    desktopBox.style.display = 'block';
  } else {
    desktopBox.style.display = 'none';
  }
}

function updateSummaryCounts(){
  const total = VEH.length;
  const instock = VEH.filter(v=> (v.status||'').toLowerCase()!=='sold').length;
  const sold = VEH.filter(v=> (v.status||'').toLowerCase()==='sold').length;
  const today = new Date(); today.setHours(0,0,0,0);
  const vehiclesWithPending = VEH.filter(v=>{
    const buyerId = v.buyer_id || '';
    const related = EMI.filter(e => (e.buyer_id===buyerId) || (e.vehicle_id===v.vehicle_id));
    return related.some(r => {
      const paid = (r.status||'').toLowerCase() === 'paid';
      const due = new Date(r.due_date); due.setHours(0,0,0,0);
      return !paid && due < today;
    });
  });
  document.getElementById('total').innerText = total;
  document.getElementById('instock').innerText = instock;
  document.getElementById('sold').innerText = sold;
  document.getElementById('pendingCount').innerText = vehiclesWithPending.length;
}

// FILTERS / TYPE / STATS - these set FILTERED_LIST and reset displayedCount
function onTypeCardClick(e){
  const btn = e.currentTarget || e.target;
  const t = btn.dataset.type || 'ALL';
  CURRENT_TYPE = t;
  PENDING_MODE = false;
  CURRENT_STATUS = 'ALL';
  setActiveTypeCard(t);
  setActiveStatCard('ALL');
  applyFilters();
}

function setActiveTypeCard(type){
  document.querySelectorAll('.type-card').forEach(el=> el.classList.remove('active'));
  const sel = type === 'ALL' ? document.getElementById('typeAll') : (type === 'Car' ? document.getElementById('typeCar') : document.getElementById('typeBike'));
  if(sel) sel.classList.add('active');
}

function onStatCardClick(mode){
  if(mode === 'PENDING'){
    PENDING_MODE = !PENDING_MODE;
    setActiveStatCard(PENDING_MODE ? 'PENDING' : 'ALL');
    if(PENDING_MODE){ CURRENT_STATUS = 'ALL'; CURRENT_TYPE = 'ALL'; setActiveTypeCard('ALL'); }
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
  if(CURRENT_TYPE && CURRENT_TYPE !== 'ALL') list = list.filter(v=> (v.type||'')===CURRENT_TYPE);
  if(CURRENT_STATUS && CURRENT_STATUS !== 'ALL') list = list.filter(v=> (v.status||'')===CURRENT_STATUS);
  if(PENDING_MODE){
    const today = new Date(); today.setHours(0,0,0,0);
    list = list.filter(v=>{
      const buyerId = v.buyer_id || '';
      const related = EMI.filter(e => (e.buyer_id===buyerId) || (e.vehicle_id===v.vehicle_id));
      return related.some(r => {
        const paid = (r.status||'').toLowerCase() === 'paid';
        const due = new Date(r.due_date); due.setHours(0,0,0,0);
        return !paid && due < today;
      });
    });
  }
  if(q){
    list = list.filter(v=> ( (v.name||'')+' '+(v.brand||'')+' '+(v.model||'')+' '+(v.number||'') ).toLowerCase().includes(q));
  }
  // set filtered list and reset display to first page
  FILTERED_LIST = list;
  displayedCount = 0;
  loadInitialPage();
}

function loadInitialPage(){
  displayedCount = Math.min(PAGE_SIZE, FILTERED_LIST.length);
  renderVisible();
  // scroll back to top of scroller for UX
  const scroller = document.getElementById('listScroller');
  if(scroller) scroller.scrollTop = 0;
}

function renderVisible(){
  const wrap = document.getElementById('tableWrap');
  if(!FILTERED_LIST || FILTERED_LIST.length === 0){ wrap.innerHTML = '<div class="muted">No records found</div>'; return; }

  const visible = FILTERED_LIST.slice(0, displayedCount);
  if(window.innerWidth < 720){
    // mobile: card view
    wrap.innerHTML = visible.map(v=>`
      <div class="item" onclick="location='view.html?id=${v.vehicle_id}'">
        <div class="meta">
          <div class="title">${v.name||''}</div>
          <div class="sub">${v.brand||''} • ${v.model||''} • ${v.color||''}</div>
        </div>
        <div style="text-align:right">
          <div class="muted"><a class="linknum" href="view.html?id=${v.vehicle_id}">${v.number||''}</a></div>
          <div class="badge ${ (v.status||'').toLowerCase()==='sold' ? 'sold' : 'stock' }">${v.status||''}</div>
        </div>
      </div>`).join('');
  } else {
    // desktop: table rows
    let rows = `<table class="table"><thead><tr><th>#</th><th>Type</th><th>Name</th><th>Brand</th><th>Model</th><th>Number</th><th>Status</th></tr></thead><tbody>`;
    visible.forEach((v,i)=> rows += `<tr><td>${i+1}</td><td>${v.type||''}</td><td>${v.name||''}</td><td>${v.brand||''}</td><td>${v.model||''}</td><td><a class="linknum" href="view.html?id=${v.vehicle_id}">${v.number||''}</a></td><td><span class="badge ${ (v.status||'').toLowerCase()==='sold' ? 'sold' : 'stock' }">${v.status||''}</span></td></tr>`);
    rows += `</tbody></table>`;
    wrap.innerHTML = rows;
  }
  // toggle desktop load more button visibility
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

// scroller scroll handler: when near bottom, load more
function onScrollerScroll(e){
  const el = e.target;
  // threshold of 120px or 20% of remaining
  if(el.scrollTop + el.clientHeight >= el.scrollHeight - 120){
    if(displayedCount < FILTERED_LIST.length){
      loadMore();
    }
  }
}

// expose filter triggers to external UI (existing functions rely on these names)
window.onTypeCardClick = onTypeCardClick;
window.onStatCardClick = onStatCardClick;
window.applyFilters = applyFilters;
window.loadMore = loadMore;
window.setActiveTypeCard = setActiveTypeCard;
window.setActiveStatCard = setActiveStatCard;

// ensure debounce on search for smoother UX (optional)
let _searchTimer = null;
const origSearch = document.getElementById ? null : null;
(function attachDebounce(){
  // attach input debounce after DOM loads
  document.addEventListener('DOMContentLoaded', ()=>{
    const s = document.getElementById('search');
    if(!s) return;
    s.addEventListener('input', ()=>{
      clearTimeout(_searchTimer);
      _searchTimer = setTimeout(()=> applyFilters(), 220);
    });
  });
})();
