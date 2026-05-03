import { useState, useRef, useEffect } from "react";
import { ImageOff } from "lucide-react";

interface Props {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

const LazyImage = ({ src, alt, className = "", style }: Props) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const [errored, setErrored] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={style}>
      {/* Skeleton / blur placeholder while loading */}
      {!errored && (
        <div
          className="absolute inset-0 transition-opacity duration-500"
          style={{
            backgroundColor: "hsl(var(--color-surface-raised))",
            opacity: loaded ? 0 : 1,
            filter: "blur(8px)",
            transform: "scale(1.1)",
          }}
        />
      )}

      {/* Fallback when image fails to load — keeps the card's shape */}
      {errored && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            backgroundColor: "hsl(var(--color-surface-raised))",
            borderRadius: "inherit",
          }}
          aria-label="Bilden kunde inte laddas"
          role="img"
        >
          <ImageOff
            style={{ color: "hsl(var(--color-text-faint))" }}
            strokeWidth={1.5}
            className="w-1/3 h-1/3 max-w-[28px] max-h-[28px] min-w-[16px] min-h-[16px]"
          />
        </div>
      )}

      {inView && !errored && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          style={{ borderRadius: "inherit" }}
        />
      )}
    </div>
  );
};

export default LazyImage;
