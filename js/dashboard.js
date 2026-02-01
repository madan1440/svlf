let VEH = [], EMI = [], CURRENT_TYPE='ALL', CURRENT_STATUS='ALL', PENDING_MODE=false;
async function loadDashboard(){
  VEH = await loadCSV('data/full.csv');
  EMI = await loadCSV('data/emi.csv');
  renderSummary();
  renderList(VEH);
}
function renderSummary(){
  const total = VEH.length;
  const instock = VEH.filter(v=> (v.status||'').toLowerCase()!=='sold').length;
  const sold = VEH.filter(v=> (v.status||'').toLowerCase()==='sold').length;
  document.getElementById('total').innerText=total;
  document.getElementById('instock').innerText=instock;
  document.getElementById('sold').innerText=sold;
}
function onTypeFilter(e){
  document.querySelectorAll('.btn-group')[0].querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
  e.target.classList.add('active');
  CURRENT_TYPE = e.target.dataset.type;
  PENDING_MODE=false;
  applyFilters();
}
function onStatusFilter(e){
  document.querySelectorAll('.btn-group')[1].querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
  e.target.classList.add('active');
  CURRENT_STATUS = e.target.dataset.status;
  PENDING_MODE=false;
  applyFilters();
}
function onPendingFilter(e){
  const btn = e.target;
  PENDING_MODE = !PENDING_MODE;
  btn.classList.toggle('active', PENDING_MODE);
  if(PENDING_MODE){
    document.querySelectorAll('.btn-group')[1].querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));
  }
  applyFilters();
}
function applyFilters(){
  const q = (document.getElementById('search').value||'').toLowerCase().trim();
  let list = VEH.slice();
  if(CURRENT_TYPE!=='ALL') list = list.filter(v=> (v.type||'')===CURRENT_TYPE);
  if(CURRENT_STATUS!=='ALL') list = list.filter(v=> (v.status||'')===CURRENT_STATUS);
  if(PENDING_MODE){
    list = list.filter(v=>{
      const buyerId = v.buyer_id || '';
      if(!buyerId) return false;
      return EMI.some(e=> (e.buyer_id===buyerId || e.vehicle_id===v.vehicle_id) && (e.status||'').toLowerCase()!=='paid');
    });
  }
  if(q){ list = list.filter(v=> (v.name+' '+v.brand+' '+v.model+' '+v.number).toLowerCase().includes(q)); }
  renderList(list);
}
function renderList(list){
  const wrap = document.getElementById('tableWrap');
  if(!list.length){ wrap.innerHTML='<div class="muted">No records found</div>'; return; }
  if(window.innerWidth < 720){
    wrap.innerHTML = list.map(v=>`
      <div class="item" onclick="location='view.html?id=${v.vehicle_id}'">
        <div class="meta">
          <div><strong>${v.name||''}</strong><div class="muted">${v.brand||''} • ${v.model||''}</div></div>
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
