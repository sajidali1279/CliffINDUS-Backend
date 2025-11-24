import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage"; // ADMIN DASHBOARD
import UsersPage from "./pages/UsersPage";
import ProductsPage from "./pages/ProductsPage";
import OrdersPage from "./pages/OrdersPage";
import RoleRequestsPage from "./pages/RoleRequestsPage";
import PublicCatalog from "./pages/PublicCatalog";
import RegisterCustomer from "./pages/RegisterCustomer";
import RegisterRetailer from "./pages/RegisterRetailer";
import RegisterWholesaler from "./pages/RegisterWholesaler";
import PendingApproval from "./pages/PendingApproval";
import WholesalerDashboard from "./pages/wholesaler/WholesalerDashboard";
import RetailerDashboard from "./pages/retailer/RetailerDashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import UserDetailPage from "./pages/admin/UserDetailPage";
import UserProductsPage from "./pages/admin/UserProductsPage";
import UserOrdersPage from "./pages/admin/UserOrdersPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* PUBLIC */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/catalog" element={<PublicCatalog />} />
        <Route path="/register" element={<RegisterCustomer />} />
        <Route path="/register/retailer" element={<RegisterRetailer />} />
        <Route path="/register/wholesaler" element={<RegisterWholesaler />} />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* ADMIN + SUPER ADMIN */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <UserDetailPage />
            </ProtectedRoute>
          }
        />

        {/* WHOLESALER DASHBOARD */}
        <Route
          path="/wholesaler-dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["wholesaler", "admin", "super_admin"]}
            >
              <WholesalerDashboard />
            </ProtectedRoute>
          }
        />

        {/* RETAILER DASHBOARD */}
        <Route
          path="/retailer-dashboard"
          element={
            <ProtectedRoute allowedRoles={["retailer"]}>
              <RetailerDashboard />
            </ProtectedRoute>
          }
        />

        {/* ADMIN PAGES */}
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <UsersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/role-requests"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <RoleRequestsPage />
            </ProtectedRoute>
          }
        />

        {/* PRODUCT & ORDER MANAGEMENT */}
        <Route
          path="/products"
          element={
            <ProtectedRoute allowedRoles={["retailer", "admin", "super_admin"]}>
              <ProductsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute
              allowedRoles={["wholesaler", "admin", "super_admin"]}
            >
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users/:id/products"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <UserProductsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users/:id/orders"
          element={
            <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
              <UserOrdersPage />
            </ProtectedRoute>
          }
        />

        {/* FALLBACK */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
