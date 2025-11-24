import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { motion } from "framer-motion";

export default function WholesalerDashboard() {
  const [stats, setStats] = useState(null);
  const { theme } = useTheme();

  useEffect(() => {
    // Temporary placeholder until backend endpoints are ready
    setStats({
      inventory: 324,
      lowStock: 12,
      categories: 8,
      shipmentsPending: 5,
      shipmentsInProgress: 3,
      shipmentsDelivered: 44,
      topRetailers: [
        { name: "RetailMart", orders: 12 },
        { name: "ValueStore", orders: 9 },
        { name: "Denton Supplies", orders: 6 },
      ],
    });
  }, []);

  const isDark = theme === "dark";

  return (
    <Layout>
      <div
        className={`${isDark ? "text-gray-200" : "text-gray-800"} transition`}
      >
        {/* HEADER */}
        <h1 className="text-3xl font-bold mb-6">Wholesaler Control Center</h1>

        {/* TOP GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="Total Inventory"
            value={stats?.inventory}
            theme={theme}
          />
          <StatCard
            title="Low Stock Items"
            value={stats?.lowStock}
            theme={theme}
            warning
          />
          <StatCard
            title="Categories"
            value={stats?.categories}
            theme={theme}
          />
          <StatCard
            title="Pending Shipments"
            value={stats?.shipmentsPending}
            theme={theme}
            warning
          />
        </div>

        {/* SHIPMENT PIPELINE */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`rounded-xl p-6 shadow border mb-10 ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <h2 className="text-xl font-semibold mb-4">Shipment Pipeline</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <PipelineCard
              title="Pending"
              count={stats?.shipmentsPending}
              color="bg-yellow-500"
            />
            <PipelineCard
              title="In Progress"
              count={stats?.shipmentsInProgress}
              color="bg-blue-500"
            />
            <PipelineCard
              title="Delivered"
              count={stats?.shipmentsDelivered}
              color="bg-green-500"
            />
          </div>
        </motion.div>

        {/* RETAILER DEMAND */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className={`rounded-xl p-6 shadow border ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
          }`}
        >
          <h2 className="text-xl font-semibold mb-4">Top Retailer Demand</h2>
          <table className="w-full text-left">
            <thead>
              <tr
                className={`${
                  isDark ? "text-gray-300" : "text-gray-600"
                } text-sm`}
              >
                <th className="pb-2">Retailer</th>
                <th className="pb-2">Orders</th>
              </tr>
            </thead>
            <tbody>
              {stats?.topRetailers?.map((r, idx) => (
                <tr
                  key={idx}
                  className={`border-t ${
                    isDark ? "border-gray-700" : "border-gray-200"
                  } text-sm`}
                >
                  <td className="py-2">{r.name}</td>
                  <td>{r.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </Layout>
  );
}

/* -------------------------------------------
   STAT CARD COMPONENT
--------------------------------------------*/
function StatCard({ title, value, theme, warning }) {
  const isDark = theme === "dark";
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`p-6 rounded-xl shadow border transition ${
        isDark
          ? "bg-gray-800 text-gray-200 border-gray-700"
          : "bg-white text-gray-800 border-gray-200"
      }`}
    >
      <p className={`text-sm ${warning ? "text-red-500" : "opacity-70"}`}>
        {title}
      </p>
      <p className="text-3xl font-bold mt-2">{value ?? "-"}</p>
    </motion.div>
  );
}

/* -------------------------------------------
   PIPELINE CARD
--------------------------------------------*/
function PipelineCard({ title, count, color }) {
  return (
    <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-700">
      <p className="text-sm opacity-70">{title}</p>
      <div className="flex items-center justify-between mt-2">
        <span className="text-2xl font-bold">{count}</span>
        <span className={`h-3 w-3 rounded-full ${color}`}></span>
      </div>
    </div>
  );
}
