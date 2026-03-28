import { useState, useRef, useEffect } from "react";

interface Props {
  src: string;
  alt: string;
  className?: string;
  style?: React.CSSProperties;
}

const LazyImage = ({ src, alt, className = "", style }: Props) => {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
      {/* Blur placeholder */}
      <div
        className="absolute inset-0 transition-opacity duration-500"
        style={{
          backgroundColor: "hsl(var(--color-surface-raised))",
          opacity: loaded ? 0 : 1,
          filter: "blur(8px)",
          transform: "scale(1.1)",
        }}
      />
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
          style={{ borderRadius: "inherit" }}
        />
      )}
    </div>
  );
};

export default LazyImage;
