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
import CurvedSeparator from "@/components/CurvedSeparator";
import ConfirmSheet from "@/components/ConfirmSheet";
import { Container } from "@/components/layout";

interface NotificationSettings {
  hangout_yes: boolean;
  hangout_maybe: boolean;
  hangout_comment: boolean;
  hangout_new: boolean;
  group_invite: boolean;
  group_message: boolean;
  life_comment: boolean;
  daily_digest_enabled: boolean;
  daily_digest_time: string;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  hangout_yes: true,
  hangout_maybe: true,
  hangout_comment: true,
  hangout_new: true,
  group_invite: true,
  group_message: true,
  life_comment: true,
  daily_digest_enabled: false,
  daily_digest_time: "07:30",
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const { toast } = useToast();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [notifSettings, setNotifSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("notification_settings")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          const s = (data as any).notification_settings;
          if (s && typeof s === "object") {
            setNotifSettings({ ...DEFAULT_SETTINGS, ...s });
          }
        }
      });
  }, [user]);

  const updateNotifSetting = useCallback(async (key: keyof NotificationSettings, value: boolean | string) => {
    if (!user) return;
    const updated = { ...notifSettings, [key]: value };
    setNotifSettings(updated);
    await supabase
      .from("profiles")
      .update({ notification_settings: updated } as any)
      .eq("user_id", user.id);
  }, [user, notifSettings]);

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

  const NOTIF_TOGGLES: { key: keyof NotificationSettings; label: string }[] = [
    { key: "hangout_yes", label: "Någon vill hänga med" },
    { key: "hangout_maybe", label: "Någon kanske hänger med" },
    { key: "hangout_comment", label: "Kommentarer på dina dejter" },
    { key: "hangout_new", label: "Vän är ledig" },
    { key: "group_invite", label: "Gruppinbjudningar" },
    { key: "group_message", label: "Gruppmeddelanden" },
    { key: "life_comment", label: "Kommentarer på dina inlägg" },
  ];

  const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) =>
    [`${String(h).padStart(2, "0")}:00`, `${String(h).padStart(2, "0")}:30`]
  ).flat();

  return (
    <div className="min-h-screen bg-background pb-20">
      <nav className="sticky top-0 z-50 bg-background">
        <Container className="py-4 flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground transition-colors duration-150">
            <ChevronLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <span className="font-display text-[20px] font-medium text-foreground">{t("settings")}</span>
        </Container>
        <CurvedSeparator />
      </nav>

      <Container as="main" className="py-6 space-y-4">
        {/* Language */}
        <Card className="rounded-[14px] border border-border">
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
        <Card className="rounded-[14px] border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-body font-medium">
              {t("changePassword")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">{t("newPassword")}</Label>
              <Input type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1 rounded-[10px] border" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">{t("confirmPassword")}</Label>
              <Input type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1 rounded-[10px] border" />
            </div>
            <Button onClick={handleChangePassword} disabled={changingPassword} size="sm" className="w-full rounded-[10px] font-medium text-sm">
              {changingPassword ? t("updating") : t("updatePassword")}
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card className="rounded-[14px] border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-body font-medium">
              Notiser
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {NOTIF_TOGGLES.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <Switch
                  checked={notifSettings[key] as boolean}
                  onCheckedChange={(v) => updateNotifSetting(key, v)}
                />
              </div>
            ))}

            {/* Separator */}
            <div className="border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm">Morgonrapport</Label>
                  <p className="text-[10px] mt-0.5" style={{ color: "#B0A8B5" }}>Kommer snart</p>
                </div>
                <Switch
                  checked={notifSettings.daily_digest_enabled}
                  onCheckedChange={(v) => updateNotifSetting("daily_digest_enabled", v)}
                />
              </div>

              {notifSettings.daily_digest_enabled && (
                <div className="mt-3">
                  <Label className="text-xs text-muted-foreground">Tid för morgonrapport</Label>
                  <Select
                    value={notifSettings.daily_digest_time}
                    onValueChange={(v) => updateNotifSetting("daily_digest_time", v)}
                  >
                    <SelectTrigger className="w-full mt-1 rounded-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIME_OPTIONS.map(t => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Data & Privacy */}
        <Card className="rounded-[14px] border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-body font-medium">
              {t("howWeUseData")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{t("dataPrivacy1")}</p>
            <p>{t("dataPrivacy2")}</p>
            <p>{t("dataPrivacy3")}</p>
            <p>Vi skickar push-notiser för att hålla dig uppdaterad om din krets. Du kan när som helst stänga av notiser i Inställningar eller i din enhets inställningar.</p>
          </CardContent>
        </Card>

        {/* Log out */}
        <Button variant="outline" onClick={handleLogout} className="w-full rounded-[10px] border border-border text-muted-foreground hover:text-foreground hover:bg-muted">
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
