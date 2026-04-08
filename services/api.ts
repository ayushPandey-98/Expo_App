import axios from "axios";
import { BASE_URL } from "@/constants/config";
import { storage } from "./storage";

const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use(async (config) => {
  const token = await storage.get("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refresh = await storage.get("refresh_token");

      try {
        const res = await axios.post(
  `${BASE_URL}/api/auth/token/refresh`,
  { refresh_token: refresh }
);

        const newAccess = res.data.access;

        await storage.set("access_token", newAccess);

        originalRequest.headers.Authorization = `Bearer ${newAccess}`;

        return api(originalRequest);
      } catch {
        await storage.remove("access_token");
        await storage.remove("refresh_token");
      }
    }

    return Promise.reject(error);
  }
);

export default api;