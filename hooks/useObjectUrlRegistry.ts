import { useEffect, useRef } from "react";

export function useObjectUrlRegistry() {
  const urlsRef = useRef<Set<string>>(new Set());

  const register = (url: string) => {
    urlsRef.current.add(url);
    return url;
  };

  const revoke = (url?: string | null) => {
    if (!url) return;
    if (urlsRef.current.has(url)) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
      urlsRef.current.delete(url);
    }
  };

  const revokeAll = () => {
    for (const u of urlsRef.current) {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    }
    urlsRef.current.clear();
  };

  useEffect(() => {
    // auto-cleanup на unmount
    return () => revokeAll();
  }, []);

  return { register, revoke, revokeAll, _debugUrls: urlsRef };
}
