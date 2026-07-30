import { cn } from "@/shared/lib/cn";

export function Avatar({
  label,
  size = "md",
  className,
}: {
  label: string;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid flex-none place-items-center rounded-full bg-accent-soft font-bold text-accent",
        size === "sm"
          ? "h-[30px] w-[30px] text-[11px]"
          : "h-[34px] w-[34px] text-[12px]",
        className,
      )}
    >
      {label}
    </span>
  );
}
