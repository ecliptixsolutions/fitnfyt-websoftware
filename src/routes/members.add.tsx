import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell, Card } from "@/components/layout/AppShell";
import {
  addPlanMonths,
  defaultMembershipPlan,
  getMembershipPlan,
  membershipPlans,
} from "@/lib/membership-plans";
import { queueHikvisionEnrollment, saveMemberToSupabase } from "@/lib/supabase-data";
import { useApp, type Member } from "@/store/app";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/members/add")({
  head: () => ({ meta: [{ title: "Add Member - Fit Force Gym" }] }),
  component: AddMember,
});

function defaultEmployeeNumber() {
  return `EMP${new Date().getTime().toString().slice(-6)}`;
}

const maxFaceImageBytes = 199 * 1024;

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Face image could not be loaded"));
    reader.readAsDataURL(blob);
  });
}

async function compressFaceImage(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    let maxSide = 900;
    let quality = 0.86;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Face image could not be processed");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/jpeg", quality),
      );
      if (!blob) throw new Error("Face image could not be compressed");
      if (blob.size <= maxFaceImageBytes || attempt === 11) {
        if (blob.size > maxFaceImageBytes) {
          throw new Error("Face image is still above 199 KB after compression");
        }
        return {
          dataUrl: await blobToDataUrl(blob),
          size: blob.size,
        };
      }

      quality = Math.max(0.45, quality - 0.08);
      if (quality <= 0.5) maxSide = Math.max(360, Math.round(maxSide * 0.82));
    }
  } finally {
    bitmap.close();
  }

  throw new Error("Face image could not be compressed");
}

