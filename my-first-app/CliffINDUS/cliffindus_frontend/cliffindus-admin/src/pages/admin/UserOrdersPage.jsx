import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function UserOrdersPage() {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.get(`/admin/users/${id}/orders/`).then((res) => {
      setOrders(res.data);
    });
  }, [id]);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">User's Orders</h1>

        {orders.length === 0 ? (
          <p className="text-gray-500">No orders found.</p>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div
                key={o.id}
                className="bg-white border rounded-xl p-4 shadow-sm"
              >
                <p className="font-medium text-gray-800">
                  Order #{o.id} — {o.status}
                </p>

                <p className="text-sm text-gray-500">Total: ${o.total_price}</p>

                <p className="text-xs text-gray-400 mt-1">
                  Created: {new Date(o.created_at).toLocaleString()}
                </p>

                <div className="mt-2">
                  <p className="text-xs font-semibold text-gray-700 mb-1">
                    Items:
                  </p>
                  <ul className="text-xs text-gray-600 list-disc pl-4">
                    {o.items.map((i) => (
                      <li key={i.id}>
                        {i.product_name} × {i.quantity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
