import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Typography } from "@/components/ui/typography";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  backLabel?: string;
  onBack?: () => void;
  className?: string;
}

/**
 * PageHeader — a calm, centered page header with a single back action.
 *
 * Stays readable on small screens and relies on the shared typography system.
 */
const PageHeader = ({ title, backLabel = "Tillbaka", onBack, className }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 w-full bg-background pt-safe",
        className,
      )}
    >
      <div className="relative flex items-center justify-center px-300 py-300">
        <button
          type="button"
          onClick={() => (onBack ? onBack() : navigate(-1))}
          className="absolute left-300 top-1/2 -translate-y-1/2 flex items-center gap-100 text-foreground active:opacity-70"
          aria-label={backLabel}
        >
          <ChevronLeft className="w-5 h-5" />
          <Typography variant="body" as="span">
            {backLabel}
          </Typography>
        </button>

        <Typography variant="heading" as="h1" className="text-foreground">
          {title}
        </Typography>
      </div>
    </header>
  );
};

export default PageHeader;
