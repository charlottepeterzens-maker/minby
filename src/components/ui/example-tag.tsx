/**
 * Delad "exempel"-tagg. Används på placeholders över hela sajten.
 * Håller stilen (färg, radius, spacing) och interaktions-states på ett ställe.
 */
import Typography from "@/components/ui/typography";

export const ExampleTag = ({
  className = "",
  label = "exempel",
}: {
  className?: string;
  label?: string;
}) => (
  <Typography
    variant="meta"
    as="span"
    tabIndex={0}
    aria-label={`${label} – platshållarinnehåll`}
    className={
      "inline-flex items-center px-3 py-1 rounded-full select-none " +
      "transition-[opacity,box-shadow,transform] duration-150 " +
      "hover:opacity-90 active:scale-[0.98] " +
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 " +
      "focus-visible:ring-[hsl(var(--color-accent-terra))] focus-visible:ring-offset-[#F9F3E1] " +
      className
    }
    style={{ backgroundColor: "hsl(var(--color-accent-terra))", color: "hsl(var(--text-inverse))" }}
  >
    {label}
  </Typography>
);
