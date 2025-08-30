import { LAST_N_MONTHS_DEFAULT, YEARS } from "../constants.js";

export const state = {
  customers: [],
  transactions: [],
  selectedCustomer: null,
  filter: {
    year: YEARS[0],
    months: "LAST_3"
  },
  ui: {
    loading: true,
    error: null,
    page: 1
  }
};
