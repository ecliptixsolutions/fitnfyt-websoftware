import { createFileRoute } from "@tanstack/react-router";
import { Camera, UploadCloud, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, Card } from "@/components/layout/AppShell";
import { queueHikvisionEnrollment } from "@/lib/supabase-data";
import { useApp } from "@/store/app";

export const Route = createFileRoute("/enrollment")({
  head: () => ({ meta: [{ title: "Biometric Enrollment - Fit & Fyt" }] }),
  component: EnrollmentPage,
});

function defaultEmployeeNumber() {
  return `EMP${new Date().getTime().toString().slice(-6)}`;
}

function EnrollmentPage() {
  const members = useApp((state) => state.members);
  const currentBranch = useApp((state) => state.currentBranch);
  const [memberId, setMemberId] = useState("");
  const selectedMember = members.find((member) => member.id === memberId);
  const [form, setForm] = useState({
    employeeNumber: defaultEmployeeNumber(),
    name: "",
    cardNumber: "",
    validFrom: new Date().toISOString().slice(0, 10),
    validTo: "2030-12-31",
    faceImagePath: "",
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const effectiveName = selectedMember?.name ?? form.name;
  const employeeNumber = form.employeeNumber.trim().toUpperCase();
  const canSave = Boolean(employeeNumber && effectiveName.trim());
  const memberOptions = useMemo(
    () => members.slice().sort((a, b) => a.name.localeCompare(b.name)),
    [members],
  );

  const set = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Select a JPG/JPEG face image");
      return;
    }

    const dataUrl = await fileToDataUrl(file);
    setPreview(dataUrl);
    set("faceImagePath", dataUrl);
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  };

  const startCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("Camera is not available in this browser");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      setCameraOpen(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch (error) {
      console.error(error);
      toast.error("Allow camera permission, then try again");
    }
  };

  const captureFrame = () => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      toast.error("Camera preview is not ready yet");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      toast.error("Could not capture camera image");
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setPreview(dataUrl);
    set("faceImagePath", dataUrl);
    stopCamera();
    toast.success("Face image captured");
  };

  useEffect(() => stopCamera, []);

  const save = async () => {
    if (!canSave) {
      toast.error("Employee number and name are required");
      return;
    }

    setSaving(true);
    try {
      await queueHikvisionEnrollment({
        employeeNumber,
        subjectId: selectedMember?.id ?? employeeNumber,
        subjectType: "member",
        name: effectiveName.trim(),
        cardNumber: form.cardNumber.trim() || undefined,
        faceImagePath: form.faceImagePath.trim() || undefined,
        validFrom: new Date(form.validFrom).toISOString(),
        validTo: new Date(form.validTo).toISOString(),
        active: true,
        branchId: selectedMember?.branchId ?? currentBranch,
      });
      toast.success("Enrollment queued for Hikvision device");
    } catch (error) {
      console.error(error);
      toast.error("Could not queue device enrollment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppShell
      title="Biometric Enrollment"
      description="Attach or capture a face image and queue the member for Hikvision upload."
    >
      <Card className="mb-4 space-y-4">
        <Field label="Existing member">
          <select
            className="input-field mt-1"
            value={memberId}
            onChange={(event) => {
              const nextMemberId = event.target.value;
              setMemberId(nextMemberId);
              const member = members.find((item) => item.id === nextMemberId);
              if (member) {
                setForm((current) => ({
                  ...current,
                  employeeNumber: member.id.toUpperCase(),
                  name: member.name,
                }));
              } else {
                setForm((current) => ({
                  ...current,
                  employeeNumber: defaultEmployeeNumber(),
                  name: "",
                }));
              }
            }}
          >
            <option value="">Manual enrollment</option>
            {memberOptions.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name} - {member.id.toUpperCase()}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Employee number *">
            <input
              className="input-field mt-1 uppercase"
              value={form.employeeNumber}
              onChange={(event) => set("employeeNumber", event.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Card number">
            <input
              className="input-field mt-1"
              value={form.cardNumber}
              onChange={(event) => set("cardNumber", event.target.value)}
            />
          </Field>
        </div>

        <Field label="Name *">
          <input
            className="input-field mt-1"
            value={effectiveName}
            disabled={Boolean(selectedMember)}
            onChange={(event) => set("name", event.target.value)}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Valid from">
            <input
              className="input-field mt-1"
              type="date"
              value={form.validFrom}
              onChange={(event) => set("validFrom", event.target.value)}
            />
          </Field>
          <Field label="Valid to">
            <input
              className="input-field mt-1"
              type="date"
              value={form.validTo}
              onChange={(event) => set("validTo", event.target.value)}
            />
          </Field>
        </div>
      </Card>

      <Card className="mb-4 space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Face Image</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="subtle-button justify-center">
            <UploadCloud className="h-4 w-4" />
            Attach image
            <input
              className="hidden"
              type="file"
              accept="image/jpeg,image/jpg,image/*"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            className="btn-primary justify-center text-xs"
            onClick={startCamera}
          >
            <Camera className="h-4 w-4" />
            Scan / capture image
          </button>
        </div>

        {cameraOpen && (
          <div className="space-y-3 rounded-md border border-border bg-secondary p-3">
            <video
              ref={videoRef}
              className="max-h-80 w-full rounded-md bg-black object-contain"
              autoPlay
              muted
              playsInline
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" className="btn-primary justify-center" onClick={captureFrame}>
                <Camera className="h-4 w-4" />
                Capture photo
              </button>
              <button type="button" className="subtle-button justify-center" onClick={stopCamera}>
                <X className="h-4 w-4" />
                Close camera
              </button>
            </div>
          </div>
        )}

        <Field label="Or local face image path">
          <input
            className="input-field mt-1"
            placeholder="C:\\Users\\padar\\Pictures\\HikvisionFaces\\EMP002.jpg"
            value={
              form.faceImagePath.startsWith("data:image/")
                ? "Image captured/attached from browser"
                : form.faceImagePath
            }
            onChange={(event) => {
              setPreview(null);
              set("faceImagePath", event.target.value);
            }}
          />
        </Field>

        {preview && (
          <img
            src={preview}
            alt="Face preview"
            className="max-h-72 w-full rounded-md bg-secondary object-contain"
          />
        )}
      </Card>

      <button
        disabled={saving || !canSave}
        onClick={save}
        className="btn-primary w-full disabled:opacity-60"
      >
        {saving ? "Queueing..." : "Queue Enrollment"}
      </button>
    </AppShell>
  );
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1 text-xs text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}
