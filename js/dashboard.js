// js/dashboard.js
// Robust dashboard loader: loads CSVs, computes counts, and initializes UI.
// Overwrites older versions that had race conditions.

let VEH = [];   // vehicles loaded from full.csv
let EMI = [];   // emis loaded from emi.csv
let FILTERED_LIST = [];
let displayedCount = 0;
const PAGE_SIZE = 20;

// safe loader wrapper
async function loadCSVSafe(path) {
  try {
    const res = await fetch(path, { cache: "no-store" });
    if (!res.ok) {
      console.error("Failed to fetch", path, res.status);
      return [];
    }
    const txt = await res.text();
    // reuse global parseCSV if it exists (from js/data.js), otherwise simple parser
    if (window.parseCSV) {
      return window.parseCSV(txt, ",");
    } else {
      // very small CSV parser: returns array of objects
      const lines = txt.split(/\r?\n/).filter(l => l.trim() !== "");
      if (lines.length === 0) return [];
      const headers = lines[0].split(",").map(h => h.trim());
      const out = [];
      for (let i = 1; i < lines.length; ++i) {
        const cols = lines[i].split(",");
        const obj = {};
        for (let j = 0; j < headers.length; ++j) {
          obj[headers[j]] = (cols[j] !== undefined) ? cols[j].trim() : "";
        }
        out.push(obj);
      }
      return out;
    }
  } catch (err) {
    console.error("loadCSVSafe error for", path, err);
    return [];
  }
}

// main dashboard initialization
async function loadDashboard() {
  try {
    // load CSVs in parallel
    const [vehiclesRaw, emisRaw] = await Promise.all([
      loadCSVSafe("data/full.csv"),
      loadCSVSafe("data/emi.csv")
    ]);

    // If you already have a normalizer in js/data.js, use it to parse/normalize rows.
    if (window.loadCSV && window.loadCSV !== loadCSVSafe) {
      // prefer the richer loader (it returns normalized objects)
      VEH = await loadCSV("data/full.csv").catch(e => { console.error(e); return vehiclesRaw; });
      EMI = await loadCSV("data/emi.csv").catch(e => { console.error(e); return emisRaw; });
    } else {
      VEH = vehiclesRaw;
      EMI = emisRaw;
    }

    console.info("Dashboard loaded:", VEH.length, "vehicles;", EMI.length, "emis");

    // update counts
    updateSummaryCounts();

    // initialize filters/list rendering (uses your existing functions if present)
    if (typeof applyFilters === "function") {
      applyFilters();
    } else {
      // fallback: render basic first page
      FILTERED_LIST = VEH.slice();
      displayedCount = Math.min(PAGE_SIZE, FILTERED_LIST.length);
      renderVisible();
    }

    // wire scroller if listScroller exists
    const scroller = document.getElementById("listScroller");
    if (scroller) {
      scroller.addEventListener("scroll", onScrollerScroll);
    }
    window.addEventListener("resize", () => {
      if (typeof toggleDesktopLoadMore === "function") toggleDesktopLoadMore();
    });

  } catch (err) {
    console.error("loadDashboard error", err);
  }
}

// compute and write summary counts
async function updateSummaryCounts() {
  try {
    // Ensure VEH / EMI are arrays
    if (!Array.isArray(VEH)) VEH = [];
    if (!Array.isArray(EMI)) EMI = [];

    const total = VEH.length;
    const sold = VEH.filter(v => String((v.status || "")).toLowerCase() === "sold").length;
    const instock = total - sold;

    // compute vehicles with at least one overdue unpaid EMI
    const today = new Date(); today.setHours(0,0,0,0);
    const vehicleIdsWithPending = new Set();

    for (const row of EMI) {
      if (!row) continue;
      const dueStr = row.due_date || row.dueDate || row.due || "";
      if (!dueStr) continue;
      const due = (window.toDateSafe ? window.toDateSafe(dueStr) : new Date(dueStr));
      if (!due || isNaN(due.getTime())) continue;

      // Determine paid: if paid_date exists OR CSV status says 'Paid'
      const paidDate = row.paid_date || row.paidDate || "";
      const csvStatus = row.status || row.Status || "";
      const isPaid = (paidDate && paidDate.trim() !== "") || (String(csvStatus).toLowerCase() === "paid");

      if (!isPaid && due < today) {
        // overdue unpaid
        const vid = String(row.vehicle_id || row.vehicle || "");
        if (vid) vehicleIdsWithPending.add(vid);
      }
    }

    const pendingVehicles = vehicleIdsWithPending.size;

    // find DOM elements (safe, check existence)
    const elTotal = document.getElementById("total");
    const elInstock = document.getElementById("instock");
    const elSold = document.getElementById("sold");
    const elPending = document.getElementById("pendingCount");

    if (elTotal) elTotal.innerText = total;
    else console.warn("Element #total not found in DOM");

    if (elInstock) elInstock.innerText = instock;
    else console.warn("Element #instock not found in DOM");

    if (elSold) elSold.innerText = sold;
    else console.warn("Element #sold not found in DOM");

    if (elPending) elPending.innerText = pendingVehicles;
    else console.warn("Element #pendingCount not found in DOM");

    return { total, instock, sold, pendingVehicles };

  } catch (err) {
    console.error("updateSummaryCounts error", err);
    return null;
  }
}

// ----- rendering fallback (if you don't use the paged renderer) -----
function renderVisible() {
  const wrap = document.getElementById("tableWrap");
  if (!wrap) return;
  const visible = FILTERED_LIST.slice(0, displayedCount);
  if (window.innerWidth < 720) {
    wrap.innerHTML = visible.map(v => `
      <div class="item">
        <div class="meta">
          <div class="title">${escapeHtml(v.name||'')}</div>
          <div class="sub">${escapeHtml(v.brand||'')} • ${escapeHtml(v.model||'')}</div>
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
}

// helper: escape HTML
function escapeHtml(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

// scroller load-more hook (if used)
function onScrollerScroll(e) {
  const el = e.target;
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 120) {
    if (displayedCount < FILTERED_LIST.length) {
      loadMore();
    }
  }
}

function loadMore() {
  const remaining = FILTERED_LIST.length - displayedCount;
  if (remaining <= 0) return;
  const add = Math.min(PAGE_SIZE, remaining);
  displayedCount += add;
  renderVisible();
}

// init on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  // begin dashboard load
  loadDashboard().catch(e => console.error("loadDashboard failed:", e));
});
