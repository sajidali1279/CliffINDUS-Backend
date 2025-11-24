import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import api from "../api/axios";
import Navbar from "../components/Navbar";
import Card from "../components/ui/Card";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

export default function PublicCatalog() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [retailerFilter, setRetailerFilter] = useState("all");
  const [priceFilter, setPriceFilter] = useState("all");

  // 🧲 Load products once
  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        setError("");
        const res = await api.get("products/products/");
        const data = Array.isArray(res.data)
          ? res.data
          : res.data.results || [];
        setProducts(data);
        setFiltered(data);
      } catch (err) {
        console.error("Failed to load catalog products:", err);
        setError("Unable to load products. Please try again later.");
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  // 🧮 Build category & retailer lists from products
  const { categories, retailers } = useMemo(() => {
    const catSet = new Set();
    const retailerSet = new Set();

    products.forEach((p) => {
      const category =
        p.category_name || p.category?.name || p.category || "Uncategorized";
      const retailer =
        p.retailer_name ||
        p.owner_name ||
        p.owner?.username ||
        p.owner ||
        "Retailer";

      catSet.add(category);
      retailerSet.add(retailer);
    });

    return {
      categories: Array.from(catSet),
      retailers: Array.from(retailerSet),
    };
  }, [products]);

  // 🧠 Apply filters whenever something changes
  useEffect(() => {
    let data = [...products];

    // search
    if (search.trim()) {
      const s = search.toLowerCase();
      data = data.filter((p) => {
        const name = String(p.name || "").toLowerCase();
        const desc = String(p.description || "").toLowerCase();
        const retailer = String(
          p.retailer_name || p.owner_name || p.owner?.username || p.owner || ""
        ).toLowerCase();
        return name.includes(s) || desc.includes(s) || retailer.includes(s);
      });
    }

    // category
    if (categoryFilter !== "all") {
      data = data.filter((p) => {
        const category =
          p.category_name || p.category?.name || p.category || "Uncategorized";
        return category === categoryFilter;
      });
    }

    // retailer
    if (retailerFilter !== "all") {
      data = data.filter((p) => {
        const retailer =
          p.retailer_name ||
          p.owner_name ||
          p.owner?.username ||
          p.owner ||
          "Retailer";
        return retailer === retailerFilter;
      });
    }

    // price range
    if (priceFilter !== "all") {
      data = data.filter((p) => {
        const price = Number(p.price || 0);
        if (priceFilter === "lt500") return price < 500;
        if (priceFilter === "500to2000") return price >= 500 && price <= 2000;
        if (priceFilter === "gt2000") return price > 2000;
        return true;
      });
    }

    setFiltered(data);
  }, [products, search, categoryFilter, retailerFilter, priceFilter]);

  // Small helpers
  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setRetailerFilter("all");
    setPriceFilter("all");
  };

  // Skeleton loading for the grid
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar />
        <main className="flex-1 max-w-6xl mx-auto px-4 py-10">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-slate-800">
              Discover Products
            </h1>
            <Spinner />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <Card key={idx} className="animate-pulse bg-slate-100 h-56" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar />

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 lg:py-10">
        {/* 🔍 Search bar */}
        <SearchBar
          value={search}
          onChange={setSearch}
          onClear={() => setSearch("")}
        />

        {/* 🎠 Top banner carousel */}
        <BannerRow />

        {/* 🏷 Category chips */}
        {categories.length > 0 && (
          <CategoryRibbon
            categories={categories}
            active={categoryFilter}
            onChange={setCategoryFilter}
          />
        )}

        {/* 🏪 Retailer offers row */}
        <RetailerOffers retailers={retailers} />

        {/* 📢 Ad space */}
        <AdBanner />

        {/* LAYOUT: filters + product grid */}
        <section className="mt-8 grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-6">
          {/* LEFT FILTERS */}
          <FilterSidebar
            categories={categories}
            retailers={retailers}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            retailerFilter={retailerFilter}
            setRetailerFilter={setRetailerFilter}
            priceFilter={priceFilter}
            setPriceFilter={setPriceFilter}
            onReset={resetFilters}
          />

          {/* PRODUCT GRID */}
          <ProductGrid products={filtered} />
        </section>
      </main>

      <footer className="bg-slate-900 text-slate-400 text-center py-6 mt-10">
        <p>
          © {new Date().getFullYear()} CliffINDUS Marketplace — Shop from
          trusted local retailers
        </p>
      </footer>
    </div>
  );
}

