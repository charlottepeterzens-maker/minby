import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const QRCodeSheet = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"my" | "scan">("my");
  const scannerRef = useRef<any>(null);
  const isRunningRef = useRef(false);
  const scannerContainerId = "qr-scanner-container";

  const appUrl = window.location.origin;
  const inviteUrl = user ? `${appUrl}/invite/${user.id}` : "";

  useEffect(() => {
    if (!open || tab !== "scan") return;

    let cancelled = false;

    const startScanner = async () => {
      const el = document.getElementById(scannerContainerId);
      if (!el || cancelled) return;

      const { Html5Qrcode } = await import("html5-qrcode");
      if (cancelled) return;

      const scanner = new Html5Qrcode(scannerContainerId);
      scannerRef.current = scanner;

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            const match = decodedText.match(/\/invite\/([a-f0-9-]{36})/);
            if (match && isRunningRef.current) {
              isRunningRef.current = false;
              scanner.stop().then(() => {
                onOpenChange(false);
                navigate(`/invite/${match[1]}`);
              }).catch(() => {});
            }
          },
          () => {}
        );
        if (!cancelled) {
          isRunningRef.current = true;
        } else {
          scanner.stop().catch(() => {});
        }
      } catch {
        // Camera not available
      }
    };

    const timer = setTimeout(startScanner, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (scannerRef.current && isRunningRef.current) {
        isRunningRef.current = false;
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [open, tab, navigate, onOpenChange]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[20px] max-h-[85vh]">
        <DrawerHeader>
          <DrawerTitle className="font-display text-base font-medium" style={{ color: "hsl(var(--color-text-primary))" }}>
            QR-kod
          </DrawerTitle>
        </DrawerHeader>

        {/* Tabs */}
        <div className="flex gap-2 px-4 mb-4">
          {(["my", "scan"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: tab === t ? "#3C2A4D" : "hsl(var(--color-surface-raised))",
                color: tab === t ? "#FFFFFF" : "#3C2A4D",
                border: "none",
              }}
            >
              {t === "my" ? "Min kod" : "Skanna"}
            </button>
          ))}
        </div>

        <div className="px-4 pb-6">
          {tab === "my" ? (
            <div className="flex flex-col items-center py-6">
              <div
                className="p-5 rounded-lg"
                style={{ backgroundColor: "hsl(var(--color-surface-card))" }}
              >
                <QRCodeSVG
                  value={inviteUrl}
                  size={200}
                  bgColor="#FFFFFF"
                  fgColor="#3C2A4D"
                  level="M"
                />
              </div>
              <p className="text-[12px] mt-4 text-center" style={{ color: "hsl(var(--color-text-muted))" }}>
                Låt någon skanna din kod för att kopplas ihop
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div
                id={scannerContainerId}
                className="w-full max-w-[280px] rounded-lg overflow-hidden"
                style={{ minHeight: 280 }}
              />
              <p className="text-[12px] mt-4 text-center" style={{ color: "hsl(var(--color-text-muted))" }}>
                Rikta kameran mot en Minby QR-kod
              </p>
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default QRCodeSheet;
