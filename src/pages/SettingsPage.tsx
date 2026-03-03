import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, LogOut, Lock, Bell, ShieldCheck, Eye, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { toast } = useToast();

  // Password change
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // Notification prefs (local state – can be persisted later)
  const [notifFriendRequests, setNotifFriendRequests] = useState(true);
  const [notifGatherings, setNotifGatherings] = useState(true);
  const [notifUpdates, setNotifUpdates] = useState(true);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated!" });
      setNewPassword("");
      setConfirmPassword("");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="font-display text-lg font-bold text-foreground">Settings</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Account info */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> Change password
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">New password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Confirm password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1"
                />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword} size="sm" className="w-full">
                {changingPassword ? "Updating..." : "Update password"}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> Notification preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">Friend requests</Label>
                <Switch checked={notifFriendRequests} onCheckedChange={setNotifFriendRequests} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">Gathering invites</Label>
                <Switch checked={notifGatherings} onCheckedChange={setNotifGatherings} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">New life updates from friends</Label>
                <Switch checked={notifUpdates} onCheckedChange={setNotifUpdates} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> How we use your data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Eye className="w-4 h-4 mt-0.5 text-accent-foreground shrink-0" />
                <p>Your life updates are only shared with friends you've explicitly granted access to, based on the tier you assign them (Close, Inner, Outer).</p>
              </div>
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 mt-0.5 text-accent-foreground shrink-0" />
                <p>We never sell your personal data or share it with third parties. Your content stays between you and your circles.</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-accent-foreground shrink-0" />
                <p>You can delete your account and all associated data at any time by contacting us.</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Log out */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          <Button variant="outline" onClick={handleLogout} className="w-full rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4 mr-2" /> Log out
          </Button>
        </motion.div>

        <p className="text-center text-[11px] text-muted-foreground/50 pt-4">
          Signed in as {user?.email}
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default SettingsPage;
