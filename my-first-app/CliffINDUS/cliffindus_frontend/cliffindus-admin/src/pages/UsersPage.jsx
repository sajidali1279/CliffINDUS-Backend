import { useEffect, useState, useCallback } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";
import UserDrawer from "../components/UserDrawer";

const PAGE_CHUNK = 20;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [computedList, setComputedList] = useState([]);
  const [visibleUsers, setVisibleUsers] = useState([]);
  const [visibleCount, setVisibleCount] = useState(PAGE_CHUNK);

  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState("username");
  const [sortDir, setSortDir] = useState("asc");

  // ----------------------------
  // Refresh users after updates
  // ----------------------------
  const refreshUsers = async () => {
    try {
      const res = await api.get("admin/users/");
      setUsers(res.data);
    } catch (err) {
      console.error("Failed to refresh users:", err);
    }
  };

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const [roleFilter, setRoleFilter] = useState("");

  // Fetch all users for admin
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get("admin/users/");
        const data = Array.isArray(res.data) ? res.data : [];
        setUsers(data);
      } catch (err) {
        console.error("Failed to load users:", err);
        setError("Unable to load users. Make sure you are logged in as admin.");
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  // Search + sort
  const applySearchAndSort = useCallback(
    (list, searchText, field, direction) => {
      let data = [...list];

      if (searchText.trim()) {
        const s = searchText.toLowerCase();
        data = data.filter((u) => {
          const username = (u.username || "").toLowerCase();
          const email = (u.email || "").toLowerCase();
          const role = (u.role || "").toLowerCase();
          const adminType = (u.admin_type || "").toLowerCase();
          return (
            username.includes(s) ||
            email.includes(s) ||
            role.includes(s) ||
            adminType.includes(s)
          );
        });
      }

      data.sort((a, b) => {
        let av, bv;

        switch (field) {
          case "email":
            av = (a.email || "").toLowerCase();
            bv = (b.email || "").toLowerCase();
            break;
          case "role":
            av = (a.admin_type || a.role || "").toLowerCase();
            bv = (b.admin_type || b.role || "").toLowerCase();
            break;
          case "verified":
            av = a.is_verified ? 1 : 0;
            bv = b.is_verified ? 1 : 0;
            break;
          case "created":
            av = new Date(a.created_at || 0).getTime();
            bv = new Date(b.created_at || 0).getTime();
            break;
          case "username":
          default:
            av = (a.username || "").toLowerCase();
            bv = (b.username || "").toLowerCase();
        }

        if (av < bv) return direction === "asc" ? -1 : 1;
        if (av > bv) return direction === "asc" ? 1 : -1;
        return 0;
      });

      return data;
    },
    []
  );

  // Recompute computedList whenever inputs change
  useEffect(() => {
    const list = applySearchAndSort(users, search, sortField, sortDir);
    setComputedList(list);

    const initialCount = Math.min(PAGE_CHUNK, list.length);
    setVisibleCount(initialCount);
    setVisibleUsers(list.slice(0, initialCount));
    setHasMore(list.length > initialCount);
  }, [users, search, sortField, sortDir, applySearchAndSort]);

  // Infinite scroll
  const loadMore = useCallback(() => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);

    setTimeout(() => {
      const newCount = Math.min(visibleCount + PAGE_CHUNK, computedList.length);
      setVisibleCount(newCount);
      setVisibleUsers(computedList.slice(0, newCount));
      setHasMore(newCount < computedList.length);
      setLoadingMore(false);
    }, 150);
  }, [hasMore, loadingMore, visibleCount, computedList]);

  useEffect(() => {
    const handleScroll = () => {
      if (!hasMore || loadingMore) return;

      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.body.offsetHeight - 200;

      if (scrollPosition >= threshold) {
        loadMore();
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [hasMore, loadingMore, loadMore]);

  const toggleSort = (fieldKey) => {
    if (sortField === fieldKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(fieldKey);
      setSortDir("asc");
    }
  };

  const sortIcon = (fieldKey) => {
    if (sortField !== fieldKey) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  const formatRoleColored = (u) => {
    let label = "—";
    let color = "bg-gray-100 text-gray-700 border-gray-200";

    if (u.admin_type === "super_admin") {
      label = "Super Admin";
      color = "bg-red-100 text-red-700 border-red-200";
    } else if (u.admin_type === "admin") {
      label = "Admin";
      color = "bg-orange-100 text-orange-700 border-orange-200";
    } else if (u.role) {
      label = u.role.charAt(0).toUpperCase() + u.role.slice(1);
      if (u.role === "wholesaler") {
        color = "bg-purple-100 text-purple-700 border-purple-200";
      } else if (u.role === "retailer") {
        color = "bg-blue-100 text-blue-700 border-blue-200";
      } else if (u.role === "consumer") {
        color = "bg-green-100 text-green-700 border-green-200";
      }
    }

    return (
      <span
        className={`px-2 py-0.5 rounded-full text-xs border whitespace-nowrap ${color}`}
      >
        {label}
      </span>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="h-screen flex justify-center items-center text-gray-500">
          Loading users...
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="p-6 space-y-6 w-full">
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded">
            {error}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex justify-between items-center mb-6 gap-4 flex-wrap">
        {/* PAGE TITLE */}
        <h1 className="text-3xl font-bold text-gray-800">Users</h1>

        {/* FILTERS */}
        <div className="flex items-center gap-3 ml-auto">
          {/* ROLE FILTER */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="wholesaler">Wholesaler</option>
            <option value="retailer">Retailer</option>
            <option value="consumer">Consumer</option>
          </select>

          {/* SEARCH INPUT */}
          <input
            type="text"
            placeholder="Search by username, email, role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-64 border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-white shadow-md rounded-xl border border-gray-200 w-full">
        <div className="overflow-y-auto" style={{ maxHeight: "600px" }}>
          <table className="min-w-full text-left text-xs md:text-sm text-gray-700">
            <thead className="bg-gray-100 border-b text-xs uppercase tracking-wide sticky top-0 z-10">
              <tr>
                <th
                  className="px-4 py-2 cursor-pointer select-none"
                  onClick={() => toggleSort("username")}
                >
                  <span className="flex items-center gap-1">
                    Username{" "}
                    <span className="text-gray-400 text-xs">
                      {sortIcon("username")}
                    </span>
                  </span>
                </th>
                <th
                  className="px-4 py-2 cursor-pointer select-none"
                  onClick={() => toggleSort("email")}
                >
                  <span className="flex items-center gap-1">
                    Email{" "}
                    <span className="text-gray-400 text-xs">
                      {sortIcon("email")}
                    </span>
                  </span>
                </th>
                <th className="px-4 py-2">Role</th>
                <th
                  className="px-4 py-2 cursor-pointer select-none"
                  onClick={() => toggleSort("verified")}
                >
                  <span className="flex items-center gap-1">
                    Verification{" "}
                    <span className="text-gray-400 text-xs">
                      {sortIcon("verified")}
                    </span>
                  </span>
                </th>
                <th className="px-4 py-2">Verified Since</th>
                <th className="px-4 py-2">Total Products</th>
                <th className="px-4 py-2">Total Orders</th>
                <th className="px-4 py-2">Last Verified</th>
                <th className="px-4 py-2">Active</th>
                <th
                  className="px-4 py-2 cursor-pointer select-none"
                  onClick={() => toggleSort("created")}
                >
                  <span className="flex items-center gap-1">
                    Created At{" "}
                    <span className="text-gray-400 text-xs">
                      {sortIcon("created")}
                    </span>
                  </span>
                </th>
                <th className="px-4 py-2">Last Login</th>
              </tr>
            </thead>

            <tbody>
              {visibleUsers.map((u) => (
                <tr
                  key={u.id}
                  className="border-b hover:bg-gray-50 transition cursor-pointer"
                  onClick={() => setSelected(u)}
                >
                  <td className="px-4 py-2 font-medium">{u.username}</td>
                  <td className="px-4 py-2">{u.email || "—"}</td>
                  <td className="px-4 py-2">{formatRoleColored(u)}</td>
                  <td className="px-4 py-2">
                    {u.is_verified ? (
                      <span className="px-2 py-0.5 text-[11px] rounded bg-green-100 text-green-700">
                        Verified
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[11px] rounded bg-red-100 text-red-700">
                        Unverified
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {u.verified_since != null
                      ? `${u.verified_since} day(s)`
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {u.total_products ?? 0}
                  </td>
                  <td className="px-4 py-2 text-center">
                    {u.total_orders ?? 0}
                  </td>
                  <td className="px-4 py-2">
                    {u.verified_at
                      ? new Date(u.verified_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2">{u.is_active ? "Yes" : "No"}</td>
                  <td className="px-4 py-2">
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {u.last_login
                      ? new Date(u.last_login).toLocaleString()
                      : "Never"}
                  </td>
                </tr>
              ))}

              {visibleUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={11}
                    className="text-center py-10 text-gray-500 italic"
                  >
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {/* Infinite scroll footer */}
      <div className="flex justify-center items-center py-4 text-sm text-gray-500">
        {loadingMore && <span>Loading more users…</span>}
        {!loadingMore && !hasMore && computedList.length > 0 && (
          <span>You've reached the end of the list.</span>
        )}
      </div>

      {selected && (
        <UserDrawer
          user={selected}
          onClose={() => setSelected(null)}
          refreshUsers={refreshUsers}
        />
      )}
    </Layout>
  );
}
