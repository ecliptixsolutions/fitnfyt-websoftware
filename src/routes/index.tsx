import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell } from "lucide-react";
import { useEffect } from "react";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Fit Force Gym" }] }),
  component: Splash,
});

function Splash() {
  const navigate = useNavigate();
  const auth = useApp((s) => s.auth);
  const authReady = useApp((s) => s.authReady);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!authReady) return;
      if (auth) navigate({ to: auth.role === "member" ? "/member/home" : "/dashboard" });
      else navigate({ to: "/login" });
    }, 2200);
    return () => clearTimeout(t);
  }, [auth, authReady, navigate]);

  return (
    <div className="min-h-screen bg-background grid place-items-center px-6">
      <div className="text-center">
        <div className="relative w-24 h-24 mx-auto grid place-items-center">
          <span className="absolute inset-0 rounded-full border-2 border-primary pulse-ring" />
          <span className="absolute inset-0 rounded-full border-2 border-primary/60 pulse-ring" style={{ animationDelay: ".6s" }} />
          <Dumbbell className="w-16 h-16 text-primary relative" />
        </div>
        <h1 className="mt-6 text-4xl font-black tracking-tight">FIT FORCE <span className="text-primary">GYM</span></h1>
        <p className="mt-3 text-primary text-xs uppercase tracking-[0.3em]">Your Gym. Automated.</p>
      </div>
    </div>
  );
}


