import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import Layout from "../../components/Layout";

export default function UserProductsPage() {
  const { id } = useParams();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api.get(`/admin/users/${id}/products/`).then((res) => {
      setProducts(res.data);
    });
  }, [id]);

  return (
    <Layout>
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">User's Products</h1>

        {products.length === 0 ? (
          <p className="text-gray-500">No products found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white border rounded-xl p-4 shadow-sm"
              >
                <p className="font-medium text-gray-800">{p.name}</p>
                <p className="text-sm text-gray-500">{p.description}</p>
                <p className="text-sm mt-2">Price: ${p.price}</p>
                <p className="text-xs text-gray-400 mt-1">
                  Created: {new Date(p.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
