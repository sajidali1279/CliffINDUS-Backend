import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar"; // ✅ exact path

export default function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-blue-50 text-gray-800">
      <Navbar />
      {/* -------------------------------------------------- */}
      {/* 🌟 HERO SECTION */}
      {/* -------------------------------------------------- */}
      <section className="flex flex-col items-center justify-center text-center pt-36 pb-24 px-6 md:px-12">
        <motion.h1
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-5xl md:text-6xl font-extrabold text-gray-900 mb-6"
        >
          Welcome to <span className="text-blue-600">CliffINDUS</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed"
        >
          The next-generation marketplace that seamlessly connects{" "}
          <span className="font-semibold text-gray-800">
            Wholesalers, Retailers, and Customers
          </span>{" "}
          through trust, transparency, and cutting-edge automation.
        </motion.p>

        {/* --- Call to Action Buttons --- */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="flex flex-col sm:flex-row gap-4 mt-10"
        >
          <AnimatedButton
            label="🛍️ Browse Catalog"
            color="green"
            onClick={() => navigate("/catalog")}
          />
          <AnimatedButton
            label="🔐 Login"
            color="blue"
            onClick={() => navigate("/login")}
          />
          <AnimatedButton
            label="✨ Register"
            color="gray"
            onClick={() => navigate("/register")}
          />
        </motion.div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 💡 ABOUT SECTION */}
      {/* -------------------------------------------------- */}
      <section className="py-20 bg-white text-center px-6 md:px-12">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">What We Do</h2>
        <p className="text-gray-600 max-w-4xl mx-auto text-lg leading-relaxed">
          CliffINDUS is an enterprise-grade B2B and B2C marketplace that
          empowers verified wholesalers and retailers to conduct business
          efficiently while customers gain access to trusted, quality products
          directly from legitimate retailers.
        </p>
        <p className="mt-4 text-gray-600 max-w-3xl mx-auto">
          Every business onboarded onto our platform goes through strict
          verification — ensuring only authentic partners engage in the
          ecosystem. We handle onboarding, inventory digitization, catalog
          visibility, and seamless order flow from warehouse to doorstep.
        </p>
      </section>

      {/* -------------------------------------------------- */}
      {/* 🔒 SECURITY SECTION */}
      {/* -------------------------------------------------- */}
      <section className="py-20 bg-gradient-to-br from-blue-50 to-white px-6 md:px-12 text-center">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">
          Security & Verification
        </h2>
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-8 text-left">
          <FeatureCard
            title="Verified Businesses"
            text="All wholesalers and retailers undergo business verification by our admin team, ensuring legitimacy and compliance."
            icon="✅"
          />
          <FeatureCard
            title="Role-Based Access"
            text="Our system uses intelligent Role-Based Access Control (RBAC) to isolate user roles, keeping data and permissions secure."
            icon="🧩"
          />
          <FeatureCard
            title="Secure Transactions"
            text="Every order, shipment, and payment is protected with end-to-end encryption and monitored for consistency and safety."
            icon="🔒"
          />
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* 🤝 HELP & SUPPORT SECTION */}
      {/* -------------------------------------------------- */}
      <section className="py-20 bg-white px-6 md:px-12 text-center">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">How We Help</h2>
        <p className="text-gray-600 max-w-4xl mx-auto mb-10 text-lg leading-relaxed">
          Our dedicated admin and support associates assist new businesses with
          onboarding, inventory setup, and account verification. Whether you’re
          a new retailer digitizing your catalog or a wholesaler expanding
          nationwide, CliffINDUS ensures smooth transitions and personalized
          guidance every step of the way.
        </p>
      </section>

      {/* -------------------------------------------------- */}
      {/* 🚀 ROLE-BASED REGISTRATION SUGGESTIONS */}
      {/* -------------------------------------------------- */}
      {/* -------------------------------------------------- */}
      {/* 🚀 SELLER INVITATION SECTION */}
      {/* -------------------------------------------------- */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-100 px-6 md:px-12 text-center">
        <h2 className="text-3xl font-bold mb-6 text-gray-900">
          Here to sell your products? Join CliffINDUS.
        </h2>
        <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
          Become part of our verified business network. Register as a wholesaler
          or retailer and start selling your inventory securely across the
          CliffINDUS marketplace.
        </p>

        <div className="flex flex-col sm:flex-row justify-center gap-6">
          <AnimatedButton
            label="🏭 Wholesaler Registration"
            color="indigo"
            onClick={() => navigate("/register/wholesaler")}
          />
          <AnimatedButton
            label="🏪 Retailer Registration"
            color="emerald"
            onClick={() => navigate("/register/retailer")}
          />
        </div>
      </section>

      {/* -------------------------------------------------- */}
      {/* ⚙️ FOOTER */}
      {/* -------------------------------------------------- */}
      <footer className="bg-gray-900 text-gray-400 text-center py-6 mt-auto">
        <p>
          © {new Date().getFullYear()} CliffINDUS | Empowering Business
          Connections
        </p>
      </footer>
    </div>
  );
}

/* --------------------------------------------------
   REUSABLE COMPONENTS
-------------------------------------------------- */

function AnimatedButton({ label, color, onClick }) {
  const base = {
    blue: "bg-blue-600 hover:bg-blue-700",
    green: "bg-green-600 hover:bg-green-700",
    gray: "bg-gray-800 hover:bg-gray-900",
    indigo: "bg-indigo-600 hover:bg-indigo-700",
    emerald: "bg-emerald-600 hover:bg-emerald-700",
    purple: "bg-purple-600 hover:bg-purple-700",
  }[color];

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`px-6 py-3 text-white font-semibold rounded-lg shadow-md transition ${base}`}
    >
      {label}
    </motion.button>
  );
}

function FeatureCard({ title, text, icon }) {
  return (
    <motion.div
      whileHover={{ scale: 1.03 }}
      className="p-6 bg-white rounded-xl shadow-md hover:shadow-xl transition text-center"
    >
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold mb-2 text-gray-800">{title}</h3>
      <p className="text-gray-600 text-sm">{text}</p>
    </motion.div>
  );
}
