import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import ConfirmSheet from "@/components/ConfirmSheet";

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

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("friend_request_notifications, meetup_notifications, update_notifications")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setNotifFriendRequests((data as any).friend_request_notifications ?? true);
          setNotifGatherings((data as any).meetup_notifications ?? true);
          setNotifUpdates((data as any).update_notifications ?? true);
        }
      });
  }, [user]);

  const updateNotifPref = useCallback(async (column: string, value: boolean) => {
    if (!user) return;
    await supabase
      .from("profiles")
      .update({ [column]: value } as any)
      .eq("user_id", user.id);
  }, [user]);

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

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await supabase.functions.invoke("delete-account", {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.error) {
        toast({ title: t("error"), description: "Kunde inte radera kontot.", variant: "destructive" });
        setDeleting(false);
        return;
      }
      await supabase.auth.signOut();
      navigate("/auth");
    } catch {
      toast({ title: t("error"), description: "Något gick fel.", variant: "destructive" });
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="max-w-2xl mx-auto px-5 py-4 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors duration-150">
            <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <span className="font-display text-[20px] font-medium text-foreground">{t("settings")}</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-5 py-6 space-y-4">
        {/* Language */}
        <Card className="rounded-[14px] border-[0.5px] border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-body font-medium">
              {t("language")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={lang} onValueChange={(v) => setLang(v as "en" | "sv")}>
              <SelectTrigger className="w-full rounded-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">{t("english")}</SelectItem>
                <SelectItem value="sv">{t("swedish")}</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Password */}
        <Card className="rounded-[14px] border-[0.5px] border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-body font-medium">
              {t("changePassword")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t("newPassword")}</Label>
              <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 rounded-[10px] border-[0.5px]" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("confirmPassword")}</Label>
              <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 rounded-[10px] border-[0.5px]" />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword} size="sm" className="w-full rounded-[10px] font-medium text-sm">
              {changingPassword ? t("updating") : t("updatePassword")}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="rounded-[14px] border-[0.5px] border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-body font-medium">
              {t("notificationPreferences")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("friendRequests")}</Label>
              <Switch checked={notifFriendRequests} onCheckedChange={(v) => { setNotifFriendRequests(v); updateNotifPref("friend_request_notifications", v); }} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("gatheringInvites")}</Label>
              <Switch checked={notifGatherings} onCheckedChange={(v) => { setNotifGatherings(v); updateNotifPref("meetup_notifications", v); }} />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-sm">{t("newLifeUpdates")}</Label>
              <Switch checked={notifUpdates} onCheckedChange={(v) => { setNotifUpdates(v); updateNotifPref("update_notifications", v); }} />
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card className="rounded-[14px] border-[0.5px] border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-body font-medium">
              {t("howWeUseData")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("dataPrivacy1")}</p>
            <p>{t("dataPrivacy2")}</p>
            <p>{t("dataPrivacy3")}</p>
          </CardContent>
        </Card>

        {/* Log out */}
        <Button variant="outline" onClick={handleLogout} className="w-full rounded-[10px] border-[0.5px] border-border text-muted-foreground hover:text-foreground hover:bg-muted">
          <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} /> {t("logOut")}
        </Button>

        <p className="text-center text-[11px] text-muted-foreground pt-4">
          {t("signedInAs")} {user?.email}
        </p>

        {/* Delete account */}
        <div className="text-center pb-6">
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-[12px] hover:underline"
            style={{ color: "#A32D2D" }}
          >
            Radera mitt konto
          </button>
        </div>

        <ConfirmSheet
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Radera konto"
          description="Detta raderar ditt konto och all din data permanent. Det går inte att ångra."
          confirmLabel="Radera konto"
          confirmStyle={{ backgroundColor: "#A32D2D" }}
          onConfirm={handleDeleteAccount}
        />
      </main>
      <BottomNav />
    </div>
  );
};

export default SettingsPage;
