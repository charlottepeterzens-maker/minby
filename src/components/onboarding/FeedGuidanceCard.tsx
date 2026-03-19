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
        border: "0.5px solid #EDE8F4",
        borderRadius: 16,
        padding: "16px 18px",
      }}
    >
      <p style={{ fontSize: 13, color: "#3C2A4D", fontWeight: 500, marginBottom: 4 }}>
        Berätta något litet från din dag – det räcker.
      </p>
      <span style={{ fontSize: 12, color: "#7A6A85" }}>
        Dela något →
      </span>
    </motion.button>
  );
};

export default FeedGuidanceCard;
