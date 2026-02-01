async function loadView(){
  const id = new URLSearchParams(location.search).get('id');
  const v = (await loadCSV('data/full.csv')).find(x=>x.vehicle_id===id);
  const emis = (await loadCSV('data/emi.csv')).filter(e=>e.vehicle_id===id);
  if(!v){ document.getElementById('vehicleCard').innerHTML='<div class="muted">Not found</div>'; return; }
  document.getElementById('vehicleCard').innerHTML = `<div class="detail-card"><h2>${v.name||''} <small class="muted">(${v.type||''})</small></h2><p><strong>Number:</strong> ${v.number||''}</p><p>${v.brand||''} • ${v.model||''} • ${v.color||''}</p></div>`;
  document.getElementById('sellerCard').innerHTML = `<h3>Seller</h3><p><strong>${v.seller_name||'N/A'}</strong></p><p>${v.seller_phone||''} • ${v.seller_city||''}</p><p>Buy: ₹${v.buy_value||''} on ${v.buy_date||''}</p>`;
  if(v.buyer_name){
    document.getElementById('buyerCard').innerHTML = `<h3>Buyer</h3><p><strong>${v.buyer_name}</strong></p><p>${v.buyer_phone||''} • ${v.buyer_address||''}</p><p>Sale: ₹${v.sale_value||''} • EMI: ₹${v.emi_amount||''} x ${v.tenure||''}</p>`;
  } else {
    document.getElementById('buyerCard').innerHTML = '<h3>Buyer</h3><p class="muted">No buyer recorded</p>';
  }
  const tbody = document.querySelector('#emiTable tbody'); tbody.innerHTML='';
  emis.forEach(e=> tbody.innerHTML += `<tr><td>${e.emi_no}</td><td>${e.due_date}</td><td>₹${e.amount}</td><td>${e.status}</td></tr>`);
}
