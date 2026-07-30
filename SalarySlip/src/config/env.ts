/** Where the Express API lives. Everything the UI shows comes from there. */
export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? "http://localhost:5000/api",
};
