/**
 * Delad "exempel"-tagg. Används på placeholders över hela sajten.
 * Håller stilen (färg, radius, spacing) och interaktions-states på ett ställe.
 */
export const ExampleTag = ({
  className = "",
  label = "exempel",
}: {
  className?: string;
  label?: string;
}) => (
  <span
    tabIndex={0}
    aria-label={`${label} – platshållarinnehåll`}
    className={
      "inline-flex items-center text-[11px] px-3 py-1 rounded-full select-none " +
      "transition-[opacity,box-shadow,transform] duration-150 " +
      "hover:opacity-90 active:scale-[0.98] " +
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 " +
      "focus-visible:ring-[#C85A2E] focus-visible:ring-offset-[#F9F3E1] " +
      className
    }
    style={{ backgroundColor: "#C85A2E", color: "#fff", letterSpacing: "0.08em" }}
  >
    {label}
  </span>
);
