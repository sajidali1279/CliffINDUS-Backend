import { NavLink } from "react-router-dom";
import { useEffect } from "react";

export default function Sidebar({ show, onClose, user }) {
  /* ---------------------------------------------------
     ROUTES PER ROLE (CLEAN + UPDATED)
  --------------------------------------------------- */

  // Routes for ALL users
  const PUBLIC_ROUTES = [{ name: "Public Catalog", path: "/catalog" }];

  // Super Admin + Admin
  const ADMIN_ROUTES = [
    { name: "Admin Dashboard", path: "/admin-dashboard" },
    { name: "Users", path: "/users" },
    { name: "Role Requests", path: "/role-requests" },
  ];

  // Wholesaler
  const WHOLESALER_ROUTES = [
    { name: "Wholesaler Dashboard", path: "/wholesaler-dashboard" },
    { name: "Orders", path: "/orders" },
  ];

  // Retailer
  const RETAILER_ROUTES = [
    { name: "Retailer Dashboard", path: "/retailer-dashboard" },
    { name: "Products", path: "/products" },
    { name: "Orders", path: "/orders" },
  ];

  /* ---------------------------------------------------
     DETERMINE USER ROUTE ACCESS
  --------------------------------------------------- */

  let links = [...PUBLIC_ROUTES];

  if (user?.admin_type === "super_admin" || user?.admin_type === "admin") {
    links = [...ADMIN_ROUTES, ...PUBLIC_ROUTES];
  } else if (user?.role === "wholesaler") {
    links = [...WHOLESALER_ROUTES, ...PUBLIC_ROUTES];
  } else if (user?.role === "retailer") {
    links = [...RETAILER_ROUTES, ...PUBLIC_ROUTES];
  } else {
    // Consumer should see ONLY public catalog
    links = [...PUBLIC_ROUTES];
  }

  /* ---------------------------------------------------
     AUTO-CLOSE SIDEBAR ON WINDOW RESIZE (Mobile)
  --------------------------------------------------- */
  useEffect(() => {
    const close = () => onClose();
    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  return (
    <>
      {/* BACKDROP (Mobile Only) */}
      {show && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-gray-800 text-gray-100 z-50
          transform transition-transform duration-300
          ${show ? "translate-x-0" : "-translate-x-64"}
          lg:translate-x-0
        `}
      >
        <div className="p-6 text-xl font-bold border-b border-gray-700">
          CliffINDUS Portal
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => (
            <NavLink
              key={link.name}
              to={link.path}
              onClick={onClose}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-700 hover:text-white"
                }`
              }
            >
              {link.name}
            </NavLink>
          ))}
        </nav>
      </aside>
    </>
  );
}
