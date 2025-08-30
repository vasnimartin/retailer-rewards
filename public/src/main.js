import { fetchTransactions } from "./services/mockApi.js";
import { state } from "./store/state.js";
import { initControls, render } from "./ui/render.js";

async function boot() {
  console.log("Booting Retailer Rewards…");
  initControls();
  state.ui.loading = true;
  render();
  try {
    const data = await fetchTransactions();
    state.transactions = data;
    state.ui.loading = false;
    state.ui.error = null;
  } catch (e) {
    state.ui.loading = false;
    state.ui.error = e.message || "Failed to load";
  } finally {
    render();
  }
}

boot();
