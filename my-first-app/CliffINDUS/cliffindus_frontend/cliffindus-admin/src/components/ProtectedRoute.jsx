import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import api from "../api/axios";

export default function ProtectedRoute({ children, allowedRoles }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const location = useLocation();

  // Public pages (always allowed)
  const PUBLIC_PATHS = [
    "/",
    "/login",
    "/catalog",
    "/register",
    "/register/customer",
    "/register/retailer",
    "/register/wholesaler",
    "/pending-approval",
  ];

  if (PUBLIC_PATHS.includes(location.pathname)) {
    return children;
  }

  useEffect(() => {
    let mounted = true;

    async function fetchMe() {
      try {
        const res = await api.get("users/me/");
        if (mounted) setUser(res.data);
      } catch (err) {
        console.error("ProtectedRoute: /me failed:", err);
        if (mounted) setUser(null);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchMe();
    return () => {
      mounted = false;
    };
  }, []);

  // Show loading
  if (loading) return <div className="p-6 text-center">Loading…</div>;

  // Not logged in → redirect to login
  if (!user) return <Navigate to="/login" />;

  // Determine the user's effective role
  const role =
    user.admin_type === "super_admin"
      ? "super_admin"
      : user.admin_type === "admin"
      ? "admin"
      : user.role;

  // Unauthorized → redirect to correct dashboard
  if (allowedRoles && !allowedRoles.includes(role)) {
    switch (role) {
      case "super_admin":
      case "admin":
        return <Navigate to="/admin-dashboard" replace />;

      case "wholesaler":
        return <Navigate to="/wholesaler-dashboard" replace />;

      case "retailer":
        return <Navigate to="/retailer-dashboard" replace />;

      case "consumer":
      default:
        return <Navigate to="/catalog" replace />;
    }
  }

  // Authorized → allow access
  return children;
}
