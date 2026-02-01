let VEH = [], EMI = [], CURRENT_TYPE='ALL', CURRENT_STATUS='ALL', PENDING_MODE=false;

async function loadDashboard(){
  VEH = await loadCSV('data/full.csv');
  EMI = await loadCSV('data/emi.csv');
  updateSummaryCounts();
  renderList(VEH);
  // attach initial active states
  setActiveTypeCard(CURRENT_TYPE);
  setActiveStatCard('ALL');
}

function updateSummaryCounts(){
  const total = VEH.length;
  const instock = VEH.filter(v=> (v.status||'').toLowerCase()!=='sold').length;
  const sold = VEH.filter(v=> (v.status||'').toLowerCase()==='sold').length;

  // pending count = vehicles having at least one overdue unpaid EMI
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
  // mode: 'ALL' | 'Stock' | 'Sold' | 'PENDING'
  if(mode === 'PENDING'){
    PENDING_MODE = !PENDING_MODE;
    // visually toggle
    setActiveStatCard(PENDING_MODE ? 'PENDING' : 'ALL');
    if(PENDING_MODE){
      CURRENT_STATUS = 'ALL';
      CURRENT_TYPE = 'ALL';
      setActiveTypeCard('ALL');
    }
  } else {
    PENDING_MODE = false;
    CURRENT_STATUS = mode;
    setActiveStatCard(mode);
  }
  applyFilters();
}

function setActiveStatCard(mode){
  document.querySelectorAll('.summary-row .stat').forEach(el=> el.classList.remove('active'));
  if(mode === 'ALL'){
    document.getElementById('totalCard').classList.add('active');
  } else if(mode === 'Stock'){
    document.getElementById('instockCard').classList.add('active');
  } else if(mode === 'Sold'){
    document.getElementById('soldCard').classList.add('active');
  } else if(mode === 'PENDING'){
    document.getElementById('pendingCard').classList.add('active');
  }
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

  if(q){ list = list.filter(v=> ( (v.name||'')+' '+(v.brand||'')+' '+(v.model||'')+' '+(v.number||'') ).toLowerCase().includes(q)); }

  renderList(list);
  // update counts so user sees filtered counts in header if desired
  // (we keep summary showing overall counts; if you want filtered counts replace below)
}

function renderList(list){
  const wrap = document.getElementById('tableWrap');
  if(!list.length){ wrap.innerHTML='<div class="muted">No records found</div>'; return; }
  if(window.innerWidth < 720){
    wrap.innerHTML = list.map(v=>`
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
    let rows = `<table class="table"><thead><tr><th>#</th><th>Type</th><th>Name</th><th>Brand</th><th>Model</th><th>Number</th><th>Status</th></tr></thead><tbody>`;
    list.forEach((v,i)=> rows += `<tr><td>${i+1}</td><td>${v.type||''}</td><td>${v.name||''}</td><td>${v.brand||''}</td><td>${v.model||''}</td><td><a class="linknum" href="view.html?id=${v.vehicle_id}">${v.number||''}</a></td><td><span class="badge ${ (v.status||'').toLowerCase()==='sold' ? 'sold' : 'stock' }">${v.status||''}</span></td></tr>`);
    rows += `</tbody></table>`;
    wrap.innerHTML = rows;
  }
}

window.addEventListener('resize', ()=> renderList(VEH));
