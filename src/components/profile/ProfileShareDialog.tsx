import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share, Copy, Check } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Props {
  userId: string;
}

const ProfileShareDialog = ({ userId }: Props) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const profileUrl = `${window.location.origin}/profile/${userId}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Share2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center gap-4 py-4">
          <h3 className="font-display text-lg font-bold text-foreground">
            {t("shareProfile")}
          </h3>
          <div className="bg-background p-4 rounded-lg border border-border">
            <QRCodeSVG
              value={profileUrl}
              size={180}
              bgColor="transparent"
              fgColor="currentColor"
              className="text-foreground"
            />
          </div>
          <div className="flex gap-2 w-full">
            <Input
              value={profileUrl}
              readOnly
              className="text-xs"
            />
            <Button
              variant="outline"
              size="icon"
              className="shrink-0"
              onClick={handleCopy}
            >
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProfileShareDialog;
