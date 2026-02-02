// js/data.js
// CSV loader + normalizer for the static app.
// Produces computed_delay_days and stable display_status/status_class for EMIs.

function parseCSV(text, sep = ",") {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length === 0) return [];
  const headers = lines[0].split(sep).map(h => h.trim());
  const out = [];
  for (let i = 1; i < lines.length; ++i) {
    const cols = lines[i].split(sep);
    const obj = {};
    for (let j = 0; j < headers.length; ++j) {
      obj[headers[j]] = (cols[j] !== undefined) ? cols[j].trim() : "";
    }
    out.push(obj);
  }
  return out;
}

function toIntSafe(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}

function toDateSafe(s) {
  if (!s) return null;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d;
  // fallback parse yyyy-mm-dd
  const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const y = parseInt(m[1], 10), mo = parseInt(m[2], 10) - 1, da = parseInt(m[3], 10);
    const dd = new Date(y, mo, da);
    if (!isNaN(dd.getTime())) return dd;
  }
  return null;
}

// day difference floor
function daysBetween(aDate, bDate) {
  return Math.floor((aDate.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24));
}

// compute delay:
// if paid_date exists -> max(0, paid - due)
// else if due < today -> today - due (overdue days)
// else -> null
function computeDelayDisplay(due_date_str, paid_date_str) {
  const due = toDateSafe(due_date_str);
  const paid = toDateSafe(paid_date_str);
  const today = new Date(); today.setHours(0,0,0,0);
  if (paid) {
    const pd = new Date(paid); pd.setHours(0,0,0,0);
    if (due) {
      const diff = daysBetween(pd, due);
      return diff > 0 ? diff : 0;
    }
    return 0;
  } else {
    if (due) {
      const dd = new Date(due); dd.setHours(0,0,0,0);
      if (dd < today) return daysBetween(today, dd);
    }
  }
  return null;
}

// determine display status (do not overwrite original CSV status):
// - If paid_date exists or CSV status === 'Paid' => 'Paid'
// - Else if due_date < today => 'Overdue'
// - Else => 'Upcoming'
function determineDisplayStatus(csvStatus, due_date_str, paid_date_str) {
  const paid = toDateSafe(paid_date_str);
  const due = toDateSafe(due_date_str);
  const today = new Date(); today.setHours(0,0,0,0);

  if (paid || (csvStatus && String(csvStatus).toLowerCase() === "paid")) {
    return "Paid";
  }
  if (due && due < today) {
    return "Overdue";
  }
  return "Upcoming";
}

// map display_status -> css class (keeps existing classes)
function statusClassFor(displayStatus) {
  if (!displayStatus) return "";
  const s = displayStatus.toLowerCase();
  if (s === "paid") return "emi-paid";
  if (s === "overdue") return "emi-pending";
  // upcoming/default
  return "emi-upcoming";
}

// loadCSV: returns Promise<array> normalised
async function loadCSV(path) {
  const res = await fetch(path, {cache: "no-store"});
  if (!res.ok) throw new Error("Failed to load " + path + " (" + res.status + ")");
  const txt = await res.text();
  const raw = parseCSV(txt, ",");
  const normalized = raw.map(r => {
    const obj = Object.assign({}, r);
    if (obj.vehicle_id !== undefined) obj.vehicle_id = toIntSafe(obj.vehicle_id);
    if (obj.buyer_id !== undefined) obj.buyer_id = toIntSafe(obj.buyer_id);
    if (obj.emi_no !== undefined) obj.emi_no = toIntSafe(obj.emi_no);
    if (obj.amount !== undefined) obj.amount = toIntSafe(obj.amount);
    if (obj.tenure !== undefined) obj.tenure = toIntSafe(obj.tenure);
    if (obj.sale_value !== undefined) obj.sale_value = toIntSafe(obj.sale_value);

    // keep original CSV status untouched in obj.status
    obj.paid_date = obj.paid_date ? obj.paid_date : "";
    obj.due_date = obj.due_date ? obj.due_date : "";
    obj.delay_days = (obj.delay_days !== undefined && obj.delay_days !== "") ? toIntSafe(obj.delay_days) : null;

    // computed delay based on dates (display only)
    obj.computed_delay_days = computeDelayDisplay(obj.due_date, obj.paid_date);

    // compute a safe display_status and corresponding css class
    obj.display_status = determineDisplayStatus(obj.status, obj.due_date, obj.paid_date);
    obj.status_class = statusClassFor(obj.display_status);

    return obj;
  });
  return normalized;
}

// expose
window.loadCSV = loadCSV;
window.computeDelayDisplay = computeDelayDisplay;
window.determineDisplayStatus = determineDisplayStatus;
window.statusClassFor = statusClassFor;
