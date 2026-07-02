import { getStoredAuthSession } from "@/lib/supabase-auth";
import {
  isRetiredBiometricDevice,
  isRetiredDemoMember,
  type AttendanceRecord,
  type BiometricDevice,
  type Lead,
  type Member,
  type ReaderConnectionEvent,
  type Staff,
} from "@/store/app";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? "https://qvrebewjlthikhzxwpcg.supabase.co";
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "sb_publishable_RiKCU541R0b2uFu4RAS2-Q_3bbTx10m";

const enabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
const CLIENT_CLEANUP_AT = new Date("2026-06-27T00:00:00+05:30").getTime();

function rowTimestamp(row: any) {
  return new Date(row.created_at ?? row.updated_at ?? 0).getTime();
}

type Snapshot = {
  members: Member[];
  staff: Staff[];
  attendance: AttendanceRecord[];
  leads: Lead[];
  biometricDevices: BiometricDevice[];
  readerConnectionEvents: ReaderConnectionEvent[];
};
type FingerprintEnrollmentLog = {
  userId: string;
  readerId: string;
  readerIp: string;
  startedAt: string;
  endedAt?: string;
  status: "Started" | "Success" | "Failed" | "Cancelled";
  errorDetails?: string;
};

type HikvisionEnrollment = {
  employeeNumber: string;
  subjectId: string;
  subjectType: "member" | "staff";
  name: string;
  cardNumber?: string;
  faceImagePath?: string;
  faceImageData?: string;
  validFrom?: string;
  validTo?: string;
  active?: boolean;
  branchId?: string;
};

export type UploadUserQueueItem = {
  id: string;
  employeeNumber: string;
  name: string;
  subjectType: "member" | "staff";
  status: string;
  queuedAt?: string;
};

export type GymSnapPerson = {
  id: string;
  name: string;
  phone: string;
  type: "member" | "staff";
  detail: string;
  branchId?: string;
};

type GymSnapMemberRow = {
  id?: unknown;
  name?: unknown;
  phone?: unknown;
  status?: unknown;
  branch_id?: unknown;
};

type GymSnapStaffRow = GymSnapMemberRow & {
  role?: unknown;
  active?: unknown;
};

async function requestOptional<T>(
  tableAndQuery: string,
  fallback: T,
  init: RequestInit = {},
): Promise<T> {
  try {
    return await request<T>(tableAndQuery, init);
  } catch (error) {
    console.warn(`Optional Supabase request skipped: ${tableAndQuery}`, error);
    return fallback;
  }
}

