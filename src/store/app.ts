import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearStoredAuthSession, type AuthUser } from "@/lib/supabase-auth";

export type Role = "owner" | "staff" | "member" | "super";
export type Status = "active" | "expired" | "expiring" | "frozen" | "inactive";

export interface MemberDocument {
  id: string;
  name: string;
  uploadedAt: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  email?: string;
  plan: string;
  startDate: string;
  expiryDate: string;
  status: Status;
  amountPaid: number;
  totalAmount: number;
  checkIns: string[]; // ISO datetimes
  streak: number;
  workoutPlan?: string[];
  documents?: MemberDocument[];
  branchId?: string;
}
export interface Staff {
  id: string;
  name: string;
  phone: string;
  role: "Trainer" | "Receptionist" | "Manager";
  joined: string;
  salary: number;
  active: boolean;
  permissions?: string[];
  shift?: string;
  weeklyOff?: string;
  assignedMemberIds?: string[];
  branchId?: string;
}
export type LeadSource = "Walk-in" | "WhatsApp" | "Instagram" | "Facebook" | "Referral" | "Website";
export interface Lead {
  id: string;
  name: string;
  phone: string;
  source: LeadSource;
  status: "New" | "Follow-up" | "Interested" | "Converted" | "Lost";
  enquiry: string;
  followUp: string;
  notes?: string;
  assignedStaffId?: string;
  activities?: { id: string; date: string; note: string }[];
  branchId?: string;
}
export interface Payment {
  id: string;
  memberId: string;
  amount: number;
  date: string;
  mode: "Cash" | "UPI" | "Card" | "Bank";
  plan: string;
  status: "Paid" | "Pending";
  type?: "payment" | "refund";
  category?: "Membership" | "Personal Training" | "Other";
  trainerId?: string;
  commissionPercent?: number;
  commissionAmount?: number;
  refundForPaymentId?: string;
  reference?: string;
  notes?: string;
  dueDate?: string;
  branchId?: string;
}
export interface AttendanceRecord {
  id: string;
  subjectId: string;
  subjectType: "member" | "staff";
  date: string;
  punchIn: string;
  punchOut?: string;
  source: "Manual" | "Biometric";
  branchId?: string;
}
export interface PayrollRecord {
  id: string;
  staffId: string;
  month: string;
  baseSalary: number;
  bonus: number;
  deduction: number;
  commissionTotal?: number;
  paidCommissionIds?: string[];
  paidAt?: string;
  mode?: Payment["mode"];
}

export interface TrainerCommissionEntry {
  id: string;
  paymentId: string;
  staffId: string;
  staffName: string;
  memberId: string;
  memberName: string;
  packageName: string;
  paymentDate: string;
  totalAmount: number;
  refundedAmount: number;
  netAmount: number;
  commissionPercent: number;
  commissionAmount: number;
  payoutStatus: "Pending" | "Paid" | "Refunded";
}
export interface Branch {
  id: string;
  name: string;
  city: string;
  manager: string;
  members: number;
  revenue: number;
  address?: string;
  phone?: string;
  active?: boolean;
}
export type ReaderStatus = "Connected" | "Disconnected" | "Error" | "Testing";

export interface BiometricDevice {
  id: string;
  name: string;
  model: string;
  branchId: string;
  ipAddress: string;
  port: string;
  username?: string;
  password?: string;
  status: ReaderStatus;
  lastSync?: string;
  lastCommunicationAt?: string;
  lastStatusUpdateAt?: string;
  lastError?: string;
  pollingIntervalSeconds?: number;
  fingerprintPath?: string;
  usersMapped: number;
}
export interface ReaderConnectionEvent {
  id: string;
  readerId: string;
  readerName: string;
  readerIp: string;
  eventType: Exclude<ReaderStatus, "Testing">;
  at: string;
  errorMessage?: string;
  durationSeconds?: number;
}
export interface GymSettings {
  name: string;
  address: string;
  phone: string;
  email: string;
  brandTagline: string;
  supportPhone: string;
  supportWhatsApp: string;
}
export interface NotificationSettings {
  whatsapp: boolean;
  sms: boolean;
  push: boolean;
  expiryReminders: boolean;
  paymentReminders: boolean;
}

export type NewMemberInput = Omit<Member, "id" | "checkIns" | "streak"> & { id?: string };

