import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";

export function ErrorState({
  title = "Could not load this data",
  error,
  onRetry,
}: {
  title?: string;
  error: Error;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[10px] border border-deduct-soft bg-deduct-soft/40 px-4 py-8 text-center">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-deduct-soft text-deduct">
        <AlertTriangle size={18} />
      </span>
      <b className="text-[14px]">{title}</b>
      <small className="max-w-[420px] text-[12.5px] leading-[1.5] text-ash">
        {error.message}
      </small>
      {onRetry && (
        <Button variant="ghost" className="mt-2" onClick={onRetry}>
          <RotateCw size={14} /> Retry
        </Button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-10 text-center text-[13px] text-mist">{message}</div>
  );
}
