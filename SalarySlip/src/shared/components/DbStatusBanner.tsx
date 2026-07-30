import { useEffect, useState } from "react";
import { Database, RefreshCw, AlertTriangle } from "lucide-react";
import { env } from "@/config/env";

export function useDbStatus() {
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkStatus = async () => {
    setIsChecking(true);
    try {
      const res = await fetch(`${env.apiUrl}/health`);
      if (res.ok) {
        const data = await res.json();
        const connected = Boolean(data.dbConnected);
        
        if (dbConnected === false && connected) {
          window.dispatchEvent(new Event("mongodb_reconnected"));
        }
        
        setDbConnected(connected);
      } else {
        setDbConnected(false);
      }
    } catch {
      setDbConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(
      () => {
        checkStatus();
      },
      dbConnected === true ? 10000 : 3000
    );

    return () => clearInterval(interval);
  }, [dbConnected]);

  return { dbConnected, isChecking, checkStatus };
}

export function DbStatusBadge() {
  const { dbConnected } = useDbStatus();

  if (dbConnected === null) return null;

  if (!dbConnected) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-[6px] text-[12px] font-semibold text-amber-800">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
        </span>
        <Database className="h-3.5 w-3.5 text-amber-600" />
        <span className="hidden sm:inline">MongoDB Offline</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-[6px] text-[12px] font-semibold text-emerald-800">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
      </span>
      <Database className="h-3.5 w-3.5 text-emerald-600" />
      <span className="hidden sm:inline">MongoDB Connected</span>
    </span>
  );
}

export function DbStatusBanner() {
  const { dbConnected, isChecking } = useDbStatus();

  if (dbConnected !== false) return null;

  return (
    <div className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-7 py-2.5 text-xs text-amber-900 shadow-xs max-mob:px-4">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 animate-pulse" />
        <span>
          <strong>MongoDB Disconnected:</strong> Waiting for local MongoDB service to start...
        </span>
      </div>
      <div className="flex items-center gap-2 text-amber-700">
        <RefreshCw className={`h-3.5 w-3.5 ${isChecking ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline text-[11px]">Auto-retrying connection...</span>
      </div>
    </div>
  );
}

