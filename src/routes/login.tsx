import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell, Eye, EyeOff, Shield } from "lucide-react";
import { useState } from "react";
import { useApp, type Role } from "@/store/app";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login — Fit Force Gym" }] }),
  component: Login,
});

function Login() {
  const [role, setRole] = useState<Role>("owner");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const login = useApp((s) => s.login);
  const navigate = useNavigate();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || !password) {
      toast.error("Enter mobile and password");
      return;
    }
    const ok = login(role, phone, password);
    if (!ok) {
      toast.error("Login failed");
      return;
    }
    toast.success("Welcome to Fit & Fyt GymOS!");
    if (phone === "superadmin") navigate({ to: "/dashboard" });
    else navigate({ to: role === "member" ? "/member/home" : "/dashboard" });
  };

  const quickSuper = () => {
    login("super", "superadmin", "superadmin");
    toast.success("Logged in as Super Admin");
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="min-h-screen grid place-items-center bg-background px-4 py-8">
      <div className="w-full max-w-sm card-surface p-7">
        <div className="text-center mb-6">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-primary/40 bg-primary/10">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-black">
            FIT <span className="text-primary">&</span> FYT
          </h1>
          <p className="mt-1 text-[10px] uppercase text-primary">MMA · Gym · Fitness</p>
          <p className="mt-3 text-xs text-muted-foreground">Sign in to GymOS</p>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-5 p-1 bg-input rounded-md">
          {(["owner", "staff", "member"] as Role[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={`py-2 text-sm rounded capitalize transition ${role === r ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground"}`}
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Mobile Number
            </label>
            <input
              className="input-field mt-1"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
              Password
            </label>
            <div className="relative mt-1">
              <input
                className="input-field pr-10"
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <div className="text-right mt-1.5">
              <a className="text-xs text-muted-foreground hover:text-primary" href="#">
                Forgot Password?
              </a>
            </div>
          </div>
          <button className="btn-primary w-full" type="submit">
            Login
          </button>
        </form>

        <button
          onClick={quickSuper}
          className="mt-3 w-full flex items-center justify-center gap-2 text-xs py-2.5 rounded-md border border-border text-muted-foreground hover:bg-secondary"
        >
          <Shield className="w-4 h-4" /> Quick Login as Super Admin
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          New gym?{" "}
          <a className="text-primary font-medium" href="#">
            Start Free Trial →
          </a>
        </p>
        <p className="text-center text-[10px] text-muted-foreground mt-3 leading-relaxed">
          Demo: use any number + password.
          <br />
          Super: <span className="text-amber-300">superadmin / superadmin</span>
        </p>
      </div>
    </div>
  );
}
