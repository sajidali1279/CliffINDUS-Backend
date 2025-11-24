import { useState } from "react";
import { motion } from "framer-motion";
import Navbar from "../../components/Navbar";

export default function CustomerHome() {
  const [search, setSearch] = useState("");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      {/* 🟦 HERO SECTION */}
      <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-extrabold mb-4"
          >
            Welcome to CliffINDUS Marketplace
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-lg opacity-90"
          >
            Explore the best deals from verified retailers near you.
          </motion.p>

          {/* 🔍 Search */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8"
          >
            <input
              type="text"
              placeholder="Search products, categories or brands..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xl mx-auto block px-4 py-3 rounded-full shadow-lg text-black outline-none focus:ring-4 focus:ring-blue-300"
            />
          </motion.div>
        </div>
      </section>

      {/* 🟡 FILTER BAR */}
      <div className="max-w-5xl mx-auto mt-6 px-6">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {["All", "Electronics", "Groceries", "Clothing", "Pharmacy"].map(
            (f) => (
              <button
                key={f}
                className="px-4 py-2 bg-white shadow-sm rounded-full border hover:bg-blue-50 whitespace-nowrap"
              >
                {f}
              </button>
            )
          )}
        </div>
      </div>

      {/* 🛍 PRODUCT LIST PLACEHOLDER */}
      <div className="max-w-5xl mx-auto px-6 mt-10">
        <h2 className="text-xl font-bold text-gray-800 mb-4">
          Popular Products
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((p) => (
            <div
              key={p}
              className="bg-white shadow-sm rounded-lg p-4 hover:shadow-md transition"
            >
              <div className="bg-gray-200 h-32 rounded mb-3"></div>
              <p className="text-gray-700 font-medium">Product Name</p>
              <p className="text-blue-600 font-bold">$00.00</p>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="text-center mt-auto py-6 text-gray-500">
        © {new Date().getFullYear()} CliffINDUS Marketplace
      </footer>
    </div>
  );
}
