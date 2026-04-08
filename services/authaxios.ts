import axios from "axios";
import { jwtDecode } from "jwt-decode";
import { BASE_URL } from "@/constants/config";
import { storage } from "./storage";

const BASE = `${BASE_URL}/api/`;

export default async function getAuthAxios() {
  let access = await storage.get("access_token");
  const refresh = await storage.get("refresh_token");

  try {
    if (access) {
      const decoded: any = jwtDecode(access);
      const exp = decoded.exp;

      if (Date.now() >= exp * 1000 && refresh) {
        const res = await axios.post(`${BASE}auth/token/refresh/`, {
          refresh,
        });

        access = res.data.access;
        await storage.set("access_token", access);
      }
    }

    if (!access) throw new Error("No token");

    return axios.create({
      baseURL: BASE,
      headers: {
        Authorization: `Bearer ${access}`,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    await storage.remove("access_token");
    await storage.remove("refresh_token");
    throw new Error("Session expired");
    
  }
  
}
