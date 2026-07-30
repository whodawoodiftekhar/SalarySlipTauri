import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

type Variant = "primary" | "ghost" | "overlay" | "overlayGhost" | "link";
type Size = "sm" | "md" | "wide";

const BASE = "inline-flex items-center font-semibold";

const VARIANT: Record<Variant, string> = {
  primary:
    "gap-[7px] rounded-[9px] border-none bg-accent text-white hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed",
  ghost:
    "gap-1 rounded-lg border border-line bg-white text-accent hover:bg-accent-soft hover:border-accent-ring",
  overlay: "gap-[7px] rounded-[9px] border border-accent bg-accent text-white",
  overlayGhost: "gap-[7px] rounded-[9px] border border-line bg-white text-ink",
  link: "gap-[2px] border-none bg-transparent p-0 text-accent",
};

const SIZE: Record<Size, string> = {
  sm: "px-3 py-[7px] text-[13px]",
  md: "px-[15px] py-[9px] max-mob:px-[13px]",
  wide: "w-full justify-center px-[15px] py-[9px] mt-4",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  const sizing =
    variant === "link"
      ? "text-[13px]"
      : variant === "overlay" || variant === "overlayGhost"
        ? "px-4 py-[9px]"
        : SIZE[size];

  return (
    <button className={cn(BASE, VARIANT[variant], sizing, className)} {...rest}>
      {children}
    </button>
  );
}

export function IconButton({
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "grid place-items-center rounded-lg border-none bg-transparent p-[5px] text-ash hover:bg-hover",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
