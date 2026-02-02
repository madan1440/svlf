// js/view.js
function qs(name) {
  const params = new URLSearchParams(location.search);
  return params.get(name);
}

async function loadView() {
  const vid = qs("id");
  if (!vid) {
    document.getElementById('vehicleCard').innerText = "Missing vehicle id";
    return;
  }
  const [vehicles, emis] = await Promise.all([
    window.loadCSV ? loadCSV('data/full.csv') : fetch('data/full.csv').then(r=>r.text()).then(t=>window.parseCSV ? window.parseCSV(t,',') : []),
    window.loadCSV ? loadCSV('data/emi.csv') : fetch('data/emi.csv').then(r=>r.text()).then(t=>window.parseCSV ? window.parseCSV(t,',') : [])
  ]);

  const v = vehicles.find(x => String(x.vehicle_id) === String(vid));
  const vehicleCard = document.getElementById('vehicleCard');
  if (v) {
    vehicleCard.innerHTML = `
      <h2>${escapeHtml(v.name || '')} <small class="muted">(${escapeHtml(v.type || '')})</small></h2>
      <p>${escapeHtml(v.brand || '')} • ${escapeHtml(v.model || '')} • ${escapeHtml(v.color || '')}</p>
      <p><strong>Number:</strong> ${escapeHtml(v.number || '')}</p>
    `;
  } else {
    vehicleCard.innerHTML = `<div class="muted">Vehicle not found</div>`;
  }

  const sellerCard = document.getElementById('sellerCard');
  if (v && v.seller_name) {
    sellerCard.innerHTML = `
      <h3>Seller Information</h3>
      <p><strong>Name:</strong> ${escapeHtml(v.seller_name)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(v.seller_phone || '')}</p>
      <p><strong>City:</strong> ${escapeHtml(v.seller_city || '')}</p>
      <p><strong>Buy Value:</strong> ${v.buy_value ? '₹' + v.buy_value : ''}</p>
      <p><strong>Buy Date:</strong> ${escapeHtml(v.buy_date || '')}</p>
    `;
  } else {
    sellerCard.innerHTML = `<h3>Seller Information</h3><p class="muted">No seller info</p>`;
  }
  
  const buyerCard = document.getElementById('buyerCard');
  if (v && v.buyer_name) {
    buyerCard.innerHTML = `
      <h3>Buyer & Finance Information</h3>
      <p><strong>Name:</strong> ${escapeHtml(v.buyer_name)}</p>
      <p><strong>Phone:</strong> ${escapeHtml(v.buyer_phone || '')}</p>
      <p><strong>Address:</strong> ${escapeHtml(v.buyer_address || '')}</p>
      <p><strong>Sale Value:</strong> ${v.sale_value ? '₹' + v.sale_value : ''}</p>
      <p><strong>Finance Amount:</strong> ${v.finance_amount ? '₹' + v.finance_amount : ''}</p>
      <p><strong>Tenure:</strong> ${escapeHtml(v.tenure || '')} months</p>
      <p><strong>Sale Date:</strong> ${escapeHtml(v.sale_date || '')}</p>
    `;
  } else {
    buyerCard.innerHTML = `
      <h3>Buyer & Finance Information</h3>
      <p class="muted">No buyer info</p>
    `;
  }

  const emiForVehicle = emis.filter(e => String(e.vehicle_id) === String(vid));
  renderEmiTable(emiForVehicle, vid);
}

function renderEmiTable(rows = [], vid = null, pendingOnly = false) {
  const tbody = document.querySelector('#emiTable tbody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="5" class="muted">No EMIs found</td></tr>';
    return;
  }

  const html = rows
    .filter(e => !pendingOnly || (e.display_status && e.display_status.toLowerCase() === 'overdue'))
    .map(e => {
      const delay = (e.computed_delay_days !== null && e.computed_delay_days !== undefined)
                    ? e.computed_delay_days
                    : (e.delay_days !== null ? e.delay_days : "");
      const statusDisplay = e.display_status || (e.status || "");
      const statusClass = e.status_class || "";    // e.g. "emi-paid", "emi-pending", "emi-upcoming"
      const delayNum = Number(delay);
      let delayClass = "";
      if (!isNaN(delayNum)) {
        if (delayNum > 2) delayClass = "delay-high";
        else if (delayNum > 0) delayClass = "delay-low";
      }

      // combine row-level classes: status + delay
      const rowClass = `${statusClass} ${delayClass}`.trim();

      return `<tr class="${rowClass}">
        <td>${escapeHtml(String(e.emi_no || ""))}</td>
        <td>${escapeHtml(e.due_date || "")}</td>
        <td>₹${escapeHtml(String(e.amount || ""))}</td>
        <td class="${statusClass}">${escapeHtml(statusDisplay)}</td>
        <td class="${delayClass}">${escapeHtml(delay === "" ? "" : String(delay))}</td>        
      </tr>`;
    }).join("");
  tbody.innerHTML = html;
}

function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