/* --------------------------------------------------
 * 🔍 Search Bar (sticky-ish, C3 style)
 * -------------------------------------------------- */
function SearchBar({ value, onChange, onClear }) {
  return (
    <div className="sticky top-0 z-20 pt-3 pb-4 bg-slate-50/80 backdrop-blur">
      <div className="flex gap-3 items-center">
        <div className="flex-1 relative">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search products, retailers, categories…"
            className="w-full rounded-full border border-slate-300 px-4 py-2.5 pr-10 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------------
 * 🎠 Banner Carousel (Swiggy-style hero)
 * -------------------------------------------------- */
function BannerRow() {
  const banners = [
    {
      id: 1,
      title: "Festival Offers",
      subtitle: "Bulk discounts from local wholesalers via retailers.",
      accent: "Save more on seasonal inventory",
      bg: "from-indigo-500 via-sky-500 to-cyan-400",
    },
    {
      id: 2,
      title: "Quick Refill for Shops",
      subtitle: "Retailers restock essential items in a few clicks.",
      accent: "Fast pickup & delivery options",
      bg: "from-emerald-500 via-lime-500 to-amber-400",
    },
    {
      id: 3,
      title: "Trusted Local Stores",
      subtitle: "Verified retailers & transparent pricing.",
      accent: "Support your neighbourhood businesses",
      bg: "from-fuchsia-500 via-rose-500 to-orange-400",
    },
  ];

  return (
    <div className="mt-2">
      <div className="flex gap-4 overflow-x-auto pb-2 hide-scrollbar">
        {banners.map((b) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className={`min-w-[260px] sm:min-w-[320px] lg:min-w-[380px] rounded-2xl p-5 text-white shadow-md bg-gradient-to-r ${b.bg}`}
          >
            <p className="text-xs uppercase tracking-wide opacity-80">
              CliffINDUS Marketing
            </p>
            <h2 className="mt-1 text-lg sm:text-xl font-bold">{b.title}</h2>
            <p className="mt-1 text-sm opacity-90">{b.subtitle}</p>
            <p className="mt-3 text-xs sm:text-sm font-medium">{b.accent}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------
 * 🏷 Category Ribbon (chips)
 * -------------------------------------------------- */
function CategoryRibbon({ categories, active, onChange }) {
  return (
    <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
      <h3 className="text-sm font-semibold text-slate-700">
        Browse by category
      </h3>
      <div className="flex-1 flex gap-2 overflow-x-auto pb-1 hide-scrollbar justify-end">
        <FilterChip
          label="All"
          active={active === "all"}
          onClick={() => onChange("all")}
        />
        {categories.map((c) => (
          <FilterChip
            key={c}
            label={c}
            active={active === c}
            onClick={() => onChange(c)}
          />
        ))}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full border text-xs sm:text-sm whitespace-nowrap ${
        active
          ? "bg-blue-600 text-white border-blue-700 shadow-sm"
          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
      }`}
    >
      {label}
    </button>
  );
}

/* --------------------------------------------------
 * 🏪 Retailer Offers row (fake data for now)
 * -------------------------------------------------- */
function RetailerOffers({ retailers }) {
  if (!retailers.length) return null;

  const sample = retailers.slice(0, 6);

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-slate-700">
          Popular retailers near you
        </h3>
        <span className="text-xs text-slate-500">
          (Sample view — real location logic later)
        </span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
        {sample.map((r) => (
          <Card
            key={r}
            className="min-w-[180px] px-3 py-3 flex flex-col justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-slate-800">{r}</p>
              <p className="text-xs text-slate-500 mt-1">
                Fast restock · Verified retailer
              </p>
            </div>
            <p className="mt-3 text-xs font-medium text-emerald-600">
              Up to 10–15% off on bulk
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------
 * 📢 Simple Ad Banner (marketing slot)
 * -------------------------------------------------- */
function AdBanner() {
  return (
    <div className="mt-6">
      <Card className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-300">
            Sponsored Slot (Marketing Module)
          </p>
          <h3 className="text-sm sm:text-base font-semibold mt-1">
            Highlight retailer promotions, festival campaigns, or CliffINDUS
            credits here.
          </h3>
        </div>
        <Button
          size="sm"
          variant="secondary"
          className="bg-white text-slate-900 hover:bg-slate-100"
        >
          Learn More
        </Button>
      </Card>
    </div>
  );
}

/* --------------------------------------------------
 * 🎛 Left Filter Sidebar (Amazon style)
 * -------------------------------------------------- */
function FilterSidebar({
  categories,
  retailers,
  categoryFilter,
  setCategoryFilter,
  retailerFilter,
  setRetailerFilter,
  priceFilter,
  setPriceFilter,
  onReset,
}) {
  return (
    <Card className="h-max sticky top-20 p-4 space-y-5 hidden lg:block">
      <h3 className="text-sm font-semibold text-slate-800">Filters</h3>

      {/* Category */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-1.5">Category</p>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Retailer */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-1.5">Retailer</p>
        <select
          value={retailerFilter}
          onChange={(e) => setRetailerFilter(e.target.value)}
          className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="all">All retailers</option>
          {retailers.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </div>

      {/* Price */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-1.5">Price range</p>
        <select
          value={priceFilter}
          onChange={(e) => setPriceFilter(e.target.value)}
          className="w-full border border-slate-300 rounded-md px-2 py-1.5 text-sm"
        >
          <option value="all">Any price</option>
          <option value="lt500">Below 500</option>
          <option value="500to2000">500 – 2,000</option>
          <option value="gt2000">Above 2,000</option>
        </select>
      </div>

      <Button
        size="sm"
        variant="secondary"
        className="w-full text-xs"
        onClick={onReset}
      >
        Reset filters
      </Button>
    </Card>
  );
}

/* --------------------------------------------------
 * 🛒 Product Grid
 * -------------------------------------------------- */
function ProductGrid({ products }) {
  if (!products.length) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <p className="text-sm text-slate-500 text-center">
          No products match your filters. Try clearing some filters or searching
          with a different keyword.
        </p>
      </Card>
    );
  }

  return (
    <section>
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-sm font-semibold text-slate-700">
          {products.length} item{products.length !== 1 ? "s" : ""} found
        </h2>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.map((p) => (
          <Card
            key={p.id}
            className="flex flex-col overflow-hidden hover:shadow-lg transition-shadow"
          >
            {/* Image placeholder / future real image */}
            <div className="h-28 bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center text-slate-400 text-xs">
              Image coming soon
            </div>

            <div className="flex-1 p-3 flex flex-col">
              <p className="text-sm font-semibold text-slate-800 line-clamp-2">
                {p.name || "Unnamed Product"}
              </p>
              <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                {p.description || "No description provided."}
              </p>

              <div className="mt-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">Retailer:</span>{" "}
                {p.retailer_name ||
                  p.owner_name ||
                  p.owner?.username ||
                  p.owner ||
                  "Retailer"}
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-base font-bold text-emerald-700">
                  {p.price != null ? `₹${p.price}` : "Price on request"}
                </p>
                <Button size="xs">Add to cart</Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </section>
  );
}
