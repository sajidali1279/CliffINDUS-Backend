import { useEffect, useState } from "react";
import Layout from "../../components/Layout";
import { useTheme } from "../../hooks/useTheme";

export default function RetailerDashboard() {
  const [stats, setStats] = useState(null);
  const { theme } = useTheme(); // "light" or "dark"

  useEffect(() => {
    async function loadStats() {
      // Placeholder until backend endpoint is ready
      setStats({
        wholesalers: 12,
        products: 85,
        orders: 26,
        revenue: 15420,
      });
    }
    loadStats();
  }, []);

  const cardStyle =
    theme === "dark"
      ? "bg-gray-800 text-gray-200 border border-gray-700"
      : "bg-white text-gray-800 border border-gray-200";

  return (
    <Layout>
      <div
        className={`transition ${
          theme === "dark" ? "text-gray-200" : "text-gray-800"
        }`}
      >
        <h1 className="text-3xl font-bold mb-6">Retailer Dashboard</h1>

        {/* GRID CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <DashboardCard
            title="Wholesalers"
            value={stats?.wholesalers}
            theme={theme}
          />
          <DashboardCard
            title="Products"
            value={stats?.products}
            theme={theme}
          />
          <DashboardCard title="Orders" value={stats?.orders} theme={theme} />
          <DashboardCard
            title="Revenue"
            value={`$${stats?.revenue}`}
            theme={theme}
          />
        </div>

        {/* Additional retailer sections can go here */}
        <div className="mt-10 p-6 rounded-xl shadow-sm bg-white">
          <h2 className="text-xl font-semibold mb-2">Next Features</h2>
          <p className="text-gray-600">
            Retailer product management, wholesaler directory, and advanced
            filtering will be added soon.
          </p>
        </div>
      </div>
    </Layout>
  );
}

function DashboardCard({ title, value, theme }) {
  return (
    <div
      className={`p-6 rounded-xl shadow border transition ${
        theme === "dark"
          ? "bg-gray-800 text-gray-200 border-gray-700"
          : "bg-white text-gray-800 border-gray-200"
      }`}
    >
      <p className="text-sm opacity-75">{title}</p>
      <p className="text-3xl font-bold mt-2">
        {value !== undefined ? value : "-"}
      </p>
    </div>
  );
}
