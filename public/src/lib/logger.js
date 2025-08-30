export const LOG_EVENTS = {
  API_START: "API_START",
  API_SUCCESS: "API_SUCCESS",
  API_ERROR: "API_ERROR",
  SELECT_CUSTOMER: "SELECT_CUSTOMER",
  CHANGE_FILTER: "CHANGE_FILTER",
  PAGINATE: "PAGINATE"
};

export function logEvent(type, details = {}) {
  const rec = { type, ts: new Date().toISOString(), ...details };
  console.info("[LOG]", rec);
  try {
    const key = "rr_logs";
    const buf = JSON.parse(localStorage.getItem(key) || "[]");
    buf.push(rec);
    if (buf.length > 200) buf.shift();
    localStorage.setItem(key, JSON.stringify(buf));
  } catch {}
}
