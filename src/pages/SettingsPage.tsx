import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, LogOut, Lock, Bell, ShieldCheck, Eye, AlertTriangle, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [notifFriendRequests, setNotifFriendRequests] = useState(true);
  const [notifGatherings, setNotifGatherings] = useState(true);
  const [notifUpdates, setNotifUpdates] = useState(true);

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: t("passwordTooShort"), description: t("passwordTooShortDesc"), variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: t("passwordsDontMatch"), variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: t("error"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("passwordUpdated") });
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
          <span className="font-display text-lg font-bold text-foreground">{t("settings")}</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Language */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Globe className="w-4 h-4 text-primary" /> {t("language")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={lang} onValueChange={(v) => setLang(v as "en" | "sv")}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">{t("english")}</SelectItem>
                  <SelectItem value="sv">{t("swedish")}</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </motion.div>

        {/* Password */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" /> {t("changePassword")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t("newPassword")}</Label>
                <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("confirmPassword")}</Label>
                <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" />
              </div>
              <Button onClick={handleChangePassword} disabled={changingPassword} size="sm" className="w-full">
                {changingPassword ? t("updating") : t("updatePassword")}
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Notifications */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Bell className="w-4 h-4 text-primary" /> {t("notificationPreferences")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t("friendRequests")}</Label>
                <Switch checked={notifFriendRequests} onCheckedChange={setNotifFriendRequests} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t("gatheringInvites")}</Label>
                <Switch checked={notifGatherings} onCheckedChange={setNotifGatherings} />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-sm">{t("newLifeUpdates")}</Label>
                <Switch checked={notifUpdates} onCheckedChange={setNotifUpdates} />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Data & Privacy */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
          <Card className="rounded-2xl border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" /> {t("howWeUseData")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <Eye className="w-4 h-4 mt-0.5 text-accent-foreground shrink-0" />
                <p>{t("dataPrivacy1")}</p>
              </div>
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 mt-0.5 text-accent-foreground shrink-0" />
                <p>{t("dataPrivacy2")}</p>
              </div>
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-accent-foreground shrink-0" />
                <p>{t("dataPrivacy3")}</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Log out */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <Button variant="outline" onClick={handleLogout} className="w-full rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10">
            <LogOut className="w-4 h-4 mr-2" /> {t("logOut")}
          </Button>
        </motion.div>

        <p className="text-center text-[11px] text-muted-foreground/50 pt-4">
          {t("signedInAs")} {user?.email}
        </p>
      </main>
      <BottomNav />
    </div>
  );
};

export default SettingsPage;
