import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { requestPasswordReset, signInWithSupabase } from "@/lib/supabase-auth";
import { useApp, type Role } from "@/store/app";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Login - Fit Force Gym" }] }),
  component: Login,
});

function Login() {
  const [role, setRole] = useState<Role>("owner");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const auth = useApp((s) => s.auth);
  const authReady = useApp((s) => s.authReady);
  const setAuth = useApp((s) => s.setAuth);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authReady || !auth) return;
    navigate({ to: auth.role === "member" ? "/member/home" : "/dashboard", replace: true });
  }, [auth, authReady, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error("Enter email/mobile and password");
      return;
    }

    setLoading(true);
    try {
      const user = await signInWithSupabase(identifier, password, role);
      setAuth(user);
      toast.success(`Welcome, ${user.name}`);
      navigate({ to: user.role === "member" ? "/member/home" : "/dashboard" });
    } catch (error) {
      const message = authMessage(error, "Login failed");
      toast.error(message.includes("Invalid") ? "Invalid email or password" : message);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async () => {
    if (!identifier || !identifier.includes("@")) {
      toast.error("Enter your login email first");
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(identifier.trim());
      toast.success("Password reset email sent");
    } catch (error) {
      toast.error(authMessage(error, "Could not send reset email"));
    } finally {
      setLoading(false);
    }
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
          <p className="mt-1 text-[10px] uppercase text-primary">MMA - Gym - Fitness</p>
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
              Email or Mobile
            </label>
            <input
              className="input-field mt-1"
              placeholder="admin@fitfyt.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="username"
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
                autoComplete="current-password"
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
              <button
                type="button"
                onClick={forgotPassword}
                className="text-xs text-muted-foreground hover:text-primary"
              >
                Forgot Password?
              </button>
            </div>
          </div>
          <button className="btn-primary w-full" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

function authMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  try {
    const parsed = JSON.parse(error.message);
    if (parsed.error_code === "over_email_send_rate_limit") {
      return "Please wait one minute before requesting another reset email.";
    }
    return parsed.msg || parsed.error_description || parsed.error || fallback;
  } catch {
    return error.message || fallback;
  }
}
