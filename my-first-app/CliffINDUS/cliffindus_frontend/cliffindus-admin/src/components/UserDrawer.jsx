import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../api/axios";

export default function UserDrawer({ user, onClose, refreshUsers }) {
  const [localUser, setLocalUser] = useState(user);

  // Editable fields
  const [editedRole, setEditedRole] = useState(user.role);
  const [editedAdminType, setEditedAdminType] = useState(user.admin_type);

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [upgradeInfo, setUpgradeInfo] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setLocalUser(user);
    setEditedRole(user.role);
    setEditedAdminType(user.admin_type);
  }, [user]);

  // Load products, orders, upgrade info
  useEffect(() => {
    if (!localUser?.id) return;
    let cancelled = false;

    async function loadDetails() {
      setLoadingDetails(true);
      try {
        const [prodRes, orderRes, upgradeRes] = await Promise.all([
          api.get(`admin/users/${localUser.id}/products/`),
          api.get(`admin/users/${localUser.id}/orders/`),
          api.get(`admin/users/${localUser.id}/upgrade-request/`),
        ]);

        if (cancelled) return;

        setProducts(prodRes.data);
        setOrders(orderRes.data);
        setUpgradeInfo(upgradeRes.data);
      } catch {
        if (!cancelled) setError("Failed to load user details.");
      } finally {
        if (!cancelled) setLoadingDetails(false);
      }
    }

    loadDetails();
    return () => (cancelled = true);
  }, [localUser?.id]);

  if (!localUser) return null;

  const createdDate = localUser.created_at
    ? new Date(localUser.created_at).toLocaleString()
    : "—";

  const lastLogin = localUser.last_login
    ? new Date(localUser.last_login).toLocaleString()
    : "Never";

  // SAVE ROLE + ADMIN TYPE
  const handleSaveChanges = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`admin/users/${localUser.id}/set-role/`, {
        role: editedRole,
        admin_type: editedAdminType,
      });

      setLocalUser(res.data.user);

      // 🔥 refresh parent list
      if (refreshUsers) refreshUsers();

      alert("Changes saved.");
    } catch (err) {
      console.error(err);
      alert("Failed to save role/admin changes.");
    } finally {
      setActionLoading(false);
    }
  };

  // VERIFY / UNVERIFY
  const handleVerifyToggle = async (next) => {
    setActionLoading(true);
    try {
      const res = await api.post(`admin/users/${localUser.id}/verify/`, {
        is_verified: next,
      });

      setLocalUser(res.data.user);
      if (refreshUsers) refreshUsers();
    } catch {
      alert("Failed to update verification.");
    } finally {
      setActionLoading(false);
    }
  };

  // APPROVE OR REJECT REQUEST
  const handleUpgradeDecision = async (decision) => {
    if (!upgradeInfo?.has_pending) return;

    setActionLoading(true);
    try {
      await api.post(
        `admin/users/${localUser.id}/upgrade-request/${decision}/`
      );

      const updated = await api.get(
        `admin/users/${localUser.id}/upgrade-request/`
      );
      setUpgradeInfo(updated.data);

      if (refreshUsers) refreshUsers();
    } catch {
      alert("Failed to update upgrade request.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.3 }}
      className="fixed top-0 right-0 h-full w-96 bg-white shadow-xl border-l border-gray-300 z-50 flex flex-col"
    >
      {/* HEADER */}
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold">User Details</h2>
        <button onClick={onClose} className="text-2xl">
          &times;
        </button>
      </div>

      {/* CONTENT */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {/* Username */}
        <div>
          <p className="text-sm text-gray-500">Username</p>
          <p className="font-semibold text-lg">{localUser.username}</p>
        </div>

        {/* Email */}
        <div>
          <p className="text-sm text-gray-500">Email</p>
          <p>{localUser.email}</p>
        </div>

        {/* ROLE */}
        <div>
          <p className="text-sm text-gray-500">Role</p>
          <select
            value={editedRole}
            onChange={(e) => setEditedRole(e.target.value)}
            className="border px-3 py-2 rounded w-full text-sm"
          >
            <option value="consumer">Consumer</option>
            <option value="retailer">Retailer</option>
            <option value="wholesaler">Wholesaler</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* ADMIN TYPE */}
        <div>
          <p className="text-sm text-gray-500">Admin Type</p>
          <select
            value={editedAdminType}
            onChange={(e) => setEditedAdminType(e.target.value)}
            className="border px-3 py-2 rounded w-full text-sm"
          >
            <option value="none">No Admin Access</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        {/* SAVE BUTTON */}
        <button
          disabled={actionLoading}
          onClick={handleSaveChanges}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          {actionLoading ? "Saving…" : "Save Changes"}
        </button>

        {/* VERIFY */}
        <div>
          <p className="text-sm text-gray-500">Verification</p>
          <p>{localUser.is_verified ? "Verified" : "Not Verified"}</p>
        </div>

        {!localUser.is_verified ? (
          <button
            disabled={actionLoading}
            onClick={() => handleVerifyToggle(true)}
            className="w-full py-2 bg-green-600 rounded text-white"
          >
            Mark Verified
          </button>
        ) : (
          <button
            disabled={actionLoading}
            onClick={() => handleVerifyToggle(false)}
            className="w-full py-2 bg-yellow-500 rounded text-white"
          >
            Mark Unverified
          </button>
        )}

        {/* Created + login */}
        <div>
          <p className="text-sm text-gray-500">Created At</p>
          <p>{createdDate}</p>
        </div>

        <div>
          <p className="text-sm text-gray-500">Last Login</p>
          <p>{lastLogin}</p>
        </div>

        {/* PRODUCTS */}
        <div>
          <p className="text-sm font-semibold">Products ({products.length})</p>
          <ul className="max-h-32 overflow-y-auto text-sm">
            {products.length === 0 && (
              <p className="text-xs text-gray-400">No products.</p>
            )}
            {products.map((p) => (
              <li key={p.id} className="flex justify-between">
                <span>{p.name}</span>
                <span className="text-xs text-gray-500">${p.price}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* ORDERS */}
        <div>
          <p className="text-sm font-semibold">Orders ({orders.length})</p>
          <ul className="max-h-32 overflow-y-auto text-sm">
            {orders.length === 0 && (
              <p className="text-xs text-gray-400">No orders.</p>
            )}
            {orders.map((o) => (
              <li key={o.id} className="flex justify-between">
                <span>Order #{o.id}</span>
                <span className="text-xs text-gray-500">
                  {o.status} · ${o.total_price}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* UPGRADE REQUEST */}
        {upgradeInfo && (
          <div className="border-t pt-4">
            <p className="text-sm font-semibold">Role Upgrade Request</p>

            {!upgradeInfo.has_pending ? (
              <p className="text-xs text-gray-400">No pending request.</p>
            ) : (
              <>
                <p className="text-sm">
                  Requested Role:{" "}
                  <span className="font-semibold">
                    {upgradeInfo.request.requested_role}
                  </span>
                </p>

                <div className="flex gap-2 mt-3">
                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpgradeDecision("approve")}
                    className="flex-1 py-2 bg-green-600 text-white rounded"
                  >
                    Approve
                  </button>

                  <button
                    disabled={actionLoading}
                    onClick={() => handleUpgradeDecision("reject")}
                    className="flex-1 py-2 bg-red-600 text-white rounded"
                  >
                    Reject
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
