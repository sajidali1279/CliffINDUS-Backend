import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

export default function RoleRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadRequests() {
    try {
      const res = await api.get("users/admin/role-requests/");
      setRequests(res.data || []);
    } catch (err) {
      console.error("Failed to load upgrade requests:", err);
      setError("Unable to load upgrade requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleApprove(req) {
    try {
      await api.post(`users/admin/role-requests/${req.id}/approve/`);
      loadRequests();
    } catch (err) {
      console.error("Approve failed:", err);
      alert(err.response?.data?.detail || "Failed to approve request.");
    }
  }

  async function handleReject(req) {
    try {
      await api.post(`users/admin/role-requests/${req.id}/reject/`);
      loadRequests();
    } catch (err) {
      console.error("Reject failed:", err);
      alert(err.response?.data?.detail || "Failed to reject request.");
    }
  }

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Role Upgrade Requests
        </h1>

        {loading && <p className="text-gray-500 text-sm">Loading requests…</p>}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {!loading && requests.length === 0 && !error && (
          <div className="text-gray-500 italic">No upgrade requests.</div>
        )}

        {!loading && requests.length > 0 && (
          <div className="space-y-4">
            {requests.map((req) => (
              <div
                key={req.id}
                className="bg-white shadow rounded-xl border border-gray-200 p-4"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-800">{req.user}</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Requested Role:{" "}
                      <span className="font-medium text-blue-600">
                        {req.requested_role_display || req.requested_role}
                      </span>
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Submitted: {new Date(req.created_at).toLocaleString()}
                    </p>

                    {req.business_license && (
                      <a
                        href={req.business_license}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-emerald-600 underline mt-2 block"
                      >
                        View Business License
                      </a>
                    )}

                    {req.admin_comment && (
                      <p className="text-xs text-gray-500 mt-1">
                        Admin comment: {req.admin_comment}
                      </p>
                    )}
                  </div>

                  <div className="space-x-2">
                    {req.status === "pending" ? (
                      <>
                        <button
                          onClick={() => handleApprove(req)}
                          className="px-3 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-sm"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(req)}
                          className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                        >
                          Reject
                        </button>
                      </>
                    ) : (
                      <span className="px-3 py-1 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        {req.status.charAt(0).toUpperCase() +
                          req.status.slice(1)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
