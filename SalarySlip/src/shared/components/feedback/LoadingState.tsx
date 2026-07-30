import { cn } from "@/shared/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-md bg-hairline", className)} />
  );
}

/** Generic in-card placeholder — a few shimmering rows. */
export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-[11px]">
          <Skeleton className="h-[30px] w-[30px] flex-none rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-[11px] w-[38%]" />
            <Skeleton className="h-[9px] w-[24%]" />
          </div>
          <Skeleton className="h-[11px] w-[64px]" />
        </div>
      ))}
    </div>
  );
}

export function LoadingStats() {
  return (
    <div className="mb-5 grid grid-cols-4 gap-4 max-tab:grid-cols-2 max-mob:gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-[13px] rounded-[14px] border border-line bg-white p-4"
        >
          <Skeleton className="h-10 w-10 flex-none rounded-[11px]" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-[9px] w-[56%]" />
            <Skeleton className="h-[15px] w-[70%]" />
          </div>
        </div>
      ))}
    </div>
  );
}
