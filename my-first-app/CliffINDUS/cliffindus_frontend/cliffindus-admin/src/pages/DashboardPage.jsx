import { useEffect, useState } from "react";
import api from "../api/axios";
import Layout from "../components/Layout";
import { motion } from "framer-motion";
import {
  Users,
  ShieldCheck,
  AlertCircle,
  Package,
  ShoppingCart,
  Activity,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function fetchMetrics() {
      try {
        const res = await api.get("admin/metrics/");
        if (!mounted) return;
        setMetrics(res.data);
      } catch (err) {
        console.error("Failed to load admin metrics:", err);
        if (!mounted) return;

        if (err.response?.status === 403) {
          setError("You do not have permission to view admin metrics.");
        } else {
          setError("Unable to load dashboard data. Please try again later.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchMetrics();
    return () => {
      mounted = false;
    };
  }, []);

  const summary = metrics?.summary || {};
  const users = summary.users || {};
  const products = summary.products || {};
  const orders = summary.orders || {};
  const upgradeRequests = summary.upgrade_requests || {};

  const totalUsers = users.total ?? 0;
  const verifiedUsers = users.verified ?? 0;
  const unverifiedUsers = users.unverified ?? 0;

  const totalProducts = products.total ?? 0;
  const verifiedProducts = products.verified ?? 0;
  const unverifiedProducts = products.unverified ?? 0;

  const totalOrders = orders.total ?? 0;
  const activeOrders = orders.active ?? 0;

  // Robust count for upgrade requests (supports array or object)
  let pendingUpgradeCount = 0;
  if (Array.isArray(upgradeRequests)) {
    pendingUpgradeCount = upgradeRequests.length;
  } else if (
    upgradeRequests &&
    typeof upgradeRequests === "object" &&
    Object.keys(upgradeRequests).length > 0
  ) {
    pendingUpgradeCount = Object.keys(upgradeRequests).length;
  }

  // Role distribution for chart (users.by_role)
  const roleBreakdown = users.by_role || {};
  const roleData = Object.entries(roleBreakdown).map(([role, count]) => ({
    role,
    count,
  }));

  const hasRoleData = roleData.length > 0;

  if (loading) {
    return (
      <Layout>
        <div className="p-8 text-gray-700 text-lg">
          Loading admin dashboard…
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-8">
          <div className="max-w-xl mx-auto bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
            <p className="font-semibold mb-1">Dashboard Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* HEADER */}
        <div className="flex flex-col gap-2 mb-2">
          <h1 className="text-2xl font-semibold text-gray-900">
            Admin Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Platform overview · users, products, and operational health.
          </p>
        </div>

        {/* KPI CARDS */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
          {/* Total Users */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Total Users
              </p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {totalUsers}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Verified: {verifiedUsers} · Unverified: {unverifiedUsers}
              </p>
            </div>
            <div className="p-3 rounded-full bg-blue-50">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </motion.div>

          {/* Products */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Products
              </p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {totalProducts}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Verified: {verifiedProducts} · Unverified: {unverifiedProducts}
              </p>
            </div>
            <div className="p-3 rounded-full bg-emerald-50">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
          </motion.div>

          {/* Orders */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Orders
              </p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {totalOrders}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Active: {activeOrders}
              </p>
            </div>
            <div className="p-3 rounded-full bg-amber-50">
              <ShoppingCart className="w-5 h-5 text-amber-600" />
            </div>
          </motion.div>

          {/* Pending Role Upgrades */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between"
          >
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">
                Pending Role Requests
              </p>
              <p className="text-2xl font-semibold text-gray-900 mt-1">
                {pendingUpgradeCount}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Requests waiting for admin review.
              </p>
            </div>
            <div className="p-3 rounded-full bg-red-50">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
          </motion.div>
        </div>

        {/* MIDDLE: ROLE CHART + SNAPSHOT */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {/* Role Distribution Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 xl:col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-medium text-gray-800">
                  User Role Distribution
                </p>
                <p className="text-xs text-gray-500">
                  Current breakdown of admins, retailers, wholesalers, and
                  consumers.
                </p>
              </div>
              <Activity className="w-5 h-5 text-gray-400" />
            </div>

            {/* FIX: prevent chart from rendering when container width = 0 */}
            {metrics && hasRoleData ? (
              <div className="h-64 w-full min-h-[260px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={roleData}
                    margin={{ top: 8, right: 8, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="role" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" name="Users" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-32 flex items-center justify-center text-sm text-gray-400">
                No role breakdown data available yet.
              </div>
            )}
          </div>

          {/* System Snapshot */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-800">System Snapshot</p>
            <p className="text-xs text-gray-500">
              High-level system indicators. You can wire these to real metrics
              later.
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">API Status</span>
                <span className="text-emerald-600 font-medium">Healthy</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Active Orders</span>
                <span className="text-gray-900 font-medium">
                  {activeOrders}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Users</span>
                <span className="text-gray-900 font-medium">{totalUsers}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Products</span>
                <span className="text-gray-900 font-medium">
                  {totalProducts}
                </span>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-gray-400">
              Backend metrics source: <code>/api/admin/metrics/</code>
            </div>
          </div>
        </div>

        {/* BOTTOM: ROLE REQUESTS PANEL (EMPTY STATE FOR NOW) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-gray-800">
                Role Upgrade Requests
              </p>
              <p className="text-xs text-gray-500">
                When users request retailer / wholesaler access, they will
                appear here.
              </p>
            </div>
            <ShieldCheck className="w-5 h-5 text-gray-400" />
          </div>

          {pendingUpgradeCount === 0 ? (
            <div className="py-8 text-sm text-gray-400 text-center border border-dashed border-gray-200 rounded-lg">
              No pending role upgrade requests at the moment.
            </div>
          ) : (
            <div className="text-sm text-gray-600">
              {/* 
                TODO: When you implement real upgrade_requests list,
                replace this placeholder with a table over that data.
              */}
              There are {pendingUpgradeCount} requests in the queue.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
