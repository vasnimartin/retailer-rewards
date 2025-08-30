import { LOG_EVENTS, logEvent } from "../lib/logger.js";
import { API_DELAY_MS, API_FAIL_RATE } from "../constants.js";

export async function fetchTransactions() {
  logEvent(LOG_EVENTS.API_START, { endpoint: "transactions" });
  await new Promise((r) => setTimeout(r, API_DELAY_MS));

  if (Math.random() < API_FAIL_RATE) {
    const err = new Error("Network error (simulated)");
    logEvent(LOG_EVENTS.API_ERROR, { endpoint: "transactions", message: err.message });
    throw err;
  }

  const res = await fetch("./data/transactions.json");
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`);
    logEvent(LOG_EVENTS.API_ERROR, { endpoint: "transactions", message: err.message });
    throw err;
  }
  const data = await res.json();
  logEvent(LOG_EVENTS.API_SUCCESS, { count: data.length });
  return data;
}