interface State {
  auth: AuthUser | null;
  authReady: boolean;
  members: Member[];
  staff: Staff[];
  leads: Lead[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  payroll: PayrollRecord[];
  branches: Branch[];
  biometricDevices: BiometricDevice[];
  readerConnectionEvents: ReaderConnectionEvent[];
  gymSettings: GymSettings;
  notificationSettings: NotificationSettings;
  currentBranch: string;
  login: (role: Role, phone: string, password: string) => boolean;
  setAuth: (auth: AuthUser) => void;
  setAuthReady: (ready: boolean) => void;
  logout: () => void;
  addMember: (m: NewMemberInput) => void;
  importMembers: (members: Omit<Member, "id" | "checkIns" | "streak">[]) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
  deleteMember: (id: string) => void;
  renewMember: (
    id: string,
    plan: string,
    months: number,
    amount: number,
    mode: Payment["mode"],
  ) => void;
  toggleMemberFreeze: (id: string) => void;
  setWorkoutPlan: (id: string, exercises: string[]) => void;
  addMemberDocument: (id: string, name: string) => void;
  checkIn: (id: string) => void;
  punchIn: (
    subjectId: string,
    subjectType?: AttendanceRecord["subjectType"],
    source?: AttendanceRecord["source"],
    at?: string,
  ) => void;
  punchOut: (recordId: string, at?: string) => void;
  updateAttendance: (id: string, patch: Partial<AttendanceRecord>) => void;
  addStaff: (s: Omit<Staff, "id">) => void;
  updateStaff: (id: string, patch: Partial<Staff>) => void;
  deleteStaff: (id: string) => void;
  recordPayroll: (record: Omit<PayrollRecord, "id">) => void;
  addLead: (l: Omit<Lead, "id">) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  addLeadActivity: (id: string, note: string) => void;
  convertLead: (id: string) => void;
  addPayment: (p: Omit<Payment, "id">) => void;
  updatePayment: (id: string, patch: Partial<Payment>) => void;
  deletePayment: (id: string) => void;
  addRefund: (p: Omit<Payment, "id" | "type" | "status">) => void;
  addBranch: (branch: Omit<Branch, "id" | "members" | "revenue">) => void;
  updateBranch: (id: string, patch: Partial<Branch>) => void;
  deleteBranch: (id: string) => void;
  setCurrentBranch: (id: string) => void;
  addBiometricDevice: (
    device: Omit<BiometricDevice, "id" | "status" | "lastSync" | "usersMapped">,
  ) => void;
  updateBiometricDevice: (id: string, patch: Partial<BiometricDevice>) => void;
  deleteBiometricDevice: (id: string) => void;
  testBiometricDevice: (id: string) => void;
  syncBiometricDevice: (id: string) => void;
  updateReaderStatus: (
    id: string,
    status: Exclude<ReaderStatus, "Testing">,
    errorMessage?: string,
  ) => void;
  pollReaderStatuses: () => void;
  updateGymSettings: (patch: Partial<GymSettings>) => void;
  updateNotificationSettings: (patch: Partial<NotificationSettings>) => void;
  resetWorkspace: () => void;
}

const today = new Date();
const offset = (days: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString();
};

const seedMembers: Member[] = [
  {
    id: "EMP001",
    name: "Test Employee",
    phone: "0000000000",
    plan: "12 Months Transformation",
    startDate: "2026-06-19T00:00:00.000Z",
    expiryDate: "2030-12-31T00:00:00.000Z",
    status: "active",
    amountPaid: 0,
    totalAmount: 0,
    checkIns: [],
    streak: 0,
    workoutPlan: [],
    documents: [],
    branchId: "b1",
  },
];

const seedStaff: Staff[] = [];

const seedLeads: Lead[] = [];

const seedPayments: Payment[] = [];

const seedBranches: Branch[] = [
  {
    id: "b1",
    name: "Fit Force Una",
    city: "Una",
    manager: "",
    members: 0,
    revenue: 0,
    address: "2nd Floor, Modheshvari Mall, Near Old Bus Stand, Una, Gujarat",
    phone: "+91 96874 78464",
    active: true,
  },
];

const seedDevices: BiometricDevice[] = [];

const seedReaderConnectionEvents: ReaderConnectionEvent[] = [];

const seedGymSettings: GymSettings = {
  name: "FIT & FYT",
  address: "2nd Floor, Modheshvari Mall, Near Old Bus Stand, Una, Gujarat",
  phone: "+91 96874 78464",
  email: "fitnfyt@gmail.com",
  brandTagline: "MMA - Gym - Fitness",
  supportPhone: "+91 76982 84691",
  supportWhatsApp: "917698284691",
};

const officialGymSettings: GymSettings = {
  name: "FIT & FYT",
  address: "2nd Floor, Modheshvari Mall, Near Old Bus Stand, Una, Gujarat",
  phone: "+91 96874 78464",
  email: "fitnfyt@gmail.com",
  brandTagline: "MMA - Gym - Fitness",
  supportPhone: "+91 76982 84691",
  supportWhatsApp: "917698284691",
};

const normalizeGymSettings = (settings: GymSettings): GymSettings => ({
  ...settings,
  ...officialGymSettings,
});

const normalizeBranch = (branch: Branch): Branch =>
  branch.id === "b1"
    ? {
        ...branch,
        name: "Fit Force Una",
        city: "Una",
        address: officialGymSettings.address,
        phone: officialGymSettings.phone,
      }
    : branch;

const seedNotificationSettings: NotificationSettings = {
  whatsapp: true,
  sms: true,
  push: true,
  expiryReminders: true,
  paymentReminders: true,
};

const seedAttendance: AttendanceRecord[] = [];

const id = () => Math.random().toString(36).slice(2, 9);

const normalizeReaderStatus = (device: BiometricDevice): Exclude<ReaderStatus, "Testing"> => {
  if (!device.ipAddress?.trim()) return "Disconnected";
  if (device.lastError?.trim()) return "Error";
  return "Connected";
};

const buildReaderEvent = (
  device: BiometricDevice,
  eventType: Exclude<ReaderStatus, "Testing">,
  errorMessage?: string,
  previousEvent?: ReaderConnectionEvent,
): ReaderConnectionEvent => {
  const at = new Date().toISOString();
  const durationSeconds = previousEvent
    ? Math.max(
        0,
        Math.round((new Date(at).getTime() - new Date(previousEvent.at).getTime()) / 1000),
      )
    : undefined;

  return {
    id: id(),
    readerId: device.id,
    readerName: device.name,
    readerIp: device.ipAddress,
    eventType,
    at,
    errorMessage,
    durationSeconds,
  };
};
export const isRetiredBiometricDevice = (device: BiometricDevice) =>
  device.name.trim().toLowerCase() === "main gate k30" ||
  device.model.trim().toLowerCase().includes("essl k30") ||
  device.ipAddress.trim() === "192.168.1.201";

export const isRetiredDemoMember = (member: Pick<Member, "id" | "name">) => {
  const idValue = member.id.trim().toLowerCase();
  const nameValue = member.name.trim().toLowerCase();
  return (
    ["m1", "m2", "m3", "m4", "m5"].includes(idValue) ||
    ["rahul sharma", "priya patel", "amit verma", "sneha joshi", "rohan gupta"].includes(nameValue)
  );
};

const isTestEmployee = (member: Pick<Member, "id" | "name">) =>
  member.id.trim().toUpperCase() === "EMP001" ||
  member.name.trim().toLowerCase() === "test employee";

const retiredStaffIds = new Set(["s1", "s2", "s3", "s4", "s5", "s6"]);
const retiredLeadIds = new Set(["l1", "l2", "l3", "l4", "l5"]);

const statusFromExpiry = (expiryDate: string): Status => {
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 7) return "expiring";
  return "active";
};

