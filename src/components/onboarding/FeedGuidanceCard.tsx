import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const FeedGuidanceCard = () => {
  const navigate = useNavigate();

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      onClick={() => navigate("/profile")}
      className="w-full text-left mb-4"
      style={{
        backgroundColor: "#FFFFFF",
        boxShadow: "0 1px 4px 0 rgba(0,0,0,0.05)",
        borderRadius: 16,
        padding: "16px 18px",
      }}
    >
      <p style={{ fontSize: 13, color: "#3C2A4D", fontWeight: 500, marginBottom: 4 }}>
        Dina närmsta vill veta om din dag. Berätta något, litet som stort.
      </p>
      <span style={{ fontSize: 12, color: "#655675" }}>Dela något →</span>
    </motion.button>
  );
};

export default FeedGuidanceCard;
