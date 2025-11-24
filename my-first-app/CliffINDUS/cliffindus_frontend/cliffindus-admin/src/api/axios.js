import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000/api/",
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");

  // FIX: Ensure headers object exists
  if (!config.headers) config.headers = {};

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Auto refresh token
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      try {
        const refresh = localStorage.getItem("refresh");
        if (!refresh) throw new Error("No refresh token");

        const res = await axios.post(
          "http://localhost:8000/api/users/auth/refresh/",
          { refresh }
        );

        const newAccess = res.data.access;
        localStorage.setItem("access", newAccess);

        original.headers.Authorization = `Bearer ${newAccess}`;
        return api(original);
      } catch (err) {
        localStorage.clear();
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
