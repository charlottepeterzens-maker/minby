import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

const PushPermissionDialog = () => {
  const { user } = useAuth();
  const { isSupported, subscribe, permission } = usePushNotifications();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user || !isSupported || permission !== "default") return;

    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("notification_permission_asked")
        .eq("user_id", user.id)
        .single();

      if (data && !(data as any).notification_permission_asked) {
        // Delay showing to not overwhelm on first load
        setTimeout(() => setShow(true), 2000);
      }
    };
    check();
  }, [user, isSupported, permission]);

  const markAsked = async () => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ notification_permission_asked: true } as any)
      .eq("user_id", user.id);
  };

  const handleActivate = async () => {
    setShow(false);
    await markAsked();
    await subscribe();
  };

  const handleLater = async () => {
    setShow(false);
    await markAsked();
  };

  if (!show) return null;

  return (
    <Dialog open={show} onOpenChange={(open) => !open && handleLater()}>
      <DialogContent
        className="max-w-[320px] rounded-full p-6 border-0"
        style={{ backgroundColor: "hsl(var(--color-surface))" }}
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "hsl(var(--color-surface-raised))" }}
          >
            <Bell className="w-6 h-6" style={{ color: "hsl(var(--color-text-primary))" }} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-display text-lg font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
              Missa inget från dina nära
            </h3>
            <p className="text-[13px] mt-2 leading-relaxed" style={{ color: "hsl(var(--color-text-secondary))" }}>
              Få en notis när en vän vill hänga med, kommenterar eller bjuder in dig.
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full mt-2">
            <button
              onClick={handleActivate}
              className="w-full py-3 rounded-xl text-[14px] font-medium text-white transition-colors"
              style={{ backgroundColor: "hsl(var(--color-text-primary))" }}
            >
              Håll mig uppdaterad
            </button>
            <button
              onClick={handleLater}
              className="w-full py-2.5 rounded-xl text-[13px] font-medium transition-colors"
              style={{ color: "hsl(var(--color-text-secondary))" }}
            >
              Senare
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PushPermissionDialog;
