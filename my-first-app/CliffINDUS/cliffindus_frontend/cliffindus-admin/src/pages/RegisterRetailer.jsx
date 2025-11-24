import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import Navbar from "../components/Navbar";

export default function RegisterRetailer() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    business_name: "",
    business_license: null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setForm({ ...form, [name]: files ? files[0] : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      // Step 1 → Register user as consumer
      const registerRes = await api.post("users/register/", {
        username: form.username,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });

      localStorage.setItem("access", registerRes.data.access);
      localStorage.setItem("refresh", registerRes.data.refresh);

      // Step 2 → Submit retailer upgrade request
      const formData = new FormData();
      formData.append("requested_role", "retailer");
      formData.append("business_name", form.business_name);
      if (form.business_license)
        formData.append("business_license", form.business_license);

      await api.post("users/upgrade-requests/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Redirect to approval screen
      navigate("/pending-approval");
    } catch (err) {
      console.error("Retailer registration failed:", err);
      setError(
        err.response?.data?.detail ||
          "Registration failed. Please check your details."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-100 flex flex-col text-gray-800">
      <Navbar />

      <div className="flex flex-col justify-center items-center flex-grow px-6 py-20">
        <h1 className="text-3xl font-bold mb-6 text-gray-900">
          Retailer Registration
        </h1>

        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-md p-8 w-full max-w-lg space-y-5"
        >
          {error && (
            <p className="text-red-600 text-sm text-center bg-red-50 border border-red-200 p-2 rounded">
              {error}
            </p>
          )}

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
              label="Phone"
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

          <Input
            label="Business Name"
            name="business_name"
            value={form.business_name}
            onChange={handleChange}
          />

          <div>
            <label className="block text-sm mb-1 font-medium text-gray-700">
              Business License (PDF or image)
            </label>
            <input
              type="file"
              name="business_license"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleChange}
              className="w-full border border-gray-300 rounded px-3 py-2 bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full text-white py-2 rounded transition ${
              loading
                ? "bg-emerald-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700"
            }`}
          >
            {loading ? "Submitting..." : "Register & Submit for Verification"}
          </button>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{" "}
            <span
              className="text-blue-600 cursor-pointer hover:underline"
              onClick={() => navigate("/login")}
            >
              Login here
            </span>
          </p>
        </form>
      </div>
    </div>
  );
}

function Input({ label, name, value, onChange, type = "text" }) {
  return (
    <div>
      <label className="block text-sm mb-1 font-medium text-gray-700">
        {label}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        required
        className="w-full border border-gray-300 rounded px-3 py-2 focus:ring-2 focus:ring-emerald-500"
      />
    </div>
  );
}
