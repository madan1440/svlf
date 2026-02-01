async function loadView(){
  const id = new URLSearchParams(location.search).get('id');
  const vehicles = await loadCSV('data/full.csv');
  const emis = await loadCSV('data/emi.csv');
  const v = vehicles.find(x=>x.vehicle_id===id);
  if(!v){ document.getElementById('vehicleCard').innerHTML='<div class="muted">Not found</div>'; return; }
  document.getElementById('vehicleCard').innerHTML = `<div class="detail-card"><h2>${v.name||''} <small class="muted">(${v.type||''})</small></h2><p><strong>Number:</strong> ${v.number||''}</p><p>${v.brand||''} • ${v.model||''} • ${v.color||''}</p></div>`;
  document.getElementById('sellerCard').innerHTML = `<h3>Seller</h3><p><strong>${v.seller_name||'N/A'}</strong></p><p>${v.seller_phone||''} • ${v.seller_city||''}</p><p>Buy: ₹${v.buy_value||''} on ${v.buy_date||''}</p>`;
  if(v.buyer_name){
    document.getElementById('buyerCard').innerHTML = `<h3>Buyer</h3><p><strong>${v.buyer_name}</strong></p><p>${v.buyer_phone||''} • ${v.buyer_address||''}</p><p>Sale: ₹${v.sale_value||''} • EMI: ₹${v.emi_amount||''} x ${v.tenure||''}</p>`;
  } else {
    document.getElementById('buyerCard').innerHTML = '<h3>Buyer</h3><p class="muted">No buyer recorded</p>';
  }
  const buyerId = v.buyer_id || '';
  const rows = emis.filter(e => (e.buyer_id===buyerId) || (e.vehicle_id && e.vehicle_id===v.vehicle_id));
  const tbody = document.querySelector('#emiTable tbody'); tbody.innerHTML='';
  const today = new Date(); today.setHours(0,0,0,0);
  rows.forEach(e=>{
    const paid = (e.status||'').toLowerCase() === 'paid';
    const due = new Date(e.due_date || e.emi_date || ''); due.setHours(0,0,0,0);
    let cls = 'emi-upcoming';
    if(paid) cls = 'emi-paid';
    else if(due < today) cls = 'emi-pending';
    const tr = `<tr class="${cls}"><td>${e.emi_no}</td><td>${e.due_date||e.emi_date}</td><td>₹${e.amount}</td><td>${paid? 'Paid' : (due < today ? 'Overdue' : 'Upcoming')}</td></tr>`;
    tbody.innerHTML += tr;
  });
  const hasPending = rows.some(r=> { const paid=(r.status||'').toLowerCase()==='paid'; const due=new Date(r.due_date||r.emi_date||''); due.setHours(0,0,0,0); return !paid && due < today; });
  if(hasPending){
    const note = document.createElement('div');
    note.className='card';
    note.innerHTML = `<strong style="color:var(--danger)">⚠️ Pending EMIs: ${rows.filter(r=> { const paid=(r.status||'').toLowerCase()==='paid'; const due=new Date(r.due_date||r.emi_date||''); due.setHours(0,0,0,0); return !paid && due < today; }).length} unpaid</strong>`;
    document.getElementById('vehicleCard').after(note);
  }
}
