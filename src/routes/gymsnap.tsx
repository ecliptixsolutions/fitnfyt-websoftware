import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  CheckCircle2,
  Download,
  LogOut,
  RefreshCw,
  Search,
  Share2,
  SquarePlus,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  loadGymSnapPeople,
  queueHikvisionEnrollment,
  type GymSnapPerson,
} from "@/lib/supabase-data";
import { signInWithSupabase, signOutSupabase, type AuthUser } from "@/lib/supabase-auth";
import { useApp, type Role } from "@/store/app";

export const Route = createFileRoute("/gymsnap")({
  head: () => ({
    meta: [{ title: "GymSnap - Face Enrollment" }, { name: "theme-color", content: "#090b0d" }],
  }),
  component: GymSnap,
});

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function GymSnap() {
  const auth = useApp((state) => state.auth);
  const authReady = useApp((state) => state.authReady);
  const setAuth = useApp((state) => state.setAuth);
  const logout = useApp((state) => state.logout);
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const receivePrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPrompt);
    };
    window.addEventListener("beforeinstallprompt", receivePrompt);
    return () => window.removeEventListener("beforeinstallprompt", receivePrompt);
  }, []);

  if (!authReady) return <GymSnapLoading />;
  if (!auth) return <GymSnapLogin onSignedIn={setAuth} />;

  return (
    <GymSnapWorkspace
      installPrompt={installPrompt}
      onInstalled={() => setInstallPrompt(null)}
      onLogout={async () => {
        await signOutSupabase();
        logout();
      }}
    />
  );
}

