import { useEffect, useState } from "react";
import { Database, RefreshCw, AlertTriangle, Server } from "lucide-react";
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

export function useBackendStatus() {
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await fetch(`${env.apiUrl}/health`);
      if (res.ok) {
        setBackendConnected(true);
      } else {
        setBackendConnected(false);
      }
    } catch {
      setBackendConnected(false);
    }
  };

  const restartBackend = async () => {
    setIsStarting(true);
    try {
      if (
        typeof window !== "undefined" &&
        ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
      ) {
        const core = await import("@tauri-apps/api/core");
        if (core && typeof core.invoke === "function") {
          await core.invoke("start_backend");
        }
      }
    } catch (err) {
      console.warn("[Tauri] Could not invoke start_backend command:", err);
    } finally {
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        try {
          const res = await fetch(`${env.apiUrl}/health`);
          if (res.ok) {
            setBackendConnected(true);
            setIsStarting(false);
            clearInterval(interval);
          }
        } catch {
          if (attempts >= 5) {
            setIsStarting(false);
            clearInterval(interval);
          }
        }
      }, 1000);
    }
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(
      checkStatus,
      backendConnected === true ? 10000 : 3000
    );
    return () => clearInterval(interval);
  }, [backendConnected]);

  return { backendConnected, isStarting, restartBackend, checkStatus };
}

export function BackendStatusBadge() {
  const { backendConnected, isStarting, restartBackend } = useBackendStatus();

  if (isStarting) {
    return (
      <button
        onClick={restartBackend}
        disabled={isStarting}
        className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-2.5 py-[6px] text-[12px] font-semibold text-indigo-800 transition hover:bg-indigo-100 cursor-pointer"
        title="Starting Backend Server..."
      >
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-indigo-600" />
        <span className="hidden sm:inline">Starting Backend...</span>
      </button>
    );
  }

  if (backendConnected === false) {
    return (
      <button
        onClick={restartBackend}
        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-2.5 py-[6px] text-[12px] font-semibold text-red-800 transition hover:bg-red-100 cursor-pointer"
        title="Backend Offline - Click to start or restart backend package"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
        </span>
        <Server className="h-3.5 w-3.5 text-red-600" />
        <span className="hidden sm:inline">Backend Offline (Click to Start)</span>
      </button>
    );
  }

  return (
    <button
      onClick={restartBackend}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-[6px] text-[12px] font-semibold text-emerald-800 transition hover:bg-emerald-100 cursor-pointer"
      title="Backend Server Active - Click to restart if needed"
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
      </span>
      <Server className="h-3.5 w-3.5 text-emerald-600" />
      <span className="hidden sm:inline">Backend Connected</span>
    </button>
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


