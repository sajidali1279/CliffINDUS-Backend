import Navbar from "../components/Navbar";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

export default function PendingApproval() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 to-gray-100">
      <Navbar />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex-1 flex flex-col items-center justify-center text-center px-6"
      >
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          ⏳ Your Account Is Pending Verification
        </h1>
        <p className="max-w-xl text-gray-600 mb-8">
          Thank you for registering with CliffINDUS. Your business details have been
          submitted for verification. An admin will review and approve your account soon.
        </p>
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={() => navigate("/")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
        >
          Back to Home
        </motion.button>
      </motion.div>

      <footer className="bg-gray-900 text-gray-400 text-center py-4">
        <p>© {new Date().getFullYear()} CliffINDUS | Verification in Progress</p>
      </footer>
    </div>
  );
}
