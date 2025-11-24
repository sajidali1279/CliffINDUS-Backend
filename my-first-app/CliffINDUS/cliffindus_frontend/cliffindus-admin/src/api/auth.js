import api from "./axios";

export async function getCurrentUser() {
  try {
    const res = await api.get("users/users/");
    return res.data?.[0] || null;
  } catch (err) {
    console.error("Cannot fetch user profile:", err);
    return null;
  }
}
