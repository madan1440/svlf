// js/data.js
// CSV loader + normalizer for static app. Computes computed_delay_days on the fly.

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

// parse ISO date string to Date (local) or null
function toDateSafe(s) {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) {
    // try common fallback (yyyy-mm-dd)
    const parts = s.split("-");
    if (parts.length >= 3) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2].slice(0,2), 10);
      const dd = new Date(y, m, day);
      if (!isNaN(dd.getTime())) return dd;
    }
    return null;
  }
  return d;
}

// compute days difference (floor)
function daysBetween(aDate, bDate) {
  const ms = aDate.getTime() - bDate.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

// compute computed_delay_days:
// - if paid_date exists: max(0, paid_date - due_date)
// - else if due_date < today: today - due_date (overdue days)
// - else: null (upcoming)
function computeDelayDisplay(due_date_str, paid_date_str) {
  const due = toDateSafe(due_date_str);
  const paid = toDateSafe(paid_date_str);
  const today = new Date();
  // normalize today's time to midnight for day-based comparisons
  today.setHours(0,0,0,0);

  if (paid) {
    // compute paid - due
    const paidDay = new Date(paid);
    paidDay.setHours(0,0,0,0);
    if (due) {
      const diff = daysBetween(paidDay, due);
      return diff > 0 ? diff : 0;
    } else {
      // no due date, fallback to 0
      return 0;
    }
  } else {
    if (due) {
      const dueDay = new Date(due);
      dueDay.setHours(0,0,0,0);
      if (dueDay < today) {
        // unpaid overdue
        return daysBetween(today, dueDay);
      }
    }
  }
  return null;
}

// loadCSV: returns Promise<array of objects> with normalized fields and computed_delay_days
async function loadCSV(path) {
  const res = await fetch(path, {cache: "no-store"});
  if (!res.ok) throw new Error("Failed to load " + path + " (" + res.status + ")");
  const txt = await res.text();
  const raw = parseCSV(txt, ",");
  const normalized = raw.map(r => {
    const obj = Object.assign({}, r);
    // normalize integer fields if present
    if (obj.vehicle_id !== undefined) obj.vehicle_id = toIntSafe(obj.vehicle_id);
    if (obj.buyer_id !== undefined) obj.buyer_id = toIntSafe(obj.buyer_id);
    if (obj.emi_no !== undefined) obj.emi_no = toIntSafe(obj.emi_no);
    if (obj.amount !== undefined) obj.amount = toIntSafe(obj.amount);
    if (obj.tenure !== undefined) obj.tenure = toIntSafe(obj.tenure);
    if (obj.sale_value !== undefined) obj.sale_value = toIntSafe(obj.sale_value);
    // keep paid_date and due_date as strings (original), but ensure defined
    obj.paid_date = obj.paid_date ? obj.paid_date : "";
    obj.due_date = obj.due_date ? obj.due_date : "";
    // attempt to parse delay_days if CSV provided it
    obj.delay_days = (obj.delay_days !== undefined) ? toIntSafe(obj.delay_days) : null;
    // compute on-the-fly display delay (does not overwrite delay_days CSV column)
    obj.computed_delay_days = computeDelayDisplay(obj.due_date, obj.paid_date);
    return obj;
  });
  return normalized;
}

// expose helpers globally for other files
window.loadCSV = loadCSV;
window.computeDelayDisplay = computeDelayDisplay;
window.toDateSafe = toDateSafe;
