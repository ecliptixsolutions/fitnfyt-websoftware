import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Role = "owner" | "staff" | "member" | "super";
export type Status = "active" | "expired" | "expiring" | "frozen";

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
  paidAt?: string;
  mode?: Payment["mode"];
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
export interface BiometricDevice {
  id: string;
  name: string;
  model: string;
  branchId: string;
  ipAddress: string;
  port: string;
  status: "Connected" | "Disconnected" | "Testing";
  lastSync?: string;
  usersMapped: number;
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

interface State {
  auth: { role: Role | null; name: string; phone: string } | null;
  members: Member[];
  staff: Staff[];
  leads: Lead[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  payroll: PayrollRecord[];
  branches: Branch[];
  biometricDevices: BiometricDevice[];
  gymSettings: GymSettings;
  notificationSettings: NotificationSettings;
  currentBranch: string;
  login: (role: Role, phone: string, password: string) => boolean;
  logout: () => void;
  addMember: (m: Omit<Member, "id" | "checkIns" | "streak">) => void;
  importMembers: (members: Omit<Member, "id" | "checkIns" | "streak">[]) => void;
  updateMember: (id: string, patch: Partial<Member>) => void;
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
  recordPayroll: (record: Omit<PayrollRecord, "id">) => void;
  addLead: (l: Omit<Lead, "id">) => void;
  updateLead: (id: string, patch: Partial<Lead>) => void;
  addLeadActivity: (id: string, note: string) => void;
  convertLead: (id: string) => void;
  addPayment: (p: Omit<Payment, "id">) => void;
  updatePayment: (id: string, patch: Partial<Payment>) => void;
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
    id: "m1",
    name: "Rahul Sharma",
    phone: "+91 98765 43210",
    plan: "Premium Plus",
    startDate: offset(-180),
    expiryDate: offset(205),
    status: "active",
    amountPaid: 24999,
    totalAmount: 24999,
    checkIns: [offset(0), offset(-1), offset(-2), offset(-3)],
    streak: 12,
  },
  {
    id: "m2",
    name: "Priya Patel",
    phone: "+91 87654 32109",
    plan: "Premium",
    startDate: offset(-90),
    expiryDate: offset(36),
    status: "active",
    amountPaid: 11999,
    totalAmount: 11999,
    checkIns: [offset(0), offset(-1)],
    streak: 5,
  },
  {
    id: "m3",
    name: "Amit Verma",
    phone: "+91 76543 21098",
    plan: "Basic",
    startDate: offset(-200),
    expiryDate: offset(-10),
    status: "expired",
    amountPaid: 8999,
    totalAmount: 8999,
    checkIns: [],
    streak: 0,
  },
  {
    id: "m4",
    name: "Sneha Joshi",
    phone: "+91 65432 10987",
    plan: "Premium",
    startDate: offset(-60),
    expiryDate: offset(72),
    status: "active",
    amountPaid: 11999,
    totalAmount: 11999,
    checkIns: [offset(0)],
    streak: 3,
  },
  {
    id: "m5",
    name: "Rohan Gupta",
    phone: "+91 54321 09876",
    plan: "Basic",
    startDate: offset(-350),
    expiryDate: offset(5),
    status: "expiring",
    amountPaid: 6000,
    totalAmount: 8999,
    checkIns: [offset(-1)],
    streak: 0,
  },
];

const seedStaff: Staff[] = [
  {
    id: "s1",
    name: "Vikram Singh",
    phone: "+91 99999 11111",
    role: "Trainer",
    joined: offset(-400),
    salary: 25000,
    active: true,
  },
  {
    id: "s2",
    name: "Meena Rao",
    phone: "+91 99999 22222",
    role: "Receptionist",
    joined: offset(-200),
    salary: 18000,
    active: true,
  },
  {
    id: "s3",
    name: "Suresh Kumar",
    phone: "+91 99999 33333",
    role: "Manager",
    joined: offset(-600),
    salary: 40000,
    active: true,
  },
];

const seedLeads: Lead[] = [
  {
    id: "l1",
    name: "Ankit Mehta",
    phone: "+91 91111 11111",
    source: "Walk-in",
    status: "Interested",
    enquiry: "Weight Loss",
    followUp: offset(1),
  },
  {
    id: "l2",
    name: "Divya Shah",
    phone: "+91 92222 22222",
    source: "Instagram",
    status: "New",
    enquiry: "Yoga",
    followUp: offset(0),
  },
  {
    id: "l3",
    name: "Karan Nair",
    phone: "+91 93333 33333",
    source: "Referral",
    status: "Converted",
    enquiry: "Muscle Gain",
    followUp: offset(-5),
  },
];

const seedPayments: Payment[] = [
  {
    id: "p1",
    memberId: "m1",
    amount: 24999,
    date: offset(-180),
    mode: "UPI",
    plan: "Premium Plus",
    status: "Paid",
  },
  {
    id: "p2",
    memberId: "m2",
    amount: 11999,
    date: offset(-90),
    mode: "Card",
    plan: "Premium",
    status: "Paid",
  },
  {
    id: "p3",
    memberId: "m4",
    amount: 11999,
    date: offset(-60),
    mode: "Cash",
    plan: "Premium",
    status: "Paid",
  },
  {
    id: "p4",
    memberId: "m5",
    amount: 6000,
    date: offset(-15),
    mode: "UPI",
    plan: "Basic",
    status: "Pending",
  },
  {
    id: "p5",
    memberId: "m3",
    amount: 8999,
    date: offset(-200),
    mode: "Cash",
    plan: "Basic",
    status: "Paid",
  },
];

const seedBranches: Branch[] = [
  {
    id: "b1",
    name: "Fit Force Andheri",
    city: "Mumbai",
    manager: "Suresh Kumar",
    members: 247,
    revenue: 124500,
    address: "Andheri West, Mumbai, 400053",
    phone: "+91 91117 11366",
    active: true,
  },
  {
    id: "b2",
    name: "Fit Force Bandra",
    city: "Mumbai",
    manager: "Meena Rao",
    members: 156,
    revenue: 89200,
    address: "Bandra West, Mumbai, 400050",
    phone: "+91 92222 11366",
    active: true,
  },
];

const seedDevices: BiometricDevice[] = [
  {
    id: "bd1",
    name: "Main Gate K30",
    model: "ESSL K30 Pro WiFi",
    branchId: "b1",
    ipAddress: "192.168.1.201",
    port: "4370",
    status: "Disconnected",
    usersMapped: 5,
  },
];

const seedGymSettings: GymSettings = {
  name: "Fit Force Gym",
  address: "Andheri West, Mumbai, 400053",
  phone: "+91 91117 11366",
  email: "admin@fitfyt.com",
  brandTagline: "MMA - Gym - Fitness",
  supportPhone: "+91 91117 11366",
  supportWhatsApp: "919111711366",
};

const seedNotificationSettings: NotificationSettings = {
  whatsapp: true,
  sms: true,
  push: true,
  expiryReminders: true,
  paymentReminders: true,
};

const seedAttendance: AttendanceRecord[] = seedMembers.flatMap((member) =>
  member.checkIns.map((checkIn, index) => ({
    id: `a-${member.id}-${index}`,
    subjectId: member.id,
    subjectType: "member" as const,
    date: checkIn.slice(0, 10),
    punchIn: checkIn,
    punchOut: new Date(new Date(checkIn).getTime() + 75 * 60000).toISOString(),
    source: "Biometric" as const,
  })),
);

const id = () => Math.random().toString(36).slice(2, 9);
const statusFromExpiry = (expiryDate: string): Status => {
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return "expired";
  if (days <= 7) return "expiring";
  return "active";
};

export const useApp = create<State>()(
  persist(
    (set, get) => ({
      auth: null,
      members: seedMembers,
      staff: seedStaff,
      leads: seedLeads,
      payments: seedPayments,
      attendance: seedAttendance,
      payroll: [],
      branches: seedBranches,
      biometricDevices: seedDevices,
      gymSettings: seedGymSettings,
      notificationSettings: seedNotificationSettings,
      currentBranch: "b1",
      login: (role, phone, password) => {
        if (!phone || !password) return false;
        // Superuser
        if (phone === "superadmin" && password === "superadmin") {
          set({ auth: { role: "super", name: "Super Admin", phone } });
          return true;
        }
        const name = role === "owner" ? "Rahul" : role === "staff" ? "Vikram" : "Priya";
        set({ auth: { role, name, phone } });
        return true;
      },
      logout: () => set({ auth: null }),
      addMember: (m) => {
        const memberId = id();
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
      addPayment: (p) =>
        set({
          payments: [
            ...get().payments,
            { ...p, id: id(), branchId: p.branchId ?? get().currentBranch },
          ],
          members:
            p.status === "Paid"
              ? get().members.map((member) =>
                  member.id === p.memberId
                    ? { ...member, amountPaid: member.amountPaid + p.amount }
                    : member,
                )
              : get().members,
        }),
      updatePayment: (paymentId, patch) =>
        set({
          payments: get().payments.map((payment) =>
            payment.id === paymentId ? { ...payment, ...patch } : payment,
          ),
        }),
      addRefund: (payment) =>
        set({
          payments: [...get().payments, { ...payment, id: id(), type: "refund", status: "Paid" }],
        }),
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
      addBiometricDevice: (device) =>
        set({
          biometricDevices: [
            ...(get().biometricDevices ?? []),
            { ...device, id: id(), status: "Disconnected", usersMapped: 0 },
          ],
        }),
      updateBiometricDevice: (deviceId, patch) =>
        set({
          biometricDevices: (get().biometricDevices ?? []).map((device) =>
            device.id === deviceId ? { ...device, ...patch } : device,
          ),
        }),
      deleteBiometricDevice: (deviceId) =>
        set({
          biometricDevices: (get().biometricDevices ?? []).filter(
            (device) => device.id !== deviceId,
          ),
        }),
      testBiometricDevice: (deviceId) =>
        set({
          biometricDevices: (get().biometricDevices ?? []).map((device) =>
            device.id === deviceId ? { ...device, status: "Connected" } : device,
          ),
        }),
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
                  usersMapped: branchMembers.length,
                }
              : item,
          ),
        });
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
          members: seedMembers,
          staff: seedStaff,
          leads: seedLeads,
          payments: seedPayments,
          attendance: seedAttendance,
          payroll: [],
          branches: seedBranches,
          biometricDevices: seedDevices,
          gymSettings: seedGymSettings,
          notificationSettings: seedNotificationSettings,
          currentBranch: "b1",
        }),
    }),
    {
      name: "fitforce-app",
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
          biometricDevices: saved.biometricDevices ?? current.biometricDevices,
          gymSettings: saved.gymSettings ?? current.gymSettings,
          notificationSettings: saved.notificationSettings ?? current.notificationSettings,
        };
      },
    },
  ),
);

export const canAccessOwner = (role: Role | null | undefined) =>
  role === "owner" || role === "super" || role === "staff";
export const isOwnerOrSuper = (role: Role | null | undefined) =>
  role === "owner" || role === "super";
