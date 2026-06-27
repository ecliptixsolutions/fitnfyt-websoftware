import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { updateRecoveredPassword } from "@/lib/supabase-auth";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset Password - Fit & Fyt GymOS" }] }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [show, setShow] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setSaving(true);
    try {
      await updateRecoveredPassword(password);
      toast.success("Password updated. Sign in with your new password.");
      navigate({ to: "/login", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Password update failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-8">
      <div className="card-surface w-full max-w-sm p-7">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-md border border-primary/40 bg-primary/10">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-4 text-2xl font-black">Set new password</h1>
          <p className="mt-2 text-xs text-muted-foreground">
            Use at least 8 characters and keep it private.
          </p>
        </div>
        <form className="space-y-4" onSubmit={submit}>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground">
            New password
            <div className="relative mt-1">
              <input
                className="input-field pr-10"
                type={show ? "text" : "password"}
                value={password}
                minLength={8}
                required
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow((value) => !value)}
              >
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </label>
          <label className="block text-xs uppercase tracking-wider text-muted-foreground">
            Confirm password
            <input
              className="input-field mt-1"
              type={show ? "text" : "password"}
              value={confirmPassword}
              minLength={8}
              required
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </label>
          <button className="btn-primary w-full justify-center" disabled={saving}>
            {saving ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
