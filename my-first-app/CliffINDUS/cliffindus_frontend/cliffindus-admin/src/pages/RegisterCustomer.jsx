import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import { motion } from "framer-motion";

export default function RegisterCustomer() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("users/register/", {
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });

      // 🔐 Auto-login (store tokens)
      localStorage.setItem("access", res.data.access);
      localStorage.setItem("refresh", res.data.refresh);

      setSuccess(true);

      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (err) {
      console.error("Registration error:", err);

      const detail =
        err.response?.data?.detail ||
        err.response?.data ||
        "Registration failed. Try again later.";

      setError(
        typeof detail === "string" ? detail : JSON.stringify(detail, null, 2)
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-xl"
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-3xl font-bold text-gray-800">
              Create Your Customer Account
            </h1>
            <p className="text-gray-500 mt-1">
              Shopping starts with a quick and secure signup.
            </p>
          </div>

          {/* Success */}
          {success ? (
            <div className="bg-green-100 border border-green-300 text-green-800 p-4 rounded text-center">
              <p className="text-lg font-semibold">
                ✅ Account created successfully!
              </p>
              <p className="text-sm mt-1">Redirecting to your dashboard…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error */}
              {error && (
                <p className="text-red-600 bg-red-50 border border-red-200 p-2 rounded text-sm text-center">
                  {error}
                </p>
              )}

              {/* Form Fields */}
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                />
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                />
                <Input
                  label="Phone Number"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                />
                <Input
                  label="Password"
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                />
                <Input
                  label="Confirm Password"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
              </div>

              <motion.button
                type="submit"
                whileHover={{ scale: loading ? 1 : 1.03 }}
                className={`w-full py-2 rounded text-white font-semibold transition ${
                  loading
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {loading ? "Creating Account…" : "Register"}
              </motion.button>

              <p className="text-center text-sm text-gray-600 mt-2">
                Already have an account?{" "}
                <span
                  className="text-blue-600 cursor-pointer hover:underline"
                  onClick={() => navigate("/login")}
                >
                  Log In
                </span>
              </p>
            </form>
          )}
        </motion.div>
      </div>

      <footer className="bg-gray-900 text-gray-400 text-center py-6">
        <p>© {new Date().getFullYear()} CliffINDUS | Customer Portal</p>
      </footer>
    </div>
  );
}

function Input({ label, name, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-gray-700 text-sm mb-1">{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required
        className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
