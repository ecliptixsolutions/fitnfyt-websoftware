import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { restoreSupabaseAuth } from "@/lib/supabase-auth";
import { loadSupabaseSnapshot, saveSupabaseSnapshot } from "@/lib/supabase-data";
import { useApp } from "@/store/app";

function isUserEditing() {
  const active = document.activeElement;
  if (!active) return false;
  const tagName = active.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || active.hasAttribute("contenteditable");
}

export function SupabaseBridge() {
  const loaded = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const lastUserInput = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const markUserInput = () => {
      lastUserInput.current = Date.now();
    };

    window.addEventListener("keydown", markUserInput, true);
    window.addEventListener("input", markUserInput, true);
    restoreSupabaseAuth()
      .then((auth) => {
        if (cancelled) return;
        if (auth) useApp.getState().setAuth(auth);
        else useApp.getState().setAuthReady(true);
      })
      .catch(() => useApp.getState().setAuthReady(true));

    loadSupabaseSnapshot()
      .then((snapshot) => {
        if (cancelled) return;
        if (
          snapshot.members?.length ||
          snapshot.staff?.length ||
          snapshot.attendance?.length ||
          snapshot.leads?.length ||
          snapshot.biometricDevices?.length ||
          snapshot.readerConnectionEvents?.length
        ) {
          useApp.setState((state) => ({ ...state, ...snapshot }));
        }
        loaded.current = true;
      })
      .catch((error) => {
        loaded.current = true;
        console.error(error);
        toast.error("Supabase sync failed. Check database setup.");
      });

    const unsubscribe = useApp.subscribe((state) => {
      if (!loaded.current || isUserEditing()) return;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => {
        if (isUserEditing() || Date.now() - lastUserInput.current < 2500) return;
        saveSupabaseSnapshot({
          members: state.members,
          staff: state.staff,
          leads: state.leads,
          attendance: state.attendance ?? [],
          biometricDevices: state.biometricDevices ?? [],
          readerConnectionEvents: state.readerConnectionEvents ?? [],
        }).catch((error) => {
          console.error(error);
          toast.error("Could not save to Supabase");
        });
      }, 1200);
    });

    const interval = window.setInterval(() => {
      if (isUserEditing() || Date.now() - lastUserInput.current < 2500) return;
      loadSupabaseSnapshot()
        .then((snapshot) => {
          if (!cancelled && !isUserEditing() && Date.now() - lastUserInput.current >= 2500) {
            useApp.setState((state) => ({ ...state, ...snapshot }));
          }
        })
        .catch((error) => console.error(error));
    }, 10000);

    return () => {
      cancelled = true;
      window.removeEventListener("keydown", markUserInput, true);
      window.removeEventListener("input", markUserInput, true);
      unsubscribe();
      window.clearTimeout(saveTimer.current);
      window.clearInterval(interval);
    };
  }, []);

  return null;
}