export const isPersonalTrainingPayment = (payment: Payment) =>
  payment.category === "Personal Training" || payment.plan.toLowerCase().includes("pt ");

const memberPaymentContribution = (payment: Payment) => {
  if (payment.status !== "Paid" || isPersonalTrainingPayment(payment)) return 0;
  return payment.type === "refund" ? -payment.amount : payment.amount;
};

export const monthKey = (value: string) => value.slice(0, 7);

export function getTrainerCommissionEntries(
  payments: Payment[],
  members: Member[],
  staff: Staff[],
  payroll: PayrollRecord[] = [],
): TrainerCommissionEntry[] {
  const refundsByPayment = payments
    .filter((payment) => payment.type === "refund")
    .reduce<Record<string, number>>((acc, refund) => {
      if (!refund.refundForPaymentId) return acc;
      acc[refund.refundForPaymentId] = (acc[refund.refundForPaymentId] ?? 0) + refund.amount;
      return acc;
    }, {});

  const paidCommissionIds = new Set(
    payroll.flatMap((record) => (record.paidAt ? (record.paidCommissionIds ?? []) : [])),
  );

  return payments
    .filter(
      (payment) =>
        payment.status === "Paid" &&
        payment.type !== "refund" &&
        isPersonalTrainingPayment(payment) &&
        Boolean(payment.trainerId),
    )
    .map((payment) => {
      const trainer = staff.find((person) => person.id === payment.trainerId);
      const member = members.find((item) => item.id === payment.memberId);
      const refundedAmount = refundsByPayment[payment.id] ?? 0;
      const netAmount = Math.max(0, payment.amount - refundedAmount);
      const commissionPercent = payment.commissionPercent ?? 40;
      const commissionAmount =
        netAmount === payment.amount && typeof payment.commissionAmount === "number"
          ? payment.commissionAmount
          : Math.round((netAmount * commissionPercent) / 100);

      return {
        id: `commission-${payment.id}`,
        paymentId: payment.id,
        staffId: payment.trainerId!,
        staffName: trainer?.name ?? "Unknown trainer",
        memberId: payment.memberId,
        memberName: member?.name ?? "Unknown member",
        packageName: payment.plan,
        paymentDate: payment.date,
        totalAmount: payment.amount,
        refundedAmount,
        netAmount,
        commissionPercent,
        commissionAmount,
        payoutStatus:
          netAmount <= 0
            ? "Refunded"
            : paidCommissionIds.has(`commission-${payment.id}`)
              ? "Paid"
              : "Pending",
      };
    });
}

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      auth: null,
      authReady: false,
      members: seedMembers.filter((member) => !isRetiredDemoMember(member)),
      staff: seedStaff,
      leads: seedLeads,
      payments: seedPayments,
      attendance: seedAttendance,
      payroll: [],
      branches: seedBranches,
      biometricDevices: seedDevices,
      readerConnectionEvents: seedReaderConnectionEvents,
      gymSettings: seedGymSettings,
      notificationSettings: seedNotificationSettings,
      currentBranch: "b1",
      login: (role, phone, password) => {
        if (!phone || !password) return false;
        // Superuser
        if (phone === "superadmin" && password === "superadmin") {
          set({
            auth: {
              id: "local-super",
              role: "super",
              name: "Super Admin",
              phone,
              branchId: "b1",
              permissions: ["*"],
            },
            authReady: true,
          });
          return true;
        }
        const name = role === "owner" ? "Rahul" : role === "staff" ? "Vikram" : "Priya";
        set({
          auth: { id: `local-${role}-${phone}`, role, name, phone, branchId: get().currentBranch },
          authReady: true,
        });
        return true;
      },
      setAuth: (auth) =>
        set({
          auth,
          authReady: true,
          currentBranch: auth.branchId ?? get().currentBranch,
        }),
      setAuthReady: (ready) => set({ authReady: ready }),
      logout: () => {
        clearStoredAuthSession();
        set({ auth: null, authReady: true });
      },
      addMember: (m) => {
        const memberId = m.id ?? id();
        set({
          members: [
            ...get().members,
            {
              ...m,
              id: memberId,
              branchId: m.branchId ?? get().currentBranch,
              checkIns: [],
              streak: 0,
              workoutPlan: m.workoutPlan ?? [],
              documents: m.documents ?? [],
            },
          ],
          payments:
            m.amountPaid > 0
              ? [
                  ...get().payments,
                  {
                    id: id(),
                    memberId,
                    amount: m.amountPaid,
                    date: m.startDate,
                    mode: "UPI",
                    plan: m.plan,
                    status: "Paid",
                    type: "payment",
                    category: "Membership",
                    branchId: m.branchId ?? get().currentBranch,
                  },
                ]
              : get().payments,
        });
      },
      importMembers: (members) =>
        set({
          members: [
            ...get().members,
            ...members.map((member) => ({
              ...member,
              id: id(),
              branchId: member.branchId ?? get().currentBranch,
              checkIns: [],
              streak: 0,
              workoutPlan: member.workoutPlan ?? [],
              documents: member.documents ?? [],
            })),
          ],
        }),
      updateMember: (mid, patch) =>
        set({ members: get().members.map((x) => (x.id === mid ? { ...x, ...patch } : x)) }),
      deleteMember: (mid) =>
        set({
          members: get().members.filter((member) => member.id !== mid),
          attendance: (get().attendance ?? []).filter(
            (record) => record.subjectId !== mid || record.subjectType !== "member",
          ),
          payments: get().payments.filter((payment) => payment.memberId !== mid),
          staff: get().staff.map((person) => ({
            ...person,
            assignedMemberIds: (person.assignedMemberIds ?? []).filter(
              (memberId) => memberId !== mid,
            ),
          })),
        }),
      renewMember: (mid, plan, months, amount, mode) => {
        const renewedAt = new Date();
        const member = get().members.find((x) => x.id === mid);
        if (!member) return;
        const currentExpiry = new Date(member.expiryDate);
        const newExpiry = currentExpiry > renewedAt ? currentExpiry : renewedAt;
        newExpiry.setMonth(newExpiry.getMonth() + months);
        set({
          members: get().members.map((x) =>
            x.id === mid
              ? {
                  ...x,
                  plan,
                  expiryDate: newExpiry.toISOString(),
                  status: "active",
                  amountPaid: x.amountPaid + amount,
                  totalAmount: x.totalAmount + amount,
                }
              : x,
          ),
          payments: [
            ...get().payments,
            {
              id: id(),
              memberId: mid,
              amount,
              date: renewedAt.toISOString(),
              mode,
              plan,
              status: "Paid",
              type: "payment",
              category: "Membership",
            },
          ],
        });
      },
      toggleMemberFreeze: (mid) =>
        set({
          members: get().members.map((x) =>
            x.id === mid
              ? { ...x, status: x.status === "frozen" ? statusFromExpiry(x.expiryDate) : "frozen" }
              : x,
          ),
        }),
      setWorkoutPlan: (mid, exercises) =>
        set({
          members: get().members.map((x) => (x.id === mid ? { ...x, workoutPlan: exercises } : x)),
        }),
      addMemberDocument: (mid, name) =>
        set({
          members: get().members.map((x) =>
            x.id === mid
              ? {
                  ...x,
                  documents: [
                    ...(x.documents ?? []),
                    { id: id(), name, uploadedAt: new Date().toISOString() },
                  ],
                }
              : x,
          ),
        }),
      checkIn: (mid) => get().punchIn(mid),
      punchIn: (
        subjectId,
        subjectType = "member",
        source = "Manual",
        at = new Date().toISOString(),
      ) => {
        const date = at.slice(0, 10);
        const openRecord = (get().attendance ?? []).find(
          (record) =>
            record.subjectId === subjectId &&
            record.subjectType === subjectType &&
            record.date === date &&
            !record.punchOut,
        );
        if (openRecord) return;
        set({
          attendance: [
            ...(get().attendance ?? []),
            { id: id(), subjectId, subjectType, date, punchIn: at, source },
          ].map((record, index, list) =>
            index === list.length - 1 ? { ...record, branchId: get().currentBranch } : record,
          ),
          members:
            subjectType === "member"
              ? get().members.map((member) =>
                  member.id === subjectId
                    ? { ...member, checkIns: [at, ...member.checkIns], streak: member.streak + 1 }
                    : member,
                )
              : get().members,
        });
      },
      punchOut: (recordId, at = new Date().toISOString()) =>
        set({
          attendance: (get().attendance ?? []).map((record) =>
            record.id === recordId ? { ...record, punchOut: at } : record,
          ),
        }),
      updateAttendance: (recordId, patch) =>
        set({
          attendance: (get().attendance ?? []).map((record) =>
            record.id === recordId ? { ...record, ...patch } : record,
          ),
        }),
      addStaff: (s) =>
        set({
          staff: [
            ...get().staff,
            {
              ...s,
              id: id(),
              branchId: s.branchId ?? get().currentBranch,
              permissions: s.permissions ?? [],
              assignedMemberIds: s.assignedMemberIds ?? [],
            },
          ],
        }),
      updateStaff: (staffId, patch) =>
        set({
          staff: get().staff.map((person) =>
            person.id === staffId ? { ...person, ...patch } : person,
          ),
        }),
      deleteStaff: (staffId) =>
        set({
          staff: get().staff.filter((person) => person.id !== staffId),
          attendance: (get().attendance ?? []).filter(
            (record) => record.subjectId !== staffId || record.subjectType !== "staff",
          ),
          leads: get().leads.map((lead) =>
            lead.assignedStaffId === staffId ? { ...lead, assignedStaffId: undefined } : lead,
          ),
          payments: get().payments.map((payment) =>
            payment.trainerId === staffId
              ? {
                  ...payment,
                  trainerId: undefined,
                  commissionPercent: undefined,
                  commissionAmount: undefined,
                }
              : payment,
          ),
        }),
      recordPayroll: (record) =>
        set({
          payroll: [
            ...(get().payroll ?? []).filter(
              (item) => !(item.staffId === record.staffId && item.month === record.month),
            ),
            { ...record, id: id() },
          ],
        }),
      addLead: (l) =>
        set({
          leads: [
            ...get().leads,
            {
              ...l,
              id: id(),
              branchId: l.branchId ?? get().currentBranch,
              activities: l.activities ?? [
                { id: id(), date: new Date().toISOString(), note: `Lead added from ${l.source}` },
              ],
            },
          ],
        }),
      updateLead: (leadId, patch) =>
        set({
          leads: get().leads.map((lead) => (lead.id === leadId ? { ...lead, ...patch } : lead)),
        }),
      addLeadActivity: (leadId, note) =>
        set({
          leads: get().leads.map((lead) =>
            lead.id === leadId
              ? {
                  ...lead,
                  activities: [
                    ...(lead.activities ?? []),
                    { id: id(), date: new Date().toISOString(), note },
                  ],
                }
              : lead,
          ),
        }),
      convertLead: (lid) => {
        const lead = get().leads.find((item) => item.id === lid);
        if (!lead) return;
        const alreadyMember = get().members.some((member) => member.phone === lead.phone);
        const startDate = new Date();
        const expiryDate = new Date();
        expiryDate.setMonth(expiryDate.getMonth() + 1);
        set({
          leads: get().leads.map((item) =>
            item.id === lid
              ? {
                  ...item,
                  status: "Converted",
                  activities: [
                    ...(item.activities ?? []),
                    { id: id(), date: startDate.toISOString(), note: "Converted to member" },
                  ],
                }
              : item,
          ),
          members: alreadyMember
            ? get().members
            : [
                ...get().members,
                {
                  id: id(),
                  name: lead.name,
                  phone: lead.phone,
                  plan: "Trial",
                  startDate: startDate.toISOString(),
                  expiryDate: expiryDate.toISOString(),
                  status: "active",
                  amountPaid: 0,
                  totalAmount: 0,
                  checkIns: [],
                  streak: 0,
                  workoutPlan: [],
                  documents: [],
                  branchId: lead.branchId ?? get().currentBranch,
                },
              ],
        });
      },
      addPayment: (p) => {
        const category = p.category ?? "Membership";
        const payment = {
          ...p,
          id: id(),
          type: p.type ?? "payment",
          category,
          branchId: p.branchId ?? get().currentBranch,
          commissionPercent:
            category === "Personal Training" ? (p.commissionPercent ?? 40) : p.commissionPercent,
          commissionAmount:
            category === "Personal Training"
              ? Math.round((p.amount * (p.commissionPercent ?? 40)) / 100)
              : p.commissionAmount,
        };
        set({
          payments: [...get().payments, payment],
          members:
            p.status === "Paid" && category !== "Personal Training"
              ? get().members.map((member) =>
                  member.id === p.memberId
                    ? { ...member, amountPaid: member.amountPaid + p.amount }
                    : member,
                )
              : get().members,
        });
      },
      updatePayment: (paymentId, patch) => {
        const previous = get().payments.find((payment) => payment.id === paymentId);
        if (!previous) return;
        const category = patch.category ?? previous.category ?? "Membership";
        const next = {
          ...previous,
          ...patch,
          category,
          commissionPercent:
            category === "Personal Training"
              ? (patch.commissionPercent ?? previous.commissionPercent ?? 40)
              : patch.commissionPercent,
        };
        const normalizedNext = {
          ...next,
          commissionAmount:
            category === "Personal Training"
              ? Math.round((next.amount * (next.commissionPercent ?? 40)) / 100)
              : next.commissionAmount,
        };
        const previousContribution = memberPaymentContribution(previous);
        const nextContribution = memberPaymentContribution(normalizedNext);
        set({
          payments: get().payments.map((payment) =>
            payment.id === paymentId ? normalizedNext : payment,
          ),
          members: get().members.map((member) => {
            let amountPaid = member.amountPaid;
            if (member.id === previous.memberId) amountPaid -= previousContribution;
            if (member.id === normalizedNext.memberId) amountPaid += nextContribution;
            return amountPaid === member.amountPaid
              ? member
              : { ...member, amountPaid: Math.max(0, amountPaid) };
          }),
        });
      },
      deletePayment: (paymentId) => {
        const payment = get().payments.find((item) => item.id === paymentId);
        if (!payment) return;
        const removedPayments = get().payments.filter(
          (item) => item.id === paymentId || item.refundForPaymentId === paymentId,
        );
        const contributionByMember = removedPayments.reduce<Record<string, number>>(
          (acc, item) => ({
            ...acc,
            [item.memberId]: (acc[item.memberId] ?? 0) + memberPaymentContribution(item),
          }),
          {},
        );
        set({
          payments: get().payments.filter(
            (item) => item.id !== paymentId && item.refundForPaymentId !== paymentId,
          ),
          members: get().members.map((member) => {
            const contribution = contributionByMember[member.id] ?? 0;
            return contribution
              ? { ...member, amountPaid: Math.max(0, member.amountPaid - contribution) }
              : member;
          }),
        });
      },
      addRefund: (payment) => {
        const original = payment.refundForPaymentId
          ? get().payments.find((item) => item.id === payment.refundForPaymentId)
          : undefined;
        const category = payment.category ?? original?.category ?? "Membership";
        const refund = {
          ...payment,
          id: id(),
          type: "refund" as const,
          status: "Paid" as const,
          category,
          trainerId: payment.trainerId ?? original?.trainerId,
          commissionPercent: payment.commissionPercent ?? original?.commissionPercent,
          branchId: payment.branchId ?? original?.branchId ?? get().currentBranch,
        };
        set({
          payments: [...get().payments, refund],
          members:
            category !== "Personal Training"
              ? get().members.map((member) =>
                  member.id === payment.memberId
                    ? { ...member, amountPaid: Math.max(0, member.amountPaid - payment.amount) }
                    : member,
                )
              : get().members,
        });
      },
      addBranch: (branch) =>
        set({
          branches: [
            ...get().branches,
            { ...branch, id: id(), members: 0, revenue: 0, active: branch.active ?? true },
          ],
        }),
      updateBranch: (branchId, patch) =>
        set({
          branches: get().branches.map((branch) =>
            branch.id === branchId ? { ...branch, ...patch } : branch,
          ),
        }),
      deleteBranch: (branchId) => {
        const remainingBranches = get().branches.filter((branch) => branch.id !== branchId);
        const fallbackBranchId = remainingBranches[0]?.id ?? "b1";

        set({
          branches: remainingBranches,
          currentBranch: get().currentBranch === branchId ? fallbackBranchId : get().currentBranch,
          members: get().members.map((member) =>
            member.branchId === branchId ? { ...member, branchId: fallbackBranchId } : member,
          ),
          staff: get().staff.map((person) =>
            person.branchId === branchId ? { ...person, branchId: fallbackBranchId } : person,
          ),
          leads: get().leads.map((lead) =>
            lead.branchId === branchId ? { ...lead, branchId: fallbackBranchId } : lead,
          ),
        });
      },
      setCurrentBranch: (branchId) => set({ currentBranch: branchId }),
      addBiometricDevice: (device) => {
        const now = new Date().toISOString();
        const created: BiometricDevice = {
          ...device,
          id: id(),
          status: "Disconnected",
          usersMapped: 0,
          pollingIntervalSeconds: device.pollingIntervalSeconds ?? 30,
          fingerprintPath: device.fingerprintPath || "/doc/index.html#/dashboard",
          lastStatusUpdateAt: now,
        };
        set({
          biometricDevices: [...(get().biometricDevices ?? []), created],
          readerConnectionEvents: [
            buildReaderEvent(created, "Disconnected", "Reader registered but not tested yet"),
            ...(get().readerConnectionEvents ?? []),
          ],
        });
      },
      updateBiometricDevice: (deviceId, patch) =>
        set({
          biometricDevices: (get().biometricDevices ?? []).map((device) =>
            device.id === deviceId
              ? {
                  ...device,
                  ...patch,
                  lastStatusUpdateAt: patch.status
                    ? new Date().toISOString()
                    : device.lastStatusUpdateAt,
                }
              : device,
          ),
        }),
      deleteBiometricDevice: (deviceId) =>
        set({
          biometricDevices: (get().biometricDevices ?? []).filter(
            (device) => device.id !== deviceId,
          ),
        }),
      updateReaderStatus: (deviceId, status, errorMessage) => {
        const devices = get().biometricDevices ?? [];
        const device = devices.find((item) => item.id === deviceId);
        if (!device) return;

        const now = new Date().toISOString();
        const nextDevice: BiometricDevice = {
          ...device,
          status,
          lastCommunicationAt: status === "Connected" ? now : device.lastCommunicationAt,
          lastStatusUpdateAt: now,
          lastError: status === "Error" ? errorMessage : undefined,
        };
        const lastEvent = (get().readerConnectionEvents ?? []).find(
          (event) => event.readerId === deviceId,
        );
        const shouldLog = !lastEvent || lastEvent.eventType !== status;
        set({
          biometricDevices: devices.map((item) => (item.id === deviceId ? nextDevice : item)),
          readerConnectionEvents: shouldLog
            ? [
                buildReaderEvent(nextDevice, status, errorMessage, lastEvent),
                ...(get().readerConnectionEvents ?? []),
              ].slice(0, 500)
            : (get().readerConnectionEvents ?? []),
        });
      },
      testBiometricDevice: (deviceId) => {
        const device = (get().biometricDevices ?? []).find((item) => item.id === deviceId);
        if (!device) return;
        const status = normalizeReaderStatus({ ...device, lastError: undefined });
        get().updateReaderStatus(deviceId, status);
      },
      pollReaderStatuses: () => {
        (get().biometricDevices ?? []).forEach((device) => {
          const nextStatus = normalizeReaderStatus(device);
          get().updateReaderStatus(
            device.id,
            nextStatus,
            nextStatus === "Disconnected" ? "Reader IP address is missing" : device.lastError,
          );
        });
      },
      syncBiometricDevice: (deviceId) => {
        const device = (get().biometricDevices ?? []).find((item) => item.id === deviceId);
        if (!device) return;
        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const branchMembers = get().members.filter(
          (member) => (member.branchId ?? "b1") === device.branchId,
        );
        const newRecords = branchMembers
          .slice(0, 3)
          .filter(
            (member) =>
              !(get().attendance ?? []).some(
                (record) =>
                  record.subjectId === member.id &&
                  record.subjectType === "member" &&
                  record.date === date &&
                  record.source === "Biometric",
              ),
          )
          .map((member, index) => {
            const punchIn = new Date(now);
            punchIn.setMinutes(now.getMinutes() - 30 - index * 7);
            return {
              id: id(),
              subjectId: member.id,
              subjectType: "member" as const,
              date,
              punchIn: punchIn.toISOString(),
              source: "Biometric" as const,
              branchId: device.branchId,
            };
          });
        set({
          attendance: [...(get().attendance ?? []), ...newRecords],
          biometricDevices: (get().biometricDevices ?? []).map((item) =>
            item.id === deviceId
              ? {
                  ...item,
                  status: "Connected",
                  lastSync: now.toISOString(),
                  lastCommunicationAt: now.toISOString(),
                  lastStatusUpdateAt: now.toISOString(),
                  lastError: undefined,
                  usersMapped: branchMembers.length,
                }
              : item,
          ),
        });
        get().updateReaderStatus(deviceId, "Connected");
      },
      updateGymSettings: (patch) =>
        set({ gymSettings: { ...(get().gymSettings ?? seedGymSettings), ...patch } }),
      updateNotificationSettings: (patch) =>
        set({
          notificationSettings: {
            ...(get().notificationSettings ?? seedNotificationSettings),
            ...patch,
          },
        }),
      resetWorkspace: () =>
        set({
          members: seedMembers.filter((member) => !isRetiredDemoMember(member)),
          staff: seedStaff,
          leads: seedLeads,
          payments: seedPayments,
          attendance: seedAttendance,
          payroll: [],
          branches: seedBranches,
          biometricDevices: seedDevices,
          readerConnectionEvents: seedReaderConnectionEvents,
          gymSettings: seedGymSettings,
          notificationSettings: seedNotificationSettings,
          currentBranch: "b1",
        }),
    }),
    {
      name: "fitforce-app",
      version: 2,
      migrate: (persisted, version) => {
        const saved = (persisted ?? {}) as Partial<State>;
        if (version >= 2) return saved;
        return {
          ...saved,
          members: (saved.members ?? seedMembers)
            .filter(isTestEmployee)
            .map((member) => ({ ...member, amountPaid: 0, totalAmount: 0, checkIns: [], streak: 0 })),
          staff: (saved.staff ?? []).filter((person) => !retiredStaffIds.has(person.id)),
          leads: (saved.leads ?? []).filter((lead) => !retiredLeadIds.has(lead.id)),
          payments: [],
          attendance: [],
          payroll: [],
          branches: (saved.branches ?? seedBranches).filter((branch) => branch.id !== "b2"),
        };
      },
      merge: (persisted, current) => {
        const saved = persisted as Partial<State>;
        return {
          ...current,
          ...saved,
          attendance: saved.attendance ?? current.attendance,
          payroll: saved.payroll ?? current.payroll,
          branches: (saved.branches ?? current.branches).map((branch) => ({
            ...branch,
            active: branch.active ?? true,
          })),
          biometricDevices: (saved.biometricDevices ?? current.biometricDevices).filter(
            (device) => !isRetiredBiometricDevice(device),
          ),
          readerConnectionEvents: saved.readerConnectionEvents ?? current.readerConnectionEvents,
          gymSettings: normalizeGymSettings(saved.gymSettings ?? current.gymSettings),
          notificationSettings: saved.notificationSettings ?? current.notificationSettings,
          authReady: current.authReady,
        };
      },
    },
  ),
);

export const canAccessOwner = (role: Role | null | undefined) =>
  role === "owner" || role === "super" || role === "staff";
export const isOwnerOrSuper = (role: Role | null | undefined) =>
  role === "owner" || role === "super";
