// js/data.js
const FULL_FIELD_ALIASES = {
  vehicle_id: ["vehicleid", "vehicle id", "id", "v_id"],
  seller_name: ["seller", "sellername", "seller name"],
  seller_phone: ["sellerphone", "seller phone", "seller_mobile", "seller mobile"],
  seller_city: ["sellercity", "seller city", "city"],
  buy_value: ["buyvalue", "buy value", "purchase_value", "purchase amount"],
  buy_date: ["buydate", "buy date", "purchase_date", "purchase date"],
  buyer_id: ["buyerid", "buyer id", "customer_id", "customerid"],
  buyer_name: ["buyer", "buyername", "buyer name", "customer_name", "customer name"],
  buyer_phone: ["buyerphone", "buyer phone", "buyer_mobile", "customer_phone"],
  buyer_address: ["buyeraddress", "buyer address", "address", "customer_address"],
  sale_value: ["salevalue", "sale value", "selling_price", "selling value"],
  finance_amount: ["financeamount", "finance amount", "loan_amount", "loan amount"],
  emi_amount: ["emiamount", "emi amount", "installment_amount", "installment amount"],
  sale_date: ["saledate", "sale date", "sold_date", "sold date"]
};

const EMI_FIELD_ALIASES = {
  buyer_id: ["buyerid", "buyer id", "customer_id"],
  emi_no: ["emino", "emi no", "installment_no", "installment no", "emi_number"],
  due_date: ["duedate", "due date", "emi_due_date", "payment_due_date"],
  paid_date: ["paiddate", "paid date", "payment_date"],
  amount: ["emi_amount", "emiamount", "installment_amount", "amount_due"],
  status: ["emi_status", "payment_status"]
};

function normalizeHeaderKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildAliasLookup(aliases = {}) {
  const map = new Map();
  Object.entries(aliases).forEach(([canonical, variants]) => {
    [canonical, ...(variants || [])].forEach(v => {
      const key = normalizeHeaderKey(v);
      if (key) map.set(key, canonical);
    });
  });
  return map;
}

function parseCSV(text, sep = ",") {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === sep && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((ch === "\n" || ch === "\r") && !inQuotes) {
      if (ch === "\r" && next === "\n") i += 1;
      row.push(field);
      if (row.some(c => String(c).trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some(c => String(c).trim() !== "")) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map(h => String(h || "").trim());
  return rows.slice(1).map(cols => {
    const out = {};
    headers.forEach((h, idx) => {
      out[h] = cols[idx] !== undefined ? String(cols[idx]).trim() : "";
    });
    return out;
  });
}

function normalizeRowKeys(rawRow, aliasLookup) {
  const out = {};
  Object.entries(rawRow || {}).forEach(([key, value]) => {
    const canonical = aliasLookup.get(normalizeHeaderKey(key)) || key;
    if ((out[canonical] === undefined || out[canonical] === "") && value !== undefined) {
      out[canonical] = String(value).trim();
    }
  });
  return out;
}

function toIntSafe(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = parseInt(v, 10);
  return Number.isNaN(n) ? null : n;
}
function toDateSafe(s) {
  if (!s) return null;
  const trimmed = String(s).trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return d;

  const mdy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (mdy) {
    let y = parseInt(mdy[3], 10);
    if (y < 100) y += 2000;
    const dd = new Date(y, parseInt(mdy[1], 10) - 1, parseInt(mdy[2], 10));
    if (!isNaN(dd.getTime())) return dd;
  }

  const dmy = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dmy) {
    const dd = new Date(parseInt(dmy[3], 10), parseInt(dmy[2], 10) - 1, parseInt(dmy[1], 10));
    if (!isNaN(dd.getTime())) return dd;
  }
  return null;
}
function daysBetween(aDate, bDate) {
  return Math.floor((aDate.getTime() - bDate.getTime()) / (1000 * 60 * 60 * 24));
}
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
function statusClassFor(displayStatus) {
  if (!displayStatus) return "";
  const s = displayStatus.toLowerCase();
  if (s === "paid") return "emi-paid";
  if (s === "overdue") return "emi-pending";
  return "emi-upcoming";
}
async function loadCSV(path) {
  const res = await fetch(path, {cache: "no-store"});
  if (!res.ok) throw new Error("Failed to load " + path + " (" + res.status + ")");
  const txt = await res.text();
  const raw = parseCSV(txt, ",");
  const isEmi = path.toLowerCase().includes("emi");
  const aliasLookup = buildAliasLookup(isEmi ? EMI_FIELD_ALIASES : FULL_FIELD_ALIASES);

  const normalized = raw.map(r => {
    const obj = normalizeRowKeys(r, aliasLookup);
    if (obj.vehicle_id !== undefined) obj.vehicle_id = toIntSafe(obj.vehicle_id);
    if (obj.buyer_id !== undefined) obj.buyer_id = toIntSafe(obj.buyer_id);
    if (obj.emi_no !== undefined) obj.emi_no = toIntSafe(obj.emi_no);
    if (obj.amount !== undefined) obj.amount = toIntSafe(obj.amount);
    if (obj.tenure !== undefined) obj.tenure = toIntSafe(obj.tenure);
    if (obj.sale_value !== undefined) obj.sale_value = toIntSafe(obj.sale_value);
    if (obj.finance_amount !== undefined) obj.finance_amount = toIntSafe(obj.finance_amount);
    if (obj.emi_amount !== undefined) obj.emi_amount = toIntSafe(obj.emi_amount);
    obj.paid_date = obj.paid_date ? obj.paid_date : "";
    obj.due_date = obj.due_date ? obj.due_date : "";
    obj.delay_days = (obj.delay_days !== undefined && obj.delay_days !== "") ? toIntSafe(obj.delay_days) : null;
    obj.computed_delay_days = computeDelayDisplay(obj.due_date, obj.paid_date);
    obj.display_status = determineDisplayStatus(obj.status, obj.due_date, obj.paid_date);
    obj.status_class = statusClassFor(obj.display_status);
    return obj;
  });
  return normalized;
}
window.loadCSV = loadCSV;
window.computeDelayDisplay = computeDelayDisplay;
window.determineDisplayStatus = determineDisplayStatus;
window.statusClassFor = statusClassFor;
window.parseCSV = parseCSV;
window.toDateSafe = toDateSafe;
