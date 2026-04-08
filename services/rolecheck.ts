import { storage } from "@/services/storage";

export async function getUser() {
  const user = await storage.get("user");
  return user ? JSON.parse(user) : null;
}

export async function getUserRole() {
  const user = await getUser();
  return user?.role?.toLowerCase() || "employee";
}

export async function isManager() {
  return (await getUserRole()) === "manager";
}

export async function isHR() {
  return (await getUserRole()) === "hr";
}

export async function isEmployee() {
  return (await getUserRole()) === "employee";
}