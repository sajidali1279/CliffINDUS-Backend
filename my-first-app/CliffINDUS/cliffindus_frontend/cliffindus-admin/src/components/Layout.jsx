import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import api from "../api/axios";

export default function Layout({ children }) {
  const [user, setUser] = useState(null);
  const [openSidebar, setOpenSidebar] = useState(false);

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await api.get("users/me/");
        setUser(res.data);
      } catch (err) {
        console.error("Layout: Failed to load user", err);
        setUser(null);
      }
    }
    loadUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    window.location.href = "/login";
  };

  // Role badge text
  const role =
    user?.admin_type === "super_admin"
      ? "Super Admin"
      : user?.admin_type === "admin"
      ? "Admin"
      : user?.role
      ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
      : "";

  return (
    <div className="min-h-screen w-full bg-white-100 flex">
      {/* -------------- SIDEBAR (Mobile + Desktop) -------------- */}
      <Sidebar
        show={openSidebar}
        onClose={() => setOpenSidebar(false)}
        user={user}
      />

      {/* -------------- MAIN CONTENT AREA -------------- */}
      <div className="flex-1 lg:ml-64 flex flex-col">
        {/* ---------------- TOPBAR ---------------- */}
        <header className="bg-white shadow px-6 py-4 mb-6 flex justify-between items-center">
          {/* LEFT SIDE: Hamburger + Title */}
          <div className="flex items-center gap-4">
            {/* MOBILE HAMBURGER */}
            <button
              className="lg:hidden p-2 rounded hover:bg-gray-200"
              onClick={() => setOpenSidebar(true)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-7 h-7 text-gray-700"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            </button>

            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                CliffINDUS Portal
              </h2>
              {user && (
                <p className="text-sm text-gray-500">
                  Welcome, <span className="font-medium">{user.username}</span>
                </p>
              )}
            </div>
          </div>

          {/* RIGHT SIDE: Role Badge + Logout */}
          <div className="flex items-center gap-4">
            {user && (
              <span className="px-3 py-1 text-sm rounded-full bg-blue-100 text-blue-700 border border-blue-300">
                {role}
              </span>
            )}

            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </header>

        {/* -------------- MAIN PAGE CONTENT -------------- */}
        <main className="flex-1 px-6">{children}</main>

        {/* -------------- FOOTER -------------- */}
        <footer className="text-center text-gray-500 text-sm mt-12 py-6">
          © {new Date().getFullYear()} CliffINDUS — Secure Commerce Platform
        </footer>
      </div>
    </div>
  );
}
