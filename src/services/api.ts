import axios from "axios";

const api = axios.create({
  // Mantém os endpoints /api/v1/* atuais e permite proxy do Vite em desenvolvimento.
  baseURL: import.meta.env.VITE_API_URL ?? "",
  timeout: 30_000,
});

export default api;