function AddMember() {
  const addMember = useApp((s) => s.addMember);
  const currentBranch = useApp((s) => s.currentBranch);
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    dob: "",
    gender: "Male",
    plan: defaultMembershipPlan.name,
    startDate: new Date().toISOString().slice(0, 10),
    amountPaid: defaultMembershipPlan.price,
    mode: "UPI",
    ref: "",
    locker: "",
    employeeNumber: defaultEmployeeNumber(),
    cardNumber: "",
    faceImageData: "",
    faceImageName: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const plan = getMembershipPlan(form.plan);
  const expiry = addPlanMonths(form.startDate, plan.months);
  const balance = plan.price - Number(form.amountPaid || 0);

  const set = (k: string, v: any) => setForm({ ...form, [k]: v });

  const selectFaceImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Select a valid face image");
      return;
    }
    try {
      const compressed = await compressFaceImage(file);
      setForm((current) => ({
        ...current,
        faceImageData: compressed.dataUrl,
        faceImageName: `${file.name} (${Math.ceil(compressed.size / 1024)} KB)`,
      }));
      toast.success("Face image compressed below 199 KB");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Face image could not be compressed");
      setForm((current) => ({ ...current, faceImageData: "", faceImageName: "" }));
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const save = async (andAnother: boolean) => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and phone required");
      return;
    }

    const employeeNumber = form.employeeNumber.trim().toUpperCase();
    if (!employeeNumber) {
      toast.error("Employee number is required for biometric enrollment");
      return;
    }

    setSaving(true);
    try {
      const member: Member = {
        id: employeeNumber,
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        plan: form.plan,
        startDate: new Date(form.startDate).toISOString(),
        expiryDate: expiry.toISOString(),
        status: "active",
        amountPaid: Number(form.amountPaid),
        totalAmount: plan.price,
        branchId: currentBranch,
        checkIns: [],
        streak: 0,
        documents: [],
        workoutPlan: [],
      };

      await saveMemberToSupabase(member);
      addMember(member);

      await queueHikvisionEnrollment({
        employeeNumber,
        subjectId: employeeNumber,
        subjectType: "member",
        name: form.name.trim(),
        cardNumber: form.cardNumber.trim() || undefined,
        faceImageData: form.faceImageData || undefined,
        validFrom: new Date(form.startDate).toISOString(),
        validTo: expiry.toISOString(),
        active: true,
        branchId: currentBranch,
      });
      toast.success("Member added to Upload Users queue");

      if (andAnother) {
        setForm({
          ...form,
          name: "",
          phone: "",
          email: "",
          cardNumber: "",
          faceImageData: "",
          faceImageName: "",
          employeeNumber: defaultEmployeeNumber(),
        });
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        navigate({ to: "/members" });
      }
    } catch (error) {
      console.error(error);
      toast.error("Member saved locally, but device enrollment queue failed");
    } finally {
      setSaving(false);
    }
  };


  return (
    <AppShell title="Add Member">
      <Card className="space-y-4 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Personal Info</h3>
        <Field label="Full Name *">
          <input className="input-field mt-1" value={form.name} onChange={(e) => set("name", e.target.value)} />
        </Field>
        <Field label="Mobile *">
          <input className="input-field mt-1" placeholder="+91" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Email">
          <input className="input-field mt-1" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Date of Birth">
            <input className="input-field mt-1" type="date" value={form.dob} onChange={(e) => set("dob", e.target.value)} />
          </Field>
          <Field label="Gender">
            <select className="input-field mt-1" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Membership</h3>
        <Field label="Plan">
          <select
            className="input-field mt-1"
            value={form.plan}
            onChange={(e) => {
              set("plan", e.target.value);
              set("amountPaid", getMembershipPlan(e.target.value).price);
            }}
          >
            {membershipPlans.map((p) => <option key={p.name}>{p.name}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date">
            <input className="input-field mt-1" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </Field>
          <Field label="Expiry">
            <input className="input-field mt-1 opacity-60" readOnly value={expiry.toISOString().slice(0, 10)} />
          </Field>
        </div>
      </Card>

      <Card className="space-y-4 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Biometric Enrollment</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Employee Number *">
            <input
              className="input-field mt-1 uppercase"
              value={form.employeeNumber}
              onChange={(event) => set("employeeNumber", event.target.value.toUpperCase())}
            />
          </Field>
          <Field label="Card Number">
            <input className="input-field mt-1" value={form.cardNumber} onChange={(event) => set("cardNumber", event.target.value)} />
          </Field>
        </div>
        <Field label="Face Image">
          <input
            ref={fileInputRef}
            className="input-field mt-1"
            type="file"
            accept="image/*"
            onChange={selectFaceImage}
          />
          {form.faceImageData && (
            <div className="mt-3 flex items-center gap-3 rounded-md border border-border p-3">
              <img
                src={form.faceImageData}
                alt=""
                className="h-16 w-16 rounded-md object-cover"
              />
              <div className="min-w-0 text-xs text-muted-foreground">
                <div className="truncate font-semibold text-foreground">{form.faceImageName}</div>
                <div>Saved with upload queue</div>
              </div>
            </div>
          )}
        </Field>
      </Card>

      <Card className="space-y-4 mb-4">
        <h3 className="text-sm font-bold uppercase tracking-wider text-primary">Payment</h3>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="font-semibold">INR {plan.price.toLocaleString("en-IN")}</span></div>
        <Field label="Amount Paid">
          <input className="input-field mt-1" type="number" value={form.amountPaid} onChange={(e) => set("amountPaid", e.target.value)} />
        </Field>
        <div className="flex justify-between text-sm"><span className="text-muted-foreground">Balance Due</span><span className={`font-semibold ${balance > 0 ? "text-destructive" : "text-primary"}`}>INR {balance.toLocaleString("en-IN")}</span></div>
        <Field label="Payment Mode">
          <div className="grid grid-cols-4 gap-2 mt-1">
            {["Cash", "UPI", "Card", "Bank"].map((m) => (
              <button key={m} type="button" onClick={() => set("mode", m)} className={`py-2 text-xs rounded-lg border ${form.mode === m ? "bg-primary text-primary-foreground border-primary font-semibold" : "border-border text-muted-foreground"}`}>{m}</button>
            ))}
          </div>
        </Field>
        {(form.mode === "UPI" || form.mode === "Card") && (
          <Field label="Reference / UTR">
            <input className="input-field mt-1" value={form.ref} onChange={(e) => set("ref", e.target.value)} />
          </Field>
        )}
      </Card>

      <button disabled={saving} onClick={() => save(false)} className="btn-primary w-full disabled:opacity-60">
        {saving ? "Saving..." : "Save Member"}
      </button>
      <button disabled={saving} onClick={() => save(true)} className="w-full mt-2 py-3 rounded-xl border border-border text-sm text-muted-foreground hover:bg-secondary disabled:opacity-60">
        Save & Add Another
      </button>
    </AppShell>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}
