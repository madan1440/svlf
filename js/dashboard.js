// Update summary counts and pending calculation (replace the previous function)
async function updateSummaryCounts() {
  // Expect VEH and EMI arrays are loaded in the script scope (like before)
  // VEH: vehicle rows from full.csv
  // EMI: emi rows from emi.csv
  if (typeof VEH === 'undefined' || typeof EMI === 'undefined') {
    // If not loaded yet, try to load them quickly
    try {
      VEH = await loadCSV('data/full.csv');
      EMI = await loadCSV('data/emi.csv');
    } catch (e) {
      console.warn("Failed to load CSVs for summary:", e);
      return;
    }
  }

  const total = VEH.length;
  const instock = VEH.filter(v => String((v.status||"")).toLowerCase() !== 'sold').length;
  const sold = VEH.filter(v => String((v.status||"")).toLowerCase() === 'sold').length;

  // compute vehicles that have at least one overdue unpaid EMI
  const today = new Date(); today.setHours(0,0,0,0);
  const vehicleIdsWithPending = new Set();
  for (const e of EMI) {
    // skip rows without due date
    if (!e.due_date) continue;
    const due = toDateSafe(e.due_date);
    if (!due) continue;
    // if not paid and due < today -> pending / overdue
    const paid = (e.paid_date && e.paid_date.trim() !== "") || (e.status && String(e.status).toLowerCase() === 'paid');
    if (!paid && due < today) {
      vehicleIdsWithPending.add(String(e.vehicle_id));
    }
  }

  const pendingVehicles = vehicleIdsWithPending.size;

  // update DOM elements (IDs used previously)
  const elTotal = document.getElementById('total');
  const elStock = document.getElementById('instock');
  const elSold = document.getElementById('sold');
  const elPending = document.getElementById('pendingCount');

  if (elTotal) elTotal.innerText = total;
  if (elStock) elStock.innerText = instock;
  if (elSold) elSold.innerText = sold;
  if (elPending) elPending.innerText = pendingVehicles;
}
