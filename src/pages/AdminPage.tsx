import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, Users, Settings, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import TranslationEditor from "@/components/admin/TranslationEditor";

const AdminPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useAdminRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-[26px] animate-float font-display font-light tracking-[-0.5px] text-primary lowercase">
          minby
        </span>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6">
        <Shield className="w-16 h-16 text-muted-foreground" />
        <h1 className="font-display text-2xl text-foreground">Access Denied</h1>
        <p className="text-muted-foreground text-center max-w-sm">
          You don't have permission to access the admin panel.
        </p>
        <Link
          to="/"
          className="mt-4 text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
        >
          Back to app
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <Shield className="w-5 h-5 text-primary" />
          <h1 className="font-display text-lg text-foreground tracking-wide">Admin Panel</h1>
        </div>
      </header>

      {/* Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto px-4 py-6"
      >
        <Tabs defaultValue="content" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-card">
            <TabsTrigger value="content" className="gap-2 text-xs sm:text-sm">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Content</span>
            </TabsTrigger>
            <TabsTrigger value="copy" className="gap-2 text-xs sm:text-sm">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Copy & i18n</span>
            </TabsTrigger>
            <TabsTrigger value="config" className="gap-2 text-xs sm:text-sm">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Config</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="mt-6">
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="font-display text-lg text-foreground mb-1">Content Moderation</h2>
              <p className="text-sm text-muted-foreground">
                View and manage user posts, profiles, and reported content.
              </p>
              <p className="text-xs text-muted-foreground mt-4 italic">Coming next…</p>
            </div>
          </TabsContent>

          <TabsContent value="copy" className="mt-6">
            <TranslationEditor />
          </TabsContent>

          <TabsContent value="config" className="mt-6">
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <Settings className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h2 className="font-display text-lg text-foreground mb-1">App Configuration</h2>
              <p className="text-sm text-muted-foreground">
                Toggle features, manage activity types, section types, and more.
              </p>
              <p className="text-xs text-muted-foreground mt-4 italic">Coming next…</p>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default AdminPage;
