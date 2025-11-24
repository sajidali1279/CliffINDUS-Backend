import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";
import {
  User,
  ShieldCheck,
  ShieldAlert,
  Package,
  ShoppingCart,
  ArrowLeft,
  CheckCircle,
  XCircle,
} from "lucide-react";

export default function UserDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [upgrade, setUpgrade] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadAll = async () => {
    try {
      const [u, up] = await Promise.all([
        api.get(`users/${id}/`),
        api.get(`admin/users/${id}/upgrade-request/`),
      ]);
      setUser(u.data);
      setUpgrade(up.data);
    } catch (err) {
      console.error("Load failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const approve = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`admin/users/${id}/upgrade-request/approve/`, {
        admin_comment: "Approved by admin",
      });
      setMessage(res.data.detail || "Action completed.");
      loadAll();
    } catch (err) {
      setMessage("Failed to approve request.");
    }
    setActionLoading(false);
  };

  const reject = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`admin/users/${id}/upgrade-request/reject/`, {
        admin_comment: "Rejected by admin",
      });
      setMessage(res.data.detail || "Action completed.");
      loadAll();
    } catch (err) {
      setMessage("Failed to reject request.");
    }
    setActionLoading(false);
  };

  const toggleVerify = async () => {
    setActionLoading(true);
    try {
      const res = await api.post(`admin/users/${id}/verify/`, {
        is_verified: !user.is_verified,
      });
      setMessage(res.data.detail || "Action completed.");
      setUser(res.data.user);
    } catch (err) {
      setMessage("Verification update failed.");
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <Layout>
        <div className="p-6">Loading user…</div>
      </Layout>
    );
  }

  const role = user.admin_type || user.role;

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Back */}
        <button onClick={() => navigate(-1)} className="text-sm text-gray-600">
          <ArrowLeft className="inline w-4 h-4" /> Back
        </button>

        {message && (
          <div className="bg-blue-50 border border-blue-100 px-4 py-2 rounded">
            {message}
          </div>
        )}

        {/* USER HEADER */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-full">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">{user.username}</h2>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <span className="px-3 py-1 bg-gray-100 rounded-full text-xs">
              Role: {role}
            </span>

            {user.is_verified ? (
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                <ShieldCheck className="inline w-4 h-4" /> Verified
              </span>
            ) : (
              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                <ShieldAlert className="inline w-4 h-4" /> Unverified
              </span>
            )}

            <button
              onClick={toggleVerify}
              disabled={actionLoading}
              className="ml-auto text-xs px-3 py-1 border rounded"
            >
              {user.is_verified ? "Mark Unverified" : "Mark Verified"}
            </button>
          </div>
        </div>

        {/* ROLE UPGRADE */}
        <div className="bg-white p-6 rounded-xl shadow-sm border space-y-2">
          <p className="text-sm font-semibold">Role Upgrade Request</p>

          {!upgrade?.has_pending ? (
            <p className="text-xs text-gray-500">No pending request.</p>
          ) : (
            <div className="border p-3 rounded">
              <p className="text-sm">
                Requested Role: <b>{upgrade.request.requested_role}</b>
              </p>
              <p className="text-xs text-gray-500">
                Submitted:{" "}
                {new Date(upgrade.request.created_at).toLocaleString()}
              </p>

              <div className="flex gap-3 mt-3">
                <button
                  onClick={approve}
                  className="bg-green-600 text-white px-3 py-1 rounded text-xs"
                  disabled={actionLoading}
                >
                  <CheckCircle className="inline w-4 h-4 mr-1" />
                  Approve
                </button>

                <button
                  onClick={reject}
                  className="bg-red-600 text-white px-3 py-1 rounded text-xs"
                  disabled={actionLoading}
                >
                  <XCircle className="inline w-4 h-4 mr-1" />
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>

        {/* PRODUCTS & ORDERS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(role === "retailer" || role === "wholesaler") && (
            <button
              onClick={() => navigate(`/admin/users/${id}/products`)}
              className="p-4 bg-white border rounded-xl flex items-center gap-3"
            >
              <Package className="w-5 h-5 text-green-600" />
              View {role}'s Products
            </button>
          )}

          <button
            onClick={() => navigate(`/admin/users/${id}/orders`)}
            className="p-4 bg-white border rounded-xl flex items-center gap-3"
          >
            <ShoppingCart className="w-5 h-5 text-blue-600" />
            View {role}'s Orders
          </button>
        </div>
      </div>
    </Layout>
  );
}
