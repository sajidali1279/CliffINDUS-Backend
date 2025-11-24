import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* ---- Logo ---- */}
        <div
          onClick={() => navigate("/")}
          className="text-2xl font-extrabold tracking-wide cursor-pointer"
        >
          <span className="text-blue-400">Cliff</span>
          <span className="text-white">INDUS</span>
        </div>

        {/* ---- Links ---- */}
        <div className="hidden md:flex space-x-8 items-center text-sm font-medium">
          <button
            onClick={() => navigate("/")}
            className="hover:text-blue-400 transition"
          >
            Home
          </button>

          <button
            onClick={() => navigate("/catalog")}
            className="hover:text-blue-400 transition"
          >
            Catalog
          </button>

          {/* --- Register Dropdown --- */}
          <div
            className="relative"
            onMouseEnter={() => setShowDropdown(true)}
            onMouseLeave={() => setShowDropdown(false)}
          >
            <button className="hover:text-blue-400 transition">Register ▾</button>
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 mt-2 bg-white text-gray-800 rounded-md shadow-lg w-44 overflow-hidden"
                >
                  <DropdownItem
                    label="🏭 Wholesaler"
                    onClick={() => navigate("/register/wholesaler")}
                  />
                  <DropdownItem
                    label="🏪 Retailer"
                    onClick={() => navigate("/register/retailer")}
                  />
                  <DropdownItem
                    label="🧑‍🤝‍🧑 Customer"
                    onClick={() => navigate("/register/customer")}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={() => navigate("/login")}
            className="bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-md text-sm transition"
          >
            Login
          </button>
        </div>

        {/* ---- Mobile Menu Placeholder ---- */}
        <div className="md:hidden flex items-center">
          <p className="text-xs text-gray-400">Menu TBD</p>
        </div>
      </div>
    </nav>
  );
}

/* ------------------------------------------------------
   Reusable Dropdown Item Component
------------------------------------------------------ */
function DropdownItem({ label, onClick }) {
  return (
    <motion.button
      whileHover={{ backgroundColor: "#e0f2fe" }}
      onClick={onClick}
      className="block w-full text-left px-4 py-2 text-sm hover:bg-blue-50 transition"
    >
      {label}
    </motion.button>
  );
}
