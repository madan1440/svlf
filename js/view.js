// js/view.js
// Renders vehicle and EMI table using computed display_status & status_class.

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
    loadCSV('data/full.csv'),
    loadCSV('data/emi.csv')
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

  // filter EMIs for this vehicle
  const emiForVehicle = emis.filter(e => String(e.vehicle_id) === String(vid));
  renderEmiTable(emiForVehicle, vid);
}

function renderEmiTable(rows = [], vid = null, pendingOnly = false) {
  const tbody = document.querySelector('#emiTable tbody');
  if (!tbody) return;
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="6" class="muted">No EMIs found</td></tr>';
    return;
  }

  const today = new Date(); today.setHours(0,0,0,0);

  const html = rows
    .filter(e => !pendingOnly || (e.display_status && e.display_status.toLowerCase() === 'overdue'))
    .map(e => {
      // prefer computed_delay_days (paid or overdue), fallback to existing delay_days field
      const delay = (e.computed_delay_days !== null && e.computed_delay_days !== undefined)
                    ? e.computed_delay_days
                    : (e.delay_days !== null ? e.delay_days : "");

      const statusDisplay = e.display_status || (e.status || "");
      // status class computed in data.js
      const statusClass = e.status_class || "";

      const actionHtml = `<span class="muted">-</span>`; // static site: no actions
      return `<tr>
        <td>${escapeHtml(String(e.emi_no || ""))}</td>
        <td>${escapeHtml(e.due_date || "")}</td>
        <td>₹${escapeHtml(String(e.amount || ""))}</td>
        <td class="${statusClass}">${escapeHtml(statusDisplay)}</td>
        <td>${escapeHtml(delay === "" ? "" : String(delay))}</td>
        <td>${actionHtml}</td>
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

// expose
window.loadView = loadView;
window.renderEmiTable = renderEmiTable;
