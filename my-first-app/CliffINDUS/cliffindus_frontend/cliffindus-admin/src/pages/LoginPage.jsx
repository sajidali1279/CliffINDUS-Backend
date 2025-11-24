import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { motion } from "framer-motion";
import Navbar from "../components/Navbar";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auto redirect if already logged in
  useEffect(() => {
    const checkExistingLogin = async () => {
      if (!localStorage.getItem("access")) return;

      try {
        const res = await api.get("users/me/");
        const user = res.data;

        const role =
          user.admin_type === "super_admin"
            ? "super_admin"
            : user.admin_type === "admin"
            ? "admin"
            : user.role;

        const verified = user.is_verified;

        // AUTO-REDIRECT BASED ON ROLE
        if (role === "super_admin" || role === "admin") {
          navigate("/admin-dashboard");
        } else if (role === "wholesaler") {
          navigate(verified ? "/wholesaler-dashboard" : "/pending-approval");
        } else if (role === "retailer") {
          navigate(verified ? "/retailer-dashboard" : "/pending-approval");
        } else {
          navigate("/catalog");
        }
      } catch (err) {
        console.error("Auto redirect failed:", err);
      }
    };

    checkExistingLogin();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.post("users/auth/login/", { username, password });

      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);

      const meRes = await api.get("users/me/");
      const user = meRes.data;

      const role =
        user.admin_type === "super_admin"
          ? "super_admin"
          : user.admin_type === "admin"
          ? "admin"
          : user.role;

      const verified = user.is_verified;

      // REDIRECT BASED ON ROLE
      if (role === "super_admin" || role === "admin") {
        return navigate("/admin-dashboard");
      }

      if (role === "wholesaler") {
        return navigate(
          verified ? "/wholesaler-dashboard" : "/pending-approval"
        );
      }

      if (role === "retailer") {
        return navigate(verified ? "/retailer-dashboard" : "/pending-approval");
      }

      // CUSTOMER
      return navigate("/catalog");
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.status === 401
          ? "Invalid username or password."
          : "Unable to connect. Try again later."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50">
      <Navbar />

      <div className="flex flex-1 items-center justify-center px-6 py-20">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md space-y-6"
        >
          <h2 className="text-2xl font-bold text-gray-800">Login</h2>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 p-2 rounded">
              {error}
            </p>
          )}

          <div>
            <label className="block text-gray-700 text-sm mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-2 rounded-md font-semibold ${
              loading
                ? "bg-blue-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            whileHover={{ scale: loading ? 1 : 1.03 }}
          >
            {loading ? "Logging in…" : "Login"}
          </motion.button>
        </motion.form>
      </div>
    </div>
  );
}
