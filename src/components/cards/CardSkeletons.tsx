const shimmer = "animate-pulse";

export const CircleCardSkeleton = () => (
  <div
    className={`w-full rounded-[20px] p-5 flex gap-4 ${shimmer}`}
    style={{ backgroundColor: "#F9F3E1" }}
  >
    <div className="flex-1 space-y-2">
      <div className="h-3 w-24 rounded" style={{ backgroundColor: "#EADFC1" }} />
      <div className="h-3 w-full rounded" style={{ backgroundColor: "#EADFC1" }} />
      <div className="h-3 w-5/6 rounded" style={{ backgroundColor: "#EADFC1" }} />
      <div className="h-3 w-16 rounded mt-3" style={{ backgroundColor: "#EADFC1" }} />
    </div>
    <div className="w-[92px] h-[92px] relative flex-shrink-0">
      <div className="absolute top-0 right-0 w-12 h-12 rounded-full" style={{ backgroundColor: "#EADFC1" }} />
      <div className="absolute top-8 left-0 w-11 h-11 rounded-full" style={{ backgroundColor: "#EADFC1" }} />
      <div className="absolute bottom-0 right-2 w-10 h-10 rounded-full" style={{ backgroundColor: "#EADFC1" }} />
    </div>
  </div>
);

export const MeetingCardSkeleton = () => (
  <div
    className={`w-[130px] flex-shrink-0 h-[166px] rounded-[30px] p-4 flex flex-col justify-between ${shimmer}`}
    style={{ backgroundColor: "#F2ECE3" }}
  >
    <div className="space-y-2">
      <div className="h-2.5 w-16 rounded" style={{ backgroundColor: "#E2D9C9" }} />
      <div className="h-3 w-20 rounded" style={{ backgroundColor: "#E2D9C9" }} />
      <div className="h-3 w-16 rounded" style={{ backgroundColor: "#E2D9C9" }} />
    </div>
    <div className="space-y-2">
      <div className="h-2 w-14 rounded" style={{ backgroundColor: "#E2D9C9" }} />
      <div className="h-3 w-12 rounded" style={{ backgroundColor: "#E2D9C9" }} />
    </div>
  </div>
);

export const TipCardSkeleton = () => (
  <div
    className={`w-full rounded-[20px] p-3 flex gap-3 ${shimmer}`}
    style={{ backgroundColor: "#F9F3E1" }}
  >
    <div className="w-[110px] h-[110px] rounded-[14px] flex-shrink-0" style={{ backgroundColor: "#EADFC1" }} />
    <div className="flex-1 space-y-2">
      <div className="flex items-center gap-2">
        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: "#EADFC1" }} />
        <div className="h-2.5 w-20 rounded" style={{ backgroundColor: "#EADFC1" }} />
      </div>
      <div className="h-3 w-3/4 rounded" style={{ backgroundColor: "#EADFC1" }} />
      <div className="h-3 w-full rounded" style={{ backgroundColor: "#EADFC1" }} />
      <div className="h-3 w-16 rounded mt-3" style={{ backgroundColor: "#EADFC1" }} />
    </div>
  </div>
);
