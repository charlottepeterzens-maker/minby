import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const VerifyPage = () => {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      navigate(data.session ? "/" : "/auth", { replace: true });
    });
  }, [navigate]);
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <span className="text-[0.875rem] font-normal leading-[1.4] text-muted-foreground">Verifierar…</span>
    </div>
  );
};

export default VerifyPage;