function GymSnapLogin({ onSignedIn }: { onSignedIn: (user: AuthUser) => void }) {
  const [role, setRole] = useState<Extract<Role, "owner" | "staff">>("staff");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setLoading(true);
    try {
      const user = await signInWithSupabase(email, password, role);
      onSignedIn(user);
      toast.success(`Welcome, ${user.name}`);
    } catch (error) {
      console.error(error);
      toast.error("Login failed. Check your email, password, and account type.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#090b0d] px-5 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-sm flex-col justify-center">
        <div className="mb-8">
          <div className="mb-5 grid h-14 w-14 place-items-center rounded-md bg-[#b7f34a] text-black">
            <Camera className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-black">GymSnap</h1>
          <p className="mt-2 text-sm text-zinc-400">Member and staff face enrollment</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 rounded-md bg-zinc-900 p-1">
            {(["staff", "owner"] as const).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRole(item)}
                className={`h-10 rounded text-sm font-semibold capitalize ${
                  role === item ? "bg-zinc-700 text-white" : "text-zinc-400"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <label className="block text-xs font-semibold uppercase text-zinc-400">
            Email
            <input
              className="mt-2 h-12 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 text-base text-white outline-none focus:border-[#b7f34a]"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold uppercase text-zinc-400">
            Password
            <input
              className="mt-2 h-12 w-full rounded-md border border-zinc-700 bg-zinc-900 px-4 text-base text-white outline-none focus:border-[#b7f34a]"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          <button
            className="h-12 w-full rounded-md bg-[#b7f34a] font-bold text-black disabled:opacity-60"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}

function GymSnapWorkspace({
  installPrompt,
  onInstalled,
  onLogout,
}: {
  installPrompt: InstallPrompt | null;
  onInstalled: () => void;
  onLogout: () => void;
}) {
  const auth = useApp((state) => state.auth);
  const [people, setPeople] = useState<GymSnapPerson[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<GymSnapPerson | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [installed, setInstalled] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setInstalled(standalone);
  }, []);

  const results = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return people.slice(0, 40);
    return people
      .filter((person) =>
        `${person.name} ${person.phone} ${person.id} ${person.type}`
          .toLowerCase()
          .includes(normalized),
      )
      .slice(0, 40);
  }, [people, query]);

  const refresh = useCallback(async (quiet = false) => {
    if (!quiet) setSyncing(true);
    try {
      const latest = await loadGymSnapPeople();
      setPeople(latest);
      setLastSync(new Date());
      setSelected((current) => {
        if (!current) return null;
        return (
          latest.find((person) => person.id === current.id && person.type === current.type) ?? null
        );
      });
    } catch (error) {
      console.error(error);
      if (!quiet) toast.error("Could not refresh records");
    } finally {
      if (!quiet) setSyncing(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(true), 5000);
    const refreshVisible = () => {
      if (document.visibilityState === "visible") void refresh(true);
    };
    document.addEventListener("visibilitychange", refreshVisible);
    window.addEventListener("online", refreshVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshVisible);
      window.removeEventListener("online", refreshVisible);
    };
  }, [refresh]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1080 } },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (!videoRef.current) return;
        videoRef.current.srcObject = stream;
        void videoRef.current.play();
      });
    } catch (error) {
      console.error(error);
      toast.error("Allow camera access and try again");
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    const canvas = document.createElement("canvas");
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = 900;
    canvas.height = 900;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.drawImage(
      video,
      (video.videoWidth - size) / 2,
      (video.videoHeight - size) / 2,
      size,
      size,
      0,
      0,
      900,
      900,
    );
    setPhoto(canvas.toDataURL("image/jpeg", 0.88));
    stopCamera();
  };

  const choosePhoto = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    setPhoto(await compressImage(file));
  };

  const save = async () => {
    if (!selected || !photo) return;
    setSaving(true);
    try {
      await queueHikvisionEnrollment({
        employeeNumber: selected.id.toUpperCase(),
        subjectId: selected.id,
        subjectType: selected.type,
        name: selected.name,
        cardNumber: selected.id.toUpperCase(),
        faceImageData: photo,
        active: true,
        branchId: selected.branchId,
      });
      toast.success("Photo saved and queued for the Hikvision device");
      setPhoto(null);
    } catch (error) {
      console.error(error);
      toast.error("Photo could not be saved");
    } finally {
      setSaving(false);
    }
  };

  const install = async () => {
    if (!installPrompt) {
      setInstallHelpOpen(true);
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setInstalled(true);
      onInstalled();
    }
  };

  return (
    <main className="min-h-screen bg-[#090b0d] pb-28 text-white">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-[#090b0d]/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-[#b7f34a] text-black">
            <Camera className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-black">GymSnap</h1>
            <p className="truncate text-xs text-zinc-400">
              {lastSync ? `Synced ${lastSync.toLocaleTimeString()}` : "Connecting..."}
            </p>
          </div>
          <button
            className="grid h-10 w-10 place-items-center rounded-md border border-zinc-700"
            aria-label="Refresh"
            title="Refresh"
            onClick={() => void refresh()}
          >
            <RefreshCw className={`h-5 w-5 ${syncing ? "animate-spin" : ""}`} />
          </button>
          <button
            className="grid h-10 w-10 place-items-center rounded-md border border-zinc-700"
            aria-label="Logout"
            title="Logout"
            onClick={onLogout}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-5">
        {!installed && (
          <button
            className="flex h-14 w-full items-center justify-center gap-2 rounded-md bg-[#b7f34a] font-black text-black"
            onClick={install}
          >
            <Download className="h-5 w-5" />
            Install GymSnap App
          </button>
        )}

        <section>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
            <input
              className="h-13 w-full rounded-md border border-zinc-700 bg-zinc-900 pl-12 pr-4 text-base outline-none focus:border-[#b7f34a]"
              placeholder="Search name, mobile, or ID"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-zinc-500">
            <span>{people.filter((item) => item.type === "member").length} members</span>
            <span>{people.filter((item) => item.type === "staff").length} staff</span>
          </div>
        </section>

        <section className="overflow-hidden rounded-md border border-zinc-800 bg-zinc-900">
          {results.length ? (
            results.map((person) => (
              <button
                key={`${person.type}-${person.id}`}
                className={`flex w-full items-center gap-3 border-b border-zinc-800 p-4 text-left last:border-0 ${
                  selected?.id === person.id && selected.type === person.type
                    ? "bg-[#b7f34a]/10"
                    : "hover:bg-zinc-800"
                }`}
                onClick={() => {
                  setSelected(person);
                  setPhoto(null);
                }}
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-zinc-800">
                  {person.type === "member" ? (
                    <UserRound className="h-5 w-5 text-[#b7f34a]" />
                  ) : (
                    <Users className="h-5 w-5 text-sky-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{person.name}</div>
                  <div className="truncate text-xs text-zinc-400">
                    {person.phone || "No mobile"} · {person.id}
                  </div>
                </div>
                <span className="text-xs capitalize text-zinc-500">{person.detail}</span>
              </button>
            ))
          ) : (
            <div className="p-8 text-center text-sm text-zinc-500">No matching person found</div>
          )}
        </section>

        {selected && (
          <section className="space-y-4 border-t border-zinc-800 pt-5">
            <div>
              <p className="text-xs font-bold uppercase text-[#b7f34a]">Selected</p>
              <h2 className="mt-1 text-2xl font-black">{selected.name}</h2>
              <p className="text-sm text-zinc-400">
                {selected.phone || "No mobile"} · {selected.id} · {selected.detail}
              </p>
            </div>

            {cameraOpen ? (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  className="aspect-square w-full rounded-md bg-black object-cover"
                  autoPlay
                  muted
                  playsInline
                />
                <div className="grid grid-cols-2 gap-3">
                  <button
                    className="flex h-12 items-center justify-center gap-2 rounded-md bg-[#b7f34a] font-bold text-black"
                    onClick={capture}
                  >
                    <Camera className="h-5 w-5" /> Capture
                  </button>
                  <button
                    className="flex h-12 items-center justify-center gap-2 rounded-md border border-zinc-700 font-semibold"
                    onClick={stopCamera}
                  >
                    <X className="h-5 w-5" /> Close
                  </button>
                </div>
              </div>
            ) : photo ? (
              <div className="relative">
                <img
                  src={photo}
                  alt={`${selected.name} face preview`}
                  className="aspect-square w-full rounded-md bg-black object-cover"
                />
                <button
                  className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-black/80"
                  aria-label="Remove photo"
                  onClick={() => setPhoto(null)}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="flex h-14 items-center justify-center gap-2 rounded-md bg-[#b7f34a] font-bold text-black"
                  onClick={startCamera}
                >
                  <Camera className="h-5 w-5" /> Camera
                </button>
                <label className="flex h-14 cursor-pointer items-center justify-center gap-2 rounded-md border border-zinc-700 font-semibold">
                  <Upload className="h-5 w-5" /> Gallery
                  <input
                    className="hidden"
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(event) => void choosePhoto(event.target.files?.[0])}
                  />
                </label>
              </div>
            )}
          </section>
        )}
      </div>

      {selected && photo && !cameraOpen && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-zinc-800 bg-[#090b0d] p-4">
          <button
            className="mx-auto flex h-14 w-full max-w-3xl items-center justify-center gap-2 rounded-md bg-[#b7f34a] font-black text-black disabled:opacity-60"
            disabled={saving}
            onClick={save}
          >
            {saving ? (
              <RefreshCw className="h-5 w-5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-5 w-5" />
            )}
            {saving ? "Saving..." : "Save and Send to Device"}
          </button>
        </div>
      )}

      {installHelpOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end bg-black/70 p-4 sm:items-center sm:justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-title"
        >
          <section className="w-full max-w-md rounded-md border border-zinc-700 bg-zinc-900 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="install-title" className="text-xl font-black">
                  Install GymSnap on iPhone
                </h2>
                <p className="mt-1 text-sm text-zinc-400">Use Safari for these steps.</p>
              </div>
              <button
                className="grid h-10 w-10 shrink-0 place-items-center rounded-md border border-zinc-700"
                aria-label="Close install instructions"
                onClick={() => setInstallHelpOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <ol className="mt-6 space-y-4">
              <li className="flex items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-sky-500/15 text-sky-400">
                  <Share2 className="h-6 w-6" />
                </span>
                <span className="text-sm">
                  <strong className="block text-base">1. Tap Share</strong>
                  Use the Share button at the bottom of Safari.
                </span>
              </li>
              <li className="flex items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-zinc-800 text-white">
                  <SquarePlus className="h-6 w-6" />
                </span>
                <span className="text-sm">
                  <strong className="block text-base">2. Add to Home Screen</strong>
                  Scroll down and tap Add to Home Screen.
                </span>
              </li>
              <li className="flex items-center gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-[#b7f34a] font-black text-black">
                  3
                </span>
                <span className="text-sm">
                  <strong className="block text-base">3. Tap Add</strong>
                  GymSnap will appear with your other apps.
                </span>
              </li>
            </ol>

            <button
              className="mt-6 h-12 w-full rounded-md bg-[#b7f34a] font-black text-black"
              onClick={() => setInstallHelpOpen(false)}
            >
              Got it
            </button>
          </section>
        </div>
      )}

      <span className="sr-only">Signed in as {auth?.name}</span>
    </main>
  );
}

function GymSnapLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#090b0d] text-white">
      <RefreshCw className="h-7 w-7 animate-spin text-[#b7f34a]" />
    </main>
  );
}

function compressImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      const size = Math.min(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = 900;
      canvas.height = 900;
      const context = canvas.getContext("2d");
      if (!context) {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Image could not be processed"));
        return;
      }
      context.drawImage(
        image,
        (image.naturalWidth - size) / 2,
        (image.naturalHeight - size) / 2,
        size,
        size,
        0,
        0,
        900,
        900,
      );
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.88));
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image could not be opened"));
    };
    image.src = objectUrl;
  });
}
