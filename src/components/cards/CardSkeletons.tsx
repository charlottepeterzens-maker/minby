const shimmer = "animate-pulse";

export const CircleCardSkeleton = () => (
  <div
    className={`w-full rounded-[20px] p-5 flex gap-4 ${shimmer}`}
    style={{ backgroundColor: "#F9F3E1" }}
  >
    <div className="flex-1 space-y-2">
      <div className="h-3 w-24 rounded" style={{ backgroundColor: "#E8DDC6" }} />
      <div className="h-3 w-full rounded" style={{ backgroundColor: "#E8DDC6" }} />
      <div className="h-3 w-5/6 rounded" style={{ backgroundColor: "#E8DDC6" }} />
      <div className="h-3 w-16 rounded mt-3" style={{ backgroundColor: "#E8DDC6" }} />
    </div>
    <div className="w-[92px] h-[92px] relative flex-shrink-0">
      <div className="absolute top-0 right-0 w-12 h-12 rounded-full" style={{ backgroundColor: "#E8DDC6" }} />
      <div className="absolute top-8 left-0 w-11 h-11 rounded-full" style={{ backgroundColor: "#E8DDC6" }} />
      <div className="absolute bottom-0 right-2 w-10 h-10 rounded-full" style={{ backgroundColor: "#E8DDC6" }} />
    </div>
  </div>
);

export const MeetingCardSkeleton = () => (
  <div
    className={`w-[176px] flex-shrink-0 h-[184px] rounded-[20px] p-4 flex flex-col justify-between ${shimmer}`}
    style={{ backgroundColor: "#F9F3E1" }}
  >
    <div className="space-y-2">
      <div className="h-2.5 w-16 rounded" style={{ backgroundColor: "#E8DDC6" }} />
      <div className="h-3 w-24 rounded" style={{ backgroundColor: "#E8DDC6" }} />
      <div className="h-3 w-20 rounded" style={{ backgroundColor: "#E8DDC6" }} />
    </div>
    <div className="space-y-2">
      <div className="h-2 w-14 rounded" style={{ backgroundColor: "#E8DDC6" }} />
      <div className="h-3 w-16 rounded" style={{ backgroundColor: "#E8DDC6" }} />
    </div>
  </div>
);

export const TipTileSkeleton = () => (
  <div
    className={`w-[110px] h-[130px] flex-shrink-0 rounded-lg ${shimmer}`}
    style={{ backgroundColor: "#E8DDC6" }}
  />
);

export const TipCardSkeleton = TipTileSkeleton;
export const PhotoTileSkeleton = TipTileSkeleton;