async function request<T>(tableAndQuery: string, init: RequestInit = {}): Promise<T> {
  if (!enabled) throw new Error("Supabase is not configured");
  const sessionToken = getStoredAuthSession()?.accessToken;
  let response = await supabaseFetch(tableAndQuery, init, sessionToken ?? SUPABASE_ANON_KEY);
  if (!response.ok && sessionToken && (response.status === 401 || response.status === 403)) {
    console.warn(
      `Supabase request returned ${response.status} with stored session token. Retrying with anon key.`,
    );
    response = await supabaseFetch(tableAndQuery, init, SUPABASE_ANON_KEY);
  }
  if (!response.ok) {
    throw new Error(`Supabase request failed: ${response.status} ${await response.text()}`);
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

async function supabaseFetch(tableAndQuery: string, init: RequestInit, token: string) {
  return fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/${tableAndQuery}`, {
    ...init,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
      ...(init.headers ?? {}),
    },
  });
}

export async function loadSupabaseSnapshot(): Promise<Partial<Snapshot>> {
  if (!enabled) return {};
  const [
    members,
    staff,
    attendance,
    leads,
    biometricDevices,
    hikvisionPeople,
    readerConnectionEvents,
  ] = await Promise.all([
    request<any[]>("members?select=*&order=name.asc"),
    request<any[]>("staff?select=*&order=name.asc"),
    request<any[]>("attendance_records?select=*&order=punch_in.desc"),
    requestOptional<any[]>("leads?select=*&order=follow_up.asc", []),
    request<any[]>("biometric_devices?select=*&order=name.asc"),
    request<any[]>("hikvision_people?select=employee_number,card_number,subject_id,subject_type"),
    requestOptional<any[]>("reader_connection_events?select=*&order=at.desc&limit=500", []),
  ]);

  const subjectAliases = buildSubjectAliases(hikvisionPeople);
  const attendanceRecords = normalizeAttendanceRecords(
    attendance
      .filter(
        (row) =>
          new Date(row.punch_in ?? row.created_at ?? row.updated_at ?? 0).getTime() >=
          CLIENT_CLEANUP_AT,
      )
      .map((row) => fromAttendanceRow(row, subjectAliases)),
  );
  const memberRows = members
    .filter(
      (row) =>
        String(row.id).toUpperCase() === "EMP001" ||
        String(row.name).trim().toLowerCase() === "test employee" ||
        rowTimestamp(row) >= CLIENT_CLEANUP_AT,
    )
    .filter((row) => (row.status ?? "active") !== "inactive")
    .map((row) => {
      const isTestEmployee =
        String(row.id).toUpperCase() === "EMP001" ||
        String(row.name).trim().toLowerCase() === "test employee";
      const isPreCleanupRecord =
        new Date(row.updated_at ?? row.created_at ?? 0).getTime() < CLIENT_CLEANUP_AT;
      return fromMemberRow(
        isTestEmployee && isPreCleanupRecord
          ? {
              ...row,
              plan: "12 Months Transformation",
              amount_paid: 0,
              total_amount: 0,
            }
          : row,
      );
    })
    .filter((member) => !isRetiredDemoMember(member));
  const membersWithCheckIns = attachMemberCheckIns(memberRows, attendanceRecords);

  return {
    members: membersWithCheckIns,
    staff: staff
      .filter(
        (row) =>
          !["s1", "s2", "s3", "s4", "s5", "s6"].includes(String(row.id)) ||
          rowTimestamp(row) >= CLIENT_CLEANUP_AT,
      )
      .map(fromStaffRow),
    attendance: attendanceRecords,
    leads: leads
      .filter(
        (row) =>
          !["l1", "l2", "l3", "l4", "l5"].includes(String(row.id)) ||
          rowTimestamp(row) >= CLIENT_CLEANUP_AT,
      )
      .map(fromLeadRow),
    biometricDevices: biometricDevices
      .map(fromDeviceRow)
      .filter((device) => !isRetiredBiometricDevice(device)),
    readerConnectionEvents: readerConnectionEvents.map(fromReaderConnectionEventRow),
  };
}

export async function loadGymSnapPeople(): Promise<GymSnapPerson[]> {
  if (!enabled) return [];
  const [members, staff] = await Promise.all([
    request<GymSnapMemberRow[]>("members?select=id,name,phone,status,branch_id&order=name.asc"),
    request<GymSnapStaffRow[]>("staff?select=id,name,phone,role,active,branch_id&order=name.asc"),
  ]);

  return [
    ...members
      .filter((row) => row.id && row.name && (row.status ?? "active") !== "inactive")
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        phone: String(row.phone ?? ""),
        type: "member" as const,
        detail: "Member",
        branchId: row.branch_id ? String(row.branch_id) : undefined,
      })),
    ...staff
      .filter((row) => row.id && row.name && row.active !== false)
      .map((row) => ({
        id: String(row.id),
        name: String(row.name),
        phone: String(row.phone ?? ""),
        type: "staff" as const,
        detail: String(row.role || "Staff"),
        branchId: row.branch_id ? String(row.branch_id) : undefined,
      })),
  ].sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteMemberFromSupabase(memberId: string) {
  if (!enabled) return;
  const id = encodeURIComponent(memberId);
  const updatedAt = new Date().toISOString();
  await Promise.all([
    requestOptional(`members?id=eq.${id}`, undefined, {
      method: "PATCH",
      body: JSON.stringify({ status: "inactive", updated_at: updatedAt }),
    }),
    requestOptional(`hikvision_people?subject_type=eq.member&subject_id=eq.${id}`, undefined, {
      method: "PATCH",
      body: JSON.stringify({
        active: false,
        pending_operation: "Upsert",
        updated_at: updatedAt,
      }),
    }),
  ]);
}

export async function deleteStaffFromSupabase(staffId: string) {
  if (!enabled) return;
  const id = encodeURIComponent(staffId);
  await Promise.all([
    requestOptional(`leads?assigned_staff_id=eq.${id}`, undefined, {
      method: "PATCH",
      body: JSON.stringify({ assigned_staff_id: null }),
    }),
    requestOptional(`payments?trainer_id=eq.${id}`, undefined, {
      method: "PATCH",
      body: JSON.stringify({ trainer_id: null, commission_percent: null, commission_amount: null }),
    }),
    requestOptional(`attendance_records?subject_type=eq.staff&subject_id=eq.${id}`, undefined, {
      method: "DELETE",
    }),
  ]);
  await requestOptional(`staff?id=eq.${id}`, undefined, { method: "DELETE" });
}

export async function saveMemberToSupabase(member: Member) {
  if (!enabled) return;
  await upsert("members", [toMemberRow(member)], "id");
}

export async function queueHikvisionEnrollment(enrollment: HikvisionEnrollment) {
  if (!enabled) return;
  await request("hikvision_people?on_conflict=employee_number", {
    method: "POST",
    body: JSON.stringify({
      employee_number: enrollment.employeeNumber,
      subject_id: enrollment.subjectId,
      subject_type: enrollment.subjectType,
      name: enrollment.name,
      card_number: enrollment.cardNumber || null,
      face_image_path: enrollment.faceImageData || enrollment.faceImagePath || null,
      valid_from: enrollment.validFrom || null,
      valid_to: enrollment.validTo || null,
      active: enrollment.active ?? true,
      pending_operation: "Upsert",
      branch_id: enrollment.branchId ?? null,
      updated_at: new Date().toISOString(),
    }),
  });
}

export async function loadUploadUsersQueue(): Promise<UploadUserQueueItem[]> {
  if (!enabled) return [];

  const people = await requestOptional<any[]>(
    "hikvision_people?select=employee_number,name,subject_type,pending_operation,updated_at&pending_operation=eq.Upsert&order=updated_at.asc",
    [],
  );

  return people.map((person) => ({
    id: person.employee_number,
    employeeNumber: person.employee_number,
    name: person.name ?? person.employee_number,
    subjectType: person.subject_type ?? "member",
    status: person.pending_operation ?? "Pending",
    queuedAt: person.updated_at,
  }));
}
export async function getReaderStatus() {
  return requestOptional<any[]>("biometric_devices?select=*&order=name.asc", []).then((rows) =>
    rows.map(fromDeviceRow).filter((device) => !isRetiredBiometricDevice(device)),
  );
}

export async function getConnectionHistory() {
  return requestOptional<any[]>(
    "reader_connection_events?select=*&order=at.desc&limit=500",
    [],
  ).then((rows) => rows.map(fromReaderConnectionEventRow));
}

export async function updateReaderStatus(device: BiometricDevice) {
  if (!enabled) return;
  await upsert("biometric_devices", [toDeviceRow(device)], "id");
}

export async function getReaderDashboardStats() {
  const readers = await getReaderStatus();
  return {
    total: readers.length,
    connected: readers.filter((reader) => reader.status === "Connected").length,
    disconnected: readers.filter((reader) => reader.status === "Disconnected").length,
    errors: readers.filter((reader) => reader.status === "Error").length,
  };
}

export async function logFingerprintEnrollment(log: FingerprintEnrollmentLog) {
  if (!enabled) return;
  await requestOptional("fingerprint_enrollment_logs", undefined, {
    method: "POST",
    body: JSON.stringify({
      id: `${log.userId}-${log.readerId}-${log.startedAt}`.replace(/[^a-zA-Z0-9_-]/g, ""),
      user_id: log.userId,
      reader_id: log.readerId,
      reader_ip: log.readerIp,
      started_at: log.startedAt,
      ended_at: log.endedAt ?? null,
      status: log.status,
      error_details: log.errorDetails ?? null,
    }),
  });
}
export async function saveSupabaseSnapshot(snapshot: Snapshot) {
  if (!enabled) return;
  await Promise.all([
    upsert(
      "members",
      snapshot.members.filter((member) => !isRetiredDemoMember(member)).map(toMemberRow),
      "id",
    ),
    upsert("staff", snapshot.staff.map(toStaffRow), "id"),
    upsert("attendance_records", snapshot.attendance.map(toAttendanceRow), "id"),
    upsertOptional("leads", snapshot.leads.map(toLeadRow), "id"),
    upsertOptional(
      "biometric_devices",
      snapshot.biometricDevices
        .filter((device) => !isRetiredBiometricDevice(device))
        .map(toDeviceRow),
      "id",
    ),
    upsertOptional(
      "reader_connection_events",
      (snapshot.readerConnectionEvents ?? []).map(toReaderConnectionEventRow),
      "id",
    ),
  ]);
}

async function upsert(table: string, rows: unknown[], conflict: string) {
  if (!rows.length) return;
  await request(`${table}?on_conflict=${conflict}`, {
    method: "POST",
    body: JSON.stringify(rows),
  });
}

async function upsertOptional(table: string, rows: unknown[], conflict: string) {
  if (!rows.length) return;
  try {
    await upsert(table, rows, conflict);
  } catch (error) {
    console.warn(`Optional Supabase upsert skipped: ${table}`, error);
  }
}

function buildSubjectAliases(rows: any[]) {
  const aliases = new Map<string, { subjectId: string; subjectType: "member" | "staff" }>();
  for (const row of rows ?? []) {
    const subjectId = row.subject_id;
    const subjectType = row.subject_type ?? "member";
    if (!subjectId || (subjectType !== "member" && subjectType !== "staff")) continue;
    for (const key of [row.employee_number, row.card_number]) {
      if (key) aliases.set(String(key), { subjectId, subjectType });
    }
  }
  return aliases;
}

function normalizeAttendanceRecords(records: AttendanceRecord[]) {
  const grouped = new Map<string, AttendanceRecord[]>();
  for (const record of records) {
    const key = `${record.subjectType}:${record.subjectId}:${record.date}`;
    const current = grouped.get(key) ?? [];
    current.push(record);
    grouped.set(key, current);
  }

  const normalized: AttendanceRecord[] = [];
  for (const group of grouped.values()) {
    const ordered = group
      .slice()
      .sort((a, b) => new Date(a.punchIn).getTime() - new Date(b.punchIn).getTime());
    let open: AttendanceRecord | null = null;

    for (const record of ordered) {
      if (record.punchOut) {
        normalized.push(record);
        open = null;
        continue;
      }

      if (!open) {
        open = { ...record };
        normalized.push(open);
        continue;
      }

      const punchOutTime = new Date(record.punchIn).getTime();
      const punchInTime = new Date(open.punchIn).getTime();
      if (punchOutTime > punchInTime) {
        open.punchOut = record.punchIn;
        open = null;
      }
    }
  }

  return normalized.sort((a, b) => new Date(b.punchIn).getTime() - new Date(a.punchIn).getTime());
}

function attachMemberCheckIns(members: Member[], attendance: AttendanceRecord[]) {
  const checkInsByMember = new Map<string, string[]>();
  for (const record of attendance) {
    if (record.subjectType !== "member" || !record.punchIn) continue;
    const current = checkInsByMember.get(record.subjectId) ?? [];
    current.push(record.punchIn);
    checkInsByMember.set(record.subjectId, current);
  }

  return members.map((member) => {
    const checkIns = (checkInsByMember.get(member.id) ?? [])
      .slice()
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    return {
      ...member,
      checkIns,
      streak: checkIns.length,
    };
  });
}

function fromMemberRow(row: any): Member {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email ?? undefined,
    plan: row.plan ?? "Premium",
    startDate: row.start_date,
    expiryDate: row.expiry_date,
    status: row.status ?? "active",
    amountPaid: Number(row.amount_paid ?? 0),
    totalAmount: Number(row.total_amount ?? 0),
    checkIns: [],
    streak: 0,
    documents: [],
    workoutPlan: [],
    branchId: row.branch_id ?? undefined,
  };
}

function toMemberRow(member: Member) {
  return {
    id: member.id,
    name: member.name,
    phone: member.phone,
    email: member.email ?? null,
    plan: member.plan,
    start_date: member.startDate,
    expiry_date: member.expiryDate,
    status: member.status,
    amount_paid: member.amountPaid,
    total_amount: member.totalAmount,
    branch_id: member.branchId ?? null,
    updated_at: new Date().toISOString(),
  };
}

function fromStaffRow(row: any): Staff {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    role: row.role ?? "Trainer",
    joined: row.joined,
    salary: Number(row.salary ?? 0),
    active: row.active ?? true,
    shift: row.shift ?? undefined,
    weeklyOff: row.weekly_off ?? undefined,
    permissions: [],
    assignedMemberIds: [],
    branchId: row.branch_id ?? undefined,
  };
}

function toStaffRow(staff: Staff) {
  return {
    id: staff.id,
    name: staff.name,
    phone: staff.phone,
    role: staff.role,
    joined: staff.joined,
    salary: staff.salary,
    active: staff.active,
    shift: staff.shift ?? null,
    weekly_off: staff.weeklyOff ?? null,
    branch_id: staff.branchId ?? null,
    updated_at: new Date().toISOString(),
  };
}

function fromAttendanceRow(
  row: any,
  aliases = new Map<string, { subjectId: string; subjectType: "member" | "staff" }>(),
): AttendanceRecord {
  return {
    id: row.id,
    subjectId: row.subject_id,
    subjectType: row.subject_type,
    date: row.date,
    punchIn: row.punch_in,
    punchOut: row.punch_out ?? undefined,
    source: row.source ?? "Biometric",
    branchId: row.branch_id ?? undefined,
  };
}

function toAttendanceRow(record: AttendanceRecord) {
  return {
    id: record.id,
    subject_id: record.subjectId,
    subject_type: record.subjectType,
    date: record.date,
    punch_in: record.punchIn,
    punch_out: record.punchOut ?? null,
    source: record.source,
    branch_id: record.branchId ?? null,
  };
}

function fromLeadRow(row: any): Lead {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    source: row.source ?? "Website",
    status: row.status ?? "New",
    enquiry: row.enquiry ?? "Website Enquiry",
    followUp: row.follow_up ?? new Date().toISOString(),
    notes: row.notes ?? undefined,
    assignedStaffId: row.assigned_staff_id ?? undefined,
    activities: Array.isArray(row.activities) ? row.activities : [],
    branchId: row.branch_id ?? undefined,
  };
}

function toLeadRow(lead: Lead) {
  return {
    id: lead.id,
    name: lead.name,
    phone: lead.phone,
    source: lead.source,
    status: lead.status,
    enquiry: lead.enquiry,
    follow_up: lead.followUp,
    notes: lead.notes ?? null,
    assigned_staff_id: lead.assignedStaffId ?? null,
    activities: lead.activities ?? [],
    branch_id: lead.branchId ?? null,
    updated_at: new Date().toISOString(),
  };
}
function fromDeviceRow(row: any): BiometricDevice {
  return {
    id: row.id,
    name: row.name,
    model: row.model,
    branchId: row.branch_id ?? "b1",
    ipAddress: row.ip_address,
    port: row.port ?? "443",
    status: row.status ?? "Disconnected",
    username: row.username ?? undefined,
    password: row.password ?? undefined,
    lastSync: row.last_sync ?? undefined,
    lastCommunicationAt: row.last_communication_at ?? undefined,
    lastStatusUpdateAt: row.last_status_update_at ?? undefined,
    lastError: row.last_error ?? undefined,
    pollingIntervalSeconds: Number(row.polling_interval_seconds ?? 30),
    fingerprintPath: row.fingerprint_path ?? undefined,
    usersMapped: Number(row.users_mapped ?? 0),
  };
}

function toDeviceRow(device: BiometricDevice) {
  return {
    id: device.id,
    name: device.name,
    model: device.model,
    branch_id: device.branchId,
    ip_address: device.ipAddress,
    port: device.port,
    status: device.status,
    username: device.username ?? null,
    password: device.password ?? null,
    last_sync: device.lastSync ?? null,
    last_communication_at: device.lastCommunicationAt ?? null,
    last_status_update_at: device.lastStatusUpdateAt ?? null,
    last_error: device.lastError ?? null,
    polling_interval_seconds: device.pollingIntervalSeconds ?? 30,
    fingerprint_path: device.fingerprintPath ?? null,
    users_mapped: device.usersMapped,
    updated_at: new Date().toISOString(),
  };
}
function fromReaderConnectionEventRow(row: any): ReaderConnectionEvent {
  return {
    id: row.id,
    readerId: row.reader_id,
    readerName: row.reader_name,
    readerIp: row.reader_ip,
    eventType: row.event_type ?? "Disconnected",
    at: row.at,
    errorMessage: row.error_message ?? undefined,
    durationSeconds:
      row.duration_seconds === null || row.duration_seconds === undefined
        ? undefined
        : Number(row.duration_seconds),
  };
}

function toReaderConnectionEventRow(event: ReaderConnectionEvent) {
  return {
    id: event.id,
    reader_id: event.readerId,
    reader_name: event.readerName,
    reader_ip: event.readerIp,
    event_type: event.eventType,
    at: event.at,
    error_message: event.errorMessage ?? null,
    duration_seconds: event.durationSeconds ?? null,
  };
}
