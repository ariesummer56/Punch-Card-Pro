import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Activity, ArchiveRestore, BarChart3, BriefcaseBusiness, Building2, CalendarClock, CalendarDays, CheckCircle2, Clock3, Coffee, Download, Edit3, Eye, FileText, ListPlus, Loader2, LockKeyhole, LogOut, MailCheck, MailWarning, MapPin, Play, Plus, Printer, Save, Search, Send, ShieldCheck, Square, Timer, Trash2, UserPlus, UserRound, UsersRound, X, XCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { supabase } from "@/integrations/supabase/client";

type PortalProps = {
  role: "admin" | "manager" | "employee";
};

type Profile = {
  display_name: string | null;
  phone: string | null;
  emergency_contact?: string | null;
  email: string | null;
  company_id?: string | null;
  company_name?: string | null;
  company_role?: string | null;
  admin_alert_email?: string | null;
  payroll_email?: string | null;
  employee_pin?: string | null;
  hire_date?: string | null;
};

type Company = {
  id: string;
  name: string;
  contact_email: string | null;
  contact_phone: string | null;
  admin_alert_email: string | null;
};

type Job = {
  id: string;
  job_name: string;
  job_description?: string;
  manager_notes?: string | null;
  address: string;
  city: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  archived_at?: string | null;
  scheduled_start_time?: string | null;
  late_grace_minutes?: number | null;
  scheduled_start_date?: string | null;
  estimated_duration?: string | null;
};

type JobSchedule = {
  id: string;
  job_id: string;
  company_id: string;
  scheduled_date: string;
  start_time: string | null;
  note: string | null;
  duration_days?: number | null;
  created_by?: string | null;
  created_at?: string;
};

type TimeEntry = {
  id: string;
  employee_user_id: string;
  job_id: string | null;
  work_date: string;
  clock_in_at: string | null;
  break_minutes: number;
  clock_out_at: string | null;
  total_minutes: number;
  is_saved: boolean;
  client_sync_id?: string | null;
  clock_in_latitude?: number | null;
  clock_in_longitude?: number | null;
  clock_in_accuracy_meters?: number | null;
  clock_in_distance_meters?: number | null;
  clock_out_latitude?: number | null;
  clock_out_longitude?: number | null;
  clock_out_accuracy_meters?: number | null;
  clock_out_distance_meters?: number | null;
  override_by_admin?: boolean | null;
  override_reason?: string | null;
  override_admin_user_id?: string | null;
  adjusted_by_admin?: boolean | null;
  adjusted_at?: string | null;
  adjusted_admin_user_id?: string | null;
  admin_adjustment_note?: string | null;
  is_shift_end?: boolean | null;
  paid_start_at?: string | null;
  is_late?: boolean | null;
  late_minutes?: number | null;
  note?: string | null;
};

type PtoBalance = {
  id?: string;
  employee_user_id: string;
  vacation_enabled: boolean;
  vacation_hours: number | string;
  sick_enabled: boolean;
  sick_hours: number | string;
  holiday_enabled: boolean;
  holiday_hours: number | string;
  day_off_enabled: boolean;
  day_off_hours: number | string;
  pto_accrual_enabled?: boolean;
  pto_accrual_start_date?: string | null;
  pto_accrual_rate_hours_per_paycheck?: number | string;
  pto_pay_periods_per_year?: number | string;
  pto_last_accrual_date?: string | null;
};

type TimeOffRequest = {
  id: string;
  employee_user_id: string;
  company_id?: string | null;
  request_type: PtoType;
  start_date: string;
  end_date: string;
  requested_hours: number | string;
  note: string | null;
  status: "pending" | "approved" | "denied" | "cancelled";
  admin_response_note: string | null;
  reminder_email_sent_at?: string | null;
  created_at?: string;
};

type HolidayPay = {
  id: string;
  employee_user_id: string;
  holiday_name: string;
  holiday_date: string;
  holiday_hours: number | string;
  qualifies: boolean;
};

type AnalyticsPeriod = "range" | "week" | "month" | "year";
type AnalyticsReportField = "employeeNames" | "hoursWorked" | "jobsAssigned" | "dates" | "ptoBalance" | "holidayPay" | "jobNotes" | "workLocations";
type PayrollFrequency = "weekly" | "biweekly";
type PayrollReportField = "include_employee_names" | "include_hours_worked" | "include_jobs_assigned" | "include_pto_used" | "include_holiday_pay" | "include_work_locations";
type LocationCheckState = { status: "idle" | "checking" | "confirmed" | "low_accuracy_confirmed" | "blocked" | "error"; message: string; jobId?: string; latitude?: number; longitude?: number; accuracy?: number; distance?: number; checkedAt?: string };
const isLocationCleared = (state: LocationCheckState) => state.status === "confirmed" || state.status === "low_accuracy_confirmed";

// Jobs without a GPS pin don't require geofence verification — allows clock-in at shop/yard
const isLocationReady = (state: LocationCheckState, job: Job | undefined) => {
  if (!job) return false;
  if (!isValidCoordinate(job.latitude, job.longitude)) return true;
  return isLocationCleared(state) && state.jobId === job.id;
};

type EmployeeRow = Profile & { user_id: string };

type AppRole = "admin" | "manager" | "employee";

type UserRoleRow = {
  user_id: string;
  role: AppRole;
};

type EmployeeAssignment = {
  id?: string;
  employee_user_id: string;
  job_id: string;
  assignment_note?: string | null;
};

type AddEmployeeForm = {
  displayName: string;
  email: string;
  phone: string;
  emergencyContact: string;
  jobIds: string[];
  pinMode: "temporary" | "first_login";
  temporaryPin: string;
};

type JobFormState = {
  id: string;
  job_name: string;
  job_description: string;
  address: string;
  city: string;
  state: string;
  latitude: string;
  longitude: string;
  scheduled_start_time: string;
  late_grace_minutes: string;
  scheduled_start_date: string;
  estimated_duration: string;
};

type EmployeeProfileDraft = {
  display_name: string;
  email: string;
  phone: string;
  emergency_contact: string;
  hire_date: string;
};

type PtoType = "vacation" | "sick" | "holiday" | "day_off";

const addEmployeeSchema = z.object({
  displayName: z.string().trim().min(1, "Name is required").max(120, "Name must be 120 characters or less"),
  email: z.string().trim().email("Enter a valid email address").max(255, "Email must be 255 characters or less"),
  phone: z.string().trim().max(40, "Phone must be 40 characters or less").optional(),
  emergencyContact: z.string().trim().max(160, "Emergency contact must be 160 characters or less").optional(),
  jobIds: z.array(z.string().trim().min(1, "Choose a valid job")).max(25, "Choose fewer jobs").default([]),
  pinMode: z.enum(["temporary", "first_login"]),
  temporaryPin: z.string().trim().optional(),
}).superRefine((value, context) => {
  if (value.pinMode === "temporary" && !/^\d{4}$/.test(value.temporaryPin ?? "")) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["temporaryPin"], message: "Temporary PIN must be exactly four digits" });
  }
});

const emptyAddEmployeeForm = (): AddEmployeeForm => ({
  displayName: "",
  email: "",
  phone: "",
  emergencyContact: "",
  jobIds: [],
  pinMode: "first_login",
  temporaryPin: "",
});

type WeeklyReportSettings = {
  id?: string;
  admin_user_id?: string;
  include_contact_info: boolean;
  include_time_totals: boolean;
  include_work_locations: boolean;
  include_pto_balances: boolean;
  include_time_off_requests: boolean;
  include_threshold_status: boolean;
  include_payroll_email: boolean;
  include_emergency_contact: boolean;
};

type WeeklyReportOverride = Partial<WeeklyReportSettings> & {
  id?: string;
  employee_user_id: string;
};

type PayrollEmailSettings = {
  id?: string;
  company_id?: string | null;
  admin_user_id?: string | null;
  recipient_email: string;
  frequency: PayrollFrequency;
  week_start_day: number;
  week_end_day: number;
  include_employee_names: boolean;
  include_hours_worked: boolean;
  include_jobs_assigned: boolean;
  include_pto_used: boolean;
  include_holiday_pay: boolean;
  include_work_locations: boolean;
  include_all_employees: boolean;
  selected_employee_user_ids: string[];
  is_active: boolean;
  last_sent_period_start?: string | null;
  last_sent_period_end?: string | null;
};

type PayrollEmailLog = {
  id: string;
  company_id: string;
  settings_id: string;
  period_start: string;
  period_end: string;
  frequency: PayrollFrequency;
  recipient_email: string;
  status: "pending" | "sent" | "failed" | "skipped";
  row_count: number;
  total_hours: number | string;
  error_message?: string | null;
  sent_at?: string | null;
  created_at?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const today = () => new Date().toISOString().slice(0, 10);

const weekStartIso = (dateIso: string) => {
  const date = new Date(`${dateIso}T00:00:00`);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date.toISOString().slice(0, 10);
};

const formatHours = (minutes: number) => `${(minutes / 60).toFixed(2)} hrs`;

const formatDateTime = (value?: string | null) => value ? new Date(value).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

const GEOFENCE_RADIUS_METERS = 100;
const DEFAULT_JOB_STATE = "NH";
const TIME_ENTRY_QUEUE_KEY = "punchCardProTimeEntryQueue";

type TimeEntryQueueItem = {
  id: string;
  userId: string;
  entryId?: string | null;
  localEntryId?: string | null;
  clientSyncId: string;
  action: "insert" | "update";
  updates: Partial<TimeEntry>;
  createdAt: string;
};

const localQueueId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;

const readTimeEntryQueue = (): TimeEntryQueueItem[] => {
  try {
    return JSON.parse(localStorage.getItem(TIME_ENTRY_QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
};

const writeTimeEntryQueue = (items: TimeEntryQueueItem[]) => {
  localStorage.setItem(TIME_ENTRY_QUEUE_KEY, JSON.stringify(items));
};

const queuedTimeEntriesForUser = (userId: string) => readTimeEntryQueue().filter((item) => item.userId === userId);

const timeEntryWithUpdate = (entry: TimeEntry | null, payload: Partial<TimeEntry>, fallback: TimeEntry): TimeEntry => ({
  ...fallback,
  ...(entry ?? {}),
  ...payload,
  id: entry?.id ?? fallback.id,
  break_minutes: Number(payload.break_minutes ?? entry?.break_minutes ?? fallback.break_minutes ?? 0),
  total_minutes: Number(payload.total_minutes ?? entry?.total_minutes ?? fallback.total_minutes ?? 0),
  is_saved: false,
});

const emptyJobForm = (): JobFormState => ({
  id: "",
  job_name: "",
  job_description: "",
  address: "",
  city: "",
  state: DEFAULT_JOB_STATE,
  latitude: "",
  longitude: "",
  scheduled_start_time: "",
  late_grace_minutes: "0",
  scheduled_start_date: "",
  estimated_duration: "",
});

const employeeProfileDraftFor = (employee: EmployeeRow): EmployeeProfileDraft => ({
  display_name: employee.display_name ?? "",
  email: employee.email ?? "",
  phone: employee.phone ?? "",
  emergency_contact: employee.emergency_contact ?? "",
  hire_date: employee.hire_date ?? "",
});

const distanceMeters = (fromLat: number, fromLon: number, toLat: number, toLon: number) => {
  const earthRadius = 6371000;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(toLat - fromLat);
  const dLon = toRad(toLon - fromLon);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(fromLat)) * Math.cos(toRad(toLat)) * Math.sin(dLon / 2) ** 2;
  return earthRadius * 2 * Math.asin(Math.sqrt(a));
};

const isValidCoordinate = (latitude?: number | null, longitude?: number | null) => Number.isFinite(latitude) && Number.isFinite(longitude) && latitude! >= -90 && latitude! <= 90 && longitude! >= -180 && longitude! <= 180;

const locationErrorMessage = (error?: GeolocationPositionError) => {
  if (error?.code === 1) return "GPS permission was denied. Open your browser's site settings, allow location for this page, then tap Refresh GPS again.";
  if (error?.code === 2) return "GPS location is unavailable. Move near a window or open area, then tap Refresh GPS again.";
  if (error?.code === 3) return "GPS timed out before getting an accurate location. Tap Refresh GPS to try again.";
  return "GPS location could not be confirmed. Tap Refresh GPS to try again.";
};

const getBestCurrentPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error("GPS is not available on this device."));
    return;
  }

  let bestPosition: GeolocationPosition | null = null;
  let settled = false;
  let watchId: number | null = null;
  const finish = (position?: GeolocationPosition, error?: GeolocationPositionError | Error) => {
    if (settled) return;
    settled = true;
    if (watchId != null) navigator.geolocation.clearWatch(watchId);
    window.clearTimeout(sampleTimer);
    window.clearTimeout(hardTimer);
    if (position) resolve(position);
    else reject(error ?? new Error("GPS location could not be confirmed."));
  };
  const capture = (position: GeolocationPosition) => {
    if (!bestPosition || position.coords.accuracy < bestPosition.coords.accuracy) bestPosition = position;
    if (position.coords.accuracy <= 25) finish(position);
  };
  const sampleTimer = window.setTimeout(() => bestPosition ? finish(bestPosition) : undefined, 4500);
  const hardTimer = window.setTimeout(() => finish(bestPosition ?? undefined, new Error("GPS timed out before getting an accurate location.")), 12000);

  watchId = navigator.geolocation.watchPosition(capture, (error) => bestPosition ? finish(bestPosition) : finish(undefined, error), { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  navigator.geolocation.getCurrentPosition(capture, (error) => bestPosition ? finish(bestPosition) : undefined, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
});

const evaluateJobGeofence = (job: Job, position: GeolocationPosition): LocationCheckState => {
  if (!isValidCoordinate(job.latitude, job.longitude) || !isValidCoordinate(position.coords.latitude, position.coords.longitude)) {
    return { status: "error", message: "GPS coordinates are invalid. Refresh location or update the job pin.", jobId: job.id };
  }
  const distance = distanceMeters(position.coords.latitude, position.coords.longitude, job.latitude!, job.longitude!);
  const accuracy = position.coords.accuracy;
  const details = `Current distance: ${Math.round(distance)} meters. GPS accuracy: ${Math.round(accuracy)} meters.`;
  // Geofence radius check disabled — always accept the location, just record the coordinates.
  const status: LocationCheckState["status"] = "confirmed";
  const message = `Location captured (geofence disabled). ${details}`;
  return {
    status,
    message,
    jobId: job.id,
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy,
    distance,
    checkedAt: new Date().toISOString(),
  };
};

const ptoTypes: { key: PtoType; label: string; enabled: keyof PtoBalance; hours: keyof PtoBalance }[] = [
  { key: "vacation", label: "Vacation", enabled: "vacation_enabled", hours: "vacation_hours" },
  { key: "sick", label: "Sick time", enabled: "sick_enabled", hours: "sick_hours" },
  { key: "holiday", label: "Holiday pay", enabled: "holiday_enabled", hours: "holiday_hours" },
  { key: "day_off", label: "Days off", enabled: "day_off_enabled", hours: "day_off_hours" },
];

const reportFields: { key: keyof WeeklyReportSettings; label: string }[] = [
  { key: "include_contact_info", label: "Employee contact info" },
  { key: "include_time_totals", label: "Clock-in, breaks, and total hours" },
  { key: "include_work_locations", label: "Work locations and addresses" },
  { key: "include_pto_balances", label: "PTO balances" },
  { key: "include_time_off_requests", label: "Time-off requests" },
  { key: "include_threshold_status", label: "35-hour threshold status" },
  { key: "include_payroll_email", label: "Payroll email" },
  { key: "include_emergency_contact", label: "Emergency contact" },
];

const analyticsReportFields: { key: AnalyticsReportField; label: string }[] = [
  { key: "employeeNames", label: "Employee names" },
  { key: "hoursWorked", label: "Hours worked" },
  { key: "jobsAssigned", label: "Jobs assigned" },
  { key: "dates", label: "Dates" },
  { key: "ptoBalance", label: "PTO balance" },
  { key: "holidayPay", label: "Holiday pay" },
  { key: "jobNotes", label: "Job notes" },
  { key: "workLocations", label: "Work locations" },
];

const payrollReportFields: { key: PayrollReportField; label: string }[] = [
  { key: "include_employee_names", label: "Employee names" },
  { key: "include_hours_worked", label: "Hours worked" },
  { key: "include_jobs_assigned", label: "Jobs assigned" },
  { key: "include_pto_used", label: "PTO used" },
  { key: "include_holiday_pay", label: "Holiday pay" },
  { key: "include_work_locations", label: "Work locations" },
];

const weekdayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const defaultAnalyticsReportContent: Record<AnalyticsReportField, boolean> = {
  employeeNames: true,
  hoursWorked: true,
  jobsAssigned: true,
  dates: true,
  ptoBalance: true,
  holidayPay: true,
  jobNotes: true,
  workLocations: true,
};

const roleOptions: { value: AppRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
];

const adminProfileFields: { label: string; key: keyof Profile; placeholder: string }[] = [
  { label: "Company name", key: "company_name", placeholder: "Punch Card Pro" },
  { label: "Admin profile phone", key: "phone", placeholder: "Phone number" },
  { label: "Designated email address", key: "email", placeholder: "admin@company.com" },
  { label: "Reports email (payroll, weekly, analytics)", key: "admin_alert_email", placeholder: "reports@company.com" },
];

const employeeProfileFields: { label: string; key: keyof Profile; placeholder: string }[] = [
  { label: "Name", key: "display_name", placeholder: "Your name" },
  { label: "Phone", key: "phone", placeholder: "Phone number" },
  { label: "Emergency contact", key: "emergency_contact", placeholder: "Name and phone" },
  { label: "Payroll report email", key: "payroll_email", placeholder: "payroll@email.com" },
];

const defaultReportSettings = (admin_user_id?: string): WeeklyReportSettings => ({
  admin_user_id,
  include_contact_info: true,
  include_time_totals: true,
  include_work_locations: true,
  include_pto_balances: true,
  include_time_off_requests: true,
  include_threshold_status: true,
  include_payroll_email: true,
  include_emergency_contact: true,
});

const defaultPayrollSettings = (company_id?: string | null, admin_user_id?: string, recipientEmail = ""): PayrollEmailSettings => ({
  company_id,
  admin_user_id,
  recipient_email: recipientEmail,
  frequency: "weekly",
  week_start_day: 1,
  week_end_day: 0,
  include_employee_names: true,
  include_hours_worked: true,
  include_jobs_assigned: true,
  include_pto_used: true,
  include_holiday_pay: true,
  include_work_locations: true,
  include_all_employees: true,
  selected_employee_user_ids: [],
  is_active: true,
});

const demoRole = () => sessionStorage.getItem("punchCardProDemoRole");

const demoToast = () => toast.info("Demo mode only — create an account to save changes.");

const lastAdminErrorMessage = "At least one admin must exist in the system at all times. A new admin must be assigned before the current one can be removed or changed.";

const PENDING_ADMIN_ONBOARDING_KEY = "punchCardProPendingAdminOnboarding";

type PendingAdminOnboarding = {
  companyName: string;
  displayName?: string;
  phone?: string;
  emergencyContact?: string;
  contactEmail?: string;
  adminAlertEmail?: string;
  email?: string;
};

const readPendingAdminOnboarding = () => {
  const raw = localStorage.getItem(PENDING_ADMIN_ONBOARDING_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingAdminOnboarding;
  } catch {
    localStorage.removeItem(PENDING_ADMIN_ONBOARDING_KEY);
    return null;
  }
};

const demoEmployees: EmployeeRow[] = [
  { user_id: "demo-admin", display_name: "Avery Morgan", email: "admin@ridgewaydemo.com", phone: "(555) 013-2200", emergency_contact: null, payroll_email: "payroll@ridgewaydemo.com", company_id: "demo-company", company_name: "Ridgeway Electrical" },
  { user_id: "demo-manager", display_name: "Casey Brooks", email: "manager@ridgewaydemo.com", phone: "(555) 013-3300", emergency_contact: null, payroll_email: "payroll@ridgewaydemo.com", company_id: "demo-company", company_name: "Ridgeway Electrical" },
  { user_id: "demo-employee-1", display_name: "Jordan Lee", email: "jordan@ridgewaydemo.com", phone: "(555) 013-4481", emergency_contact: "Taylor Lee — (555) 013-4499", payroll_email: "payroll@ridgewaydemo.com", hire_date: "2023-03-15", company_id: "demo-company", company_name: "Ridgeway Electrical" },
  { user_id: "demo-employee-2", display_name: "Sam Rivera", email: "sam@ridgewaydemo.com", phone: "(555) 013-1172", emergency_contact: "Mia Rivera — (555) 013-1188", payroll_email: "payroll@ridgewaydemo.com", hire_date: "2025-09-01", company_id: "demo-company", company_name: "Ridgeway Electrical" },
];

const demoUserRoles: UserRoleRow[] = [
  { user_id: "demo-admin", role: "admin" },
  { user_id: "demo-manager", role: "manager" },
  { user_id: "demo-employee-1", role: "employee" },
  { user_id: "demo-employee-2", role: "employee" },
];

const demoJobs: Job[] = [
  { id: "demo-job-1", job_name: "Westbrook Office Buildout", job_description: "Suite wiring and panel trim", manager_notes: "Park in back lot. Use service entrance. Ask for Tom on arrival.", address: "410 Market Street", city: "Cedar Falls", state: "IA", latitude: 42.5349, longitude: -92.4453 },
  { id: "demo-job-2", job_name: "North Yard Service Call", job_description: "Exterior lighting repair", address: "88 Industrial Park Road", city: "Waterloo", state: "IA", latitude: 42.4928, longitude: -92.3426 },
  { id: "demo-job-3", job_name: "Old Depot Retrofit", job_description: "Completed low-voltage retrofit", address: "12 Depot Lane", city: "Waterloo", state: "IA", latitude: 42.5012, longitude: -92.3361, archived_at: new Date(Date.now() - 2 * 86400000).toISOString() },
];

const demoRequests: TimeOffRequest[] = [
  { id: "demo-request-1", employee_user_id: "demo-employee-1", request_type: "vacation", start_date: today(), end_date: today(), requested_hours: 8, note: "Family appointment", status: "pending", admin_response_note: null },
  { id: "demo-request-2", employee_user_id: "demo-employee-2", request_type: "sick", start_date: today(), end_date: today(), requested_hours: 4, note: null, status: "approved", admin_response_note: "Approved for morning hours." },
];

const emptyPtoBalance = (employee_user_id: string): PtoBalance => ({
  employee_user_id,
  vacation_enabled: false,
  vacation_hours: 0,
  sick_enabled: false,
  sick_hours: 0,
  holiday_enabled: false,
  holiday_hours: 0,
  day_off_enabled: false,
  day_off_hours: 0,
  pto_accrual_enabled: true,
  pto_accrual_start_date: null,
  pto_accrual_rate_hours_per_paycheck: DEFAULT_PTO_ACCRUAL_RATE,
  pto_pay_periods_per_year: DEFAULT_PAY_PERIODS_PER_YEAR,
  pto_last_accrual_date: null,
});

const ptoLabel = (type: PtoType) => ptoTypes.find((item) => item.key === type)?.label ?? type;

const formatDate = (value?: string | null) => value ? new Date(`${value}T00:00:00`).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "Not set";

const PTO_WEEK_HOURS = 40;
const DEFAULT_PAY_PERIODS_PER_YEAR = 26;
const DEFAULT_PTO_ACCRUAL_RATE = Number((PTO_WEEK_HOURS / DEFAULT_PAY_PERIODS_PER_YEAR).toFixed(2));

const addDaysIso = (value: string, days: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const monthStartIso = (value: string) => `${value.slice(0, 7)}-01`;

const monthEndIso = (value: string) => {
  const date = new Date(`${value.slice(0, 7)}-01T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return date.toISOString().slice(0, 10);
};

const dateRangesOverlap = (startA: string, endA: string, startB: string, endB: string) => startA <= endB && endA >= startB;

// Parse free-text estimated duration like "4 hours", "2 days", "1 week" into whole days (ceiling).
// Returns null when it can't be parsed.
const parseDurationToDays = (raw?: string | null): number | null => {
  if (!raw) return null;
  const text = raw.trim().toLowerCase();
  if (!text) return null;
  const match = text.match(/(\d+(?:\.\d+)?)\s*([a-z]*)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  const unit = match[2] || "d";
  if (/^h/.test(unit)) return Math.max(1, Math.ceil(value / 8));
  if (/^d/.test(unit)) return Math.max(1, Math.ceil(value));
  if (/^w/.test(unit)) return Math.max(1, Math.ceil(value * 7));
  if (/^mo/.test(unit) || /^month/.test(unit)) return Math.max(1, Math.ceil(value * 30));
  // unknown unit — assume days
  return Math.max(1, Math.ceil(value));
};

const deriveJobEndDate = (startDate?: string | null, durationText?: string | null): string | null => {
  if (!startDate) return null;
  const days = parseDurationToDays(durationText);
  if (days == null) return null;
  return addDaysIso(startDate, Math.max(0, days - 1));
};

const periodStartFor = (dateIso: string, startDay: number, frequency: PayrollFrequency) => {
  const date = new Date(`${dateIso}T00:00:00`);
  const offset = (date.getDay() - startDay + 7) % 7;
  date.setDate(date.getDate() - offset);
  if (frequency === "biweekly") {
    const anchor = new Date("2024-01-01T00:00:00");
    const daysSinceAnchor = Math.floor((date.getTime() - anchor.getTime()) / 86400000);
    const weeksSinceAnchor = Math.floor(daysSinceAnchor / 7);
    if (Math.abs(weeksSinceAnchor) % 2 === 1) date.setDate(date.getDate() - 7);
  }
  return date.toISOString().slice(0, 10);
};

const payrollPeriodFor = (settings: PayrollEmailSettings, baseDate = today()) => {
  const start = periodStartFor(baseDate, settings.week_start_day, settings.frequency);
  const length = settings.frequency === "biweekly" ? 14 : 7;
  return { start, end: addDaysIso(start, length - 1), label: `${formatDate(start)} – ${formatDate(addDaysIso(start, length - 1))}` };
};

const addYearsIso = (value: string, years: number) => {
  const date = new Date(`${value}T00:00:00`);
  date.setFullYear(date.getFullYear() + years);
  return date.toISOString().slice(0, 10);
};

const vacationEligibilityDate = (hireDate?: string | null) => hireDate ? addYearsIso(hireDate, 1) : null;

const isVacationEligible = (hireDate?: string | null) => {
  const eligibility = vacationEligibilityDate(hireDate);
  return !!eligibility && eligibility <= today();
};

const yearsOfService = (hireDate?: string | null, asOf = today()) => {
  if (!hireDate) return 0;
  const start = new Date(`${hireDate}T00:00:00`);
  const end = new Date(`${asOf}T00:00:00`);
  let years = end.getFullYear() - start.getFullYear();
  const anniversary = new Date(end.getFullYear(), start.getMonth(), start.getDate());
  if (end < anniversary) years -= 1;
  return Math.max(0, years);
};

const ptoAnnualHoursForHireDate = (hireDate?: string | null, asOf = today()) => {
  const years = yearsOfService(hireDate, asOf);
  if (years >= 5) return PTO_WEEK_HOURS * 3;
  if (years >= 3) return PTO_WEEK_HOURS * 2;
  if (years >= 1) return PTO_WEEK_HOURS;
  return 0;
};

const ptoAccrualRateForHireDate = (hireDate?: string | null, payPeriods: number | string = DEFAULT_PAY_PERIODS_PER_YEAR, asOf = today()) => {
  const safePeriods = Math.max(1, Number(payPeriods) || DEFAULT_PAY_PERIODS_PER_YEAR);
  return Number((ptoAnnualHoursForHireDate(hireDate, asOf) / safePeriods).toFixed(2));
};

const ptoTierLabel = (hireDate?: string | null) => {
  const hours = ptoAnnualHoursForHireDate(hireDate);
  if (!hireDate) return "Hire date needed";
  if (hours === 0) return `Eligible ${formatDate(vacationEligibilityDate(hireDate))}`;
  return `${hours / PTO_WEEK_HOURS} week${hours === PTO_WEEK_HOURS ? "" : "s"} per year`;
};

const nextPtoTierDate = (hireDate?: string | null) => {
  if (!hireDate) return null;
  const years = yearsOfService(hireDate);
  if (years < 1) return addYearsIso(hireDate, 1);
  if (years < 3) return addYearsIso(hireDate, 3);
  if (years < 5) return addYearsIso(hireDate, 5);
  return null;
};

const currentAnniversaryIso = (hireDate?: string | null, asOf = today()) => {
  if (!hireDate) return null;
  const hire = new Date(`${hireDate}T00:00:00`);
  const current = new Date(`${asOf}T00:00:00`);
  const anniversary = new Date(current.getFullYear(), hire.getMonth(), hire.getDate());
  if (anniversary > current) anniversary.setFullYear(anniversary.getFullYear() - 1);
  return anniversary.toISOString().slice(0, 10);
};

const ptoAccruedHoursFor = (hireDate?: string | null, payPeriods: number | string = DEFAULT_PAY_PERIODS_PER_YEAR, asOf = today()) => {
  const annualHours = ptoAnnualHoursForHireDate(hireDate, asOf);
  const anniversary = currentAnniversaryIso(hireDate, asOf);
  if (!annualHours || !anniversary) return 0;
  const safePeriods = Math.max(1, Number(payPeriods) || DEFAULT_PAY_PERIODS_PER_YEAR);
  const nextAnniversary = addYearsIso(anniversary, 1);
  const daysInYear = Math.max(1, (new Date(`${nextAnniversary}T00:00:00`).getTime() - new Date(`${anniversary}T00:00:00`).getTime()) / 86400000);
  const daysElapsed = Math.max(0, (new Date(`${asOf}T00:00:00`).getTime() - new Date(`${anniversary}T00:00:00`).getTime()) / 86400000);
  const paychecksElapsed = Math.min(safePeriods, Math.floor((daysElapsed / daysInYear) * safePeriods) + 1);
  return Number(((annualHours / safePeriods) * paychecksElapsed).toFixed(2));
};

const nthWeekdayOfMonth = (year: number, monthIndex: number, weekday: number, nth: number) => {
  const date = new Date(year, monthIndex, 1);
  const offset = (weekday - date.getDay() + 7) % 7;
  date.setDate(1 + offset + (nth - 1) * 7);
  return date.toISOString().slice(0, 10);
};

const lastWeekdayOfMonth = (year: number, monthIndex: number, weekday: number) => {
  const date = new Date(year, monthIndex + 1, 0);
  const offset = (date.getDay() - weekday + 7) % 7;
  date.setDate(date.getDate() - offset);
  return date.toISOString().slice(0, 10);
};

const majorHolidays = (year = new Date().getFullYear()) => [
  { name: "New Year's Day", date: `${year}-01-01` },
  { name: "Memorial Day", date: lastWeekdayOfMonth(year, 4, 1) },
  { name: "Fourth of July", date: `${year}-07-04` },
  { name: "Labor Day", date: nthWeekdayOfMonth(year, 8, 1, 1) },
  { name: "Thanksgiving", date: nthWeekdayOfMonth(year, 10, 4, 4) },
  { name: "Christmas", date: `${year}-12-25` },
];

const shiftWorkday = (dateIso: string, direction: 1 | -1) => {
  const date = new Date(`${dateIso}T00:00:00`);
  do {
    date.setDate(date.getDate() + direction);
  } while (date.getDay() === 0 || date.getDay() === 6);
  return date.toISOString().slice(0, 10);
};

const workedOnDate = (entries: TimeEntry[], dateIso: string) => entries.some((entry) => entry.work_date === dateIso && (entry.clock_in_at || entry.total_minutes > 0));

const mapUrl = (latitude?: number | null, longitude?: number | null) =>
  latitude != null && longitude != null ? `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=18/${latitude}/${longitude}` : "";

const mapEmbedUrl = (latitude?: number | null, longitude?: number | null) => {
  if (latitude == null || longitude == null) return "";
  const pad = 0.002;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - pad}%2C${latitude - pad}%2C${longitude + pad}%2C${latitude + pad}&layer=mapnik&marker=${latitude}%2C${longitude}`;
};

const ptoHoursPayload = (balance: PtoBalance) => ({
  employee_user_id: balance.employee_user_id,
  vacation_enabled: !!balance.vacation_enabled,
  vacation_hours: Number(balance.vacation_hours) || 0,
  sick_enabled: !!balance.sick_enabled,
  sick_hours: Number(balance.sick_hours) || 0,
  holiday_enabled: !!balance.holiday_enabled,
  holiday_hours: Number(balance.holiday_hours) || 0,
  day_off_enabled: !!balance.day_off_enabled,
  day_off_hours: Number(balance.day_off_hours) || 0,
  pto_accrual_enabled: balance.pto_accrual_enabled !== false,
  pto_accrual_start_date: balance.pto_accrual_start_date || null,
  pto_accrual_rate_hours_per_paycheck: Number(balance.pto_accrual_rate_hours_per_paycheck) || DEFAULT_PTO_ACCRUAL_RATE,
  pto_pay_periods_per_year: Number(balance.pto_pay_periods_per_year) || DEFAULT_PAY_PERIODS_PER_YEAR,
  pto_last_accrual_date: balance.pto_last_accrual_date || null,
});

const elapsedMinutes = (entry: TimeEntry | null) => {
  if (!entry?.clock_in_at) return 0;
  const end = entry.clock_out_at ? new Date(entry.clock_out_at).getTime() : Date.now();
  const start = new Date(entry.clock_in_at).getTime();
  return Math.max(0, Math.floor((end - start) / 60000) - (entry.break_minutes ?? 0));
};

const entryMinutes = (entry: TimeEntry) => entry.total_minutes || elapsedMinutes(entry);

const summarizeDay = (entries: TimeEntry[], employeeId: string, dateIso: string) => {
  const dayEntries = entries.filter((e) => e.employee_user_id === employeeId && e.work_date === dateIso);
  const perJob = new Map<string, number>();
  let totalMinutes = 0;
  let shiftStart: string | null = null;
  let shiftEnd: string | null = null;
  let isActive = false;
  for (const entry of dayEntries) {
    const minutes = entryMinutes(entry);
    totalMinutes += minutes;
    const key = entry.job_id ?? "unassigned";
    perJob.set(key, (perJob.get(key) ?? 0) + minutes);
    if (entry.clock_in_at && (!shiftStart || entry.clock_in_at < shiftStart)) shiftStart = entry.clock_in_at;
    if (entry.clock_in_at && !entry.clock_out_at) isActive = true;
    if (entry.clock_out_at && (!shiftEnd || entry.clock_out_at > shiftEnd)) shiftEnd = entry.clock_out_at;
  }
  return { perJob: Array.from(perJob.entries()).map(([job_id, minutes]) => ({ job_id, minutes })), totalMinutes, shiftStart, shiftEnd, isActive, count: dayEntries.length };
};

const DAILY_HOURS_CAP_MINUTES = 16 * 60;
const REST_PERIOD_MS = 8 * 60 * 60 * 1000;

const checkHoursWarnings = (params: {
  entries: TimeEntry[];
  employeeUserId: string;
  workDate: string;
  newMinutes: number;
  newClockInAt?: string | null;
  excludeEntryId?: string;
}): { overCap?: string; tooSoon?: string } => {
  const { entries, employeeUserId, workDate, newMinutes, newClockInAt, excludeEntryId } = params;
  const result: { overCap?: string; tooSoon?: string } = {};
  const sameDay = entries.filter((e) => e.employee_user_id === employeeUserId && e.work_date === workDate && e.id !== excludeEntryId);
  const existing = sameDay.reduce((sum, e) => sum + (entryMinutes(e) || 0), 0);
  const projected = existing + Math.max(0, newMinutes || 0);
  if (projected >= DAILY_HOURS_CAP_MINUTES) {
    result.overCap = `${(projected / 60).toFixed(1)}h logged on ${workDate} — at or above the 16-hour daily limit.`;
  }
  if (newClockInAt) {
    const clockInMs = new Date(newClockInAt).getTime();
    if (!Number.isNaN(clockInMs)) {
      let lastOut = -Infinity;
      for (const e of entries) {
        if (e.employee_user_id !== employeeUserId || e.id === excludeEntryId || !e.clock_out_at) continue;
        const t = new Date(e.clock_out_at).getTime();
        if (!Number.isNaN(t) && t <= clockInMs && t > lastOut) lastOut = t;
      }
      if (lastOut !== -Infinity) {
        const gap = clockInMs - lastOut;
        if (gap >= 0 && gap < REST_PERIOD_MS) {
          const hrs = Math.floor(gap / 3600000);
          const mins = Math.floor((gap % 3600000) / 60000);
          result.tooSoon = `Clock-in is ${hrs}h ${mins}m after last clock-out — under the 8-hour rest period.`;
        }
      }
    }
  }
  return result;
};

const emitHoursWarnings = (result: { overCap?: string; tooSoon?: string }, nameLabel?: string) => {
  const prefix = nameLabel ? `${nameLabel}: ` : "Heads up: ";
  if (result.overCap) toast.warning(prefix + result.overCap);
  if (result.tooSoon) toast.warning(prefix + result.tooSoon);
};

const isEmail = (value?: string | null) => !value || /^\S+@\S+\.\S+$/.test(value);

const weakPasswordPattern = /^(password|password\d+|12345678|qwerty\d*|letmein\d*|welcome\d*|admin\d*|changeme\d*)$/i;
const weakPasswordMessage = "That password is too common or easy to guess. Please choose a stronger password — try the Generate button.";

const isWeakPassword = (value: string) => weakPasswordPattern.test(value.trim());

const AdminDashboard = ({ managerOnly = false, loginPath = "/admin-login" }: { managerOnly?: boolean; loginPath?: string }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();
  const setupMode = !managerOnly && new URLSearchParams(location.search).get("setup") === "company";
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(setupMode);
  const [profile, setProfile] = useState<Profile>({ display_name: "", phone: "", email: "", company_name: "", admin_alert_email: "" });
  const [company, setCompany] = useState<Company | null>(null);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [addingEmployee, setAddingEmployee] = useState(false);
  const [savingEmployee, setSavingEmployee] = useState(false);
  const [addEmployeeForm, setAddEmployeeForm] = useState<AddEmployeeForm>(emptyAddEmployeeForm());
  const [userRoles, setUserRoles] = useState<Record<string, AppRole>>({});
  const [editingRoleUserId, setEditingRoleUserId] = useState("");
  const [roleDrafts, setRoleDrafts] = useState<Record<string, AppRole>>({});
  const [pendingRoleChange, setPendingRoleChange] = useState<{ targetUserId: string; currentRole: AppRole; nextRole: AppRole } | null>(null);
  const [pendingReschedule, setPendingReschedule] = useState<{ completedJob: Job; nextJob: Job; daysSaved: number; newStartDate: string } | null>(null);
  const [reschedulingJob, setReschedulingJob] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employeeAssignments, setEmployeeAssignments] = useState<EmployeeAssignment[]>([]);
  const [adminTimeEntries, setAdminTimeEntries] = useState<TimeEntry[]>([]);
  const [jobForm, setJobForm] = useState<JobFormState>(emptyJobForm());
  const [editingEmployeeUserId, setEditingEmployeeUserId] = useState("");
  const [employeeDrafts, setEmployeeDrafts] = useState<Record<string, EmployeeProfileDraft>>({});
  const [pendingEmployeeDelete, setPendingEmployeeDelete] = useState<EmployeeRow | null>(null);
  const [deletingEmployee, setDeletingEmployee] = useState(false);
  const [setPwTarget, setSetPwTarget] = useState<EmployeeRow | null>(null);
  const [setPwValue, setSetPwValue] = useState("");
  const [setPwConfirm, setSetPwConfirm] = useState("");
  const [setPwSaving, setSetPwSaving] = useState(false);
  const [setPwShown, setSetPwShown] = useState<{ email: string; password: string } | null>(null);
  const [ptoBalances, setPtoBalances] = useState<Record<string, PtoBalance>>({});
  const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({});
  const [managerJobDrafts, setManagerJobDrafts] = useState<Record<string, { manager_notes: string; latitude: string; longitude: string }>>({});
  const [managerAssignmentDrafts, setManagerAssignmentDrafts] = useState<Record<string, string>>({});
  const [editingAssignmentUserId, setEditingAssignmentUserId] = useState("");
  const [employeeAssignmentDrafts, setEmployeeAssignmentDrafts] = useState<Record<string, string[]>>({});
  const [expandedEmployeeId, setExpandedEmployeeId] = useState("");
  const [employeeEntryWeek, setEmployeeEntryWeek] = useState<Record<string, string>>({});
  const [jobAssignmentDraft, setJobAssignmentDraft] = useState<{ employeeIds: string[]; notes: Record<string, string> }>({ employeeIds: [], notes: {} });
  const [archivedJobSearch, setArchivedJobSearch] = useState("");
  const [pendingArchiveJob, setPendingArchiveJob] = useState<Job | null>(null);
  const [archiveConfirmText, setArchiveConfirmText] = useState("");
  const [archivingJob, setArchivingJob] = useState(false);
  const [managerEntryDrafts, setManagerEntryDrafts] = useState<Record<string, { break_minutes: string; total_hours: string }>>({});
  const [overrideClockInOpen, setOverrideClockInOpen] = useState(false);
  const [overrideClockInForm, setOverrideClockInForm] = useState<{ employee_user_id: string; job_id: string; reason: string }>({ employee_user_id: "", job_id: "", reason: "Admin override — GPS bypassed" });
  const [overrideClockOutTarget, setOverrideClockOutTarget] = useState<TimeEntry | null>(null);
  const [overrideClockOutReason, setOverrideClockOutReason] = useState("Admin override — GPS bypassed");
  const [missedClockInOpen, setMissedClockInOpen] = useState(false);
  const [missedClockInForm, setMissedClockInForm] = useState<{ employee_user_id: string; job_id: string; clock_in_at: string; reason: string }>({ employee_user_id: "", job_id: "", clock_in_at: "", reason: "Admin fix — missed clock-in" });
  const [editEntryDialog, setEditEntryDialog] = useState<{ open: boolean; mode: "edit" | "create"; entryId?: string; employee_user_id: string; job_id: string; work_date: string; clock_in_at: string; clock_out_at: string; break_minutes: string; hours_worked: string; note: string }>({ open: false, mode: "edit", employee_user_id: "", job_id: "", work_date: today(), clock_in_at: "", clock_out_at: "", break_minutes: "0", hours_worked: "", note: "" });
  type BacklogRow = { start_date: string; end_date: string; job_id: string; hours_worked: string; break_minutes: string; note: string; weekdays_only: boolean; status: "pending" | "saving" | "saved" | "error"; error?: string; saved_count?: number };
  const [backlogDialog, setBacklogDialog] = useState<{ open: boolean; employee_user_id: string; rows: BacklogRow[]; saving: boolean }>({ open: false, employee_user_id: "", rows: [], saving: false });
  const [reportSettings, setReportSettings] = useState<WeeklyReportSettings>(defaultReportSettings());
  const [reportOverrides, setReportOverrides] = useState<Record<string, WeeklyReportOverride>>({});
  const [reportEmployeeFilter, setReportEmployeeFilter] = useState("all");
  const [reportJobFilter, setReportJobFilter] = useState("all");
  const [reportWeekFilter, setReportWeekFilter] = useState(weekStartIso(today()));
  const [reportStartDate, setReportStartDate] = useState(weekStartIso(today()));
  const [reportEndDate, setReportEndDate] = useState(addDaysIso(weekStartIso(today()), 6));
  const [hoursViewMode, setHoursViewMode] = useState<"day" | "week">("day");
  const [weekViewStart, setWeekViewStart] = useState(weekStartIso(today()));
  const [weekShowWeekend, setWeekShowWeekend] = useState(false);
  const [reportsTab, setReportsTab] = useState<"analytics" | "payroll" | "jobtotals" | "weekly" | "autoreport" | "deletion">("analytics");
  const [jobTotalsRange, setJobTotalsRange] = useState<"all" | "month" | "quarter" | "year" | "custom">("all");
  const [jobTotalsStart, setJobTotalsStart] = useState("");
  const [jobTotalsEnd, setJobTotalsEnd] = useState("");
  const [jobTotalsStatus, setJobTotalsStatus] = useState<"all" | "active" | "archived">("all");
  const [jobTotalsSearch, setJobTotalsSearch] = useState("");
  const [jobTotalsBreakdownId, setJobTotalsBreakdownId] = useState<string | null>(null);
  const [quickViewEmployeeId, setQuickViewEmployeeId] = useState<string | null>(null);
  const [emailBannerDismissed, setEmailBannerDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem("pcp-email-banner-dismissed") === "1";
  });
  const adminLocationRequestRef = useRef(0);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>("week");
  const [analyticsStartDate, setAnalyticsStartDate] = useState(weekStartIso(today()));
  const [analyticsEndDate, setAnalyticsEndDate] = useState(addDaysIso(weekStartIso(today()), 6));
  const [analyticsMonth, setAnalyticsMonth] = useState(today().slice(0, 7));
  const [analyticsYear, setAnalyticsYear] = useState(String(new Date().getFullYear()));
  const [analyticsReportContent, setAnalyticsReportContent] = useState<Record<AnalyticsReportField, boolean>>(defaultAnalyticsReportContent);
  const [payrollSettings, setPayrollSettings] = useState<PayrollEmailSettings>(defaultPayrollSettings());
  const [payrollLogs, setPayrollLogs] = useState<PayrollEmailLog[]>([]);
  const [editingPayroll, setEditingPayroll] = useState(false);
  const [savingPayroll, setSavingPayroll] = useState(false);
  const [emailingPayroll, setEmailingPayroll] = useState(false);
  const [payrollReportOpen, setPayrollReportOpen] = useState(false);
  type ActivityReportSettings = { id?: string; company_id?: string | null; is_active: boolean; frequency: "weekly" | "biweekly"; recipients: string[]; last_sent_period_end?: string | null };
  const [activityReport, setActivityReport] = useState<ActivityReportSettings>({ is_active: true, frequency: "weekly", recipients: [] });
  const [activityRecipientDraft, setActivityRecipientDraft] = useState("");
  const [savingActivityReport, setSavingActivityReport] = useState(false);
  const [sendingActivityReport, setSendingActivityReport] = useState(false);
  const [holidayPay, setHolidayPay] = useState<HolidayPay[]>([]);
  const [emailingReport, setEmailingReport] = useState(false);
  type DeletionLogRow = { id: string; time_entry_id: string; employee_user_id: string; job_id: string | null; work_date: string; clock_in_at: string | null; clock_out_at: string | null; total_minutes: number | null; break_minutes: number | null; deleted_by_user_id: string; deleted_by_email: string | null; deleted_by_name: string | null; deletion_reason: string | null; deleted_at: string };
  const [deletionLog, setDeletionLog] = useState<DeletionLogRow[]>([]);
  const [loadingDeletionLog, setLoadingDeletionLog] = useState(false);
  const [selectedAdminJobId, setSelectedAdminJobId] = useState("");
  const [adminActiveEntry, setAdminActiveEntry] = useState<TimeEntry | null>(null);
  const [adminJobLocationCheck, setAdminJobLocationCheck] = useState<LocationCheckState>({ status: "idle", message: "Select a job and refresh GPS before clocking in or out." });
  const [jobPinDraft, setJobPinDraft] = useState<{ jobId: string; latitude: string; longitude: string; accuracy?: number; isLocating: boolean; isSaving: boolean } | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(today().slice(0, 7));
  const [jobSchedules, setJobSchedules] = useState<JobSchedule[]>([]);
  const [scheduleDialog, setScheduleDialog] = useState<{ date: string; editingId?: string } | null>(null);
  const [scheduleForm, setScheduleForm] = useState<{ jobId: string; startTime: string; note: string; durationDays: number }>({ jobId: "", startTime: "", note: "", durationDays: 1 });
  const [savingSchedule, setSavingSchedule] = useState(false);

  useEffect(() => {
    const loadCompanyInfo = async () => {
      if (demoRole() === "admin" || demoRole() === "manager") {
        setUserId(managerOnly ? "demo-manager" : "demo-admin");
        setProfile(managerOnly ? { display_name: "Casey Brooks", phone: "(555) 013-3300", email: "manager@ridgewaydemo.com", company_id: "demo-company", company_name: "Ridgeway Electrical", admin_alert_email: "alerts@ridgewaydemo.com" } : { display_name: "Avery Morgan", phone: "(555) 013-2200", email: "admin@ridgewaydemo.com", company_id: "demo-company", company_name: "Ridgeway Electrical", admin_alert_email: "alerts@ridgewaydemo.com" });
        setCompany({ id: "demo-company", name: "Ridgeway Electrical", contact_email: "admin@ridgewaydemo.com", contact_phone: "(555) 013-2200", admin_alert_email: "alerts@ridgewaydemo.com" });
        setEmployees(demoEmployees);
        setUserRoles(Object.fromEntries(demoUserRoles.map((row) => [row.user_id, row.role])));
        setRoleDrafts(Object.fromEntries(demoUserRoles.map((row) => [row.user_id, row.role])));
        setJobs(demoJobs);
        setJobSchedules([
          { id: "demo-sched-1", job_id: "demo-job-1", company_id: "demo-company", scheduled_date: addDaysIso(today(), 1), start_time: "08:00", note: "Crew kickoff", duration_days: 3 },
          { id: "demo-sched-2", job_id: "demo-job-2", company_id: "demo-company", scheduled_date: addDaysIso(today(), 3), start_time: null, note: null, duration_days: 1 },
        ]);
        setEmployeeAssignments([
          { employee_user_id: "demo-employee-1", job_id: "demo-job-1", assignment_note: "Lead on panel trim" },
          { employee_user_id: "demo-employee-1", job_id: "demo-job-2", assignment_note: null },
          { employee_user_id: "demo-employee-2", job_id: "demo-job-2", assignment_note: "Bring ladder and tester" },
          { employee_user_id: "demo-employee-2", job_id: "demo-job-1", assignment_note: null },
        ]);
        setAdminTimeEntries([
          { id: "demo-admin-entry-1", employee_user_id: "demo-employee-1", job_id: "demo-job-1", work_date: today(), clock_in_at: null, clock_out_at: null, break_minutes: 30, total_minutes: 420, is_saved: true },
          { id: "demo-admin-entry-2", employee_user_id: "demo-employee-2", job_id: "demo-job-2", work_date: today(), clock_in_at: null, clock_out_at: null, break_minutes: 30, total_minutes: 390, is_saved: true },
          { id: "demo-admin-entry-3", employee_user_id: "demo-admin", job_id: "demo-job-1", work_date: today(), clock_in_at: null, clock_out_at: null, break_minutes: 0, total_minutes: 120, is_saved: true },
        ]);
        setPtoBalances({
          "demo-employee-1": { employee_user_id: "demo-employee-1", vacation_enabled: true, vacation_hours: 32, sick_enabled: true, sick_hours: 12, holiday_enabled: true, holiday_hours: 8, day_off_enabled: true, day_off_hours: 16 },
          "demo-employee-2": { employee_user_id: "demo-employee-2", vacation_enabled: true, vacation_hours: 18, sick_enabled: true, sick_hours: 20, holiday_enabled: false, holiday_hours: 0, day_off_enabled: true, day_off_hours: 8 },
        });
        setTimeOffRequests(demoRequests);
        setHolidayPay([{ id: "demo-holiday-1", employee_user_id: "demo-employee-1", holiday_name: "Labor Day", holiday_date: today(), holiday_hours: 8, qualifies: true }]);
        setReportSettings(defaultReportSettings("demo-admin"));
        setPayrollSettings(defaultPayrollSettings("demo-company", "demo-admin", "payroll@ridgewaydemo.com"));
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id;
      if (!currentUserId) {
        navigate(loginPath);
        return;
      }

      // Verify the signed-in user actually holds the required role for this portal.
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUserId)
        .maybeSingle();
      const requiredRole = managerOnly ? "manager" : "admin";
      const actualRole = roleRow?.role ?? null;
      if (actualRole !== requiredRole) {
        // If they have a different real role, send them to the correct portal; otherwise to login.
        if (actualRole === "admin") navigate("/admin");
        else if (actualRole === "manager") navigate("/manager");
        else if (actualRole === "employee") navigate("/employee");
        else navigate(loginPath);
        return;
      }

      setUserId(currentUserId);
      const pendingOnboarding = readPendingAdminOnboarding();
      const [{ data }, { data: employeeData }, { data: roleData }, { data: jobsData }, { data: assignmentData }, { data: entryData }, { data: balanceData }, { data: requestData }, { data: settingsData }, { data: overrideData }, { data: holidayData }, { data: payrollData }, { data: payrollLogData }, { data: scheduleData }] = await Promise.all([
        db.from("profiles").select("display_name, phone, email, company_id, company_name, admin_alert_email").eq("user_id", currentUserId).maybeSingle(),
        db.from("profiles").select("user_id, display_name, email, phone, emergency_contact, hire_date, company_id, company_name").order("display_name"),
        db.from("user_roles").select("user_id, role"),
        db.from("jobs").select("id, job_name, job_description, manager_notes, address, city, state, latitude, longitude, archived_at, scheduled_start_time, late_grace_minutes, scheduled_start_date, estimated_duration").order("job_name"),
        db.from("employee_job_assignments").select("id, employee_user_id, job_id, assignment_note"),
        db.from("time_entries").select("id, employee_user_id, job_id, work_date, clock_in_at, clock_out_at, break_minutes, total_minutes, is_saved, client_sync_id, clock_in_latitude, clock_in_longitude, clock_out_latitude, clock_out_longitude, override_by_admin, override_reason, override_admin_user_id, adjusted_by_admin, adjusted_at, adjusted_admin_user_id, admin_adjustment_note, paid_start_at, is_late, late_minutes").order("work_date", { ascending: false }).limit(5000),
        db.from("employee_pto_balances").select("*"),
        db.from("time_off_requests").select("*").order("created_at", { ascending: false }),
        db.from("company_weekly_report_settings").select("*").eq("admin_user_id", currentUserId).maybeSingle(),
        db.from("employee_weekly_report_overrides").select("*"),
        db.from("employee_holiday_pay").select("id, employee_user_id, holiday_name, holiday_date, holiday_hours, qualifies").order("holiday_date", { ascending: false }),
        db.from("company_payroll_email_settings").select("*").maybeSingle(),
        db.from("payroll_email_send_log").select("*").order("created_at", { ascending: false }).limit(8),
        db.from("job_schedules").select("id, job_id, company_id, scheduled_date, start_time, note, duration_days, created_by, created_at").order("scheduled_date"),
      ]);
      if (data) setProfile({ ...data, admin_alert_email: data.admin_alert_email || data.email || "" });
      if (!managerOnly && pendingOnboarding?.companyName && (!pendingOnboarding.email || pendingOnboarding.email.toLowerCase() === (userData.user.email ?? "").toLowerCase())) {
        setEditing(true);
        setProfile((current) => ({
          ...current,
          display_name: pendingOnboarding.displayName ?? current.display_name,
          company_name: pendingOnboarding.companyName,
          phone: pendingOnboarding.phone ?? current.phone,
          email: pendingOnboarding.contactEmail ?? pendingOnboarding.email ?? current.email,
          admin_alert_email: pendingOnboarding.adminAlertEmail ?? pendingOnboarding.contactEmail ?? pendingOnboarding.email ?? current.admin_alert_email,
        }));
      }
      if (data?.company_id) {
        const { data: companyData } = await db.from("companies").select("id, name, contact_email, contact_phone, admin_alert_email").eq("id", data.company_id).maybeSingle();
        if (companyData) {
          setCompany(companyData);
          setProfile((current) => ({
            ...current,
            company_name: companyData.name,
            email: companyData.contact_email ?? current.email,
            phone: companyData.contact_phone ?? current.phone,
            admin_alert_email: companyData.admin_alert_email ?? current.admin_alert_email,
          }));
        }
      }
      setEmployees(employeeData ?? []);
      const rolesByUser = Object.fromEntries((roleData ?? []).map((row: UserRoleRow) => [row.user_id, row.role]));
      setUserRoles(rolesByUser);
      setRoleDrafts(rolesByUser);
      setJobs(jobsData ?? []);
      setEmployeeAssignments(assignmentData ?? []);
      setAdminTimeEntries(entryData ?? []);
      setAdminActiveEntry((entryData ?? []).find((entry: TimeEntry) => entry.employee_user_id === currentUserId && entry.clock_in_at && !entry.clock_out_at) ?? null);
      setPtoBalances(Object.fromEntries((balanceData ?? []).map((balance: PtoBalance) => [balance.employee_user_id, balance])));
      setTimeOffRequests(requestData ?? []);
      setHolidayPay(holidayData ?? []);
      setReportSettings(settingsData ?? defaultReportSettings(currentUserId));
      setReportOverrides(Object.fromEntries((overrideData ?? []).map((override: WeeklyReportOverride) => [override.employee_user_id, override])));
      setPayrollSettings(payrollData ? { ...payrollData, selected_employee_user_ids: payrollData.selected_employee_user_ids ?? [] } : defaultPayrollSettings(data?.company_id ?? null, currentUserId, data?.admin_alert_email || data?.email || ""));
      setPayrollLogs(payrollLogData ?? []);
      setJobSchedules(scheduleData ?? []);
      if (data?.company_id) {
        const { data: arData } = await db.from("company_activity_report_settings").select("*").eq("company_id", data.company_id).maybeSingle();
        if (arData) setActivityReport({ id: arData.id, company_id: arData.company_id, is_active: arData.is_active, frequency: arData.frequency, recipients: arData.recipients ?? [], last_sent_period_end: arData.last_sent_period_end });
        else setActivityReport({ company_id: data.company_id, is_active: true, frequency: "weekly", recipients: [] });
      }
      setLoading(false);
    };

    loadCompanyInfo();
  }, [navigate, loginPath, managerOnly]);

  useEffect(() => {
    if (!userId || demoRole() === "admin" || demoRole() === "manager") return;
    const channel = supabase
      .channel(`admin-time-entries-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "time_entries" }, (payload) => {
        if (payload.eventType === "DELETE") {
          const oldRow = payload.old as Partial<TimeEntry>;
          if (oldRow.id) setAdminTimeEntries((entries) => entries.filter((entry) => entry.id !== oldRow.id));
          return;
        }
        const nextEntry = payload.new as TimeEntry;
        if (!nextEntry?.id) return;
        setAdminTimeEntries((entries) => [nextEntry, ...entries.filter((entry) => entry.id !== nextEntry.id)]);
        setAdminActiveEntry((current) => nextEntry.employee_user_id === userId ? (nextEntry.clock_in_at && !nextEntry.clock_out_at ? nextEntry : null) : current);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    if (jobForm.id) return;
    const employeeIds = employees.filter((employee) => (userRoles[employee.user_id] ?? "employee") === "employee").map((employee) => employee.user_id);
    setJobAssignmentDraft((current) => ({ ...current, employeeIds }));
  }, [employees, userRoles, jobForm.id]);

  const saveCompanyInfo = async (event?: FormEvent) => {
    event?.preventDefault();
    if (demoRole() === "admin") {
      demoToast();
      setEditing(false);
      return;
    }
    if (!profile.company_name?.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (!isEmail(profile.email) || !isEmail(profile.admin_alert_email)) {
      toast.error("Enter valid email addresses");
      return;
    }

    setSaving(true);
    const pendingOnboarding = readPendingAdminOnboarding();
    const needsFirstSetup = !company?.id || !!pendingOnboarding;
    const setupResult = needsFirstSetup ? await supabase.functions.invoke("complete-admin-onboarding", {
      body: {
        companyName: profile.company_name,
        displayName: profile.display_name || pendingOnboarding?.displayName || undefined,
        phone: profile.phone || pendingOnboarding?.phone || undefined,
        emergencyContact: pendingOnboarding?.emergencyContact || undefined,
        contactEmail: profile.email || pendingOnboarding?.contactEmail || pendingOnboarding?.email || undefined,
        adminAlertEmail: profile.admin_alert_email || pendingOnboarding?.adminAlertEmail || profile.email || undefined,
      },
    }) : await db.from("companies").update({
      name: profile.company_name,
      contact_email: profile.email,
      contact_phone: profile.phone,
      admin_alert_email: profile.admin_alert_email || profile.email,
    }).eq("id", company.id);
    const { data, error } = setupResult;
    setSaving(false);

    if (error) toast.error(needsFirstSetup ? `You are signed in, but company setup did not finish: ${error.message}` : error.message);
    else {
      if (needsFirstSetup) {
        localStorage.removeItem(PENDING_ADMIN_ONBOARDING_KEY);
        const companyId = (data as { companyId?: string } | null)?.companyId ?? profile.company_id ?? "";
        setCompany({ id: companyId, name: profile.company_name ?? "", contact_email: profile.email, contact_phone: profile.phone ?? null, admin_alert_email: profile.admin_alert_email || profile.email });
        setProfile((current) => ({ ...current, company_id: companyId, company_role: "admin" }));
        navigate("/admin", { replace: true });
      } else if (company?.id) setCompany({ ...company, name: profile.company_name ?? company.name, contact_email: profile.email, contact_phone: profile.phone ?? null, admin_alert_email: profile.admin_alert_email || profile.email });
      toast.success("Company information saved");
      setEditing(false);
    }
  };

  const updatePtoBalance = (employeeId: string, updates: Partial<PtoBalance>) => {
    setPtoBalances((current) => ({ ...current, [employeeId]: { ...(current[employeeId] ?? emptyPtoBalance(employeeId)), ...updates } }));
  };

  const updateEmployeeProfile = (employeeId: string, updates: Partial<EmployeeRow>) => {
    setEmployees((current) => current.map((employee) => employee.user_id === employeeId ? { ...employee, ...updates } : employee));
    if (updates.hire_date) {
      updatePtoBalance(employeeId, { pto_accrual_start_date: vacationEligibilityDate(updates.hire_date) });
    }
  };

  const startEmployeeProfileEdit = (employee: EmployeeRow) => {
    setEmployeeDrafts((current) => ({ ...current, [employee.user_id]: current[employee.user_id] ?? employeeProfileDraftFor(employee) }));
    setEditingEmployeeUserId(employee.user_id);
    setExpandedEmployeeId(employee.user_id);
  };

  const sendEmployeePasswordReset = async (employee: EmployeeRow) => {
    if (!employee.email) {
      toast.error("Add an email for this employee first");
      return;
    }
    if (demoRole() === "admin") {
      demoToast();
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(employee.email, {
      redirectTo: `${window.location.origin}/set-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Password reset email sent to ${employee.email}`);
  };

  const openSetPasswordDialog = (employee: EmployeeRow) => {
    if (demoRole() === "admin") { demoToast(); return; }
    setSetPwTarget(employee);
    setSetPwValue("");
    setSetPwConfirm("");
    setSetPwShown(null);
  };

  const generateRandomPassword = () => {
    const groups = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!@#$%&*"];
    const chars = groups.join("");
    const bytes = new Uint8Array(18);
    crypto.getRandomValues(bytes);
    const pw = groups.map((group, index) => group[bytes[index] % group.length]).join("") + Array.from(bytes.slice(groups.length), (b) => chars[b % chars.length]).join("");
    setSetPwValue(pw);
    setSetPwConfirm(pw);
  };

  const submitSetPassword = async () => {
    if (!setPwTarget) return;
    if (setPwValue.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (isWeakPassword(setPwValue)) { toast.error(weakPasswordMessage); return; }
    if (setPwValue !== setPwConfirm) { toast.error("Passwords don't match"); return; }
    setSetPwSaving(true);
    const { data, error } = await supabase.functions.invoke("set-employee-password", {
      body: { target_user_id: setPwTarget.user_id, new_password: setPwValue },
    });
    setSetPwSaving(false);
    let serverError: string | undefined;
    if (error) {
      try {
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          serverError = body?.error || (typeof body?.message === "string" ? body.message : undefined);
        }
      } catch { /* ignore */ }
    }
    if (!serverError && data && typeof data === "object") {
      serverError = (data as { error?: string }).error;
    }
    if (error || serverError) {
      const msg = serverError || error?.message || "Couldn't set password";
      const friendly = /weak|easy to guess|pwned|breached/i.test(msg)
        ? weakPasswordMessage
        : msg;
      toast.error(friendly);
      return;
    }
    setSetPwShown({ email: setPwTarget.email || "", password: setPwValue });
    setSetPwValue("");
    setSetPwConfirm("");
    toast.success("Password updated. Share it privately with the employee.");
  };

  const updateEmployeeDraft = (employeeId: string, updates: Partial<EmployeeProfileDraft>) => {
    const employee = employees.find((item) => item.user_id === employeeId);
    setEmployeeDrafts((current) => ({
      ...current,
      [employeeId]: { ...(current[employeeId] ?? (employee ? employeeProfileDraftFor(employee) : { display_name: "", email: "", phone: "", emergency_contact: "", hire_date: "" })), ...updates },
    }));
  };

  const cancelEmployeeProfileEdit = (employeeId: string) => {
    setEmployeeDrafts((current) => {
      const next = { ...current };
      delete next[employeeId];
      return next;
    });
    setEditingEmployeeUserId("");
  };

  const saveEmployeeProfile = async (employeeId: string) => {
    const draft = employeeDrafts[employeeId];
    if (!draft) return;
    if (!draft.display_name.trim()) {
      toast.error("Employee name is required");
      return;
    }
    if (!isEmail(draft.email)) {
      toast.error("Enter a valid employee email address");
      return;
    }
    if (demoRole() === "admin") {
      demoToast();
      setEditingEmployeeUserId("");
      return;
    }
    const payload = {
      display_name: draft.display_name.trim(),
      email: draft.email.trim() || null,
      phone: draft.phone.trim() || null,
      emergency_contact: draft.emergency_contact.trim() || null,
      hire_date: draft.hire_date || null,
    };
    const { data, error } = await db.from("profiles").update(payload).eq("user_id", employeeId).select("user_id, display_name, email, phone, emergency_contact, hire_date, company_id, company_name").single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmployees((current) => current.map((employee) => employee.user_id === employeeId ? data : employee));
    setEmployeeDrafts((current) => ({ ...current, [employeeId]: employeeProfileDraftFor(data) }));
    setEditingEmployeeUserId("");
    if (payload.hire_date) updatePtoBalance(employeeId, { pto_accrual_start_date: vacationEligibilityDate(payload.hire_date) });
    toast.success("Employee profile saved");
  };

  const confirmDeleteEmployee = async () => {
    if (!pendingEmployeeDelete) return;
    const employeeId = pendingEmployeeDelete.user_id;
    if (demoRole() === "admin") {
      demoToast();
      setPendingEmployeeDelete(null);
      return;
    }
    setDeletingEmployee(true);
    const { error } = await supabase.functions.invoke("delete-employee", { body: { employeeUserId: employeeId } });
    setDeletingEmployee(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmployees((current) => current.filter((employee) => employee.user_id !== employeeId));
    setEmployeeAssignments((current) => current.filter((assignment) => assignment.employee_user_id !== employeeId));
    setAdminTimeEntries((current) => current.filter((entry) => entry.employee_user_id !== employeeId));
    setTimeOffRequests((current) => current.filter((request) => request.employee_user_id !== employeeId));
    setHolidayPay((current) => current.filter((holiday) => holiday.employee_user_id !== employeeId));
    setPtoBalances((current) => {
      const next = { ...current };
      delete next[employeeId];
      return next;
    });
    setUserRoles((current) => {
      const next = { ...current };
      delete next[employeeId];
      return next;
    });
    setReportOverrides((current) => {
      const next = { ...current };
      delete next[employeeId];
      return next;
    });
    if (expandedEmployeeId === employeeId) setExpandedEmployeeId("");
    setPendingEmployeeDelete(null);
    toast.success("Employee deleted");
  };

  const saveUserRole = async (targetUserId: string) => {
    const nextRole = roleDrafts[targetUserId];
    if (!nextRole) {
      toast.error("Select a role before saving");
      return;
    }
    const currentRole = userRoles[targetUserId] ?? "employee";
    if (currentRole === nextRole) {
      setEditingRoleUserId("");
      return;
    }
    const adminCount = Object.values(userRoles).filter((role) => role === "admin").length;
    if (currentRole === "admin" && nextRole !== "admin" && adminCount <= 1) {
      toast.error(lastAdminErrorMessage);
      return;
    }
    setPendingRoleChange({ targetUserId, currentRole, nextRole });
  };

  const confirmSaveUserRole = async () => {
    if (!pendingRoleChange) return;
    const { targetUserId, nextRole } = pendingRoleChange;
    if (demoRole() === "admin") {
      demoToast();
      setEditingRoleUserId("");
      setPendingRoleChange(null);
      return;
    }

    const { data, error } = await db.rpc("set_user_role", { _target_user_id: targetUserId, _role: nextRole });
    if (error) {
      setPendingRoleChange(null);
      toast.error(error.message);
    } else {
      const savedRole = (data?.role ?? nextRole) as AppRole;
      setUserRoles((current) => ({ ...current, [targetUserId]: savedRole }));
      setRoleDrafts((current) => ({ ...current, [targetUserId]: savedRole }));
      setEditingRoleUserId("");
      setPendingRoleChange(null);
      toast.success("User role saved");
    }
  };

  const cancelUserRoleEdit = (targetUserId: string) => {
    setRoleDrafts((current) => ({ ...current, [targetUserId]: userRoles[targetUserId] ?? "employee" }));
    setEditingRoleUserId("");
  };

  const editJob = (job: Job) => {
    setJobForm({
      id: job.id,
      job_name: job.job_name,
      job_description: job.job_description ?? "",
      address: job.address,
      city: job.city,
      state: job.state,
      latitude: job.latitude?.toString() ?? "",
      longitude: job.longitude?.toString() ?? "",
      scheduled_start_time: job.scheduled_start_time ? job.scheduled_start_time.slice(0, 5) : "",
      late_grace_minutes: (job.late_grace_minutes ?? 0).toString(),
      scheduled_start_date: job.scheduled_start_date ?? "",
      estimated_duration: job.estimated_duration ?? "",
    });
    const jobAssignments = employeeAssignments.filter((assignment) => assignment.job_id === job.id);
    setJobAssignmentDraft({
      employeeIds: jobAssignments.map((assignment) => assignment.employee_user_id),
      notes: Object.fromEntries(jobAssignments.map((assignment) => [assignment.employee_user_id, assignment.assignment_note ?? ""])),
    });
  };

  const scrollToJobForm = () => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      const input = document.querySelector<HTMLInputElement>('[data-job-name-input="true"]');
      if (input) {
        input.scrollIntoView({ behavior: "smooth", block: "center" });
        try { input.focus({ preventScroll: true }); } catch { input.focus(); }
      }
    });
  };

  const useCurrentLocationForJob = () => {
    if (!navigator.geolocation) {
      toast.error("GPS is not available on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => setJobForm((current) => ({ ...current, latitude: position.coords.latitude.toFixed(6), longitude: position.coords.longitude.toFixed(6) })),
      () => toast.error("Allow location access to set the GPS pin"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  };

  const saveJob = async (event: FormEvent) => {
    event.preventDefault();
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      return;
    }
    if (managerOnly && !jobForm.id) {
      toast.error("Managers can adjust existing GPS pins, but cannot create new jobs");
      return;
    }
    const latitude = Number(jobForm.latitude);
    const longitude = Number(jobForm.longitude);
    if (!jobForm.job_name.trim() || !jobForm.address.trim() || !jobForm.city.trim() || !jobForm.state.trim()) {
      toast.error("Enter the job name and address details");
      return;
    }
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      toast.error("Enter a valid GPS pin latitude and longitude");
      return;
    }
    const isNewJob = !jobForm.id;
    const sched = (jobForm.scheduled_start_time ?? "").trim();
    const graceParsed = parseInt(jobForm.late_grace_minutes ?? "0", 10);
    const startDate = (jobForm.scheduled_start_date ?? "").trim();
    const duration = (jobForm.estimated_duration ?? "").trim();
    const payload = { job_name: jobForm.job_name.trim(), job_description: jobForm.job_description.trim() || "GPS protected job", address: jobForm.address.trim(), city: jobForm.city.trim(), state: jobForm.state.trim(), latitude, longitude, company_id: company?.id ?? profile.company_id ?? null, scheduled_start_time: sched ? sched : null, late_grace_minutes: Number.isFinite(graceParsed) && graceParsed >= 0 ? graceParsed : 0, scheduled_start_date: startDate ? startDate : null, estimated_duration: duration ? duration : null };
    const query = jobForm.id ? db.from("jobs").update(payload).eq("id", jobForm.id).select("id, job_name, job_description, manager_notes, address, city, state, latitude, longitude, archived_at, scheduled_start_time, late_grace_minutes, scheduled_start_date, estimated_duration").single() : db.from("jobs").insert(payload).select("id, job_name, job_description, manager_notes, address, city, state, latitude, longitude, archived_at, scheduled_start_time, late_grace_minutes, scheduled_start_date, estimated_duration").single();
    const { data, error } = await query;
    if (error) toast.error(error.message);
    else {
      setJobs((current) => [data, ...current.filter((job) => job.id !== data.id)]);
      await saveJobAssignments(data.id, jobAssignmentDraft);
      setJobForm(emptyJobForm());
      setJobAssignmentDraft({ employeeIds: [], notes: {} });
      if (isNewJob) {
        toast.success("Job saved — ready to add the next one");
        setTimeout(() => {
          const nameInput = document.querySelector<HTMLInputElement>('input[data-job-name-input="true"]');
          nameInput?.focus();
          nameInput?.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 50);
      } else {
        toast.success("Job updated");
      }
    }
  };

  const updateManagerDraft = (job: Job) => {
    setManagerJobDrafts((current) => ({ ...current, [job.id]: { manager_notes: job.manager_notes ?? "", latitude: job.latitude?.toString() ?? "", longitude: job.longitude?.toString() ?? "" } }));
  };

  const saveManagerJob = async (job: Job) => {
    const draft = managerJobDrafts[job.id] ?? { manager_notes: job.manager_notes ?? "", latitude: job.latitude?.toString() ?? "", longitude: job.longitude?.toString() ?? "" };
    if (draft.manager_notes.length > 1000) {
      toast.error("Manager notes must be 1000 characters or less");
      return;
    }
    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      toast.error("Enter a valid GPS pin latitude and longitude");
      return;
    }
    if (demoRole() === "manager") {
      demoToast();
      return;
    }
    const { data, error } = await db.from("jobs").update({ manager_notes: draft.manager_notes.trim() || null, latitude, longitude }).eq("id", job.id).select("id, job_name, job_description, manager_notes, address, city, state, latitude, longitude, archived_at, scheduled_start_time, late_grace_minutes, scheduled_start_date, estimated_duration").single();
    if (error) toast.error(error.message);
    else {
      setJobs((current) => current.map((item) => item.id === data.id ? data : item));
      toast.success("Job notes and GPS pin saved");
    }
  };

  const startJobPinEdit = (job: Job) => {
    setSelectedAdminJobId(job.id);
    setJobPinDraft({
      jobId: job.id,
      latitude: job.latitude?.toString() ?? "",
      longitude: job.longitude?.toString() ?? "",
      accuracy: undefined,
      isLocating: false,
      isSaving: false,
    });
  };

  const setSelectedJobPinHere = (job: Job) => {
    if (!navigator.geolocation) {
      toast.error("GPS is not available on this device");
      return;
    }
    setSelectedAdminJobId(job.id);
    setJobPinDraft((current) => ({
      jobId: job.id,
      latitude: current?.jobId === job.id ? current.latitude : job.latitude?.toString() ?? "",
      longitude: current?.jobId === job.id ? current.longitude : job.longitude?.toString() ?? "",
      accuracy: current?.jobId === job.id ? current.accuracy : undefined,
      isLocating: true,
      isSaving: false,
    }));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setJobPinDraft({
          jobId: job.id,
          latitude: position.coords.latitude.toFixed(6),
          longitude: position.coords.longitude.toFixed(6),
          accuracy: position.coords.accuracy,
          isLocating: false,
          isSaving: false,
        });
        toast.success("Current location captured");
      },
      () => {
        setJobPinDraft((current) => current?.jobId === job.id ? { ...current, isLocating: false } : current);
        toast.error("Allow location access to set the GPS pin");
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  const saveSelectedJobPin = async (job: Job) => {
    const draft = jobPinDraft?.jobId === job.id ? jobPinDraft : null;
    if (!draft) return;
    const latitude = Number(draft.latitude);
    const longitude = Number(draft.longitude);
    if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
      toast.error("Enter a valid GPS pin latitude and longitude");
      return;
    }
    const accuracyText = draft.accuracy ? ` Accuracy: ${Math.round(draft.accuracy)} meters.` : "";
    if (!window.confirm(`Save this GPS pin for ${job.job_name}?\n\nLatitude: ${latitude.toFixed(6)}\nLongitude: ${longitude.toFixed(6)}\n${accuracyText}`)) {
      return;
    }
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      setJobPinDraft(null);
      return;
    }
    setJobPinDraft((current) => current?.jobId === job.id ? { ...current, isSaving: true } : current);
    const { data, error } = await db.from("jobs").update({ latitude, longitude }).eq("id", job.id).select("id, job_name, job_description, manager_notes, address, city, state, latitude, longitude, archived_at, scheduled_start_time, late_grace_minutes, scheduled_start_date, estimated_duration").single();
    if (error) {
      setJobPinDraft((current) => current?.jobId === job.id ? { ...current, isSaving: false } : current);
      toast.error(error.message);
    } else {
      setJobs((current) => current.map((item) => item.id === data.id ? data : item));
      setJobForm((current) => current.id === data.id ? { ...current, latitude: data.latitude?.toString() ?? "", longitude: data.longitude?.toString() ?? "" } : current);
      setManagerJobDrafts((current) => ({ ...current, [data.id]: { manager_notes: current[data.id]?.manager_notes ?? data.manager_notes ?? "", latitude: data.latitude?.toString() ?? "", longitude: data.longitude?.toString() ?? "" } }));
      setAdminJobLocationCheck({ status: "idle", message: "GPS pin updated. Check GPS before clocking in or out." });
      setJobPinDraft(null);
      toast.success("Job GPS pin updated");
    }
  };

  const unarchiveJob = async (job: Job) => {
    if (demoRole() === "admin") {
      demoToast();
      return;
    }
    const { data, error } = await db
      .from("jobs")
      .update({ archived_at: null })
      .eq("id", job.id)
      .select("id, job_name, job_description, manager_notes, address, city, state, latitude, longitude, archived_at, scheduled_start_time, late_grace_minutes, scheduled_start_date, estimated_duration")
      .single();
    if (error) toast.error(error.message);
    else {
      setJobs((current) => current.map((item) => item.id === data.id ? data : item));
      toast.success("Job reopened");
    }
  };

  const completeJob = async (job: Job) => {
    if (!window.confirm(`Mark "${job.job_name}" complete?\n\nEmployees won't be able to clock in until it's reopened.`)) return;
    if (demoRole() === "admin") {
      demoToast();
      return;
    }
    const { data, error } = await db
      .from("jobs")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", job.id)
      .select("id, job_name, job_description, manager_notes, address, city, state, latitude, longitude, archived_at, scheduled_start_time, late_grace_minutes, scheduled_start_date, estimated_duration")
      .single();
    if (error) { toast.error(error.message); return; }
    setJobs((current) => current.map((item) => item.id === data.id ? data : item));
    toast.success("Job marked complete");

    // Detect early completion → propose pulling the next scheduled job forward.
    const todayIso = today();
    const derivedEnd = deriveJobEndDate(job.scheduled_start_date, job.estimated_duration);
    const daysSaved = derivedEnd ? Math.floor((new Date(`${derivedEnd}T00:00:00`).getTime() - new Date(`${todayIso}T00:00:00`).getTime()) / 86400000) : 0;
    if (daysSaved >= 1) {
      const nextJob = jobs
        .filter((other) => other.id !== job.id && !other.archived_at && other.scheduled_start_date && other.scheduled_start_date > todayIso)
        .sort((a, b) => (a.scheduled_start_date ?? "") < (b.scheduled_start_date ?? "") ? -1 : 1)[0];
      if (nextJob && nextJob.scheduled_start_date) {
        const newStart = addDaysIso(nextJob.scheduled_start_date, -daysSaved);
        const safeNewStart = newStart < todayIso ? todayIso : newStart;
        setPendingReschedule({ completedJob: job, nextJob, daysSaved, newStartDate: safeNewStart });
      }
    }
  };

  const applyReschedule = async () => {
    if (!pendingReschedule) return;
    setReschedulingJob(true);
    const { nextJob, completedJob, daysSaved, newStartDate } = pendingReschedule;
    const oldStart = nextJob.scheduled_start_date;
    const { data, error } = await db
      .from("jobs")
      .update({ scheduled_start_date: newStartDate })
      .eq("id", nextJob.id)
      .select("id, job_name, job_description, manager_notes, address, city, state, latitude, longitude, archived_at, scheduled_start_time, late_grace_minutes, scheduled_start_date, estimated_duration")
      .single();
    if (error) {
      toast.error(error.message);
      setReschedulingJob(false);
      return;
    }
    setJobs((current) => current.map((item) => item.id === data.id ? data : item));
    toast.success(`${nextJob.job_name} moved to ${formatDate(newStartDate)}`);
    setPendingReschedule(null);
    setReschedulingJob(false);

    // Fire-and-forget admin email alert.
    const companyId = company?.id ?? profile.company_id ?? null;
    if (companyId) {
      try {
        await supabase.functions.invoke("send-job-reschedule-alert", {
          body: {
            companyId,
            completedJobName: completedJob.job_name,
            completedJobAddress: `${completedJob.address}, ${completedJob.city}, ${completedJob.state}`,
            rescheduledJobName: nextJob.job_name,
            rescheduledJobAddress: `${nextJob.address}, ${nextJob.city}, ${nextJob.state}`,
            oldStartDate: oldStart,
            newStartDate,
            daysSaved,
          },
        });
      } catch (err) {
        console.error("reschedule alert email failed", err);
      }
    }
  };

  const deleteJob = (job: Job) => {
    if (managerOnly) return;
    setArchiveConfirmText("");
    setPendingArchiveJob(job);
  };

  const confirmArchiveJob = async () => {
    const job = pendingArchiveJob;
    if (!job || managerOnly) return;
    if (archiveConfirmText.trim() !== "DELETE") return;
    if (demoRole() === "admin") {
      demoToast();
      setPendingArchiveJob(null);
      return;
    }
    setArchivingJob(true);
    const archivedAt = new Date().toISOString();
    const { error } = await db
      .from("jobs")
      .update({ archived_at: archivedAt, archived_by: userId ?? null })
      .eq("id", job.id);
    setArchivingJob(false);
    if (error) { toast.error(error.message); return; }
    setJobs((current) => current.map((item) => item.id === job.id ? { ...item, archived_at: archivedAt, archived_by: userId ?? null } : item));
    setSelectedAdminJobId((current) => (current === job.id ? null : current));
    if (jobForm.id === job.id) {
      setJobForm(emptyJobForm());
    }
    setPendingArchiveJob(null);
    setArchiveConfirmText("");
    toast.success("Job archived");
  };

  const openScheduleDialog = (dateIso: string) => {
    const todayIso = today();
    if (dateIso < todayIso) {
      toast.error("Pick today or a future date");
      return;
    }
    setScheduleForm({ jobId: "", startTime: "", note: "", durationDays: 1 });
    setScheduleDialog({ date: dateIso });
  };

  const openEditScheduleDialog = (entry: JobSchedule) => {
    setScheduleForm({
      jobId: entry.job_id,
      startTime: entry.start_time ? entry.start_time.slice(0, 5) : "",
      note: entry.note ?? "",
      durationDays: Math.max(1, entry.duration_days ?? 1),
    });
    setScheduleDialog({ date: entry.scheduled_date, editingId: entry.id });
  };

  const saveJobSchedule = async () => {
    if (!scheduleDialog) return;
    if (!scheduleForm.jobId) { toast.error("Pick a job"); return; }
    const dateIso = scheduleDialog.date;
    const editingId = scheduleDialog.editingId;
    if (jobSchedules.some((s) => s.job_id === scheduleForm.jobId && s.scheduled_date === dateIso && s.id !== editingId)) {
      toast.error("That job is already queued on this date");
      return;
    }
    setSavingSchedule(true);
    const durationDays = Math.max(1, Math.floor(scheduleForm.durationDays || 1));

    if (editingId) {
      const patch = {
        scheduled_date: dateIso,
        start_time: scheduleForm.startTime || null,
        note: scheduleForm.note.trim() || null,
        duration_days: durationDays,
      };
      if (demoRole() === "admin" || demoRole() === "manager") {
        setJobSchedules((current) => current.map((s) => s.id === editingId ? { ...s, ...patch } : s));
        setSavingSchedule(false);
        setScheduleDialog(null);
        demoToast();
        return;
      }
      const { data, error } = await db.from("job_schedules").update(patch).eq("id", editingId).select("id, job_id, company_id, scheduled_date, start_time, note, duration_days, created_by, created_at").single();
      setSavingSchedule(false);
      if (error) { toast.error(error.message); return; }
      if (data) setJobSchedules((current) => current.map((s) => s.id === editingId ? data : s));
      setScheduleDialog(null);
      toast.success("Schedule updated");
      return;
    }

    if (demoRole() === "admin" || demoRole() === "manager") {
      const next: JobSchedule = {
        id: `demo-sched-${Date.now()}`,
        job_id: scheduleForm.jobId,
        company_id: company?.id ?? "demo-company",
        scheduled_date: dateIso,
        start_time: scheduleForm.startTime || null,
        note: scheduleForm.note.trim() || null,
        duration_days: durationDays,
      };
      setJobSchedules((current) => [...current, next]);
      setSavingSchedule(false);
      setScheduleDialog(null);
      demoToast();
      return;
    }
    const payload = {
      job_id: scheduleForm.jobId,
      company_id: company?.id ?? profile.company_id ?? null,
      scheduled_date: dateIso,
      start_time: scheduleForm.startTime || null,
      note: scheduleForm.note.trim() || null,
      duration_days: durationDays,
      created_by: userId || null,
    };
    const { data, error } = await db.from("job_schedules").insert(payload).select("id, job_id, company_id, scheduled_date, start_time, note, duration_days, created_by, created_at").single();
    setSavingSchedule(false);
    if (error) { toast.error(error.message); return; }
    if (data) setJobSchedules((current) => [...current, data]);
    setScheduleDialog(null);
    toast.success(durationDays > 1 ? `Job queued across ${durationDays} days` : "Job queued on the schedule");
  };

  const removeJobSchedule = async (entry: JobSchedule) => {
    if (!window.confirm("Remove this scheduled job from the calendar?")) return;
    if (demoRole() === "admin" || demoRole() === "manager") {
      setJobSchedules((current) => current.filter((s) => s.id !== entry.id));
      demoToast();
      return;
    }
    const { error } = await db.from("job_schedules").delete().eq("id", entry.id);
    if (error) { toast.error(error.message); return; }
    setJobSchedules((current) => current.filter((s) => s.id !== entry.id));
    toast.success("Removed from schedule");
  };

  const saveManagerAssignment = async (employeeId: string) => {
    const nextJobId = managerAssignmentDrafts[employeeId];
    if (!nextJobId) {
      toast.error("Choose a job before saving");
      return;
    }
    if (demoRole() === "manager") {
      demoToast();
      return;
    }
    const existing = employeeAssignments.find((assignment) => assignment.employee_user_id === employeeId);
    const query = existing ? db.from("employee_job_assignments").update({ job_id: nextJobId }).eq("id", existing.id).select("employee_user_id, job_id, id, assignment_note").single() : db.from("employee_job_assignments").insert({ employee_user_id: employeeId, job_id: nextJobId }).select("employee_user_id, job_id, id, assignment_note").single();
    const { data, error } = await query;
    if (error) toast.error(error.message);
    else {
      setEmployeeAssignments((current) => [data, ...current.filter((assignment) => assignment.employee_user_id !== employeeId)]);
      toast.success("Employee assignment saved");
    }
  };



  const toggleJobAssignmentEmployee = (employeeId: string, checked: boolean) => {
    setJobAssignmentDraft((current) => ({
      employeeIds: checked ? Array.from(new Set([...current.employeeIds, employeeId])) : current.employeeIds.filter((id) => id !== employeeId),
      notes: current.notes,
    }));
  };

  const toggleAllJobAssignmentEmployees = (checked: boolean) => {
    setJobAssignmentDraft((current) => ({
      ...current,
      employeeIds: checked ? assignableEmployees.map((employee) => employee.user_id) : [],
    }));
  };

  const saveJobAssignments = async (jobId: string, draft = jobAssignmentDraft) => {
    if (!jobId) {
      toast.error("Save the job before assigning employees");
      return false;
    }
    if (Object.values(draft.notes).some((note) => note.length > 1000)) {
      toast.error("Job-specific notes must be 1000 characters or less");
      return false;
    }
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      return true;
    }

    const keepIds = new Set(draft.employeeIds);
    const assignableEmployeeIds = new Set(assignableEmployees.map((employee) => employee.user_id));
    const existingForJob = employeeAssignments.filter((assignment) => assignment.job_id === jobId);
    const removeIds = existingForJob.filter((assignment) => assignableEmployeeIds.has(assignment.employee_user_id) && !keepIds.has(assignment.employee_user_id)).map((assignment) => assignment.id).filter(Boolean);
    if (removeIds.length) {
      const { error: deleteError } = await db.from("employee_job_assignments").delete().in("id", removeIds);
      if (deleteError) {
        toast.error(deleteError.message);
        return false;
      }
    }

    let savedAssignments: EmployeeAssignment[] = [];
    if (draft.employeeIds.length) {
      const payload = draft.employeeIds.map((employeeId) => ({
        employee_user_id: employeeId,
        job_id: jobId,
        assignment_note: draft.notes[employeeId]?.trim() || null,
      }));
      const { data, error } = await db.from("employee_job_assignments").upsert(payload, { onConflict: "employee_user_id,job_id" }).select("id, employee_user_id, job_id, assignment_note");
      if (error) {
        toast.error(error.message);
        return false;
      }
      savedAssignments = data ?? [];
    }

    setEmployeeAssignments((current) => [
      ...current.filter((assignment) => assignment.job_id !== jobId || !assignableEmployeeIds.has(assignment.employee_user_id)),
      ...savedAssignments,
    ]);
    toast.success("Job assignments saved");
    return true;
  };

  const startEmployeeAssignmentEdit = (employeeId: string) => {
    setEmployeeAssignmentDrafts((current) => ({ ...current, [employeeId]: assignedJobsFor(employeeId).map((job) => job.id) }));
    setEditingAssignmentUserId(employeeId);
  };

  const cancelEmployeeAssignmentEdit = (employeeId: string) => {
    setEmployeeAssignmentDrafts((current) => {
      const next = { ...current };
      delete next[employeeId];
      return next;
    });
    setEditingAssignmentUserId("");
  };

  const toggleEmployeeAssignmentJob = (employeeId: string, jobId: string, checked: boolean) => {
    setEmployeeAssignmentDrafts((current) => {
      const currentIds = current[employeeId] ?? assignedJobsFor(employeeId).map((job) => job.id);
      return { ...current, [employeeId]: checked ? Array.from(new Set([...currentIds, jobId])) : currentIds.filter((id) => id !== jobId) };
    });
  };

  const saveEmployeeJobAssignments = async (employeeId: string) => {
    const selectedIds = employeeAssignmentDrafts[employeeId] ?? [];
    if (demoRole() === "admin") {
      demoToast();
      setEditingAssignmentUserId("");
      return;
    }
    const existingForEmployee = employeeAssignments.filter((assignment) => assignment.employee_user_id === employeeId);
    const keepIds = new Set(selectedIds);
    const removeIds = existingForEmployee.filter((assignment) => !keepIds.has(assignment.job_id)).map((assignment) => assignment.id).filter(Boolean);
    if (removeIds.length) {
      const { error } = await db.from("employee_job_assignments").delete().in("id", removeIds);
      if (error) {
        toast.error(error.message);
        return;
      }
    }
    let savedAssignments: EmployeeAssignment[] = [];
    if (selectedIds.length) {
      const { data, error } = await db.from("employee_job_assignments").upsert(selectedIds.map((jobId) => ({ employee_user_id: employeeId, job_id: jobId })), { onConflict: "employee_user_id,job_id" }).select("id, employee_user_id, job_id, assignment_note");
      if (error) {
        toast.error(error.message);
        return;
      }
      savedAssignments = data ?? [];
    }
    setEmployeeAssignments((current) => [...current.filter((assignment) => assignment.employee_user_id !== employeeId), ...savedAssignments]);
    setEditingAssignmentUserId("");
    toast.success("Employee job assignments saved");
  };

  const saveEmployeeAssignmentsFromProfile = async (employeeId: string) => {
    const selectedJobId = managerAssignmentDrafts[employeeId];
    if (!selectedJobId) {
      toast.error("Choose a job before saving");
      return;
    }
    const job = jobs.find((item) => item.id === selectedJobId);
    if (!job) {
      toast.error("Choose a valid job");
      return;
    }
    const existingForJob = employeeAssignments.filter((assignment) => assignment.job_id === selectedJobId);
    const draft = {
      employeeIds: Array.from(new Set([...existingForJob.map((assignment) => assignment.employee_user_id), employeeId])),
      notes: Object.fromEntries(existingForJob.map((assignment) => [assignment.employee_user_id, assignment.assignment_note ?? ""])),
    };
    const saved = await saveJobAssignments(selectedJobId, draft);
    if (saved) setManagerAssignmentDrafts((current) => ({ ...current, [employeeId]: selectedJobId }));
  };

  const toggleAddEmployeeJob = (jobId: string, checked: boolean) => {
    setAddEmployeeForm((current) => ({
      ...current,
      jobIds: checked ? Array.from(new Set([...current.jobIds, jobId])) : current.jobIds.filter((id) => id !== jobId),
    }));
  };

  const saveNewEmployee = async (event?: FormEvent) => {
    event?.preventDefault();
    const parsed = addEmployeeSchema.safeParse(addEmployeeForm);
    if (!parsed.success) {
      const message = Object.values(parsed.error.flatten().fieldErrors).flat()[0] ?? "Check employee details";
      toast.error(message);
      return;
    }
    const validJobIds = new Set(jobs.map((job) => job.id));
    if (parsed.data.jobIds.some((jobId) => !validJobIds.has(jobId))) {
      toast.error("Choose valid company jobs");
      return;
    }
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      setAddingEmployee(false);
      setAddEmployeeForm(emptyAddEmployeeForm());
      return;
    }

    setSavingEmployee(true);
    const { data, error } = await supabase.functions.invoke("invite-user", {
      body: {
        email: parsed.data.email,
        displayName: parsed.data.displayName,
        role: "employee",
        phone: parsed.data.phone || null,
        emergencyContact: parsed.data.emergencyContact || null,
        employeePin: parsed.data.pinMode === "temporary" ? parsed.data.temporaryPin : null,
        jobIds: parsed.data.jobIds,
        origin: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });
    setSavingEmployee(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const result = data as { userId: string; profile?: EmployeeRow; assignments?: EmployeeAssignment[]; role?: AppRole; error?: string } | null;
    if (result?.error || !result?.userId) {
      toast.error(result?.error ?? "Unable to add employee");
      return;
    }
    const nextEmployee: EmployeeRow = result.profile ?? {
      user_id: result.userId,
      display_name: parsed.data.displayName,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      emergency_contact: parsed.data.emergencyContact || null,
      company_id: profile.company_id ?? company?.id ?? null,
      company_name: profile.company_name ?? company?.name ?? null,
    };
    setEmployees((current) => [nextEmployee, ...current.filter((employee) => employee.user_id !== result.userId)]);
    setUserRoles((current) => ({ ...current, [result.userId]: result.role ?? "employee" }));
    setRoleDrafts((current) => ({ ...current, [result.userId]: result.role ?? "employee" }));
    setEmployeeAssignments((current) => [
      ...(result.assignments ?? parsed.data.jobIds.map((jobId) => ({ employee_user_id: result.userId, job_id: jobId }))),
      ...current.filter((assignment) => assignment.employee_user_id !== result.userId),
    ]);
    setAddingEmployee(false);
    setAddEmployeeForm(emptyAddEmployeeForm());
    toast.success("Employee added and invite sent");
  };

  const saveManagerEntry = async (entry: TimeEntry) => {
    const draft = managerEntryDrafts[entry.id];
    if (!draft) return;
    const breakMinutes = Number(draft.break_minutes);
    const totalMinutes = Math.round(Number(draft.total_hours) * 60);
    if (!Number.isFinite(breakMinutes) || breakMinutes < 0 || !Number.isFinite(totalMinutes) || totalMinutes < 0) {
      toast.error("Enter valid hour adjustments");
      return;
    }
    if (demoRole() === "manager") {
      demoToast();
      return;
    }
    const { data, error } = await db.from("time_entries").update({ break_minutes: breakMinutes, total_minutes: totalMinutes, is_saved: true }).eq("id", entry.id).select("*").single();
    if (error) toast.error(error.message);
    else {
      setAdminTimeEntries((entries) => entries.map((item) => item.id === data.id ? data : item));
      toast.success("Hours saved");
    }
  };

  const localToIsoForInput = (local: string) => local ? new Date(local).toISOString() : "";
  const isoToLocalInput = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const adminOverrideClockOut = async () => {
    const entry = overrideClockOutTarget;
    if (!entry) return;
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      setOverrideClockOutTarget(null);
      return;
    }
    const nowIso = new Date().toISOString();
    const { data, error } = await db.from("time_entries").update({
      clock_out_at: nowIso,
      is_saved: true,
      override_by_admin: true,
      override_reason: overrideClockOutReason || "Admin override — GPS bypassed",
      override_admin_user_id: userId,
    }).eq("id", entry.id).select("*").single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setAdminTimeEntries((entries) => entries.map((item) => item.id === data.id ? data : item));
    toast.success(`Clocked out ${employeeLabel(entry.employee_user_id)} (override)`);
    setOverrideClockOutTarget(null);
    setOverrideClockOutReason("Admin override — GPS bypassed");
  };

  const adminOverrideClockIn = async () => {
    const { employee_user_id, job_id, reason } = overrideClockInForm;
    if (!employee_user_id || !job_id) {
      toast.error("Choose an employee and a job");
      return;
    }
    const existingActive = adminTimeEntries.find((entry) => entry.employee_user_id === employee_user_id && entry.clock_in_at && !entry.clock_out_at);
    if (existingActive) {
      toast.error("Employee is already clocked into a job. Clock them out first.");
      return;
    }
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      return;
    }
    const nowIso = new Date().toISOString();
    const { data, error } = await db.from("time_entries").insert({
      employee_user_id,
      job_id,
      work_date: today(),
      clock_in_at: nowIso,
      break_minutes: 0,
      total_minutes: 0,
      is_saved: false,
      override_by_admin: true,
      override_reason: reason || "Admin override — GPS bypassed",
      override_admin_user_id: userId,
    }).select("*").single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setAdminTimeEntries((entries) => [data, ...entries]);
    toast.success(`Clocked in ${employeeLabel(employee_user_id)} (override)`);
    emitHoursWarnings(checkHoursWarnings({ entries: adminTimeEntries, employeeUserId: employee_user_id, workDate: today(), newMinutes: 0, newClockInAt: nowIso }), employeeLabel(employee_user_id));
    setOverrideClockInOpen(false);
    setOverrideClockInForm({ employee_user_id: "", job_id: "", reason: "Admin override — GPS bypassed" });
  };

  const openMissedClockInDialog = () => {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
    // format for datetime-local input (local time, no seconds)
    const pad = (n: number) => String(n).padStart(2, "0");
    const defaultLocal = `${eightHoursAgo.getFullYear()}-${pad(eightHoursAgo.getMonth() + 1)}-${pad(eightHoursAgo.getDate())}T${pad(eightHoursAgo.getHours())}:${pad(eightHoursAgo.getMinutes())}`;
    setMissedClockInForm({ employee_user_id: "", job_id: "", clock_in_at: defaultLocal, reason: "Admin fix — missed clock-in" });
    setMissedClockInOpen(true);
  };

  const submitMissedClockIn = async () => {
    const { employee_user_id, job_id, clock_in_at, reason } = missedClockInForm;
    if (!employee_user_id || !job_id) {
      toast.error("Choose an employee and a job");
      return;
    }
    if (!clock_in_at) {
      toast.error("Choose a clock-in date and time");
      return;
    }
    const clockInDate = new Date(clock_in_at);
    if (Number.isNaN(clockInDate.getTime())) {
      toast.error("Invalid clock-in date or time");
      return;
    }
    if (clockInDate.getTime() > Date.now()) {
      toast.error("Clock-in time can't be in the future");
      return;
    }
    const existingActive = adminTimeEntries.find((entry) => entry.employee_user_id === employee_user_id && entry.clock_in_at && !entry.clock_out_at);
    if (existingActive) {
      toast.error("Employee already has an open clock-in. Clock them out first.");
      return;
    }
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      setMissedClockInOpen(false);
      return;
    }
    const clockInIso = clockInDate.toISOString();
    const workDate = `${clockInDate.getFullYear()}-${String(clockInDate.getMonth() + 1).padStart(2, "0")}-${String(clockInDate.getDate()).padStart(2, "0")}`;
    const nowIso = new Date().toISOString();
    const note = reason || "Admin fix — missed clock-in";
    const { data, error } = await db.from("time_entries").insert({
      employee_user_id,
      job_id,
      work_date: workDate,
      clock_in_at: clockInIso,
      break_minutes: 30,
      total_minutes: 0,
      is_saved: false,
      override_by_admin: true,
      override_reason: note,
      override_admin_user_id: userId,
      adjusted_by_admin: true,
      adjusted_at: nowIso,
      adjusted_admin_user_id: userId,
      admin_adjustment_note: note,
    }).select("*").single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setAdminTimeEntries((entries) => [data, ...entries]);
    toast.success(`Clocked in ${employeeLabel(employee_user_id)} at the corrected time`);
    emitHoursWarnings(checkHoursWarnings({ entries: adminTimeEntries, employeeUserId: employee_user_id, workDate, newMinutes: 0, newClockInAt: clockInIso }), employeeLabel(employee_user_id));
    setMissedClockInOpen(false);
  };

  const overrideClockOutEntry = async (entry: TimeEntry) => {
    if (demoRole() === "admin" || demoRole() === "manager") { demoToast(); return; }
    const nowIso = new Date().toISOString();
    const { data, error } = await db.from("time_entries").update({
      clock_out_at: nowIso,
      override_by_admin: true,
      override_reason: "Admin override — clocked out from employee card",
      override_admin_user_id: userId,
      adjusted_by_admin: true,
      adjusted_at: nowIso,
      adjusted_admin_user_id: userId,
      admin_adjustment_note: "Clock-out override from User management",
      is_saved: true,
    }).eq("id", entry.id).select("*").single();
    if (error) { toast.error(error.message); return; }
    setAdminTimeEntries((entries) => entries.map((e) => e.id === entry.id ? data : e));
    toast.success(`Clocked out ${employeeLabel(entry.employee_user_id)} from ${jobLabel(entry.job_id)}`);
  };

  const openEditEntryDialog = (entry: TimeEntry) => {
    setEditEntryDialog({
      open: true,
      mode: "edit",
      entryId: entry.id,
      employee_user_id: entry.employee_user_id,
      job_id: entry.job_id ?? "",
      work_date: entry.work_date,
      clock_in_at: isoToLocalInput(entry.clock_in_at),
      clock_out_at: isoToLocalInput(entry.clock_out_at),
      break_minutes: String(entry.break_minutes ?? 0),
      hours_worked: "",
      note: entry.admin_adjustment_note ?? "",
    });
  };

  const openCreateEntryDialog = () => {
    setEditEntryDialog({
      open: true,
      mode: "create",
      employee_user_id: "",
      job_id: "",
      work_date: today(),
      clock_in_at: "",
      clock_out_at: "",
      break_minutes: "30",
      hours_worked: "8",
      note: "",
    });
  };

  const openCreateEntryDialogForEmployee = (employee_user_id: string) => {
    setEditEntryDialog({
      open: true,
      mode: "create",
      employee_user_id,
      job_id: "",
      work_date: today(),
      clock_in_at: "",
      clock_out_at: "",
      break_minutes: "30",
      hours_worked: "8",
      note: "",
    });
  };

  const ensureEmployeeJobAssignment = async (employee_user_id: string, job_id: string) => {
    const exists = employeeAssignments.some((a) => a.employee_user_id === employee_user_id && a.job_id === job_id);
    if (exists) return;
    const { data, error } = await db.from("employee_job_assignments").insert({ employee_user_id, job_id }).select("*").single();
    if (error) throw error;
    setEmployeeAssignments((current) => [data, ...current]);
  };

  const submitEditEntry = async () => {
    const form = editEntryDialog;
    const breakMinutes = Number(form.break_minutes);
    if (!Number.isFinite(breakMinutes) || breakMinutes < 0) {
      toast.error("Break minutes must be 0 or greater");
      return;
    }
    if (form.mode === "create" && (!form.employee_user_id || !form.job_id)) {
      toast.error("Choose an employee and job");
      return;
    }
    let clockInIso: string | null = null;
    let clockOutIso: string | null = null;
    const hoursVal = form.hours_worked.trim() ? Number(form.hours_worked) : NaN;
    const useHours = Number.isFinite(hoursVal) && hoursVal > 0 && !form.clock_in_at && !form.clock_out_at;
    if (useHours) {
      // Build clock-in at 8:00 AM local on work_date, clock-out = in + hours + break
      const [y, m, d] = form.work_date.split("-").map(Number);
      const start = new Date(y, (m || 1) - 1, d || 1, 8, 0, 0, 0);
      const end = new Date(start.getTime() + hoursVal * 60 * 60 * 1000 + breakMinutes * 60 * 1000);
      clockInIso = start.toISOString();
      clockOutIso = end.toISOString();
    } else {
      if (!form.clock_in_at) {
        toast.error("Enter hours worked, or a clock-in time");
        return;
      }
      clockInIso = localToIsoForInput(form.clock_in_at);
      clockOutIso = form.clock_out_at ? localToIsoForInput(form.clock_out_at) : null;
      if (clockOutIso && new Date(clockOutIso) <= new Date(clockInIso)) {
        toast.error("Clock-out must be after clock-in");
        return;
      }
    }
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      setEditEntryDialog((current) => ({ ...current, open: false }));
      return;
    }
    const payload: Record<string, unknown> = {
      clock_in_at: clockInIso,
      clock_out_at: clockOutIso,
      break_minutes: breakMinutes,
      work_date: form.work_date,
      job_id: form.job_id || null,
      is_saved: true,
      adjusted_by_admin: true,
      adjusted_at: new Date().toISOString(),
      adjusted_admin_user_id: userId,
      admin_adjustment_note: form.note || null,
    };
    if (form.mode === "create") {
      payload.employee_user_id = form.employee_user_id;
      try {
        if (form.job_id) await ensureEmployeeJobAssignment(form.employee_user_id, form.job_id);
      } catch (e: any) {
        toast.error(e?.message || "Could not assign employee to job");
        return;
      }
      const { data, error } = await db.from("time_entries").insert(payload).select("*").single();
      if (error) {
        toast.error(error.message);
        return;
      }
      setAdminTimeEntries((entries) => [data, ...entries]);
      toast.success(`Time entry saved for ${employeeLabel(form.employee_user_id)} on ${formatDate(form.work_date)}`);
    } else {
      const { data, error } = await db.from("time_entries").update(payload).eq("id", form.entryId).select("*").single();
      if (error) {
        toast.error(error.message);
        return;
      }
      setAdminTimeEntries((entries) => entries.map((item) => item.id === data.id ? data : item));
      toast.success(`Time entry updated for ${employeeLabel(form.employee_user_id)} on ${formatDate(form.work_date)}`);
    }
    // Daily hours warnings
    try {
      const newMinutes = clockInIso && clockOutIso
        ? Math.max(0, Math.floor((new Date(clockOutIso).getTime() - new Date(clockInIso).getTime()) / 60000) - breakMinutes)
        : 0;
      emitHoursWarnings(
        checkHoursWarnings({
          entries: adminTimeEntries,
          employeeUserId: form.employee_user_id,
          workDate: form.work_date,
          newMinutes,
          newClockInAt: clockInIso,
          excludeEntryId: form.mode === "edit" ? form.entryId : undefined,
        }),
        employeeLabel(form.employee_user_id),
      );
    } catch {
      // non-blocking
    }
    // Make sure the entry is visible in the Week tab: jump to its week and clear filters that would hide it.
    try {
      setWeekViewStart(weekStartIso(form.work_date));
      if (reportEmployeeFilter !== "all" && reportEmployeeFilter !== form.employee_user_id) {
        setReportEmployeeFilter("all");
      }
      if (reportJobFilter !== "all" && form.job_id && reportJobFilter !== form.job_id) {
        setReportJobFilter("all");
      }
    } catch {
      // best-effort; ignore navigation errors
    }
    setEditEntryDialog((current) => ({ ...current, open: false }));
  };

  const loadDeletionLog = async () => {
    if (!profile?.company_id) return;
    if (demoRole() === "admin" || demoRole() === "manager") { setDeletionLog([]); return; }
    setLoadingDeletionLog(true);
    const { data, error } = await db.from("time_entry_deletion_log").select("*").eq("company_id", profile.company_id).order("deleted_at", { ascending: false }).limit(100);
    setLoadingDeletionLog(false);
    if (error) { toast.error(error.message); return; }
    setDeletionLog((data ?? []) as DeletionLogRow[]);
  };

  const deleteEntryFromDialog = async () => {
    const form = editEntryDialog;
    if (form.mode !== "edit" || !form.entryId) return;
    if (!window.confirm("Permanently delete this time entry? This cannot be undone.")) return;
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      setEditEntryDialog((current) => ({ ...current, open: false }));
      return;
    }
    const original = adminTimeEntries.find((item) => item.id === form.entryId);
    if (profile?.company_id && userId) {
      const { error: logError } = await db.from("time_entry_deletion_log").insert({
        time_entry_id: form.entryId,
        employee_user_id: form.employee_user_id,
        company_id: profile.company_id,
        job_id: original?.job_id ?? form.job_id ?? null,
        work_date: original?.work_date ?? form.work_date,
        clock_in_at: original?.clock_in_at ?? null,
        clock_out_at: original?.clock_out_at ?? null,
        total_minutes: original?.total_minutes ?? null,
        break_minutes: original?.break_minutes ?? null,
        deleted_by_user_id: userId,
        deleted_by_email: profile.email ?? null,
        deleted_by_name: profile.display_name ?? null,
        deletion_reason: form.note || null,
      });
      if (logError) {
        toast.error(`Could not record audit log: ${logError.message}`);
        return;
      }
    }
    const { error } = await db.from("time_entries").delete().eq("id", form.entryId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setAdminTimeEntries((entries) => entries.filter((item) => item.id !== form.entryId));
    toast.success("Time entry deleted");
    loadDeletionLog();
    setEditEntryDialog((current) => ({ ...current, open: false }));
  };

  const newBacklogRow = (start_date?: string): BacklogRow => {
    const start = start_date || today();
    return {
      start_date: start,
      end_date: start,
      job_id: "",
      hours_worked: "8",
      break_minutes: "30",
      note: "",
      weekdays_only: true,
      status: "pending",
    };
  };

  const expandBacklogDates = (row: BacklogRow): string[] => {
    if (!row.start_date) return [];
    const end = row.end_date || row.start_date;
    const [sy, sm, sd] = row.start_date.split("-").map(Number);
    const [ey, em, ed] = end.split("-").map(Number);
    const startD = new Date(sy, (sm || 1) - 1, sd || 1);
    const endD = new Date(ey, (em || 1) - 1, ed || 1);
    if (endD < startD) return [];
    const out: string[] = [];
    for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
      const day = d.getDay();
      if (row.weekdays_only && (day === 0 || day === 6)) continue;
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      out.push(`${yyyy}-${mm}-${dd}`);
    }
    return out;
  };

  const openBacklogDialog = () => {
    setBacklogDialog({
      open: true,
      employee_user_id: "",
      rows: [newBacklogRow(), newBacklogRow(), newBacklogRow()],
      saving: false,
    });
  };

  const updateBacklogRow = (index: number, patch: Partial<BacklogRow>) => {
    setBacklogDialog((current) => ({
      ...current,
      rows: current.rows.map((row, i) => i === index ? { ...row, ...patch } : row),
    }));
  };

  const submitBacklog = async () => {
    const { employee_user_id, rows } = backlogDialog;
    if (!employee_user_id) {
      toast.error("Choose an employee");
      return;
    }
    const fillable = rows.map((row, idx) => ({ row, idx, dates: expandBacklogDates(row) }))
      .filter(({ row, dates }) => row.status !== "saved" && row.job_id && Number(row.hours_worked) > 0 && dates.length > 0);
    if (!fillable.length) {
      toast.error("Add at least one row with a job, valid date range, and hours");
      return;
    }
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      setBacklogDialog((current) => ({ ...current, open: false }));
      return;
    }
    setBacklogDialog((current) => ({ ...current, saving: true }));
    let okCount = 0;
    let failCount = 0;
    for (const { row, idx, dates } of fillable) {
      setBacklogDialog((current) => ({
        ...current,
        rows: current.rows.map((r, i) => i === idx ? { ...r, status: "saving", error: undefined } : r),
      }));
      try {
        await ensureEmployeeJobAssignment(employee_user_id, row.job_id);
        const breakMinutes = Math.max(0, Number(row.break_minutes) || 0);
        const hours = Number(row.hours_worked);
        const note = row.note || "Backlog hours";
        let rowOk = 0;
        let rowErr: string | undefined;
        for (const work_date of dates) {
          const [y, m, d] = work_date.split("-").map(Number);
          const start = new Date(y, (m || 1) - 1, d || 1, 8, 0, 0, 0);
          const end = new Date(start.getTime() + hours * 60 * 60 * 1000 + breakMinutes * 60 * 1000);
          const { data, error } = await db.from("time_entries").insert({
            employee_user_id,
            job_id: row.job_id,
            work_date,
            clock_in_at: start.toISOString(),
            clock_out_at: end.toISOString(),
            break_minutes: breakMinutes,
            is_saved: true,
            adjusted_by_admin: true,
            adjusted_at: new Date().toISOString(),
            adjusted_admin_user_id: userId,
            admin_adjustment_note: note,
          }).select("*").single();
          if (error) { rowErr = error.message; continue; }
          setAdminTimeEntries((entries) => [data, ...entries]);
          emitHoursWarnings(
            checkHoursWarnings({
              entries: [data, ...adminTimeEntries].filter((e) => e.id !== data.id),
              employeeUserId: employee_user_id,
              workDate: work_date,
              newMinutes: Math.max(0, Math.floor(hours * 60)),
              newClockInAt: start.toISOString(),
            }),
            employeeLabel(employee_user_id),
          );
          rowOk++;
        }
        if (rowOk > 0) {
          okCount += rowOk;
          setBacklogDialog((current) => ({
            ...current,
            rows: current.rows.map((r, i) => i === idx ? { ...r, status: "saved", saved_count: rowOk, error: rowErr } : r),
          }));
        } else {
          failCount++;
          setBacklogDialog((current) => ({
            ...current,
            rows: current.rows.map((r, i) => i === idx ? { ...r, status: "error", error: rowErr || "Failed" } : r),
          }));
        }
      } catch (e: any) {
        failCount++;
        setBacklogDialog((current) => ({
          ...current,
          rows: current.rows.map((r, i) => i === idx ? { ...r, status: "error", error: e?.message || "Failed" } : r),
        }));
      }
    }
    setBacklogDialog((current) => ({ ...current, saving: false }));
    if (okCount) toast.success(`Saved ${okCount} time ${okCount === 1 ? "entry" : "entries"}`);
    if (failCount) toast.error(`${failCount} row${failCount === 1 ? "" : "s"} could not be saved`);
  };

  const savePtoBalance = async (employeeId: string) => {
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      return;
    }
    const balance = ptoBalances[employeeId] ?? emptyPtoBalance(employeeId);
    if (ptoTypes.some((item) => Number(balance[item.hours]) < 0)) {
      toast.error("PTO hours cannot be negative");
      return;
    }
    const employee = employees.find((item) => item.user_id === employeeId);
    const hireDate = employee?.hire_date || null;
    const payload = { ...ptoHoursPayload(balance), pto_accrual_start_date: balance.pto_accrual_start_date || vacationEligibilityDate(hireDate) };
    const [{ data, error }, { error: profileError }] = await Promise.all([
      db.from("employee_pto_balances").upsert(payload, { onConflict: "employee_user_id" }).select("*").single(),
      db.from("profiles").update({ hire_date: hireDate }).eq("user_id", employeeId),
    ]);
    if (error || profileError) toast.error(error?.message || profileError?.message);
    else {
      setPtoBalances((current) => ({ ...current, [employeeId]: data }));
      toast.success("PTO settings saved");
    }
  };

  const saveReportSettings = async () => {
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      return;
    }
    const payload = { ...reportSettings, admin_user_id: userId };
    const { data, error } = await db.from("company_weekly_report_settings").upsert(payload, { onConflict: "admin_user_id" }).select("*").single();
    if (error) toast.error(error.message);
    else {
      setReportSettings(data);
      toast.success("Weekly email defaults saved");
    }
  };

  const updateReportOverride = (employeeId: string, key: keyof WeeklyReportSettings, value: boolean) => {
    setReportOverrides((current) => ({
      ...current,
      [employeeId]: { ...(current[employeeId] ?? { employee_user_id: employeeId }), [key]: value },
    }));
  };

  const saveReportOverride = async (employeeId: string) => {
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      return;
    }
    const payload = { ...(reportOverrides[employeeId] ?? { employee_user_id: employeeId }), employee_user_id: employeeId };
    const { data, error } = await db.from("employee_weekly_report_overrides").upsert(payload, { onConflict: "employee_user_id" }).select("*").single();
    if (error) toast.error(error.message);
    else {
      setReportOverrides((current) => ({ ...current, [employeeId]: data }));
      toast.success("Employee weekly email settings saved");
    }
  };

  const sendWeeklyReportNow = async () => {
    if (!profile.admin_alert_email && !profile.email) {
      toast.error("Add an admin alert or recovery email first");
      return;
    }
    toast.info("Weekly email settings are ready. Complete sender domain setup to enable sending.");
  };

  const savePayrollSettings = async () => {
    const companyId = company?.id ?? profile.company_id;
    if (!companyId) {
      toast.error("Save company information before enabling payroll emails");
      return;
    }
    const reportsEmail = profile.admin_alert_email || profile.email || "";
    if (!reportsEmail || !isEmail(reportsEmail)) {
      toast.error("Set a valid Reports email in your admin profile first");
      return;
    }
    if (!selectedPayrollFields.length) {
      toast.error("Select at least one payroll report field");
      return;
    }
    if (!payrollSettings.include_all_employees && !payrollSettings.selected_employee_user_ids.length) {
      toast.error("Select at least one employee or choose all employees");
      return;
    }
    if (demoRole() === "admin") {
      demoToast();
      setEditingPayroll(false);
      return;
    }
    setSavingPayroll(true);
    const payload = {
      ...payrollSettings,
      company_id: companyId,
      admin_user_id: userId,
      recipient_email: reportsEmail,
      selected_employee_user_ids: payrollSettings.include_all_employees ? [] : payrollSettings.selected_employee_user_ids,
    };
    const { data, error } = await db.from("company_payroll_email_settings").upsert(payload, { onConflict: "company_id" }).select("*").single();
    setSavingPayroll(false);
    if (error) toast.error(error.message);
    else {
      setPayrollSettings({ ...data, selected_employee_user_ids: data.selected_employee_user_ids ?? [] });
      setEditingPayroll(false);
      toast.success("Payroll email settings saved");
    }
  };

  const addActivityRecipient = () => {
    const value = activityRecipientDraft.trim().toLowerCase();
    if (!value || !isEmail(value)) { toast.error("Enter a valid email"); return; }
    if (activityReport.recipients.includes(value)) { toast.error("Already in the list"); return; }
    setActivityReport((prev) => ({ ...prev, recipients: [...prev.recipients, value] }));
    setActivityRecipientDraft("");
  };

  const removeActivityRecipient = (email: string) => {
    setActivityReport((prev) => ({ ...prev, recipients: prev.recipients.filter((r) => r !== email) }));
  };

  const saveActivityReportSettings = async () => {
    const companyId = company?.id ?? profile.company_id;
    if (!companyId) { toast.error("Save company information first"); return; }
    if (demoRole()) { demoToast(); return; }
    setSavingActivityReport(true);
    const payload = {
      company_id: companyId,
      is_active: activityReport.is_active,
      frequency: activityReport.frequency,
      recipients: activityReport.recipients,
    };
    const { data, error } = await db.from("company_activity_report_settings").upsert(payload, { onConflict: "company_id" }).select("*").single();
    setSavingActivityReport(false);
    if (error) { toast.error(error.message); return; }
    setActivityReport({ id: data.id, company_id: data.company_id, is_active: data.is_active, frequency: data.frequency, recipients: data.recipients ?? [], last_sent_period_end: data.last_sent_period_end });
    toast.success("Activity report settings saved");
  };

  const sendActivityReportNow = async () => {
    const companyId = company?.id ?? profile.company_id;
    if (!companyId) { toast.error("Save company information first"); return; }
    if (!activityReport.recipients.length) { toast.error("Add at least one recipient first"); return; }
    if (demoRole()) { demoToast(); return; }
    setSendingActivityReport(true);
    const { data, error } = await supabase.functions.invoke("weekly-activity-report-automation", {
      body: { companyId, force: true },
    });
    setSendingActivityReport(false);
    if (error) { toast.error(error.message ?? "Failed to send report"); return; }
    const result = (data as any)?.results?.[0];
    if (result?.recipients?.some((r: any) => r.status === "failed")) {
      toast.error("Some recipients failed — check email logs");
    } else {
      toast.success(`Sent activity report for ${result?.period ?? "this period"}`);
    }
  };

  const exportPayrollReport = () => {
    if (!payrollRows.length) {
      toast.error("No payroll rows for the saved pay period");
      return;
    }
    const reportColumns = [
      { key: "include_employee_names" as const, header: "Employee", value: (row: typeof payrollRows[number]) => row.employeeName },
      { key: "include_hours_worked" as const, header: "Hours worked", value: (row: typeof payrollRows[number]) => row.hoursWorked.toFixed(2) },
      { key: "include_jobs_assigned" as const, header: "Jobs assigned", value: (row: typeof payrollRows[number]) => row.assignedJobs },
      { key: "include_pto_used" as const, header: "PTO used", value: (row: typeof payrollRows[number]) => row.ptoUsed.toFixed(2) },
      { key: "include_holiday_pay" as const, header: "Holiday pay", value: (row: typeof payrollRows[number]) => row.holidayHours.toFixed(2) },
      { key: "include_work_locations" as const, header: "Work locations", value: (row: typeof payrollRows[number]) => row.workLocations },
    ].filter((column) => payrollSettings[column.key]);
    const headers = ["Pay period", "Frequency", "Job site", "Entries", ...reportColumns.map((column) => column.header)];
    const lines = payrollRows.map((row) => [payrollPeriod.label, payrollSettings.frequency, row.jobName, String(row.entryCount), ...reportColumns.map((column) => column.value(row))]);
    const csv = [headers, ...lines].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `payroll-report-${payrollPeriod.start}-to-${payrollPeriod.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const sendPayrollReportNow = async () => {
    const companyId = company?.id ?? profile.company_id;
    if (!companyId || !payrollSettings.id) {
      toast.error("Save payroll email settings before sending");
      return;
    }
    const reportsEmail = profile.admin_alert_email || profile.email || payrollSettings.recipient_email;
    if (!reportsEmail || !isEmail(reportsEmail)) {
      toast.error("Set a valid Reports email in your admin profile first");
      return;
    }
    if (!payrollRows.length) {
      toast.error("No payroll rows for the saved pay period");
      return;
    }
    if (demoRole() === "admin") {
      demoToast();
      return;
    }
    setEmailingPayroll(true);
    const logPayload = {
      company_id: companyId,
      settings_id: payrollSettings.id,
      period_start: payrollPeriod.start,
      period_end: payrollPeriod.end,
      frequency: payrollSettings.frequency,
      recipient_email: reportsEmail,
      status: "pending",
      row_count: payrollRows.length,
      total_hours: payrollTotals.hours,
    };
    const { data: logData } = await db.from("payroll_email_send_log").upsert(logPayload, { onConflict: "settings_id,period_start,period_end" }).select("*").single();
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "payroll-report-export",
        recipientEmail: reportsEmail,
        idempotencyKey: `payroll-report-${companyId}-${payrollPeriod.start}-${payrollPeriod.end}`,
        templateData: {
          companyName: profile.company_name || company?.name || "Punch Card Pro",
          periodLabel: payrollPeriod.label,
          frequency: payrollSettings.frequency,
          includedFields: selectedPayrollFields.map((field) => field.label),
          totals: { hoursWorked: payrollTotals.hours.toFixed(2), ptoUsed: payrollTotals.pto.toFixed(2), holidayPay: payrollTotals.holiday.toFixed(2), rows: payrollRows.length },
          rows: payrollRows.map((row) => ({ employeeName: payrollSettings.include_employee_names ? row.employeeName : "", jobSite: row.jobName, assignedJobs: row.assignedJobs, hoursWorked: row.hoursWorked.toFixed(2), ptoUsed: row.ptoUsed.toFixed(2), holidayPay: row.holidayHours.toFixed(2), workLocations: row.workLocations })),
        },
      },
    });
    setEmailingPayroll(false);
    if (error) {
      if (logData?.id) await db.from("payroll_email_send_log").update({ status: "failed", error_message: "Email sender setup is not complete" }).eq("id", logData.id);
      toast.error("Payroll report is ready, but sender setup must be completed before emails can send.");
    } else {
      if (logData?.id) {
        const { data: updatedLog } = await db.from("payroll_email_send_log").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", logData.id).select("*").single();
        if (updatedLog) setPayrollLogs((current) => [updatedLog, ...current.filter((log) => log.id !== updatedLog.id)]);
      }
      await db.from("company_payroll_email_settings").update({ last_sent_period_start: payrollPeriod.start, last_sent_period_end: payrollPeriod.end }).eq("id", payrollSettings.id);
      setPayrollSettings((current) => ({ ...current, last_sent_period_start: payrollPeriod.start, last_sent_period_end: payrollPeriod.end, recipient_email: reportsEmail }));
      toast.success(`Payroll report sent to ${reportsEmail}`);
    }
  };

  const reviewRequest = async (request: TimeOffRequest, status: "approved" | "denied") => {
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const { data, error } = await db.from("time_off_requests").update({
      status,
      admin_response_note: adminNotes[request.id] ?? request.admin_response_note,
      reviewed_by: userData.user?.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", request.id).select("*").single();
    if (error) toast.error(error.message);
    else {
      setTimeOffRequests((requests) => requests.map((item) => item.id === request.id ? data : item));
      toast.success(`Request ${status}`);
    }
  };

  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const employeeHours = (employeeId: string) => adminTimeEntries
    .filter((entry) => entry.employee_user_id === employeeId)
    .reduce((total, entry) => total + (entry.total_minutes || elapsedMinutes(entry)), 0);

  const employeeHoursForRange = (employeeId: string, start: string, end: string) => adminTimeEntries
    .filter((entry) => entry.employee_user_id === employeeId && entry.work_date >= start && entry.work_date <= end)
    .reduce((total, entry) => total + (entry.work_date === today() ? elapsedMinutes(entry) : entry.total_minutes || elapsedMinutes(entry)), 0);

  const employeeHourTallies = (employeeId: string) => ({
    daily: employeeHoursForRange(employeeId, today(), today()),
    weekly: employeeHoursForRange(employeeId, weekStartIso(today()), addDaysIso(weekStartIso(today()), 6)),
    yearly: employeeHoursForRange(employeeId, `${new Date().getFullYear()}-01-01`, `${new Date().getFullYear()}-12-31`),
  });

  const employeePtoSummary = (employee: EmployeeRow, balance = ptoBalances[employee.user_id] ?? emptyPtoBalance(employee.user_id)) => {
    const annual = ptoAnnualHoursForHireDate(employee.hire_date);
    const accrued = ptoAccruedHoursFor(employee.hire_date, balance.pto_pay_periods_per_year);
    const accrualRate = ptoAccrualRateForHireDate(employee.hire_date, balance.pto_pay_periods_per_year);
    const nextTier = nextPtoTierDate(employee.hire_date);
    return { annual, accrued, accrualRate, nextTier, tierLabel: ptoTierLabel(employee.hire_date) };
  };

  const roleForUser = (targetUserId: string): AppRole => userRoles[targetUserId] ?? "employee";
  const assignableEmployees = employees.filter((employee) => roleForUser(employee.user_id) === "employee");
  const activeJobs = jobs.filter((job) => !job.archived_at);
  const archivedJobs = jobs.filter((job) => job.archived_at);
  const jobsByStatus = [...activeJobs, ...archivedJobs];
  const jobTimeLogSummary = (jobId: string) => {
    const entries = adminTimeEntries.filter((entry) => entry.job_id === jobId);
    const latest = entries.reduce<string | null>((current, entry) => (!current || entry.work_date > current ? entry.work_date : current), null);
    return { count: entries.length, latest };
  };
  const archivedJobMatches = archivedJobs.filter((job) => {
    const query = archivedJobSearch.trim().toLowerCase();
    if (!query) return true;
    return [job.job_name, job.address, job.city, job.state].some((value) => value?.toLowerCase().includes(query));
  });

  const assignedJobsFor = (employeeId: string) => {
    return employeeAssignments
      .filter((assignment) => assignment.employee_user_id === employeeId)
      .map((assignment) => jobs.find((job) => job.id === assignment.job_id))
      .filter(Boolean) as Job[];
  };

  const selectedAdminJob = jobs.find((job) => job.id === selectedAdminJobId);
  const selectedJobPinDraft = selectedAdminJob && jobPinDraft?.jobId === selectedAdminJob.id ? jobPinDraft : null;
  const reportRows = adminTimeEntries.filter((entry) => {
    return (reportEmployeeFilter === "all" || entry.employee_user_id === reportEmployeeFilter)
      && (reportJobFilter === "all" || entry.job_id === reportJobFilter)
      && (!reportStartDate || entry.work_date >= reportStartDate)
      && (!reportEndDate || entry.work_date <= reportEndDate);
  });
  const reportTotalMinutes = reportRows.reduce((total, entry) => total + (entry.total_minutes || elapsedMinutes(entry)), 0);
  const reportDailyTotals = (() => {
    const sorted = [...reportRows].sort((a, b) => {
      if (a.work_date !== b.work_date) return a.work_date < b.work_date ? 1 : -1;
      const aEmp = a.employee_user_id || "";
      const bEmp = b.employee_user_id || "";
      if (aEmp !== bEmp) return aEmp < bEmp ? -1 : 1;
      return (a.clock_in_at ?? "") < (b.clock_in_at ?? "") ? -1 : 1;
    });
    const groups = new Map<string, { employee_user_id: string; work_date: string; entries: TimeEntry[]; perJob: Map<string, number>; total: number }>();
    for (const entry of sorted) {
      const key = `${entry.employee_user_id}|${entry.work_date}`;
      const minutes = entry.total_minutes || elapsedMinutes(entry);
      const jobKey = entry.job_id ?? "unassigned";
      const existing = groups.get(key);
      if (existing) {
        existing.entries.push(entry);
        existing.total += minutes;
        existing.perJob.set(jobKey, (existing.perJob.get(jobKey) ?? 0) + minutes);
      } else {
        const perJob = new Map<string, number>();
        perJob.set(jobKey, minutes);
        groups.set(key, { employee_user_id: entry.employee_user_id, work_date: entry.work_date, entries: [entry], perJob, total: minutes });
      }
    }
    return Array.from(groups.values());
  })();
  const employeeLabel = (employeeId: string) => employees.find((employee) => employee.user_id === employeeId)?.display_name || employees.find((employee) => employee.user_id === employeeId)?.email || (employeeId === userId ? "Admin" : "User");
  const jobLabel = (jobId?: string | null) => {
    const job = jobs.find((item) => item.id === jobId);
    return job ? `${job.job_name} — ${job.address}` : "Unassigned job";
  };
  const analyticsRange = (() => {
    if (analyticsPeriod === "week") return { start: reportWeekFilter, end: addDaysIso(reportWeekFilter, 6), label: `Week of ${formatDate(reportWeekFilter)}` };
    if (analyticsPeriod === "month") return { start: monthStartIso(analyticsMonth), end: monthEndIso(analyticsMonth), label: new Date(`${analyticsMonth}-01T00:00:00`).toLocaleDateString([], { month: "long", year: "numeric" }) };
    if (analyticsPeriod === "year") return { start: `${analyticsYear}-01-01`, end: `${analyticsYear}-12-31`, label: analyticsYear };
    return { start: analyticsStartDate, end: analyticsEndDate, label: `${formatDate(analyticsStartDate)} – ${formatDate(analyticsEndDate)}` };
  })();
  const analyticsTimeEntries = adminTimeEntries.filter((entry) => (reportEmployeeFilter === "all" || entry.employee_user_id === reportEmployeeFilter)
    && (reportJobFilter === "all" || entry.job_id === reportJobFilter)
    && entry.work_date >= analyticsRange.start
    && entry.work_date <= analyticsRange.end);
  const selectedAnalyticsFields = analyticsReportFields.filter((field) => analyticsReportContent[field.key]);
  const analyticsKeys = Array.from(new Set(analyticsTimeEntries.map((entry) => `${entry.employee_user_id}:${entry.job_id ?? "unassigned"}`)));
  const firstAnalyticsKeyByEmployee = new Map<string, string>();
  analyticsKeys.forEach((key) => {
    const [employeeId] = key.split(":");
    if (!firstAnalyticsKeyByEmployee.has(employeeId)) firstAnalyticsKeyByEmployee.set(employeeId, key);
  });
  const analyticsRows = analyticsKeys.map((key) => {
    const [employeeId, jobKey] = key.split(":");
    const jobId = jobKey === "unassigned" ? null : jobKey;
    const entries = analyticsTimeEntries.filter((entry) => entry.employee_user_id === employeeId && (entry.job_id ?? null) === jobId);
    const includeEmployeePeriodTotals = reportJobFilter !== "all" || firstAnalyticsKeyByEmployee.get(employeeId) === key;
    const ptoUsed = includeEmployeePeriodTotals ? timeOffRequests
      .filter((request) => request.employee_user_id === employeeId && request.status === "approved" && request.request_type !== "holiday" && dateRangesOverlap(request.start_date, request.end_date, analyticsRange.start, analyticsRange.end))
      .reduce((sum, request) => sum + Number(request.requested_hours || 0), 0) : 0;
    const holidayHours = includeEmployeePeriodTotals ? holidayPay
      .filter((holiday) => holiday.employee_user_id === employeeId && holiday.qualifies && holiday.holiday_date >= analyticsRange.start && holiday.holiday_date <= analyticsRange.end)
      .reduce((sum, holiday) => sum + Number(holiday.holiday_hours || 0), 0) : 0;
    const job = jobs.find((item) => item.id === jobId);
    const assignedJobs = assignedJobsFor(employeeId);
    const workDates = Array.from(new Set(entries.map((entry) => entry.work_date))).sort();
    const ptoBalance = ptoBalances[employeeId];
    const ptoBalanceSummary = ptoBalance ? `Vacation ${Number(ptoBalance.vacation_hours || 0).toFixed(2)} · Sick ${Number(ptoBalance.sick_hours || 0).toFixed(2)} · Holiday ${Number(ptoBalance.holiday_hours || 0).toFixed(2)} · Days off ${Number(ptoBalance.day_off_hours || 0).toFixed(2)}` : "No PTO balance set";
    const locationLines = entries.map((entry) => {
      const clockIn = entry.clock_in_latitude && entry.clock_in_longitude ? `in ${entry.clock_in_latitude.toFixed(5)}, ${entry.clock_in_longitude.toFixed(5)}` : "clock-in GPS not captured";
      const clockOut = entry.clock_out_latitude && entry.clock_out_longitude ? `out ${entry.clock_out_latitude.toFixed(5)}, ${entry.clock_out_longitude.toFixed(5)}` : "clock-out GPS not captured";
      return `${entry.work_date}: ${clockIn}; ${clockOut}`;
    });
    return {
      key,
      employeeId,
      employeeName: employeeLabel(employeeId),
      jobName: jobLabel(jobId),
      assignedJobs: assignedJobs.length ? assignedJobs.map((assignedJob) => `${assignedJob.job_name} — ${assignedJob.address}`).join("; ") : "No assigned jobs",
      dateSummary: workDates.length ? `${formatDate(workDates[0])}${workDates.length > 1 ? ` – ${formatDate(workDates[workDates.length - 1])}` : ""}` : analyticsRange.label,
      hoursWorked: entries.reduce((total, entry) => total + (entry.total_minutes || elapsedMinutes(entry)), 0) / 60,
      ptoUsed,
      ptoBalanceSummary,
      holidayHours,
      jobNotes: job?.manager_notes || "No job notes",
      workLocations: [job ? `${job.address}, ${job.city}, ${job.state}` : "Unassigned job", ...locationLines].join(" | "),
      entryCount: entries.length,
    };
  }).sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.jobName.localeCompare(b.jobName));
  const analyticsTotals = analyticsRows.reduce((totals, row) => ({
    hours: totals.hours + row.hoursWorked,
    pto: totals.pto + row.ptoUsed,
    holiday: totals.holiday + row.holidayHours,
  }), { hours: 0, pto: 0, holiday: 0 });
  const payrollPeriod = payrollPeriodFor(payrollSettings);
  const selectedPayrollFields = payrollReportFields.filter((field) => payrollSettings[field.key]);
  const payrollSelectableEmployees = employees.filter((employee) => userRoles[employee.user_id] !== "admin").sort((a, b) => employeeLabel(a.user_id).localeCompare(employeeLabel(b.user_id)));
  const selectedPayrollEmployeeIds = new Set(payrollSettings.selected_employee_user_ids ?? []);
  const payrollIncludedEmployeeIds = payrollSettings.include_all_employees
    ? payrollSelectableEmployees.map((employee) => employee.user_id)
    : payrollSelectableEmployees.filter((employee) => selectedPayrollEmployeeIds.has(employee.user_id)).map((employee) => employee.user_id);
  const payrollIncludedEmployeeIdSet = new Set(payrollIncludedEmployeeIds);
  const payrollIncludedEmployeeCount = payrollIncludedEmployeeIds.length;
  const payrollTimeEntries = adminTimeEntries.filter((entry) => entry.work_date >= payrollPeriod.start && entry.work_date <= payrollPeriod.end && payrollIncludedEmployeeIdSet.has(entry.employee_user_id));
  const payrollKeys = Array.from(new Set([
    ...payrollTimeEntries.map((entry) => `${entry.employee_user_id}:${entry.job_id ?? "unassigned"}`),
    ...payrollIncludedEmployeeIds.filter((id) => !payrollTimeEntries.some((entry) => entry.employee_user_id === id)).map((id) => `${id}:unassigned`),
  ]));
  const firstPayrollKeyByEmployee = new Map<string, string>();
  payrollKeys.forEach((key) => {
    const [employeeId] = key.split(":");
    if (!firstPayrollKeyByEmployee.has(employeeId)) firstPayrollKeyByEmployee.set(employeeId, key);
  });
  const payrollRows = payrollKeys.map((key) => {
    const [employeeId, jobKey] = key.split(":");
    const jobId = jobKey === "unassigned" ? null : jobKey;
    const entries = payrollTimeEntries.filter((entry) => entry.employee_user_id === employeeId && (entry.job_id ?? null) === jobId);
    const includeEmployeePeriodTotals = firstPayrollKeyByEmployee.get(employeeId) === key;
    const ptoUsed = includeEmployeePeriodTotals ? timeOffRequests
      .filter((request) => request.employee_user_id === employeeId && request.status === "approved" && request.request_type !== "holiday" && dateRangesOverlap(request.start_date, request.end_date, payrollPeriod.start, payrollPeriod.end))
      .reduce((sum, request) => sum + Number(request.requested_hours || 0), 0) : 0;
    const holidayHours = includeEmployeePeriodTotals ? holidayPay
      .filter((holiday) => holiday.employee_user_id === employeeId && holiday.qualifies && holiday.holiday_date >= payrollPeriod.start && holiday.holiday_date <= payrollPeriod.end)
      .reduce((sum, holiday) => sum + Number(holiday.holiday_hours || 0), 0) : 0;
    const job = jobs.find((item) => item.id === jobId);
    const assignedJobs = assignedJobsFor(employeeId);
    const locationLines = entries.map((entry) => {
      const clockIn = entry.clock_in_latitude && entry.clock_in_longitude ? `in ${entry.clock_in_latitude.toFixed(5)}, ${entry.clock_in_longitude.toFixed(5)}` : "clock-in GPS not captured";
      const clockOut = entry.clock_out_latitude && entry.clock_out_longitude ? `out ${entry.clock_out_latitude.toFixed(5)}, ${entry.clock_out_longitude.toFixed(5)}` : "clock-out GPS not captured";
      return `${entry.work_date}: ${clockIn}; ${clockOut}`;
    });
    return {
      key,
      employeeName: employeeLabel(employeeId),
      jobName: jobLabel(jobId),
      assignedJobs: assignedJobs.length ? assignedJobs.map((assignedJob) => `${assignedJob.job_name} — ${assignedJob.address}`).join("; ") : "No assigned jobs",
      hoursWorked: entries.reduce((total, entry) => total + (entry.total_minutes || elapsedMinutes(entry)), 0) / 60,
      ptoUsed,
      holidayHours,
      workLocations: [job ? `${job.address}, ${job.city}, ${job.state}` : "Unassigned job", ...locationLines].join(" | "),
      entryCount: entries.length,
    };
  }).sort((a, b) => a.employeeName.localeCompare(b.employeeName) || a.jobName.localeCompare(b.jobName));
  const payrollTotals = payrollRows.reduce((totals, row) => ({
    hours: totals.hours + row.hoursWorked,
    pto: totals.pto + row.ptoUsed,
    holiday: totals.holiday + row.holidayHours,
  }), { hours: 0, pto: 0, holiday: 0 });
  const pendingPtoCount = timeOffRequests.filter((request) => request.status === "pending").length;
  const approvedCalendarRequests = timeOffRequests.filter((request) => request.status === "approved" && dateRangesOverlap(request.start_date, request.end_date, monthStartIso(calendarMonth), monthEndIso(calendarMonth)));
  const calendarMonthStart = monthStartIso(calendarMonth);
  const calendarMonthEnd = monthEndIso(calendarMonth);
  const calendarYear = Number(calendarMonth.slice(0, 4)) || new Date().getFullYear();
  const calendarHolidays = majorHolidays(calendarYear).filter((holiday) => holiday.date >= calendarMonthStart && holiday.date <= calendarMonthEnd);
  const calendarDays = Array.from(new Set([
    ...calendarHolidays.map((holiday) => holiday.date),
    ...adminTimeEntries.filter((entry) => entry.work_date >= calendarMonthStart && entry.work_date <= calendarMonthEnd && entry.job_id).map((entry) => entry.work_date),
  ])).sort();
  const holidayQualificationRows = employees.filter((employee) => roleForUser(employee.user_id) === "employee").flatMap((employee) => majorHolidays().map((holiday) => {
    const entries = adminTimeEntries.filter((entry) => entry.employee_user_id === employee.user_id);
    const dayBefore = shiftWorkday(holiday.date, -1);
    const dayAfter = shiftWorkday(holiday.date, 1);
    const qualifies = workedOnDate(entries, dayBefore) && workedOnDate(entries, dayAfter);
    return { employee, holiday, dayBefore, dayAfter, qualifies };
  }));
  const latestPayrollLog = payrollLogs[0];
  const activeWorkers = adminTimeEntries.filter((entry) => entry.employee_user_id !== userId && entry.clock_in_at && !entry.clock_out_at);
  const currentActiveJob = jobs.find((job) => job.id === adminActiveEntry?.job_id);
  const adminActiveJobId = adminActiveEntry?.job_id ?? "";
  const assignedJobIdFor = (employeeId: string) => employeeAssignments.find((assignment) => assignment.employee_user_id === employeeId)?.job_id ?? "";
  const employeeAssignmentEditor = (employee: EmployeeRow) => {
    const isEditingAssignments = editingAssignmentUserId === employee.user_id;
    const selectedIds = isEditingAssignments ? (employeeAssignmentDrafts[employee.user_id] ?? []) : assignedJobsFor(employee.user_id).map((job) => job.id);
    return (
      <div className="rounded-lg border bg-secondary p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="font-medium">Job assignments</p><p className="text-sm text-muted-foreground">{selectedIds.length} of {activeJobs.length} active jobs assigned</p></div>
          <div className="flex gap-2">
            {isEditingAssignments ? <><Button className="h-10" type="button" onClick={() => saveEmployeeJobAssignments(employee.user_id)}><Save className="h-4 w-4" />{t("common.save")}</Button><Button className="h-10" type="button" variant="outline" onClick={() => cancelEmployeeAssignmentEdit(employee.user_id)}>{t("common.cancel")}</Button></> : <Button className="h-10" type="button" variant="outline" onClick={() => startEmployeeAssignmentEdit(employee.user_id)}><Edit3 className="h-4 w-4" />Edit</Button>}
          </div>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {activeJobs.length ? activeJobs.map((job) => <label key={job.id} className="flex items-start gap-3 rounded-md border bg-card p-3 text-sm"><Checkbox disabled={!isEditingAssignments} checked={selectedIds.includes(job.id)} onCheckedChange={(checked) => toggleEmployeeAssignmentJob(employee.user_id, job.id, checked === true)} /><span><span className="block font-medium">{job.job_name}</span><span className="block text-muted-foreground">{job.address}</span></span></label>) : <p className="text-sm text-muted-foreground">Create jobs before assigning this employee.</p>}
        </div>
      </div>
    );
  };
  const addEmployeePanel = addingEmployee ? (
    <form className="space-y-4 rounded-lg border border-primary/30 bg-secondary p-4" onSubmit={saveNewEmployee}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">New employee</p>
          <p className="text-sm text-muted-foreground">Saving creates the employee in this company and emails them a one-time link to choose their own login password. There is no default password — they pick it when they open the link.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" onClick={() => { setAddingEmployee(false); setAddEmployeeForm(emptyAddEmployeeForm()); }} disabled={savingEmployee}>{t("common.cancel")}</Button>
          <Button type="submit" disabled={savingEmployee}>{savingEmployee ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2"><Label>{t("emp.name")}</Label><Input maxLength={120} value={addEmployeeForm.displayName} onChange={(event) => setAddEmployeeForm((current) => ({ ...current, displayName: event.target.value }))} placeholder="Jordan Lee" /></div>
        <div className="space-y-2"><Label>Email address</Label><Input type="email" maxLength={255} value={addEmployeeForm.email} onChange={(event) => setAddEmployeeForm((current) => ({ ...current, email: event.target.value }))} placeholder="employee@company.com" /></div>
        <div className="space-y-2"><Label>Phone number</Label><Input maxLength={40} value={addEmployeeForm.phone} onChange={(event) => setAddEmployeeForm((current) => ({ ...current, phone: event.target.value }))} placeholder="(555) 010-1234" /></div>
        <div className="space-y-2"><Label>Emergency contact</Label><Input maxLength={160} value={addEmployeeForm.emergencyContact} onChange={(event) => setAddEmployeeForm((current) => ({ ...current, emergencyContact: event.target.value }))} placeholder="Name — phone" /></div>
      </div>
      <div className="space-y-2 rounded-lg border bg-card p-3">
        <Label>Assign jobs</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {activeJobs.length ? activeJobs.map((job) => (
            <label key={job.id} className="flex items-start gap-3 rounded-md border bg-secondary p-3 text-sm">
              <Checkbox checked={addEmployeeForm.jobIds.includes(job.id)} onCheckedChange={(checked) => toggleAddEmployeeJob(job.id, checked === true)} />
              <span><span className="block font-medium">{job.job_name}</span><span className="block text-muted-foreground">{job.address}</span></span>
            </label>
          )) : <p className="text-sm text-muted-foreground">Create jobs before assigning this employee.</p>}
        </div>
      </div>
      <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-[220px_1fr] sm:items-end">
        <div className="space-y-2">
          <Label>PIN option</Label>
          <Select value={addEmployeeForm.pinMode} onValueChange={(value) => setAddEmployeeForm((current) => ({ ...current, pinMode: value as AddEmployeeForm["pinMode"], temporaryPin: value === "first_login" ? "" : current.temporaryPin }))}>
            <SelectTrigger className="h-11 bg-background"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="first_login">Set on first login</SelectItem><SelectItem value="temporary">Temporary PIN</SelectItem></SelectContent>
          </Select>
        </div>
        {addEmployeeForm.pinMode === "temporary" ? <div className="space-y-2"><Label>Temporary four-digit PIN</Label><Input inputMode="numeric" maxLength={4} value={addEmployeeForm.temporaryPin} onChange={(event) => setAddEmployeeForm((current) => ({ ...current, temporaryPin: event.target.value.replace(/\D/g, "") }))} placeholder="0000" /></div> : <p className="text-sm text-muted-foreground">The employee will be asked to create a four-digit PIN after first login.</p>}
      </div>
    </form>
  ) : null;

  const exportHoursReport = () => {
    if (!reportRows.length) {
      toast.error("No hours to export for the selected filters");
      return;
    }
    const headers = ["Employee", "Job", "Address", "Work date", "Clock in", "Clock out", "Break minutes", "Entry hours", "Day total hours"];
    const rows: string[][] = [];
    for (const group of reportDailyTotals) {
      for (const entry of group.entries) {
        const job = jobs.find((item) => item.id === entry.job_id);
        rows.push([
          employeeLabel(entry.employee_user_id),
          job?.job_name ?? "Unassigned job",
          job ? `${job.address}, ${job.city}, ${job.state}` : "",
          entry.work_date,
          entry.clock_in_at ? new Date(entry.clock_in_at).toLocaleString() : "",
          entry.clock_out_at ? new Date(entry.clock_out_at).toLocaleString() : "",
          String(entry.break_minutes ?? 0),
          ((entry.total_minutes || elapsedMinutes(entry)) / 60).toFixed(2),
          "",
        ]);
      }
      rows.push([
        employeeLabel(group.employee_user_id),
        "DAY TOTAL",
        "",
        group.work_date,
        "",
        "",
        "",
        "",
        (group.total / 60).toFixed(2),
      ]);
    }
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `hours-report-${reportStartDate || today()}-to-${reportEndDate || today()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAnalyticsReport = () => {
    if (!analyticsRows.length) {
      toast.error("No report rows match the selected filters");
      return;
    }
    const reportColumns = [
      { key: "employeeNames" as const, header: "Employee", value: (row: typeof analyticsRows[number]) => row.employeeName },
      { key: "jobsAssigned" as const, header: "Jobs assigned", value: (row: typeof analyticsRows[number]) => row.assignedJobs },
      { key: "dates" as const, header: "Dates", value: (row: typeof analyticsRows[number]) => row.dateSummary },
      { key: "hoursWorked" as const, header: "Hours worked", value: (row: typeof analyticsRows[number]) => row.hoursWorked.toFixed(2) },
      { key: "ptoBalance" as const, header: "PTO used / balance", value: (row: typeof analyticsRows[number]) => `${row.ptoUsed.toFixed(2)} used · ${row.ptoBalanceSummary}` },
      { key: "holidayPay" as const, header: "Holiday pay", value: (row: typeof analyticsRows[number]) => row.holidayHours.toFixed(2) },
      { key: "jobNotes" as const, header: "Job notes", value: (row: typeof analyticsRows[number]) => row.jobNotes },
      { key: "workLocations" as const, header: "Work locations", value: (row: typeof analyticsRows[number]) => row.workLocations },
    ].filter((column) => analyticsReportContent[column.key]);
    const headers = ["Job site", "Period", "Entries", ...reportColumns.map((column) => column.header)];
    const lines = analyticsRows.map((row) => [row.jobName, analyticsRange.label, String(row.entryCount), ...reportColumns.map((column) => column.value(row))]);
    const csv = [headers, ...lines].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `analytics-report-${analyticsRange.start}-to-${analyticsRange.end}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const emailAnalyticsReport = async () => {
    const recipientEmail = profile.admin_alert_email || profile.email;
    if (!recipientEmail || !isEmail(recipientEmail)) {
      toast.error("Add a valid designated admin email address first");
      return;
    }
    if (!analyticsRows.length) {
      toast.error("No report rows match the selected filters");
      return;
    }
    if (demoRole() === "admin") {
      demoToast();
      return;
    }
    setEmailingReport(true);
    const { error } = await supabase.functions.invoke("send-transactional-email", {
      body: {
        templateName: "admin-report-export",
        recipientEmail,
        idempotencyKey: `admin-report-${userId}-${analyticsRange.start}-${analyticsRange.end}-${reportEmployeeFilter}-${reportJobFilter}-${Date.now()}`,
        templateData: {
          companyName: profile.company_name || company?.name || "Punch Card Pro",
          periodLabel: analyticsRange.label,
          filters: {
            employee: reportEmployeeFilter === "all" ? "All employees" : employeeLabel(reportEmployeeFilter),
            job: reportJobFilter === "all" ? "All jobs" : jobLabel(reportJobFilter),
          },
          includedFields: selectedAnalyticsFields.map((field) => field.label),
          totals: {
            hoursWorked: analyticsTotals.hours.toFixed(2),
            ptoUsed: analyticsTotals.pto.toFixed(2),
            holidayPay: analyticsTotals.holiday.toFixed(2),
            rows: analyticsRows.length,
          },
          rows: analyticsRows.map((row) => ({
            employeeName: row.employeeName,
            jobSite: row.jobName,
            assignedJobs: row.assignedJobs,
            dates: row.dateSummary,
            hoursWorked: row.hoursWorked.toFixed(2),
            ptoUsed: row.ptoUsed.toFixed(2),
            ptoBalance: row.ptoBalanceSummary,
            holidayPay: row.holidayHours.toFixed(2),
            jobNotes: row.jobNotes,
            workLocations: row.workLocations,
          })),
        },
      },
    });
    setEmailingReport(false);
    if (error) toast.error("Email export is ready in the dashboard, but sender setup must be completed before reports can send.");
    else toast.success(`Full report sent to ${recipientEmail}`);
  };

  const checkAdminJobLocation = async (job = selectedAdminJob) => {
    if (!job) {
      setAdminJobLocationCheck({ status: "blocked", message: "Select a job address first." });
      return;
    }
    if (!isValidCoordinate(job.latitude, job.longitude)) {
      setAdminJobLocationCheck({ status: "blocked", message: "This job needs a GPS pin before clock-in or clock-out." });
      return;
    }
    if (!navigator.geolocation) {
      setAdminJobLocationCheck({ status: "error", message: "GPS is not available on this device." });
      return;
    }
    const requestId = ++adminLocationRequestRef.current;
    setAdminJobLocationCheck({ status: "checking", message: "Refreshing your GPS location...", jobId: job.id });
    try {
      const position = await getBestCurrentPosition();
      if (requestId !== adminLocationRequestRef.current) return;
      setAdminJobLocationCheck(evaluateJobGeofence(job, position));
    } catch (error) {
      if (requestId !== adminLocationRequestRef.current) return;
      setAdminJobLocationCheck({ status: "error", message: error instanceof Error && !("code" in error) ? error.message : locationErrorMessage(error as GeolocationPositionError), jobId: job.id });
    }
  };

  const adminClockIn = async () => {
    if (!selectedAdminJob) {
      toast.error("Select a job address first");
      return;
    }
    if (adminActiveEntry) {
      const activeJob = jobs.find((job) => job.id === adminActiveEntry.job_id);
      toast.error(`Clock out of ${activeJob?.job_name ?? "the current job"} before clocking into another job.`);
      return;
    }
    if (selectedAdminJob.archived_at) {
      toast.error("Unarchive this job before clocking in");
      return;
    }
    if (!isLocationCleared(adminJobLocationCheck) || adminJobLocationCheck.jobId !== selectedAdminJob.id) {
      toast.error(adminJobLocationCheck.status === "checking" ? "GPS check is still running — wait for it to finish." : adminJobLocationCheck.status === "blocked" && adminJobLocationCheck.distance != null ? `You're outside the job radius. Current distance: ${Math.round(adminJobLocationCheck.distance)} m.` : adminJobLocationCheck.status === "error" ? adminJobLocationCheck.message : "Tap Refresh GPS for this job before clocking in.");
      return;
    }
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      return;
    }
    const payload = {
      employee_user_id: userId,
      job_id: selectedAdminJob.id,
      work_date: today(),
      clock_in_at: new Date().toISOString(),
      clock_in_latitude: adminJobLocationCheck.latitude,
      clock_in_longitude: adminJobLocationCheck.longitude,
      clock_in_accuracy_meters: adminJobLocationCheck.accuracy,
      clock_in_distance_meters: adminJobLocationCheck.distance,
      break_minutes: 0,
      is_saved: true,
      client_sync_id: localQueueId(),
    };
    const { data, error } = await db.from("time_entries").insert(payload).select("*").single();
    if (error) toast.error(error.code === "23505" ? "You're already clocked into a job. Clock out first before clocking in again." : error.message);
    else {
      setAdminActiveEntry(data);
      setAdminTimeEntries((entries) => [data, ...entries]);
      toast.success("Clock-in saved");
      emitHoursWarnings(checkHoursWarnings({ entries: adminTimeEntries, employeeUserId: userId, workDate: payload.work_date, newMinutes: 0, newClockInAt: payload.clock_in_at }), employeeLabel(userId));
    }
  };

  const adminClockOut = async () => {
    if (!adminActiveEntry) {
      toast.error("No active admin clock-in found");
      return;
    }
    if (!isLocationCleared(adminJobLocationCheck) || adminJobLocationCheck.jobId !== adminActiveEntry.job_id) {
      toast.error(adminJobLocationCheck.status === "checking" ? "GPS check is still running — wait for it to finish." : "Tap Refresh GPS for the active job before clocking out.");
      return;
    }
    if (demoRole() === "admin" || demoRole() === "manager") {
      demoToast();
      return;
    }
    const { data, error } = await db.from("time_entries").update({
      clock_out_at: new Date().toISOString(),
      clock_out_latitude: adminJobLocationCheck.latitude,
      clock_out_longitude: adminJobLocationCheck.longitude,
      clock_out_accuracy_meters: adminJobLocationCheck.accuracy,
      clock_out_distance_meters: adminJobLocationCheck.distance,
      is_saved: true,
    }).eq("id", adminActiveEntry.id).select("*").single();
    if (error) toast.error(error.message);
    else {
      setAdminActiveEntry(null);
      setAdminTimeEntries((entries) => [data, ...entries.filter((entry) => entry.id !== data.id)]);
      toast.success("Clock-out saved");
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <AlertDialog open={!!pendingRoleChange} onOpenChange={(open) => { if (!open) setPendingRoleChange(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm role change</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingRoleChange ? `Change ${employeeLabel(pendingRoleChange.targetUserId)} from ${roleOptions.find((option) => option.value === pendingRoleChange.currentRole)?.label ?? pendingRoleChange.currentRole} to ${roleOptions.find((option) => option.value === pendingRoleChange.nextRole)?.label ?? pendingRoleChange.nextRole}?` : "Confirm this role change?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSaveUserRole}>Save role</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!pendingReschedule} onOpenChange={(open) => { if (!open && !reschedulingJob) setPendingReschedule(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Pull next job earlier?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingReschedule
                ? `You finished "${pendingReschedule.completedJob.job_name}" ${pendingReschedule.daysSaved} day${pendingReschedule.daysSaved === 1 ? "" : "s"} ahead of schedule. Move "${pendingReschedule.nextJob.job_name}" from ${formatDate(pendingReschedule.nextJob.scheduled_start_date)} to ${formatDate(pendingReschedule.newStartDate)}? An alert email will be sent to your admin contact.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={reschedulingJob}>Skip</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); applyReschedule(); }} disabled={reschedulingJob}>{reschedulingJob ? "Saving..." : "Move job"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={!!scheduleDialog} onOpenChange={(open) => { if (!open && !savingSchedule) setScheduleDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{scheduleDialog?.editingId ? "Edit scheduled job" : "Queue a job"}</DialogTitle>
            <DialogDescription>{scheduleDialog ? (scheduleDialog.editingId ? `Update the schedule for ${formatDate(scheduleDialog.date)}.` : `Pick a job to start on ${formatDate(scheduleDialog.date)}. Everyone assigned to the job will be queued for that date.`) : ""}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Job</Label>
              <Select value={scheduleForm.jobId} onValueChange={(value) => setScheduleForm((f) => ({ ...f, jobId: value }))} disabled={!!scheduleDialog?.editingId}>
                <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
                <SelectContent>
                  {activeJobs.length ? activeJobs.map((job) => {
                    const count = employeeAssignments.filter((a) => a.job_id === job.id).length;
                    return <SelectItem key={job.id} value={job.id}>{job.job_name} — {count} assigned</SelectItem>;
                  }) : <SelectItem value="__none" disabled>No active jobs</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Start time (optional)</Label>
                <Input type="time" value={scheduleForm.startTime} onChange={(event) => setScheduleForm((f) => ({ ...f, startTime: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Estimated duration (days)</Label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={scheduleForm.durationDays}
                  onChange={(event) => setScheduleForm((f) => ({ ...f, durationDays: Math.max(1, Math.floor(Number(event.target.value) || 1)) }))}
                />
                {scheduleDialog && scheduleForm.durationDays > 1 ? (
                  <p className="text-xs text-muted-foreground">Spans {formatDate(scheduleDialog.date)} → {formatDate(addDaysIso(scheduleDialog.date, scheduleForm.durationDays - 1))}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Job will be queued across this many consecutive days.</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea maxLength={1000} value={scheduleForm.note} onChange={(event) => setScheduleForm((f) => ({ ...f, note: event.target.value }))} placeholder="Crew kickoff, materials reminder, etc." />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setScheduleDialog(null)} disabled={savingSchedule}>{t("common.cancel")}</Button>
            <Button type="button" onClick={saveJobSchedule} disabled={savingSchedule || !scheduleForm.jobId}>{savingSchedule ? "Saving..." : (scheduleDialog?.editingId ? "Save changes" : "Queue job")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!setPwTarget} onOpenChange={(open) => { if (!open && !setPwSaving) { setSetPwTarget(null); setSetPwShown(null); setSetPwValue(""); setSetPwConfirm(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set temporary password</DialogTitle>
            <DialogDescription>
              {setPwTarget ? `Set a password for ${setPwTarget.display_name || setPwTarget.email || "this employee"} right now. Share it privately — they can change it later from their profile.` : ""}
            </DialogDescription>
          </DialogHeader>
          {setPwShown ? (
            <div className="space-y-3">
              <div className="rounded-lg border bg-secondary p-3 text-sm">
                <p className="font-medium">Password set successfully.</p>
                <p className="mt-1 text-muted-foreground">Copy and share this password securely. It won't be shown again.</p>
                <div className="mt-3 grid gap-2">
                  <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("emp.email")}</Label><Input readOnly value={setPwShown.email} /></div>
                  <div><Label className="text-xs uppercase tracking-wide text-muted-foreground">Password</Label><Input readOnly value={setPwShown.password} /></div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { navigator.clipboard?.writeText(setPwShown.password); toast.success("Password copied"); }}>Copy password</Button>
                <Button type="button" onClick={() => { setSetPwTarget(null); setSetPwShown(null); }}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>New password</Label>
                <Input type="text" autoComplete="off" value={setPwValue} onChange={(e) => setSetPwValue(e.target.value)} placeholder="At least 8 characters" />
              </div>
              <div className="space-y-2">
                <Label>Confirm password</Label>
                <Input type="text" autoComplete="off" value={setPwConfirm} onChange={(e) => setSetPwConfirm(e.target.value)} placeholder="Re-enter the password" />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={generateRandomPassword}>Generate a random one</Button>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setSetPwTarget(null)} disabled={setPwSaving}>{t("common.cancel")}</Button>
                <Button type="button" onClick={submitSetPassword} disabled={setPwSaving}>{setPwSaving ? "Saving..." : "Set password"}</Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={!!pendingArchiveJob} onOpenChange={(open) => { if (!open && !archivingJob) { setPendingArchiveJob(null); setArchiveConfirmText(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive "{pendingArchiveJob?.job_name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              The job and its time entries stay in your records, but it will be hidden from active lists. You can reopen it later from the Archived jobs view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="archive-confirm-input">Type <span className="font-mono font-semibold text-foreground">DELETE</span> to confirm</Label>
            <Input
              id="archive-confirm-input"
              autoFocus
              value={archiveConfirmText}
              onChange={(event) => setArchiveConfirmText(event.target.value)}
              placeholder="DELETE"
              disabled={archivingJob}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={archivingJob}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => { event.preventDefault(); confirmArchiveJob(); }}
              disabled={archivingJob || archiveConfirmText.trim() !== "DELETE"}
            >
              {archivingJob ? "Archiving..." : "Archive job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!pendingEmployeeDelete} onOpenChange={(open) => { if (!open && !deletingEmployee) setPendingEmployeeDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete employee?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingEmployeeDelete ? `Delete ${pendingEmployeeDelete.display_name || pendingEmployeeDelete.email || "this employee"}? This removes their profile, job assignments, PTO records, time entries, and login access.` : "Delete this employee?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingEmployee}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteEmployee} disabled={deletingEmployee}>{deletingEmployee ? "Deleting..." : "Delete employee"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!overrideClockOutTarget} onOpenChange={(open) => { if (!open) setOverrideClockOutTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clock out with GPS override?</AlertDialogTitle>
            <AlertDialogDescription>
              {overrideClockOutTarget ? `${employeeLabel(overrideClockOutTarget.employee_user_id)} will be clocked out of ${jobLabel(overrideClockOutTarget.job_id)} right now, bypassing the GPS check.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Override reason</Label>
            <Input value={overrideClockOutReason} onChange={(event) => setOverrideClockOutReason(event.target.value)} placeholder="Reason for GPS override" maxLength={200} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={adminOverrideClockOut}>Clock out (override)</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={overrideClockInOpen} onOpenChange={setOverrideClockInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clock in employee (GPS override)</DialogTitle>
            <DialogDescription>Manually clock an employee into a job, skipping the GPS check.</DialogDescription>
          </DialogHeader>
          {(() => {
            const selectedEmpId = overrideClockInForm.employee_user_id;
            const activeEntryForSelected = selectedEmpId ? adminTimeEntries.find((entry) => entry.employee_user_id === selectedEmpId && entry.clock_in_at && !entry.clock_out_at) : null;
            const availableJobs = selectedEmpId ? assignedJobsFor(selectedEmpId).filter((job) => !job.archived_at) : [];
            return (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={selectedEmpId || undefined} onValueChange={(value) => setOverrideClockInForm((current) => ({ ...current, employee_user_id: value, job_id: "" }))}>
                    <SelectTrigger className="h-11"><SelectValue placeholder="Choose employee" /></SelectTrigger>
                    <SelectContent>
                      {employees.filter((employee) => employee.user_id !== userId).map((employee) => {
                        const role = userRoles[employee.user_id] ?? "—";
                        return <SelectItem key={employee.user_id} value={employee.user_id}>{(employee.display_name || employee.email || "Employee")} — {role}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Job</Label>
                  <Select value={overrideClockInForm.job_id || undefined} onValueChange={(value) => setOverrideClockInForm((current) => ({ ...current, job_id: value }))} disabled={!!activeEntryForSelected}>
                    <SelectTrigger className="h-11"><SelectValue placeholder={selectedEmpId ? "Choose job" : "Choose employee first"} /></SelectTrigger>
                    <SelectContent>
                      {availableJobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.job_name} — {job.address}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {activeEntryForSelected ? (
                    <p className="text-xs text-destructive">This user is already clocked into {jobLabel(activeEntryForSelected.job_id)}. Clock them out first using the override clock-out button.</p>
                  ) : selectedEmpId && availableJobs.length === 0 ? (
                    <p className="text-xs text-destructive">This user has no assigned jobs. Assign them in the Employees panel, or create a job for the company.</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Override reason</Label>
                  <Input value={overrideClockInForm.reason} onChange={(event) => setOverrideClockInForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Reason for GPS override" maxLength={200} />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOverrideClockInOpen(false)}>{t("common.cancel")}</Button>
            <Button type="button" onClick={adminOverrideClockIn}><Play className="h-4 w-4" />Clock in (override)</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={missedClockInOpen} onOpenChange={setMissedClockInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fix missed clock-in</DialogTitle>
            <DialogDescription>Start a clock-in for an employee at the time they actually began work. They'll show as currently clocked in until they (or you) clock them out.</DialogDescription>
          </DialogHeader>
          {(() => {
            const selectedEmpId = missedClockInForm.employee_user_id;
            const activeEntryForSelected = selectedEmpId ? adminTimeEntries.find((entry) => entry.employee_user_id === selectedEmpId && entry.clock_in_at && !entry.clock_out_at) : null;
            const availableJobs = selectedEmpId ? assignedJobsFor(selectedEmpId).filter((job) => !job.archived_at) : [];
            const eligibleEmployees = employees.filter((employee) => employee.user_id !== userId && !adminTimeEntries.some((entry) => entry.employee_user_id === employee.user_id && entry.clock_in_at && !entry.clock_out_at));
            return (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Employee</Label>
                  <Select value={selectedEmpId || undefined} onValueChange={(value) => setMissedClockInForm((current) => ({ ...current, employee_user_id: value, job_id: "" }))}>
                    <SelectTrigger className="h-11"><SelectValue placeholder={eligibleEmployees.length ? "Choose employee" : "All employees are already clocked in"} /></SelectTrigger>
                    <SelectContent>
                      {eligibleEmployees.map((employee) => {
                        const role = userRoles[employee.user_id] ?? "—";
                        return <SelectItem key={employee.user_id} value={employee.user_id}>{(employee.display_name || employee.email || "Employee")} — {role}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                  {selectedEmpId && activeEntryForSelected ? (
                    <p className="text-xs text-destructive">Already clocked into {jobLabel(activeEntryForSelected.job_id)}. Clock them out before adding a missed punch.</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Job</Label>
                  <Select value={missedClockInForm.job_id || undefined} onValueChange={(value) => setMissedClockInForm((current) => ({ ...current, job_id: value }))} disabled={!selectedEmpId || !!activeEntryForSelected}>
                    <SelectTrigger className="h-11"><SelectValue placeholder={selectedEmpId ? "Choose job" : "Choose employee first"} /></SelectTrigger>
                    <SelectContent>
                      {availableJobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.job_name} — {job.address}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {selectedEmpId && !activeEntryForSelected && availableJobs.length === 0 ? (
                    <p className="text-xs text-destructive">This user has no assigned jobs. Assign them in the Employees panel first.</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label>Actual clock-in date & time</Label>
                  <Input type="datetime-local" value={missedClockInForm.clock_in_at} onChange={(event) => setMissedClockInForm((current) => ({ ...current, clock_in_at: event.target.value }))} />
                  <p className="text-xs text-muted-foreground">When the employee actually started working. Cannot be in the future.</p>
                </div>
                <div className="space-y-2">
                  <Label>Reason / note</Label>
                  <Input value={missedClockInForm.reason} onChange={(event) => setMissedClockInForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Reason for the correction" maxLength={200} />
                </div>
              </div>
            );
          })()}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMissedClockInOpen(false)}>{t("common.cancel")}</Button>
            <Button type="button" onClick={submitMissedClockIn}><Clock3 className="h-4 w-4" />Add missed clock-in</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={editEntryDialog.open} onOpenChange={(open) => setEditEntryDialog((current) => ({ ...current, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editEntryDialog.mode === "create" ? "Add manual time entry" : "Edit time entry"}</DialogTitle>
            <DialogDescription>{editEntryDialog.mode === "create" ? "Create a time entry on behalf of an employee." : "Adjust clock-in, clock-out, and break for this entry."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {editEntryDialog.mode === "create" ? (
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={editEntryDialog.employee_user_id || undefined} onValueChange={(value) => setEditEntryDialog((current) => ({ ...current, employee_user_id: value, job_id: "" }))}>
                  <SelectTrigger className="h-11"><SelectValue placeholder="Choose employee" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => <SelectItem key={employee.user_id} value={employee.user_id}>{employee.display_name || employee.email || "Employee"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Employee: <span className="font-medium text-foreground">{employeeLabel(editEntryDialog.employee_user_id)}</span></p>
            )}
            <div className="space-y-2">
              <Label>Job</Label>
              <Select value={editEntryDialog.job_id || undefined} onValueChange={(value) => setEditEntryDialog((current) => ({ ...current, job_id: value }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Choose job" /></SelectTrigger>
                <SelectContent>
                  {activeJobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.job_name} — {job.address}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Work date</Label>
                <Input type="date" value={editEntryDialog.work_date} onChange={(event) => setEditEntryDialog((current) => ({ ...current, work_date: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Hours worked</Label>
                <Input type="number" min="0" step="0.25" placeholder="e.g. 8" value={editEntryDialog.hours_worked} onChange={(event) => setEditEntryDialog((current) => ({ ...current, hours_worked: event.target.value, clock_in_at: "", clock_out_at: "" }))} />
                <p className="text-xs text-muted-foreground">Fastest way: enter total hours and we’ll record the shift starting 8:00 AM.</p>
              </div>
              <div className="space-y-2">
                <Label>Break minutes</Label>
                <Input type="number" min="0" value={editEntryDialog.break_minutes} onChange={(event) => setEditEntryDialog((current) => ({ ...current, break_minutes: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Clock in (optional)</Label>
                <Input type="datetime-local" value={editEntryDialog.clock_in_at} onChange={(event) => setEditEntryDialog((current) => ({ ...current, clock_in_at: event.target.value, hours_worked: "" }))} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Clock out (optional)</Label>
                <Input type="datetime-local" value={editEntryDialog.clock_out_at} onChange={(event) => setEditEntryDialog((current) => ({ ...current, clock_out_at: event.target.value, hours_worked: "" }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Adjustment note (optional)</Label>
              <Textarea maxLength={500} value={editEntryDialog.note} onChange={(event) => setEditEntryDialog((current) => ({ ...current, note: event.target.value }))} placeholder="e.g. Employee forgot to clock in, adjusting to actual start time" />
            </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {editEntryDialog.mode === "edit" ? (
              <Button type="button" variant="destructive" onClick={deleteEntryFromDialog}><Trash2 className="h-4 w-4" />Delete entry</Button>
            ) : <span />}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setEditEntryDialog((current) => ({ ...current, open: false }))}>{t("common.cancel")}</Button>
              <Button type="button" onClick={submitEditEntry}><Save className="h-4 w-4" />{editEntryDialog.mode === "create" ? "Create entry" : "Save changes"}</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={backlogDialog.open} onOpenChange={(open) => setBacklogDialog((current) => ({ ...current, open }))}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bulk week entry</DialogTitle>
            <DialogDescription>Quickly enter past shifts for an employee. Pick a job, date, and hours per row, then save them all at once.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select value={backlogDialog.employee_user_id || undefined} onValueChange={(value) => setBacklogDialog((current) => ({ ...current, employee_user_id: value }))}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Choose employee" /></SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => <SelectItem key={employee.user_id} value={employee.user_id}>{employee.display_name || employee.email || "Employee"}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              {backlogDialog.rows.map((row, index) => (
                <div key={index} className={`rounded-lg border p-3 space-y-2 ${row.status === "saved" ? "border-success/50 bg-success/5" : row.status === "error" ? "border-destructive/50 bg-destructive/5" : "bg-card"}`}>
                  <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.6fr_90px_90px]">
                    <div className="space-y-1"><Label className="text-xs">Start date</Label><Input type="date" value={row.start_date} onChange={(e) => updateBacklogRow(index, { start_date: e.target.value, end_date: row.end_date && row.end_date >= e.target.value ? row.end_date : e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">End date</Label><Input type="date" value={row.end_date} min={row.start_date} onChange={(e) => updateBacklogRow(index, { end_date: e.target.value })} /></div>
                    <div className="space-y-1">
                      <Label className="text-xs">Job</Label>
                      <Select value={row.job_id || undefined} onValueChange={(value) => updateBacklogRow(index, { job_id: value })}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Choose job" /></SelectTrigger>
                        <SelectContent>{activeJobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.job_name} — {job.address}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className="text-xs">Hours/day</Label><Input type="number" min="0" step="0.25" value={row.hours_worked} onChange={(e) => updateBacklogRow(index, { hours_worked: e.target.value })} /></div>
                    <div className="space-y-1"><Label className="text-xs">Break (min)</Label><Input type="number" min="0" value={row.break_minutes} onChange={(e) => updateBacklogRow(index, { break_minutes: e.target.value })} /></div>
                  </div>
                  <Input placeholder="Optional note" value={row.note} onChange={(e) => updateBacklogRow(index, { note: e.target.value })} />
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <label className="flex items-center gap-2 text-muted-foreground">
                      <input type="checkbox" checked={row.weekdays_only} onChange={(e) => updateBacklogRow(index, { weekdays_only: e.target.checked })} />
                      Weekdays only (skip Sat/Sun)
                    </label>
                    {(() => {
                      const days = expandBacklogDates(row).length;
                      const total = days * (Number(row.hours_worked) || 0);
                      return <span className="text-muted-foreground">{days} day{days === 1 ? "" : "s"} · {total} hours total</span>;
                    })()}
                  </div>
                  {row.status === "saved" ? <p className="text-xs text-success">Saved {row.saved_count || ""} {row.saved_count === 1 ? "entry" : "entries"}{row.error ? ` (some skipped: ${row.error})` : ""}</p> : null}
                  {row.status === "saving" ? <p className="text-xs text-muted-foreground">Saving…</p> : null}
                  {row.status === "error" ? <p className="text-xs text-destructive">{row.error || "Failed to save"}</p> : null}
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => setBacklogDialog((current) => ({ ...current, rows: [...current.rows, newBacklogRow()] }))}><Plus className="h-4 w-4" />Add row</Button>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setBacklogDialog((current) => ({ ...current, open: false }))} disabled={backlogDialog.saving}>Close</Button>
            <Button type="button" onClick={submitBacklog} disabled={backlogDialog.saving}>{backlogDialog.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save all</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <section className="rounded-lg border border-primary/30 bg-card p-4 shadow-[var(--shadow-panel)] sm:p-5">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><MapPin className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{managerOnly ? "Manager job sites" : "Job sites"}</p>
            <h1 className="text-2xl font-semibold tracking-normal">Quick access</h1>
          </div>
        </div>
        {activeJobs.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {activeJobs.map((job) => {
              const isClockedIntoJob = adminActiveJobId === job.id;
              return (
              <Button key={job.id} type="button" variant={selectedAdminJobId === job.id ? "default" : "outline"} className="h-auto min-h-24 justify-start p-4 text-left" onClick={() => { if (selectedAdminJobId === job.id) return; setSelectedAdminJobId(job.id); setAdminJobLocationCheck({ status: "idle", message: "Tap Refresh GPS to confirm your location.", jobId: job.id }); }}>
                {isClockedIntoJob ? <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-success" /> : <XCircle className="mt-1 h-5 w-5 shrink-0 text-destructive" />}
                <span className="min-w-0">
                  <span className="block font-semibold text-foreground">{job.address}</span>
                  <span className="mt-1 block text-sm text-muted-foreground">{job.job_name} · {job.city}, {job.state}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{isClockedIntoJob ? "Clocked in" : "Clocked out"}</span>
                </span>
              </Button>
            );})}
          </div>
        ) : <p className="text-sm text-muted-foreground">Create or unarchive jobs below to show active address buttons here.</p>}
        {selectedAdminJob ? (
          <div className="mt-4 rounded-lg border border-primary/30 bg-secondary p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Job details</p>
                <h2 className="mt-1 text-2xl font-semibold tracking-normal">{selectedAdminJob.address}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{selectedAdminJob.job_name} · {selectedAdminJob.city}, {selectedAdminJob.state}</p>
                {selectedAdminJob.job_description ? <p className="mt-2 text-sm">{selectedAdminJob.job_description}</p> : null}
                {managerOnly && selectedAdminJob.manager_notes ? <p className="mt-2 rounded-md border bg-card p-3 text-sm">{selectedAdminJob.manager_notes}</p> : null}
                {selectedAdminJob.archived_at ? <p className="mt-2 rounded-md border bg-card p-3 text-sm font-medium text-muted-foreground">Archived {formatDate(selectedAdminJob.archived_at)}</p> : null}
                <p className="mt-2 text-xs text-muted-foreground">{selectedAdminJob.latitude != null && selectedAdminJob.longitude != null ? `GPS pin: ${selectedAdminJob.latitude.toFixed(6)}, ${selectedAdminJob.longitude.toFixed(6)} · 100m geofence` : "No GPS pin set"}</p>
                {selectedJobPinDraft ? (
                  <div className="mt-3 grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2">
                    <div className="space-y-2"><Label>Pin latitude</Label><Input type="number" step="0.000001" value={selectedJobPinDraft.latitude} onChange={(event) => setJobPinDraft((current) => current?.jobId === selectedAdminJob.id ? { ...current, latitude: event.target.value } : current)} /></div>
                    <div className="space-y-2"><Label>Pin longitude</Label><Input type="number" step="0.000001" value={selectedJobPinDraft.longitude} onChange={(event) => setJobPinDraft((current) => current?.jobId === selectedAdminJob.id ? { ...current, longitude: event.target.value } : current)} /></div>
                    {selectedJobPinDraft.accuracy ? <p className="text-xs text-muted-foreground sm:col-span-2">GPS accuracy: {Math.round(selectedJobPinDraft.accuracy)} meters</p> : null}
                  </div>
                ) : null}
                <p className="mt-2 text-sm font-medium">Status: {adminActiveEntry ? `Clocked in at ${formatDateTime(adminActiveEntry.clock_in_at)}` : "Clocked out"}{adminActiveEntry?.is_late ? <span className="ml-2 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">Late +{adminActiveEntry.late_minutes ?? 0}m</span> : null}{adminActiveEntry?.paid_start_at && adminActiveEntry.clock_in_at && adminActiveEntry.paid_start_at !== adminActiveEntry.clock_in_at ? <span className="ml-2 text-xs italic text-muted-foreground">Paid from {formatDateTime(adminActiveEntry.paid_start_at)}</span> : null}</p>
                <p className="mt-1 text-sm text-muted-foreground">{adminJobLocationCheck.message}</p>
                {adminJobLocationCheck.distance != null ? <p className="mt-1 text-xs text-muted-foreground">Distance: {Math.round(adminJobLocationCheck.distance)} meters · Accuracy: {Math.round(adminJobLocationCheck.accuracy ?? 0)} meters · Radius: {GEOFENCE_RADIUS_METERS} meters</p> : null}
                {adminJobLocationCheck.latitude != null && adminJobLocationCheck.longitude != null ? <p className="mt-1 text-xs text-muted-foreground">Your location: {adminJobLocationCheck.latitude.toFixed(6)}, {adminJobLocationCheck.longitude.toFixed(6)}</p> : null}
              </div>
              <div className="grid w-full gap-2 sm:w-auto sm:min-w-44">
                {selectedJobPinDraft ? (
                  <>
                    <Button type="button" variant="outline" onClick={() => setSelectedJobPinHere(selectedAdminJob)} disabled={selectedJobPinDraft.isLocating || selectedJobPinDraft.isSaving}>
                      {selectedJobPinDraft.isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      Set Pin Here
                    </Button>
                    <Button type="button" onClick={() => saveSelectedJobPin(selectedAdminJob)} disabled={selectedJobPinDraft.isLocating || selectedJobPinDraft.isSaving}>
                      {selectedJobPinDraft.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Pin
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => setJobPinDraft(null)} disabled={selectedJobPinDraft.isSaving}>{t("common.cancel")}</Button>
                  </>
                ) : (
                  <Button type="button" variant="outline" onClick={() => startJobPinEdit(selectedAdminJob)}><Edit3 className="h-4 w-4" />Edit Pin</Button>
                )}
                {!managerOnly ? <Button type="button" variant="outline" onClick={() => { editJob(selectedAdminJob); scrollToJobForm(); }}><Edit3 className="h-4 w-4" />Edit job details</Button> : null}
                <Button type="button" variant="outline" onClick={() => checkAdminJobLocation(selectedAdminJob)} disabled={adminJobLocationCheck.status === "checking"}>
                  {adminJobLocationCheck.status === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                  {adminJobLocationCheck.latitude != null ? "Refresh Location" : "Check GPS"}
                </Button>
                {!managerOnly && selectedAdminJob.archived_at ? <Button type="button" variant="outline" onClick={() => unarchiveJob(selectedAdminJob)}><ArchiveRestore className="h-4 w-4" />Unarchive</Button> : null}
                {!managerOnly ? <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteJob(selectedAdminJob)}><Trash2 className="h-4 w-4" />Archive job</Button> : null}
                <Button type="button" onClick={adminClockIn} disabled={!!adminActiveEntry || !!selectedAdminJob.archived_at}><Play className="h-4 w-4" />Clock in</Button>
                <Button type="button" variant="outline" onClick={adminClockOut} disabled={!adminActiveEntry}><Square className="h-4 w-4" />Clock out</Button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {managerOnly ? (
        <section className="sticky top-3 z-10 rounded-lg border border-primary/30 bg-card/95 p-4 shadow-[var(--shadow-panel)] backdrop-blur">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Clock3 className="h-6 w-6" /></span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Current status</p>
                <p className="text-xl font-semibold tracking-normal">{adminActiveEntry ? `Clocked in at ${currentActiveJob?.address ?? "selected job"}` : "Clocked out"}</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground sm:text-right">
              <p>{adminActiveEntry ? `Since ${formatDateTime(adminActiveEntry.clock_in_at)}` : "Select a job to clock in"}</p>
              <p>{adminJobLocationCheck.message}</p>
            </div>
          </div>
        </section>
      ) : null}


      {(() => {
        if (loading) return null;
        const weekStart = weekStartIso(today());
        const weekEnd = addDaysIso(weekStart, 6);
        const weekDays = Array.from({ length: 5 }, (_, i) => addDaysIso(weekStart, i));
        const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri"];
        const openEntries = adminTimeEntries.filter((e) => e.clock_in_at && !e.clock_out_at);
        const openByEmployee = new Map(openEntries.map((e) => [e.employee_user_id, e] as const));
        const openByJob = new Map<string, typeof openEntries>();
        openEntries.forEach((e) => {
          if (!e.job_id) return;
          const list = openByJob.get(e.job_id) ?? [];
          list.push(e);
          openByJob.set(e.job_id, list);
        });
        const activeJobs = jobs.filter((j) => !j.archived_at);
        const jobsWithOpen = activeJobs
          .map((j) => ({ job: j, count: (openByJob.get(j.id) ?? []).length, latest: (openByJob.get(j.id) ?? []).reduce<string | null>((acc, e) => !acc || (e.clock_in_at ?? "") > acc ? (e.clock_in_at ?? acc) : acc, null) }))
          .sort((a, b) => b.count - a.count);
        const activeJobsNow = jobsWithOpen.filter((x) => x.count > 0);
        const employeeInitials = (e: EmployeeRow) => {
          const name = e.display_name || e.email || "?";
          return name.split(/\s+/).map((s) => s[0]).join("").slice(0, 2).toUpperCase();
        };
        const quickEmp = quickViewEmployeeId ? employees.find((e) => e.user_id === quickViewEmployeeId) ?? null : null;

        return (
          <section className="space-y-3">
            {!emailBannerDismissed && !managerOnly ? (
              <div className="flex items-start gap-3 rounded-lg border border-amber-500/40 bg-amber-50 px-4 py-3 text-sm shadow-[var(--shadow-panel)] dark:bg-amber-950/30">
                <MailWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Email sending isn't fully set up yet.</p>
                  <p className="mt-0.5 text-muted-foreground">Payroll, weekly, and analytics reports may fail to deliver until your branded sender domain is verified. Finish setup in your project's Cloud → Emails settings.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => { window.sessionStorage.setItem("pcp-email-banner-dismissed", "1"); setEmailBannerDismissed(true); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : null}

            {(() => {
              const todayIso = today();
              const companyMinutesToday = employees.reduce((acc, emp) => acc + employeeHoursForRange(emp.user_id, todayIso, todayIso), 0);
              const weekDayMinutes = weekDays.map((d) => employees.reduce((acc, emp) => acc + employeeHoursForRange(emp.user_id, d, d), 0));
              const weekTotalMinutes = weekDayMinutes.reduce((a, b) => a + b, 0);
              const maxDayMin = Math.max(1, ...weekDayMinutes);
              // Upcoming = active jobs with zero time entries in the past 7 days (queue proxy)
              const recentJobIds = new Set(adminTimeEntries.filter((e) => e.work_date && e.work_date >= addDaysIso(todayIso, -7)).map((e) => e.job_id).filter(Boolean) as string[]);
              const upcomingJobs = activeJobs.filter((j) => !recentJobIds.has(j.id));

              return (
                <>
                  <div className="grid gap-3 lg:grid-cols-3">
                    {/* Active Now — spans 2 cols, primary focus */}
                    <div className="rounded-lg border border-emerald-500/30 bg-card p-4 shadow-[var(--shadow-panel)] lg:col-span-2">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600"><Activity className="h-5 w-5" /></span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Actively Working</p>
                          <p className="text-lg font-semibold leading-none">{openEntries.length} clocked in · {activeJobsNow.length} job{activeJobsNow.length === 1 ? "" : "s"}</p>
                        </div>
                      </div>
                      <ul className="grid gap-1 sm:grid-cols-2">
                        {activeJobsNow.slice(0, 8).map(({ job, count, latest }) => (
                          <li key={job.id} className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-2 py-1.5 text-sm">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" />
                              <span className="truncate font-medium">{job.job_name}</span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">{count} · {latest ? new Date(latest).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : ""}</span>
                          </li>
                        ))}
                        {!activeJobsNow.length ? <li className="px-2 py-3 text-sm text-muted-foreground">No one is clocked in right now.</li> : null}
                      </ul>
                    </div>

                    {/* Working Hours — today + week */}
                    <div className="rounded-lg border border-primary/20 bg-card p-4 shadow-[var(--shadow-panel)]">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Timer className="h-5 w-5" /></span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Working Hours</p>
                          <p className="text-lg font-semibold leading-none">{formatHours(companyMinutesToday)} today</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-5 gap-1 text-center">
                        {weekDays.map((d, i) => (
                          <div key={d} className="flex flex-col items-center gap-1">
                            <div className="flex h-12 w-full items-end rounded bg-muted/40">
                              <div className="w-full rounded bg-primary/70" style={{ height: `${Math.max(6, (weekDayMinutes[i] / maxDayMin) * 100)}%` }} />
                            </div>
                            <p className="text-[10px] font-medium text-muted-foreground">{dayLabels[i]}</p>
                            <p className="text-[10px] font-semibold tabular-nums">{(weekDayMinutes[i] / 60).toFixed(1)}</p>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2 text-right text-xs font-semibold">Week: <span className="tabular-nums">{formatHours(weekTotalMinutes)}</span></p>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {/* Upcoming / In-queue jobs */}
                    <div className="rounded-lg border border-primary/20 bg-card p-4 shadow-[var(--shadow-panel)]">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-amber-500/10 text-amber-600"><CalendarClock className="h-5 w-5" /></span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Upcoming / In Queue</p>
                          <p className="text-lg font-semibold leading-none">{upcomingJobs.length} job{upcomingJobs.length === 1 ? "" : "s"} waiting</p>
                        </div>
                      </div>
                      <ul className="space-y-1">
                        {upcomingJobs.slice(0, 5).map((job) => (
                          <li key={job.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500/70" />
                              <span className="truncate font-medium">{job.job_name}</span>
                            </span>
                            <span className="shrink-0 truncate text-xs text-muted-foreground">{[job.city, job.state].filter(Boolean).join(", ") || "—"}</span>
                          </li>
                        ))}
                        {!upcomingJobs.length ? <li className="px-2 py-1.5 text-sm text-muted-foreground">No jobs in queue. (Based on no activity in the last 7 days.)</li> : null}
                      </ul>
                      {upcomingJobs.length ? <p className="mt-2 text-[10px] text-muted-foreground">Based on no clock-ins in the last 7 days.</p> : null}
                    </div>

                    {/* Job Sites — condensed */}
                    <div className="rounded-lg border border-primary/20 bg-card p-4 shadow-[var(--shadow-panel)]">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary"><Building2 className="h-5 w-5" /></span>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Job Sites</p>
                          <p className="text-lg font-semibold leading-none">{activeJobs.length} active</p>
                        </div>
                      </div>
                      <ul className="space-y-1">
                        {jobsWithOpen.slice(0, 4).map(({ job, count }) => (
                          <li key={job.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                            <span className="flex min-w-0 items-center gap-2">
                              <span className={`h-2 w-2 shrink-0 rounded-full ${count > 0 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]" : "bg-muted-foreground/30"}`} />
                              <span className="truncate font-medium">{job.job_name}</span>
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">{count > 0 ? `${count} on site` : "—"}</span>
                          </li>
                        ))}
                        {!activeJobs.length ? <li className="px-2 py-1.5 text-sm text-muted-foreground">No active jobs.</li> : null}
                      </ul>
                    </div>
                  </div>

                  {/* Employees — moved to bottom */}
                  <div className="rounded-lg border border-primary/20 bg-card p-4 shadow-[var(--shadow-panel)]">
                    <div className="mb-3 flex items-center gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-accent/30 text-accent-foreground"><UsersRound className="h-5 w-5" /></span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{t("nav.employees")}</p>
                        <p className="text-lg font-semibold leading-none">{openEntries.length}/{employees.length} on the clock</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {employees.map((emp) => {
                        const isOpen = openByEmployee.has(emp.user_id);
                        return (
                          <Popover key={emp.user_id} open={quickViewEmployeeId === emp.user_id} onOpenChange={(o) => setQuickViewEmployeeId(o ? emp.user_id : null)}>
                            <PopoverTrigger asChild>
                              <button type="button" title={emp.display_name || emp.email || "Employee"} className={`relative flex h-9 w-9 items-center justify-center rounded-full border text-xs font-semibold transition ${isOpen ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"}`}>
                                {employeeInitials(emp)}
                                <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-card ${isOpen ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]" : "bg-muted-foreground/30"}`} />
                              </button>
                            </PopoverTrigger>
                            <PopoverContent align="end" className="w-80 p-0">
                              {quickEmp && quickEmp.user_id === emp.user_id ? (() => {
                                const openEntry = openByEmployee.get(emp.user_id) ?? null;
                                const currentJob = openEntry ? jobs.find((j) => j.id === openEntry.job_id) : null;
                                const lastEntry = adminTimeEntries
                                  .filter((e) => e.employee_user_id === emp.user_id && e.clock_in_at)
                                  .sort((a, b) => (b.clock_in_at ?? "").localeCompare(a.clock_in_at ?? ""))[0];
                                const lastLat = openEntry?.clock_in_latitude ?? lastEntry?.clock_in_latitude ?? null;
                                const lastLng = openEntry?.clock_in_longitude ?? lastEntry?.clock_in_longitude ?? null;
                                const weekTotal = employeeHoursForRange(emp.user_id, weekStart, weekEnd);
                                return (
                                  <div className="space-y-3 p-4">
                                    <div className="flex items-start justify-between gap-2">
                                      <div>
                                        <p className="font-semibold leading-tight">{emp.display_name || emp.email}</p>
                                        <p className="text-xs text-muted-foreground">{isOpen ? `Clocked in${currentJob ? ` at ${currentJob.job_name}` : ""}` : "Off the clock"}</p>
                                      </div>
                                      <span className={`mt-1 h-2.5 w-2.5 rounded-full ${isOpen ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                                    </div>
                                    <div>
                                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">This week (Mon–Fri)</p>
                                      <div className="grid grid-cols-5 gap-1 text-center text-xs">
                                        {weekDays.map((d, i) => {
                                          const mins = employeeHoursForRange(emp.user_id, d, d);
                                          return (
                                            <div key={d} className="rounded-md border bg-muted/30 px-1 py-1.5">
                                              <p className="text-[10px] font-medium text-muted-foreground">{dayLabels[i]}</p>
                                              <p className="mt-0.5 text-xs font-semibold tabular-nums">{(mins / 60).toFixed(1)}</p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                      <p className="mt-2 text-right text-xs font-semibold">Week total: <span className="tabular-nums">{formatHours(weekTotal)}</span></p>
                                    </div>
                                    {lastLat != null && lastLng != null ? (
                                      <div className="flex items-start gap-2 rounded-md border bg-muted/20 px-2 py-1.5 text-xs">
                                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                        <span className="text-muted-foreground">Last clock-in: {Number(lastLat).toFixed(5)}, {Number(lastLng).toFixed(5)}</span>
                                      </div>
                                    ) : null}
                                    <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => {
                                      setReportEmployeeFilter(emp.user_id);
                                      setHoursViewMode("week");
                                      setWeekViewStart(weekStart);
                                      setQuickViewEmployeeId(null);
                                    }}>Open full week view</Button>
                                  </div>
                                );
                              })() : null}
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                      {!employees.length ? <p className="text-sm text-muted-foreground">No employees yet.</p> : null}
                    </div>
                  </div>
                </>
              );
            })()}
          </section>
        );
      })()}

      <Accordion type="multiple" defaultValue={setupMode ? ["company"] : undefined} className="space-y-4">
        {<AccordionItem value="active-workers" className="rounded-lg border border-primary/20 bg-card px-5 shadow-[var(--shadow-panel)] sm:px-7">
          <AccordionTrigger className="py-5 text-left hover:no-underline">
            <span className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BriefcaseBusiness className="h-6 w-6" /></span><span><span className="block text-2xl font-semibold tracking-normal">{t("nav.dashboard")}</span><span className="mt-1 block text-sm font-normal text-muted-foreground">Vea quién está trabajando y dónde.</span></span></span>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pb-6">
            {!managerOnly ? (
              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={openMissedClockInDialog}>
                  <Clock3 className="h-4 w-4" />Fix Missed Clock-In
                </Button>
                <Button type="button" variant="outline" onClick={() => setOverrideClockInOpen(true)}>
                  <ShieldCheck className="h-4 w-4" />Clock In Employee (GPS Override)
                </Button>
              </div>
            ) : null}
            {activeWorkers.length ? activeWorkers.map((entry) => (
              <div key={entry.id} className="rounded-lg border bg-secondary p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{employeeLabel(entry.employee_user_id)}</p>
                    <p className="text-sm text-muted-foreground">{jobLabel(entry.job_id)}</p>
                    {entry.override_by_admin ? <p className="mt-1 text-xs font-medium text-primary">Admin override · {entry.override_reason || "GPS bypassed"}</p> : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:items-end">
                    <div className="text-sm text-muted-foreground sm:text-right"><p>Clocked in {formatDateTime(entry.clock_in_at)}{entry.is_late ? <span className="ml-2 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">Late +{entry.late_minutes ?? 0}m</span> : null}</p><p>{formatHours(elapsedMinutes(entry))} elapsed</p></div>
                    {!managerOnly ? (
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openEditEntryDialog(entry)}><Edit3 className="h-3.5 w-3.5" />Edit</Button>
                        <Button type="button" size="sm" variant="destructive" onClick={() => { setOverrideClockOutReason("Admin override — GPS bypassed"); setOverrideClockOutTarget(entry); }}><Square className="h-3.5 w-3.5" />Clock Out (Override)</Button>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )) : <p className="text-sm text-muted-foreground">No employees are currently clocked in.</p>}
          </AccordionContent>
        </AccordionItem>}

        <AccordionItem value="hours" className="rounded-lg border border-primary/20 bg-card px-5 shadow-[var(--shadow-panel)] sm:px-7">
          <AccordionTrigger className="py-5 text-left hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground"><FileText className="h-6 w-6" /></span>
              <span>
                <span className="block text-2xl font-semibold tracking-normal">Hours Report</span>
                <span className="mt-1 block text-sm font-normal text-muted-foreground">Filter hours by employee, job, or week and export payroll-ready data.</span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <Tabs value={hoursViewMode} onValueChange={(value) => setHoursViewMode(value as "day" | "week")} className="space-y-4">
              <TabsList className="grid w-full max-w-sm grid-cols-2">
                <TabsTrigger value="day">Day view</TabsTrigger>
                <TabsTrigger value="week">Week view</TabsTrigger>
              </TabsList>

              <TabsContent value="day" className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px_160px_auto] lg:items-end">
                  <div className="space-y-2">
                    <Label>Employee</Label>
                    <Select value={reportEmployeeFilter} onValueChange={setReportEmployeeFilter}>
                      <SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All employees</SelectItem>
                        {employees.map((employee) => <SelectItem key={employee.user_id} value={employee.user_id}>{employee.display_name || employee.email || "User"}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Job</Label>
                    <Select value={reportJobFilter} onValueChange={setReportJobFilter}>
                      <SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All jobs</SelectItem>
                        {jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.address}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Start date</Label>
                    <Input className="h-11 bg-card" type="date" value={reportStartDate} max={reportEndDate || undefined} onChange={(event) => setReportStartDate(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End date</Label>
                    <Input className="h-11 bg-card" type="date" value={reportEndDate} min={reportStartDate || undefined} onChange={(event) => setReportEndDate(event.target.value)} />
                  </div>
                  <Button className="h-11" type="button" variant="outline" onClick={exportHoursReport}><Download className="h-4 w-4" />Export</Button>
                </div>
                <div className="rounded-lg border bg-secondary p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">Filtered total</p>
                      <p className="mt-1 text-sm text-muted-foreground">{reportRows.length} report {reportRows.length === 1 ? "entry" : "entries"}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-2xl font-semibold tracking-normal text-primary">{formatHours(reportTotalMinutes)}</p>
                      {!managerOnly ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button type="button" variant="outline" onClick={openBacklogDialog}><ListPlus className="h-4 w-4" />Bulk week entry</Button>
                            </TooltipTrigger>
                            <TooltipContent>Enter hours for multiple days or a whole week at once</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : null}
                      {!managerOnly ? <Button type="button" variant="outline" onClick={openCreateEntryDialog}><UserPlus className="h-4 w-4" />Add Manual Entry</Button> : null}
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  {reportDailyTotals.length ? reportDailyTotals.map((group) => (
                    <div key={`${group.employee_user_id}|${group.work_date}`} className="space-y-2 rounded-lg border border-primary/20 bg-secondary/30 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                        <div>
                          <p className="text-sm font-semibold">{employeeLabel(group.employee_user_id)} · {group.work_date}</p>
                          <p className="text-xs text-muted-foreground">
                            {Array.from(group.perJob.entries()).map(([jobId, mins]) => {
                              const job = jobs.find((j) => j.id === jobId);
                              return `${job?.job_name ?? "Unassigned"} ${formatHours(mins)}`;
                            }).join(" · ")}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-primary">Day total: {formatHours(group.total)}</p>
                      </div>
                      {group.entries.map((entry) => (
                        <div key={entry.id} className="rounded-lg border bg-card p-4">
                          <div className="grid gap-3 lg:grid-cols-[1fr_1fr_140px_auto] lg:items-center">
                            <div>
                              <p className="font-medium">{employeeLabel(entry.employee_user_id)}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{jobLabel(entry.job_id)}</p>
                              {entry.override_by_admin ? <p className="mt-1 text-xs font-medium text-primary">Admin override · {entry.override_reason || "GPS bypassed"}</p> : null}
                              {entry.adjusted_by_admin ? <p className="mt-1 text-xs font-medium text-accent-foreground">Edited by admin{entry.adjusted_at ? ` · ${formatDateTime(entry.adjusted_at)}` : ""}</p> : null}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <p>{entry.work_date}</p>
                              <p>{formatDateTime(entry.clock_in_at)} — {formatDateTime(entry.clock_out_at)}</p>
                            </div>
                            <div className="text-left lg:text-right">
                              <p className="font-semibold">{formatHours(entry.total_minutes || elapsedMinutes(entry))}</p>
                              <p className="text-xs text-muted-foreground">Break: {entry.break_minutes ?? 0} min</p>
                            </div>
                            {!managerOnly ? (
                              <Button type="button" size="sm" variant="outline" onClick={() => openEditEntryDialog(entry)}><Edit3 className="h-3.5 w-3.5" />Edit</Button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No hours match the selected filters.</p>}
                </div>
              </TabsContent>

              <TabsContent value="week" className="space-y-4">
                {(() => {
                  const dayCount = weekShowWeekend ? 7 : 5;
                  const days = Array.from({ length: dayCount }, (_, i) => addDaysIso(weekViewStart, i));
                  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
                  const employeeList = reportEmployeeFilter === "all" ? employees : employees.filter((e) => e.user_id === reportEmployeeFilter);
                  const weekEntries = adminTimeEntries.filter((e) => e.work_date >= days[0] && e.work_date <= days[days.length - 1]
                    && (reportJobFilter === "all" || e.job_id === reportJobFilter));
                  const grid = new Map<string, Map<string, Map<string, number>>>();
                  for (const e of weekEntries) {
                    const minutes = e.total_minutes || elapsedMinutes(e);
                    if (!minutes) continue;
                    const empMap = grid.get(e.employee_user_id) ?? new Map();
                    const dayMap = empMap.get(e.work_date) ?? new Map();
                    const jobKey = e.job_id ?? "unassigned";
                    dayMap.set(jobKey, (dayMap.get(jobKey) ?? 0) + minutes);
                    empMap.set(e.work_date, dayMap);
                    grid.set(e.employee_user_id, empMap);
                  }
                  const rows = employeeList.map((emp) => {
                    let weekTotal = 0;
                    const cells = days.map((d) => {
                      const dayMap = grid.get(emp.user_id)?.get(d);
                      if (!dayMap) return { total: 0, jobs: [] as { name: string; minutes: number }[] };
                      let total = 0;
                      const jobsList: { name: string; minutes: number }[] = [];
                      for (const [jobKey, mins] of dayMap.entries()) {
                        total += mins;
                        const job = jobs.find((j) => j.id === jobKey);
                        jobsList.push({ name: job?.job_name ?? "Unassigned", minutes: mins });
                      }
                      weekTotal += total;
                      return { total, jobs: jobsList };
                    });
                    return { emp, cells, weekTotal };
                  });
                  return (
                    <>
                      <div className="flex flex-wrap items-end gap-3">
                        <div className="space-y-2">
                          <Label>Employee</Label>
                          <Select value={reportEmployeeFilter} onValueChange={setReportEmployeeFilter}>
                            <SelectTrigger className="h-11 w-56 bg-card"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All employees</SelectItem>
                              {employees.map((employee) => <SelectItem key={employee.user_id} value={employee.user_id}>{employee.display_name || employee.email || "User"}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Job</Label>
                          <Select value={reportJobFilter} onValueChange={setReportJobFilter}>
                            <SelectTrigger className="h-11 w-56 bg-card"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All jobs</SelectItem>
                              {jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.address}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                          {!managerOnly ? (
                            <Button type="button" size="sm" onClick={() => setEditEntryDialog({ open: true, mode: "create", employee_user_id: "", job_id: "", work_date: today(), clock_in_at: "", clock_out_at: "", break_minutes: "30", hours_worked: "8", note: "" })}>
                              <UserPlus className="h-4 w-4" />Add manual entry
                            </Button>
                          ) : null}
                          <Button type="button" variant="outline" size="sm" onClick={() => setWeekViewStart(addDaysIso(weekViewStart, -7))}>← Prev</Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setWeekViewStart(weekStartIso(today()))}>This week</Button>
                          <Button type="button" variant="outline" size="sm" onClick={() => setWeekViewStart(addDaysIso(weekViewStart, 7))}>Next →</Button>
                          <label className="ml-2 flex items-center gap-2 rounded-lg border bg-secondary px-3 py-2 text-sm">
                            <Checkbox checked={weekShowWeekend} onCheckedChange={(v) => setWeekShowWeekend(v === true)} />
                            <span>Show weekend</span>
                          </label>
                        </div>
                      </div>
                      <div className="rounded-lg border bg-secondary/40 p-3">
                        <p className="text-sm font-medium">Week of {formatDate(days[0])} – {formatDate(days[days.length - 1])}</p>
                      </div>

                      <div className="hidden overflow-x-auto rounded-lg border md:block">
                        <table className="w-full text-sm">
                          <thead className="bg-secondary/60">
                            <tr>
                              <th className="px-3 py-2 text-left font-medium">Employee</th>
                              {days.map((d, i) => (
                                <th key={d} className="px-3 py-2 text-left font-medium">
                                  <div>{dayLabels[i]}</div>
                                  <div className="text-xs font-normal text-muted-foreground">{d.slice(5)}</div>
                                </th>
                              ))}
                              <th className="px-3 py-2 text-right font-medium">Week total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.length ? rows.map(({ emp, cells, weekTotal }) => (
                              <tr key={emp.user_id} className="border-t align-top">
                                <td className="px-3 py-2 font-medium">{emp.display_name || emp.email || "User"}</td>
                                {cells.map((cell, i) => {
                                  const cellDate = days[i];
                                  const cellEntries = weekEntries.filter((e) => e.employee_user_id === emp.user_id && e.work_date === cellDate);
                                  return (
                                  <td key={i} className="px-3 py-2">
                                    {cell.total ? (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button type="button" className="w-full rounded-md p-1 text-left hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring" aria-label={`Edit hours for ${emp.display_name || emp.email || "employee"} on ${cellDate}`}>
                                            <div className="font-semibold text-primary underline-offset-2 hover:underline">{formatHours(cell.total)}</div>
                                            {cell.jobs.map((j, idx) => (
                                              <div key={idx} className="text-xs text-muted-foreground">{j.name} · {formatHours(j.minutes)}</div>
                                            ))}
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent align="start" className="w-80 p-3 space-y-2">
                                          <p className="text-sm font-semibold">{emp.display_name || emp.email || "Employee"} · {formatDate(cellDate)}</p>
                                          {cellEntries.length ? cellEntries.map((entry) => (
                                            <div key={entry.id} className="rounded-md border bg-card p-2 text-xs space-y-1">
                                              <p className="font-medium">{jobLabel(entry.job_id)}</p>
                                              <p className="text-muted-foreground">{entry.clock_in_at ? formatDateTime(entry.clock_in_at) : "—"} → {entry.clock_out_at ? formatDateTime(entry.clock_out_at) : "—"}</p>
                                              <p className="text-muted-foreground">{formatHours(entry.total_minutes || elapsedMinutes(entry))} · break {entry.break_minutes ?? 0} min</p>
                                              {entry.adjusted_by_admin ? <p className="text-accent-foreground">Edited by admin{entry.adjusted_at ? ` · ${formatDateTime(entry.adjusted_at)}` : ""}</p> : null}
                                              {!managerOnly ? <Button type="button" size="sm" variant="outline" className="h-7 w-full" onClick={() => openEditEntryDialog(entry)}><Edit3 className="h-3 w-3" />Edit</Button> : null}
                                            </div>
                                          )) : <p className="text-xs text-muted-foreground">No detailed entries.</p>}
                                          {!managerOnly ? <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => { setEditEntryDialog({ open: true, mode: "create", employee_user_id: emp.user_id, job_id: "", work_date: cellDate, clock_in_at: "", clock_out_at: "", break_minutes: "30", hours_worked: "8", note: "" }); }}><UserPlus className="h-3.5 w-3.5" />Add entry</Button> : null}
                                        </PopoverContent>
                                      </Popover>
                                    ) : <span className="text-muted-foreground">—</span>}
                                  </td>
                                  );
                                })}
                                <td className="px-3 py-2 text-right font-semibold">{formatHours(weekTotal)}</td>
                              </tr>
                            )) : (
                              <tr><td colSpan={dayCount + 2} className="px-3 py-6 text-center text-muted-foreground">No employees match the filters.</td></tr>
                            )}
                          </tbody>
                        </table>
                      </div>

                      <div className="space-y-3 md:hidden">
                        {rows.map(({ emp, cells, weekTotal }) => (
                          <div key={emp.user_id} className="rounded-lg border bg-card p-3">
                            <div className="flex items-center justify-between">
                              <p className="font-medium">{emp.display_name || emp.email || "User"}</p>
                              <p className="text-sm font-semibold text-primary">{formatHours(weekTotal)}</p>
                            </div>
                            <div className="mt-2 space-y-1">
                              {cells.map((cell, i) => {
                                const cellDate = days[i];
                                const cellEntries = weekEntries.filter((e) => e.employee_user_id === emp.user_id && e.work_date === cellDate);
                                return (
                                <div key={i} className="flex items-start justify-between gap-3 border-t pt-1 text-sm">
                                  <div className="text-muted-foreground">{dayLabels[i]} <span className="text-xs">{days[i].slice(5)}</span></div>
                                  <div className="text-right">
                                    {cell.total ? (
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <button type="button" className="rounded-md p-1 text-right hover:bg-accent/40 focus:outline-none focus:ring-2 focus:ring-ring">
                                            <div className="font-semibold underline-offset-2 hover:underline">{formatHours(cell.total)}</div>
                                            {cell.jobs.map((j, idx) => (
                                              <div key={idx} className="text-xs text-muted-foreground">{j.name}</div>
                                            ))}
                                          </button>
                                        </PopoverTrigger>
                                        <PopoverContent align="end" className="w-72 p-3 space-y-2">
                                          <p className="text-sm font-semibold">{emp.display_name || emp.email || "Employee"} · {formatDate(cellDate)}</p>
                                          {cellEntries.length ? cellEntries.map((entry) => (
                                            <div key={entry.id} className="rounded-md border bg-card p-2 text-xs space-y-1">
                                              <p className="font-medium">{jobLabel(entry.job_id)}</p>
                                              <p className="text-muted-foreground">{entry.clock_in_at ? formatDateTime(entry.clock_in_at) : "—"} → {entry.clock_out_at ? formatDateTime(entry.clock_out_at) : "—"}</p>
                                              <p className="text-muted-foreground">{formatHours(entry.total_minutes || elapsedMinutes(entry))} · break {entry.break_minutes ?? 0} min</p>
                                              {!managerOnly ? <Button type="button" size="sm" variant="outline" className="h-7 w-full" onClick={() => openEditEntryDialog(entry)}><Edit3 className="h-3 w-3" />Edit</Button> : null}
                                            </div>
                                          )) : <p className="text-xs text-muted-foreground">No detailed entries.</p>}
                                          {!managerOnly ? <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => { setEditEntryDialog({ open: true, mode: "create", employee_user_id: emp.user_id, job_id: "", work_date: cellDate, clock_in_at: "", clock_out_at: "", break_minutes: "30", hours_worked: "8", note: "" }); }}><UserPlus className="h-3.5 w-3.5" />Add entry</Button> : null}
                                        </PopoverContent>
                                      </Popover>
                                    ) : <span className="text-muted-foreground">—</span>}
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="jobs" className="rounded-lg border border-primary/20 bg-card px-5 shadow-[var(--shadow-panel)] sm:px-7">
          <AccordionTrigger className="py-5 text-left hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><MapPin className="h-6 w-6" /></span>
              <span className="block text-2xl font-semibold tracking-normal">{t("nav.jobs")}</span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-5 pb-6">
            {!managerOnly ? (
              <div className="flex flex-col gap-2 rounded-lg border border-primary/20 bg-secondary p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">{jobForm.id ? "Editing job" : "Add a new job"}</p>
                  <p className="text-base font-medium">{jobForm.id ? (jobForm.job_name || "Untitled job") : "Fill in the details below to create a GPS-protected job."}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {jobForm.id ? (
                    <Button type="button" variant="outline" onClick={() => { setJobForm(emptyJobForm()); setJobAssignmentDraft({ employeeIds: [], notes: {} }); }}><X className="h-4 w-4" />Cancel edit</Button>
                  ) : null}
                  <Button type="button" onClick={() => { setJobForm(emptyJobForm()); setJobAssignmentDraft({ employeeIds: [], notes: {} }); toast.success("Started a new job — fill in the details below."); }}><Plus className="h-4 w-4" />New Job</Button>
                </div>
              </div>
            ) : null}
            <form className="space-y-4" onSubmit={saveJob}>
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3"><TabsTrigger value="details">Job Details</TabsTrigger><TabsTrigger value="schedule">Job Schedule</TabsTrigger><TabsTrigger value="assign">Assign Employees</TabsTrigger></TabsList>
                <TabsContent value="details" className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label>Job name</Label><Input data-job-name-input="true" disabled={managerOnly} value={jobForm.job_name} onChange={(event) => setJobForm({ ...jobForm, job_name: event.target.value })} placeholder="Main Street renovation" /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>Job address</Label><Input disabled={managerOnly} value={jobForm.address} onChange={(event) => setJobForm({ ...jobForm, address: event.target.value })} placeholder="123 Jobsite Road" /></div>
                  <div className="space-y-2"><Label>{t("jobs.city")}</Label><Input disabled={managerOnly} value={jobForm.city} onChange={(event) => setJobForm({ ...jobForm, city: event.target.value })} placeholder="City" /></div>
                  <div className="space-y-2"><Label>{t("jobs.state")}</Label><Input disabled={managerOnly} value={jobForm.state} onChange={(event) => setJobForm({ ...jobForm, state: event.target.value })} placeholder="State" /></div>
                  <div className="space-y-2 sm:col-span-2"><Label>{t("jobs.description")}</Label><Textarea disabled={managerOnly} maxLength={500} value={jobForm.job_description} onChange={(event) => setJobForm({ ...jobForm, job_description: event.target.value })} placeholder="Optional notes for the job" /></div>
                  <div className="space-y-2"><Label>GPS latitude</Label><Input type="number" step="0.000001" value={jobForm.latitude} onChange={(event) => setJobForm({ ...jobForm, latitude: event.target.value })} placeholder="42.534900" /></div>
                  <div className="space-y-2"><Label>GPS longitude</Label><Input type="number" step="0.000001" value={jobForm.longitude} onChange={(event) => setJobForm({ ...jobForm, longitude: event.target.value })} placeholder="-92.445300" /></div>
                  <div className="space-y-2"><Label>Scheduled start time</Label><Input disabled={managerOnly} type="time" value={jobForm.scheduled_start_time} onChange={(event) => setJobForm({ ...jobForm, scheduled_start_time: event.target.value })} /><p className="text-xs text-muted-foreground">Optional. Paid hours start at this time even if employees clock in earlier.</p></div>
                  <div className="space-y-2"><Label>Late grace (minutes)</Label><Input disabled={managerOnly} type="number" min="0" max="120" value={jobForm.late_grace_minutes} onChange={(event) => setJobForm({ ...jobForm, late_grace_minutes: event.target.value })} placeholder="0" /><p className="text-xs text-muted-foreground">Clock-ins after the scheduled start + grace are flagged as late.</p></div>
                  <div className="space-y-2"><Label>Scheduled start date</Label><Input disabled={managerOnly} type="date" value={jobForm.scheduled_start_date} onChange={(event) => setJobForm({ ...jobForm, scheduled_start_date: event.target.value })} /><p className="text-xs text-muted-foreground">Optional. The day this job is planned to begin.</p></div>
                  <div className="space-y-2"><Label>Estimated job duration</Label><Input disabled={managerOnly} value={jobForm.estimated_duration} onChange={(event) => setJobForm({ ...jobForm, estimated_duration: event.target.value })} placeholder="e.g. 4 hours, 2 days, 1 week" /><p className="text-xs text-muted-foreground">Optional admin estimate of how long the job will take.</p></div>
                  <p className="sm:col-span-2 text-xs text-muted-foreground">Switch to <strong>Job Schedule</strong> to queue this job on specific dates, or <strong>Assign Employees</strong> to pick who works it. Admins and managers are added automatically.</p>
                </TabsContent>
                <TabsContent value="schedule" className="space-y-5">
                  {(() => {
                    const monthIso = calendarMonth;
                    const monthStart = new Date(`${monthIso}-01T00:00:00`);
                    const year = monthStart.getFullYear();
                    const month = monthStart.getMonth();
                    const firstWeekday = monthStart.getDay();
                    const daysInMonth = new Date(year, month + 1, 0).getDate();
                    const todayIso = today();
                    const cells: Array<{ dateIso: string | null; day: number | null }> = [];
                    for (let i = 0; i < firstWeekday; i++) cells.push({ dateIso: null, day: null });
                    for (let d = 1; d <= daysInMonth; d++) {
                      const iso = `${monthIso}-${String(d).padStart(2, "0")}`;
                      cells.push({ dateIso: iso, day: d });
                    }
                    while (cells.length % 7 !== 0) cells.push({ dateIso: null, day: null });
                    type ScheduleSpan = { entry: JobSchedule; dayIndex: number; totalDays: number };
                    const byDate = new Map<string, ScheduleSpan[]>();
                    for (const s of jobSchedules) {
                      const total = Math.max(1, s.duration_days ?? 1);
                      for (let i = 0; i < total; i++) {
                        const iso = addDaysIso(s.scheduled_date, i);
                        const arr = byDate.get(iso) ?? [];
                        arr.push({ entry: s, dayIndex: i, totalDays: total });
                        byDate.set(iso, arr);
                      }
                    }
                    const jobById = new Map(jobs.map((j) => [j.id, j]));
                    const nextQueue = jobSchedules
                      .filter((s) => s.scheduled_date >= todayIso)
                      .sort((a, b) => (a.scheduled_date < b.scheduled_date ? -1 : a.scheduled_date > b.scheduled_date ? 1 : (a.start_time ?? "") < (b.start_time ?? "") ? -1 : 1))
                      .slice(0, 6);
                    const shiftMonth = (delta: number) => {
                      const d = new Date(`${monthIso}-01T00:00:00`);
                      d.setMonth(d.getMonth() + delta);
                      setCalendarMonth(d.toISOString().slice(0, 7));
                    };
                    const monthLabel = monthStart.toLocaleDateString([], { month: "long", year: "numeric" });
                    const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
                    return (
                      <div className="space-y-4 rounded-lg border bg-card p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Job queue calendar</h3>
                            <p className="text-xs text-muted-foreground">Click a date to queue a job. Assigned employees come from each job's existing assignments.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(-1)}>‹</Button>
                            <span className="min-w-[140px] text-center text-sm font-medium">{monthLabel}</span>
                            <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(1)}>›</Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => setCalendarMonth(today().slice(0, 7))}>Today</Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {weekdayLabels.map((w) => <div key={w}>{w}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {cells.map((cell, idx) => {
                            if (!cell.dateIso) return <div key={idx} className="min-h-[88px] rounded border border-transparent" />;
                            const entries = byDate.get(cell.dateIso) ?? [];
                            const isPast = cell.dateIso < todayIso;
                            const isToday = cell.dateIso === todayIso;
                            return (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => openScheduleDialog(cell.dateIso!)}
                                disabled={isPast}
                                className={`min-h-[88px] rounded border p-1 text-left transition ${isPast ? "cursor-not-allowed border-border/40 bg-muted/30 opacity-60" : "border-border bg-secondary hover:border-primary hover:bg-accent"} ${isToday ? "ring-2 ring-primary" : ""}`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className={`text-xs font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>{cell.day}</span>
                                  {entries.length ? <span className="rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{entries.length}</span> : null}
                                </div>
                                <div className="mt-1 space-y-0.5">
                                  {entries.slice(0, 2).map((span) => {
                                    const e = span.entry;
                                    const job = jobById.get(e.job_id);
                                    const count = employeeAssignments.filter((a) => a.job_id === e.job_id).length;
                                    const isContinuation = span.dayIndex > 0;
                                    const suffix = span.totalDays > 1 ? ` · day ${span.dayIndex + 1}/${span.totalDays}` : ` · ${count}`;
                                    return (
                                      <div key={`${e.id}-${span.dayIndex}`} role="button" tabIndex={0} onClick={(ev) => { ev.stopPropagation(); openEditScheduleDialog(e); }} onKeyDown={(ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); ev.stopPropagation(); openEditScheduleDialog(e); } }} className={`cursor-pointer truncate rounded px-1 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/25 ${isContinuation ? "border-l-2 border-dashed border-primary/60 bg-primary/10 opacity-80" : "bg-primary/15"}`} title={`${job?.job_name ?? "Job"} · ${count} assigned${span.totalDays > 1 ? ` · day ${span.dayIndex + 1} of ${span.totalDays}` : ""} · click to edit`}>
                                        {job?.job_name ?? "Job"}{suffix}
                                      </div>
                                    );
                                  })}
                                  {entries.length > 2 ? <div className="text-[10px] text-muted-foreground">+{entries.length - 2} more</div> : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Next in queue</h4>
                          {nextQueue.length ? (
                            <div className="space-y-2">
                              {nextQueue.map((entry) => {
                                const job = jobById.get(entry.job_id);
                                const assignees = employeeAssignments
                                  .filter((a) => a.job_id === entry.job_id)
                                  .map((a) => employees.find((e) => e.user_id === a.employee_user_id)?.display_name || employees.find((e) => e.user_id === a.employee_user_id)?.email || "Unknown");
                                return (
                                  <div key={entry.id} className="rounded-lg border bg-secondary p-3">
                                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                      <div className="min-w-0 space-y-1">
                                        <p className="font-medium text-foreground">{job?.job_name ?? "Job"}{entry.start_time ? <span className="ml-2 text-xs text-muted-foreground">@ {entry.start_time.slice(0, 5)}</span> : null}</p>
                                        <p className="text-xs text-muted-foreground"><CalendarDays className="mr-1 inline h-3 w-3" />{(() => { const total = Math.max(1, entry.duration_days ?? 1); return total > 1 ? `${formatDate(entry.scheduled_date)} – ${formatDate(addDaysIso(entry.scheduled_date, total - 1))} · ${total} days` : formatDate(entry.scheduled_date); })()}{job ? ` · ${job.address}, ${job.city}` : ""}</p>
                                        <p className="text-xs"><UsersRound className="mr-1 inline h-3 w-3" />{assignees.length ? assignees.join(", ") : <span className="text-muted-foreground">No employees assigned to this job yet</span>}</p>
                                        {entry.note ? <p className="text-xs text-muted-foreground">Note: {entry.note}</p> : null}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                        <Button type="button" variant="outline" size="sm" onClick={() => openEditScheduleDialog(entry)}><Edit3 className="h-4 w-4" />Edit</Button>
                                        <Button type="button" variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeJobSchedule(entry)}><Trash2 className="h-4 w-4" />Remove</Button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : <p className="text-sm text-muted-foreground">No jobs queued. Click a date on the calendar to add one.</p>}
                        </div>
                      </div>
                    );
                  })()}
                  {(() => {
                    const todayIso = today();
                    const withDerived = activeJobs.map((job) => {
                      const days = parseDurationToDays(job.estimated_duration);
                      const end = deriveJobEndDate(job.scheduled_start_date, job.estimated_duration);
                      return { job, days, end };
                    });
                    const inProgress = withDerived
                      .filter(({ job }) => job.scheduled_start_date && job.scheduled_start_date <= todayIso)
                      .sort((a, b) => (a.job.scheduled_start_date ?? "") < (b.job.scheduled_start_date ?? "") ? -1 : 1);
                    const upcoming = withDerived
                      .filter(({ job }) => job.scheduled_start_date && job.scheduled_start_date > todayIso)
                      .sort((a, b) => (a.job.scheduled_start_date ?? "") < (b.job.scheduled_start_date ?? "") ? -1 : 1);
                    const unscheduled = withDerived.filter(({ job }) => !job.scheduled_start_date);
                    const renderRow = ({ job, days, end }: { job: Job; days: number | null; end: string | null }) => {
                      const assignedCount = employeeAssignments.filter((a) => a.job_id === job.id).length;
                      return (
                        <div key={job.id} className="rounded-lg border bg-secondary p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-1">
                              <p className="font-medium text-foreground">{job.job_name}</p>
                              <p className="text-sm text-muted-foreground">{job.address}, {job.city}, {job.state}</p>
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                <span><CalendarDays className="mr-1 inline h-3 w-3" />Start: {formatDate(job.scheduled_start_date)}</span>
                                <span>Duration: {job.estimated_duration || "—"}{days != null ? ` (~${days}d)` : ""}</span>
                                <span>End: {end ? formatDate(end) : "—"}</span>
                                <span><UsersRound className="mr-1 inline h-3 w-3" />{assignedCount} assigned</span>
                              </div>
                            </div>
                            {!managerOnly ? (
                              <Button type="button" variant="outline" onClick={() => { editJob(job); setSelectedAdminJobId(job.id); }}><Edit3 className="h-4 w-4" />Edit job</Button>
                            ) : null}
                          </div>
                        </div>
                      );
                    };
                    return (
                      <>
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">In progress / today</h3>
                          {inProgress.length ? inProgress.map(renderRow) : <p className="text-sm text-muted-foreground">No jobs are scheduled for today or earlier.</p>}
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Upcoming</h3>
                          {upcoming.length ? upcoming.map(renderRow) : <p className="text-sm text-muted-foreground">No upcoming scheduled jobs.</p>}
                        </div>
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Unscheduled</h3>
                          {unscheduled.length ? unscheduled.map(renderRow) : <p className="text-sm text-muted-foreground">All active jobs have a scheduled start date.</p>}
                        </div>
                        <p className="text-xs text-muted-foreground">Tip: when you mark a job complete before its estimated end date, you'll be asked if you want to pull the next job earlier.</p>
                      </>
                    );
                  })()}
                </TabsContent>
                <TabsContent value="assign" className="space-y-3">
                  <div className="rounded-lg border bg-secondary p-3">
                    <label className="flex items-center gap-3 text-sm font-medium"><Checkbox checked={assignableEmployees.length > 0 && jobAssignmentDraft.employeeIds.length === assignableEmployees.length} onCheckedChange={(checked) => toggleAllJobAssignmentEmployees(checked === true)} />Select All Employees</label>
                    <p className="mt-2 text-xs text-muted-foreground">{jobAssignmentDraft.employeeIds.length} of {assignableEmployees.length} employees assigned.</p>
                  </div>
                  {assignableEmployees.map((employee) => (
                    <div key={employee.user_id} className="grid gap-3 rounded-lg border bg-secondary p-3 lg:grid-cols-[220px_1fr] lg:items-start">
                      <label className="flex items-center gap-3 text-sm font-medium"><Checkbox checked={jobAssignmentDraft.employeeIds.includes(employee.user_id)} onCheckedChange={(checked) => toggleJobAssignmentEmployee(employee.user_id, checked === true)} />{employee.display_name || employee.email || "Employee"}</label>
                      <div className="space-y-2"><Label>Job-specific notes</Label><Textarea maxLength={1000} value={jobAssignmentDraft.notes[employee.user_id] ?? ""} onChange={(event) => setJobAssignmentDraft((current) => ({ ...current, notes: { ...current.notes, [employee.user_id]: event.target.value } }))} placeholder="Notes for this employee on this job" /></div>
                    </div>
                  ))}
                  {!assignableEmployees.length ? <p className="text-sm text-muted-foreground">Add employees before assigning this job.</p> : null}
                </TabsContent>
              </Tabs>
              <div className="grid gap-3 sm:grid-cols-2">
                <Button className="h-11" type="button" variant="outline" onClick={useCurrentLocationForJob}><MapPin className="h-4 w-4" />Use current location</Button>
                <Button className="h-11" type="submit"><Save className="h-4 w-4" />{jobForm.id ? "Update job" : managerOnly ? "Select a job to adjust" : "Create GPS job"}</Button>
              </div>
            </form>
              <Tabs defaultValue="active" className="w-full">
                <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
                  <TabsTrigger value="active">All jobs</TabsTrigger>
                <TabsTrigger value="complete">Complete a job</TabsTrigger>
                <TabsTrigger value="completed">Completed jobs</TabsTrigger>
              </TabsList>
              <TabsContent value="active" className="space-y-3">
                  {jobsByStatus.length ? jobsByStatus.map((job) => {
                    const timeLog = jobTimeLogSummary(job.id);
                    return (
                  <div key={job.id} className="rounded-lg border bg-secondary p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button type="button" className="min-w-0 text-left" onClick={() => { setSelectedAdminJobId(job.id); setAdminJobLocationCheck(job.archived_at ? { status: "blocked", message: "This job is completed. Reopen it before clocking in.", jobId: job.id } : { status: "idle", message: "Check GPS before clocking in or out." }); }}>
                        <p className="font-medium text-foreground">{job.job_name} {job.archived_at ? <span className="ml-2 rounded-full border bg-card px-2 py-0.5 text-xs font-medium text-muted-foreground">Completed</span> : null}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{job.address}, {job.city}, {job.state}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{job.latitude != null && job.longitude != null ? `GPS pin: ${job.latitude.toFixed(6)}, ${job.longitude.toFixed(6)} · 100m radius` : "GPS pin needed before employee clock-in"}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{timeLog.count ? `${timeLog.count} time log${timeLog.count === 1 ? "" : "s"}${timeLog.latest ? ` · latest ${formatDate(timeLog.latest)}` : ""}` : "No time logs yet"}</p>
                      </button>
                      <div className="flex flex-wrap gap-2">
                        {managerOnly
                          ? <Button type="button" variant="outline" onClick={() => { editJob(job); updateManagerDraft(job); startJobPinEdit(job); }}><Edit3 className="h-4 w-4" />Edit pin</Button>
                          : <Button type="button" variant="outline" onClick={() => { setSelectedAdminJobId(job.id); editJob(job); scrollToJobForm(); }}><Edit3 className="h-4 w-4" />Edit job</Button>}
                        {job.archived_at ? <Button type="button" variant="outline" onClick={() => unarchiveJob(job)}><ArchiveRestore className="h-4 w-4" />Reopen</Button> : <Button type="button" variant="outline" onClick={() => completeJob(job)}><CheckCircle2 className="h-4 w-4" />Mark complete</Button>}
                        {!managerOnly ? <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteJob(job)}><Trash2 className="h-4 w-4" />Archive</Button> : null}
                      </div>
                    </div>
                    {managerOnly ? (
                      <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_150px_150px_auto] lg:items-end">
                        <div className="space-y-2">
                          <Label>Stock needed / next-day reminder</Label>
                          <Textarea maxLength={1000} value={(managerJobDrafts[job.id]?.manager_notes ?? job.manager_notes ?? "")} onChange={(event) => setManagerJobDrafts((current) => ({ ...current, [job.id]: { manager_notes: event.target.value, latitude: current[job.id]?.latitude ?? job.latitude?.toString() ?? "", longitude: current[job.id]?.longitude ?? job.longitude?.toString() ?? "" } }))} placeholder="Add stock needed or reminders" />
                        </div>
                        <div className="space-y-2"><Label>Latitude</Label><Input type="number" step="0.000001" value={managerJobDrafts[job.id]?.latitude ?? job.latitude?.toString() ?? ""} onChange={(event) => setManagerJobDrafts((current) => ({ ...current, [job.id]: { manager_notes: current[job.id]?.manager_notes ?? job.manager_notes ?? "", latitude: event.target.value, longitude: current[job.id]?.longitude ?? job.longitude?.toString() ?? "" } }))} /></div>
                        <div className="space-y-2"><Label>Longitude</Label><Input type="number" step="0.000001" value={managerJobDrafts[job.id]?.longitude ?? job.longitude?.toString() ?? ""} onChange={(event) => setManagerJobDrafts((current) => ({ ...current, [job.id]: { manager_notes: current[job.id]?.manager_notes ?? job.manager_notes ?? "", latitude: current[job.id]?.latitude ?? job.latitude?.toString() ?? "", longitude: event.target.value } }))} /></div>
                        <Button className="h-11" type="button" onClick={() => saveManagerJob(job)}><Save className="h-4 w-4" />{t("common.save")}</Button>
                      </div>
                    ) : null}
                  </div>
                    );
                  }) : <p className="text-sm text-muted-foreground">Create jobs with GPS pins so employees can clock in on-site.</p>}
              </TabsContent>
              <TabsContent value="complete" className="space-y-3">
                <p className="text-sm text-muted-foreground">Mark a job complete when work has finished. Employees will not be able to clock in to it until it is reopened.</p>
                {activeJobs.length ? activeJobs.map((job) => (
                  <div key={job.id} className="rounded-lg border bg-secondary p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{job.job_name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{job.address}, {job.city}, {job.state}</p>
                      </div>
                      <Button type="button" onClick={() => completeJob(job)}><CheckCircle2 className="h-4 w-4" />Mark complete</Button>
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No active jobs to complete.</p>}
              </TabsContent>
              <TabsContent value="completed" className="space-y-3">
                <div className="space-y-3 rounded-lg border bg-secondary p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-semibold">Completed jobs</p>
                      <p className="text-sm text-muted-foreground">Completed jobs stay searchable and can be reopened.</p>
                    </div>
                    <div className="relative sm:w-72">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pl-9" value={archivedJobSearch} onChange={(event) => setArchivedJobSearch(event.target.value)} placeholder="Search completed jobs" />
                    </div>
                  </div>
                  {archivedJobMatches.length ? archivedJobMatches.map((job) => (
                    <div key={job.id} className="rounded-lg border bg-card p-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <button type="button" className="min-w-0 text-left" onClick={() => { setSelectedAdminJobId(job.id); setAdminJobLocationCheck({ status: "blocked", message: "This job is completed. Reopen it before clocking in.", jobId: job.id }); }}>
                          <p className="font-medium text-foreground">{job.job_name}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{job.address}, {job.city}, {job.state}</p>
                          <p className="mt-1 text-xs text-muted-foreground">Completed {formatDate(job.archived_at)}</p>
                        </button>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" variant="outline" onClick={() => unarchiveJob(job)}><ArchiveRestore className="h-4 w-4" />Reopen job</Button>
                          {!managerOnly ? <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteJob(job)}><Trash2 className="h-4 w-4" />Archive</Button> : null}
                        </div>
                      </div>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No completed jobs match this search.</p>}
                </div>
              </TabsContent>
            </Tabs>
            {selectedAdminJob ? (
              <div className="rounded-lg border border-primary/30 bg-secondary p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Selected job</p>
                    <h3 className="mt-1 text-xl font-semibold tracking-normal">{selectedAdminJob.address}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{selectedAdminJob.job_name} · {selectedAdminJob.city}, {selectedAdminJob.state}</p>
                    {selectedAdminJob.job_description ? <p className="mt-2 text-sm">{selectedAdminJob.job_description}</p> : null}
                    {selectedAdminJob.archived_at ? <p className="mt-2 rounded-md border bg-card p-3 text-sm font-medium text-muted-foreground">Archived {formatDate(selectedAdminJob.archived_at)}</p> : null}
                    <p className="mt-2 text-xs text-muted-foreground">{selectedAdminJob.latitude != null && selectedAdminJob.longitude != null ? `GPS pin: ${selectedAdminJob.latitude.toFixed(6)}, ${selectedAdminJob.longitude.toFixed(6)} · 100m geofence` : "No GPS pin set"}</p>
                    {selectedJobPinDraft ? (
                      <div className="mt-3 grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2">
                        <div className="space-y-2"><Label>Pin latitude</Label><Input type="number" step="0.000001" value={selectedJobPinDraft.latitude} onChange={(event) => setJobPinDraft((current) => current?.jobId === selectedAdminJob.id ? { ...current, latitude: event.target.value } : current)} /></div>
                        <div className="space-y-2"><Label>Pin longitude</Label><Input type="number" step="0.000001" value={selectedJobPinDraft.longitude} onChange={(event) => setJobPinDraft((current) => current?.jobId === selectedAdminJob.id ? { ...current, longitude: event.target.value } : current)} /></div>
                        {selectedJobPinDraft.accuracy ? <p className="text-xs text-muted-foreground sm:col-span-2">GPS accuracy: {Math.round(selectedJobPinDraft.accuracy)} meters</p> : null}
                      </div>
                    ) : null}
                    <p className="mt-2 text-sm font-medium">Status: {adminActiveEntry ? `Clocked in at ${formatDateTime(adminActiveEntry.clock_in_at)}` : "Clocked out"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{adminJobLocationCheck.message}</p>
                    {adminJobLocationCheck.distance != null ? <p className="mt-1 text-xs text-muted-foreground">Distance: {Math.round(adminJobLocationCheck.distance)} meters · Accuracy: {Math.round(adminJobLocationCheck.accuracy ?? 0)} meters · Radius: {GEOFENCE_RADIUS_METERS} meters</p> : null}
                    {adminJobLocationCheck.latitude != null && adminJobLocationCheck.longitude != null ? <p className="mt-1 text-xs text-muted-foreground">Your location: {adminJobLocationCheck.latitude.toFixed(6)}, {adminJobLocationCheck.longitude.toFixed(6)}</p> : null}
                  </div>
                  <div className="grid w-full gap-2 sm:w-auto sm:min-w-44">
                    {selectedJobPinDraft ? (
                      <>
                        <Button type="button" variant="outline" onClick={() => setSelectedJobPinHere(selectedAdminJob)} disabled={selectedJobPinDraft.isLocating || selectedJobPinDraft.isSaving}>
                          {selectedJobPinDraft.isLocating ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                          Set Pin Here
                        </Button>
                        <Button type="button" onClick={() => saveSelectedJobPin(selectedAdminJob)} disabled={selectedJobPinDraft.isLocating || selectedJobPinDraft.isSaving}>
                          {selectedJobPinDraft.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                          Save Pin
                        </Button>
                        <Button type="button" variant="ghost" onClick={() => setJobPinDraft(null)} disabled={selectedJobPinDraft.isSaving}>{t("common.cancel")}</Button>
                      </>
                    ) : (
                      <Button type="button" variant="outline" onClick={() => startJobPinEdit(selectedAdminJob)}><Edit3 className="h-4 w-4" />Edit Pin</Button>
                    )}
                    <Button type="button" variant="outline" onClick={() => checkAdminJobLocation(selectedAdminJob)} disabled={adminJobLocationCheck.status === "checking"}>
                      {adminJobLocationCheck.status === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                      {adminJobLocationCheck.latitude != null ? "Refresh Location" : "Check GPS"}
                    </Button>
                    {!managerOnly && selectedAdminJob.archived_at ? <Button type="button" variant="outline" onClick={() => unarchiveJob(selectedAdminJob)}><ArchiveRestore className="h-4 w-4" />Unarchive</Button> : null}
                    {!managerOnly ? <Button type="button" variant="outline" className="text-destructive hover:text-destructive" onClick={() => deleteJob(selectedAdminJob)}><Trash2 className="h-4 w-4" />Archive job</Button> : null}
                    <Button type="button" onClick={adminClockIn} disabled={!selectedAdminJob || !!selectedAdminJob.archived_at}><Play className="h-4 w-4" />Clock in</Button>
                    <Button type="button" variant="outline" onClick={adminClockOut} disabled={!adminActiveEntry}><Square className="h-4 w-4" />Clock out</Button>
                  </div>
                </div>
              </div>
            ) : null}
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="company-calendar" className="rounded-lg border border-primary/20 bg-card px-5 shadow-[var(--shadow-panel)] sm:px-7">
          <AccordionTrigger className="py-5 text-left hover:no-underline">
            <span className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground"><CalendarDays className="h-6 w-6" /></span><span><span className="block text-2xl font-semibold tracking-normal">{t("nav.company")}</span><span className="mt-1 block text-sm font-normal text-muted-foreground">Días festivos y trabajos con actividad. Horas por empleado en Horas.</span></span></span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="grid gap-3 sm:grid-cols-[220px_1fr] sm:items-end">
              <div className="space-y-2"><Label>Calendar month</Label><Input className="h-11 bg-card" type="month" value={calendarMonth} onChange={(event) => setCalendarMonth(event.target.value || today().slice(0, 7))} /></div>
              <p className="text-sm text-muted-foreground">Holidays show once per day. Jobs are deduplicated — each job appears once per day regardless of how many employees clocked in.</p>
            </div>
            <div className="space-y-3">
              {calendarDays.length ? calendarDays.map((day) => {
                const holidayItems = calendarHolidays.filter((holiday) => holiday.date === day);
                const dayJobIds = Array.from(new Set(adminTimeEntries.filter((entry) => entry.work_date === day && entry.job_id).map((entry) => entry.job_id as string)));
                return (
                  <div key={day} className="rounded-lg border bg-secondary p-4">
                    <p className="font-medium">{formatDate(day)}</p>
                    <div className="mt-3 grid gap-2 lg:grid-cols-2">
                      {holidayItems.map((holiday) => <div key={holiday.name} className="rounded-md border bg-accent/40 p-3 text-sm"><p className="font-medium">Holiday · {holiday.name}</p></div>)}
                      {dayJobIds.map((jobId) => <div key={jobId} className="rounded-md border bg-card p-3 text-sm"><p className="font-medium">Job · {jobLabel(jobId)}</p></div>)}
                      {!holidayItems.length && !dayJobIds.length ? <p className="text-sm text-muted-foreground">No activity.</p> : null}
                    </div>
                  </div>
                );
              }) : <p className="text-sm text-muted-foreground">No holidays or job activity for this month yet.</p>}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="reports" className="rounded-lg border border-primary/20 bg-card px-5 shadow-[var(--shadow-panel)] sm:px-7">
          <AccordionTrigger className="py-5 text-left hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><BarChart3 className="h-6 w-6" /></span>
              <span>
                <span className="block text-2xl font-semibold tracking-normal">{t("nav.reports")}</span>
                <span className="mt-1 block text-sm font-normal text-muted-foreground">Exportación de análisis, correos de nómina y resumen semanal.</span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <Tabs value={managerOnly && reportsTab === "analytics" ? "payroll" : reportsTab} onValueChange={(value) => setReportsTab(value as "analytics" | "payroll" | "jobtotals" | "weekly" | "autoreport" | "deletion")} className="space-y-4">
              <TabsList className={`grid w-full ${managerOnly ? "max-w-xl grid-cols-4" : "max-w-4xl grid-cols-6"}`}>
                {!managerOnly ? <TabsTrigger value="analytics">Analytics</TabsTrigger> : null}
                <TabsTrigger value="payroll">Payroll Email</TabsTrigger>
                <TabsTrigger value="jobtotals">Job Hours Totals</TabsTrigger>
                <TabsTrigger value="weekly">Weekly Email</TabsTrigger>
                <TabsTrigger value="autoreport">Auto Report</TabsTrigger>
                {!managerOnly ? <TabsTrigger value="deletion" onClick={() => { if (!deletionLog.length) loadDeletionLog(); }}>Deletion Log</TabsTrigger> : null}
              </TabsList>
              {!managerOnly ? <TabsContent value="analytics" className="space-y-5">
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_160px]">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={reportEmployeeFilter} onValueChange={setReportEmployeeFilter}>
                  <SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {employees.map((employee) => <SelectItem key={employee.user_id} value={employee.user_id}>{employee.display_name || employee.email || "User"}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Job site</Label>
                <Select value={reportJobFilter} onValueChange={setReportJobFilter}>
                  <SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All jobs</SelectItem>
                    {jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.address}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>View by</Label>
                <Select value={analyticsPeriod} onValueChange={(value) => setAnalyticsPeriod(value as AnalyticsPeriod)}>
                  <SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="range">Date range</SelectItem>
                    <SelectItem value="week">Week</SelectItem>
                    <SelectItem value="month">Month</SelectItem>
                    <SelectItem value="year">Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
              {analyticsPeriod === "range" ? <>
                <div className="space-y-2"><Label>Start date</Label><Input className="h-11 bg-card" type="date" value={analyticsStartDate} onChange={(event) => setAnalyticsStartDate(event.target.value || today())} /></div>
                <div className="space-y-2"><Label>End date</Label><Input className="h-11 bg-card" type="date" value={analyticsEndDate} onChange={(event) => setAnalyticsEndDate(event.target.value || today())} /></div>
              </> : null}
              {analyticsPeriod === "week" ? <div className="space-y-2"><Label>Week</Label><Input className="h-11 bg-card" type="date" value={reportWeekFilter} onChange={(event) => setReportWeekFilter(weekStartIso(event.target.value || today()))} /></div> : null}
              {analyticsPeriod === "month" ? <div className="space-y-2"><Label>Month</Label><Input className="h-11 bg-card" type="month" value={analyticsMonth} onChange={(event) => setAnalyticsMonth(event.target.value || today().slice(0, 7))} /></div> : null}
              {analyticsPeriod === "year" ? <div className="space-y-2"><Label>Year</Label><Input className="h-11 bg-card" type="number" min="2000" max="2100" value={analyticsYear} onChange={(event) => setAnalyticsYear(event.target.value || String(new Date().getFullYear()))} /></div> : null}
              <Button className="h-11" type="button" variant="outline" onClick={exportAnalyticsReport}><Download className="h-4 w-4" />Export CSV</Button>
              <Button className="h-11" type="button" onClick={emailAnalyticsReport} disabled={emailingReport}>
                {emailingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Email full report
              </Button>
            </div>
            <div className="rounded-lg border bg-secondary p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium">Report contents</p>
                <p className="text-sm text-muted-foreground">Choose the data points included on screen, CSV, and email.</p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {analyticsReportFields.map((field) => (
                  <label key={field.key} className="flex min-h-11 items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm font-medium">
                    <Checkbox checked={analyticsReportContent[field.key]} onCheckedChange={(checked) => setAnalyticsReportContent((current) => ({ ...current, [field.key]: checked === true }))} />
                    {field.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-secondary p-4"><p className="text-sm text-muted-foreground">Hours worked</p><p className="mt-1 text-2xl font-semibold tracking-normal text-primary">{analyticsTotals.hours.toFixed(2)}</p></div>
              <div className="rounded-lg border bg-secondary p-4"><p className="text-sm text-muted-foreground">PTO used</p><p className="mt-1 text-2xl font-semibold tracking-normal text-primary">{analyticsTotals.pto.toFixed(2)}</p></div>
              <div className="rounded-lg border bg-secondary p-4"><p className="text-sm text-muted-foreground">Holiday pay</p><p className="mt-1 text-2xl font-semibold tracking-normal text-primary">{analyticsTotals.holiday.toFixed(2)}</p></div>
              <div className="rounded-lg border bg-secondary p-4"><p className="text-sm text-muted-foreground">Report rows</p><p className="mt-1 text-2xl font-semibold tracking-normal text-primary">{analyticsRows.length}</p></div>
            </div>
            <div className="rounded-lg border bg-secondary p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium">Full report view</p>
                <p className="text-sm text-muted-foreground">{analyticsRange.label}</p>
              </div>
              <div className="mt-4 hidden overflow-x-auto rounded-lg border bg-card lg:block">
                <div className="grid min-w-[900px] grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3 border-b p-3 text-sm font-medium text-muted-foreground">
                  {analyticsReportContent.employeeNames ? <span>Employee</span> : null}<span>Job site</span>{analyticsReportContent.jobsAssigned ? <span>Jobs assigned</span> : null}{analyticsReportContent.dates ? <span>Dates</span> : null}{analyticsReportContent.hoursWorked ? <span>Hours</span> : null}{analyticsReportContent.ptoBalance ? <span>PTO</span> : null}{analyticsReportContent.holidayPay ? <span>Holiday</span> : null}{analyticsReportContent.jobNotes ? <span>Notes</span> : null}{analyticsReportContent.workLocations ? <span>Locations</span> : null}
                </div>
                {analyticsRows.length ? analyticsRows.map((row) => (
                  <div key={row.key} className="grid min-w-[900px] grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-3 border-b p-3 text-sm last:border-b-0">
                    {analyticsReportContent.employeeNames ? <span className="font-medium">{row.employeeName}</span> : null}<span className="text-muted-foreground">{row.jobName}</span>{analyticsReportContent.jobsAssigned ? <span>{row.assignedJobs}</span> : null}{analyticsReportContent.dates ? <span>{row.dateSummary}</span> : null}{analyticsReportContent.hoursWorked ? <span>{row.hoursWorked.toFixed(2)} hrs</span> : null}{analyticsReportContent.ptoBalance ? <span>{row.ptoUsed.toFixed(2)} used<br />{row.ptoBalanceSummary}</span> : null}{analyticsReportContent.holidayPay ? <span>{row.holidayHours.toFixed(2)} hrs</span> : null}{analyticsReportContent.jobNotes ? <span>{row.jobNotes}</span> : null}{analyticsReportContent.workLocations ? <span>{row.workLocations}</span> : null}
                  </div>
                )) : <p className="p-4 text-sm text-muted-foreground">No report data matches the selected filters.</p>}
              </div>
              <div className="mt-4 space-y-3 lg:hidden">
                {analyticsRows.length ? analyticsRows.map((row) => (
                  <div key={row.key} className="rounded-lg border bg-card p-4">
                    {analyticsReportContent.employeeNames ? <p className="font-medium">{row.employeeName}</p> : null}
                    <p className="mt-1 text-sm text-muted-foreground">{row.jobName}</p>
                    <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                      {analyticsReportContent.jobsAssigned ? <span><strong>Jobs:</strong> {row.assignedJobs}</span> : null}
                      {analyticsReportContent.dates ? <span><strong>Dates:</strong> {row.dateSummary}</span> : null}
                      {analyticsReportContent.hoursWorked ? <span><strong>Hours:</strong> {row.hoursWorked.toFixed(2)}</span> : null}
                      {analyticsReportContent.ptoBalance ? <span><strong>PTO:</strong> {row.ptoUsed.toFixed(2)} used · {row.ptoBalanceSummary}</span> : null}
                      {analyticsReportContent.holidayPay ? <span><strong>Holiday:</strong> {row.holidayHours.toFixed(2)}</span> : null}
                      {analyticsReportContent.jobNotes ? <span><strong>Notes:</strong> {row.jobNotes}</span> : null}
                      {analyticsReportContent.workLocations ? <span><strong>Locations:</strong> {row.workLocations}</span> : null}
                    </div>
                  </div>
                )) : <p className="text-sm text-muted-foreground">No report data matches the selected filters.</p>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">Email exports use the designated admin email: {profile.admin_alert_email || profile.email || "not set"}.</p>
              </TabsContent> : null}

              <TabsContent value="payroll" className="space-y-5">
            <div className="rounded-lg border bg-secondary p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-medium">Saved payroll setup</p>
                  <p className="mt-1 text-sm text-muted-foreground">{payrollSettings.frequency === "biweekly" ? "Biweekly" : "Weekly"} · {weekdayOptions.find((day) => day.value === payrollSettings.week_start_day)?.label} to {weekdayOptions.find((day) => day.value === payrollSettings.week_end_day)?.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Current period: {payrollPeriod.label}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Employees: {payrollSettings.include_all_employees ? "All employees" : `${payrollIncludedEmployeeCount} selected`}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Recipient: {profile.admin_alert_email || profile.email || payrollSettings.recipient_email || "Not set"} <span className="text-xs">(from admin profile)</span></p>
                </div>
                <div className="grid gap-2 sm:min-w-40">
                  <Button type="button" variant="outline" onClick={() => setEditingPayroll((current) => !current)}><Edit3 className="h-4 w-4" />{editingPayroll ? "Cancel" : "Edit"}</Button>
                  <Button type="button" onClick={savePayrollSettings} disabled={savingPayroll}>{savingPayroll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save</Button>
                </div>
              </div>
            </div>

            {editingPayroll ? (
              <div className="grid gap-4 rounded-lg border bg-secondary p-4 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>Payroll recipient email</Label>
                  <Input className="h-11 bg-card" type="email" value={profile.admin_alert_email || profile.email || ""} readOnly disabled placeholder="Set in admin profile" />
                  <p className="text-xs text-muted-foreground">Managed in your admin profile (Reports email). Update there to change all report recipients.</p>
                </div>
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select value={payrollSettings.frequency} onValueChange={(value) => setPayrollSettings({ ...payrollSettings, frequency: value as PayrollFrequency })}>
                    <SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="biweekly">Biweekly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Week starts on</Label>
                  <Select value={String(payrollSettings.week_start_day)} onValueChange={(value) => setPayrollSettings({ ...payrollSettings, week_start_day: Number(value) })}>
                    <SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{weekdayOptions.map((day) => <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Week ends on</Label>
                  <Select value={String(payrollSettings.week_end_day)} onValueChange={(value) => setPayrollSettings({ ...payrollSettings, week_end_day: Number(value) })}>
                    <SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
                    <SelectContent>{weekdayOptions.map((day) => <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-3 lg:col-span-2">
                  <p className="font-medium">Employees included in payroll emails</p>
                  <label className="flex min-h-11 items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm font-medium">
                    <Checkbox
                      checked={payrollSettings.include_all_employees}
                      onCheckedChange={(checked) => setPayrollSettings({ ...payrollSettings, include_all_employees: checked === true })}
                    />
                    Select all employees
                  </label>
                  {!payrollSettings.include_all_employees ? (
                    <div className="grid max-h-64 gap-3 overflow-y-auto rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {payrollSelectableEmployees.length ? payrollSelectableEmployees.map((employee) => {
                        const checked = selectedPayrollEmployeeIds.has(employee.user_id);
                        return (
                          <label key={employee.user_id} className="flex min-h-11 items-center gap-3 rounded-lg border bg-secondary px-3 py-2 text-sm font-medium">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(nextChecked) => setPayrollSettings((current) => {
                                const nextIds = new Set(current.selected_employee_user_ids ?? []);
                                if (nextChecked === true) nextIds.add(employee.user_id);
                                else nextIds.delete(employee.user_id);
                                return { ...current, selected_employee_user_ids: Array.from(nextIds) };
                              })}
                            />
                            <span className="min-w-0 truncate">{employeeLabel(employee.user_id)}</span>
                          </label>
                        );
                      }) : <p className="text-sm text-muted-foreground">No employees are available yet.</p>}
                    </div>
                  ) : null}
                  <p className="text-sm text-muted-foreground">This selection is saved as the default preset for future automated payroll emails.</p>
                </div>
                <div className="space-y-3 lg:col-span-2">
                  <p className="font-medium">Payroll report data</p>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {payrollReportFields.map((field) => (
                      <label key={field.key} className="flex min-h-11 items-center gap-3 rounded-lg border bg-card px-3 py-2 text-sm font-medium">
                        <Checkbox checked={payrollSettings[field.key] === true} onCheckedChange={(checked) => setPayrollSettings({ ...payrollSettings, [field.key]: checked === true })} />
                        {field.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border bg-secondary p-4"><p className="text-sm text-muted-foreground">Hours</p><p className="mt-1 text-2xl font-semibold tracking-normal text-primary">{payrollTotals.hours.toFixed(2)}</p></div>
              <div className="rounded-lg border bg-secondary p-4"><p className="text-sm text-muted-foreground">PTO used</p><p className="mt-1 text-2xl font-semibold tracking-normal text-primary">{payrollTotals.pto.toFixed(2)}</p></div>
              <div className="rounded-lg border bg-secondary p-4"><p className="text-sm text-muted-foreground">Holiday pay</p><p className="mt-1 text-2xl font-semibold tracking-normal text-primary">{payrollTotals.holiday.toFixed(2)}</p></div>
              <div className="rounded-lg border bg-secondary p-4"><p className="text-sm text-muted-foreground">Rows</p><p className="mt-1 text-2xl font-semibold tracking-normal text-primary">{payrollRows.length}</p></div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Button className="h-12" type="button" variant="outline" onClick={() => setPayrollReportOpen(true)}><Eye className="h-4 w-4" />View full report</Button>
              <Button className="h-12" type="button" variant="outline" onClick={exportPayrollReport}><Download className="h-4 w-4" />Export payroll CSV</Button>
              <Button className="h-12" type="button" onClick={sendPayrollReportNow} disabled={emailingPayroll}>{emailingPayroll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Send payroll report now</Button>
            </div>

            <div className="rounded-lg border bg-secondary p-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-medium">Auto-populated payroll report</p>
                <p className="text-sm text-muted-foreground">{payrollPeriod.label} · {payrollRows.length} {payrollRows.length === 1 ? "row" : "rows"}</p>
              </div>
              <div className="mt-4 max-h-[28rem] overflow-auto rounded-lg border bg-card">
                {payrollRows.length ? (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-secondary text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <tr>
                        {payrollSettings.include_employee_names ? <th className="px-3 py-2 font-medium">Employee</th> : null}
                        <th className="px-3 py-2 font-medium">Job site</th>
                        {payrollSettings.include_hours_worked ? <th className="px-3 py-2 text-right font-medium">Hours</th> : null}
                        {payrollSettings.include_pto_used ? <th className="px-3 py-2 text-right font-medium">PTO</th> : null}
                        {payrollSettings.include_holiday_pay ? <th className="px-3 py-2 text-right font-medium">Holiday</th> : null}
                        {payrollSettings.include_jobs_assigned ? <th className="px-3 py-2 font-medium">Jobs assigned</th> : null}
                        {payrollSettings.include_work_locations ? <th className="px-3 py-2 font-medium">Work locations</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {payrollRows.map((row) => (
                        <tr key={row.key} className="border-t align-top">
                          {payrollSettings.include_employee_names ? <td className="px-3 py-2 font-medium">{row.employeeName}</td> : null}
                          <td className="px-3 py-2 text-muted-foreground">{row.jobName}</td>
                          {payrollSettings.include_hours_worked ? <td className="px-3 py-2 text-right tabular-nums">{row.hoursWorked.toFixed(2)}</td> : null}
                          {payrollSettings.include_pto_used ? <td className="px-3 py-2 text-right tabular-nums">{row.ptoUsed.toFixed(2)}</td> : null}
                          {payrollSettings.include_holiday_pay ? <td className="px-3 py-2 text-right tabular-nums">{row.holidayHours.toFixed(2)}</td> : null}
                          {payrollSettings.include_jobs_assigned ? <td className="px-3 py-2 text-muted-foreground">{row.assignedJobs}</td> : null}
                          {payrollSettings.include_work_locations ? <td className="px-3 py-2 text-muted-foreground">{row.workLocations}</td> : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="p-4 text-sm text-muted-foreground">No payroll data matches the saved pay period.</p>
                )}
              </div>
            </div>
            {latestPayrollLog ? <p className="text-sm text-muted-foreground">Last payroll email: {latestPayrollLog.status} · {formatDate(latestPayrollLog.period_start)} – {formatDate(latestPayrollLog.period_end)} · {latestPayrollLog.recipient_email}</p> : null}
            <p className="text-sm text-muted-foreground">Automatic sending is prepared for the end of each saved pay period and will activate once sender-domain setup is complete.</p>

            <Dialog open={payrollReportOpen} onOpenChange={setPayrollReportOpen}>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-h-none print:overflow-visible print:shadow-none">
                <DialogHeader className="print:hidden">
                  <DialogTitle>Payroll report</DialogTitle>
                  <DialogDescription>{payrollPeriod.label} · {payrollSettings.frequency === "biweekly" ? "Biweekly" : "Weekly"} · Sending to {payrollSettings.recipient_email || "(no recipient set)"}</DialogDescription>
                </DialogHeader>
                <div id="payroll-report-print" className="space-y-6 print:p-0">
                  <div className="border-b pb-4">
                    <h2 className="text-2xl font-semibold">{profile.company_name || "Payroll report"}</h2>
                    <p className="text-sm text-muted-foreground mt-1">Pay period: {payrollPeriod.label}</p>
                    <p className="text-sm text-muted-foreground">Frequency: {payrollSettings.frequency === "biweekly" ? "Biweekly" : "Weekly"} · Generated {new Date().toLocaleString()}</p>
                    {payrollSettings.recipient_email ? <p className="text-sm text-muted-foreground">Recipient: {payrollSettings.recipient_email}</p> : null}
                  </div>

                  <div className="grid gap-3 grid-cols-2 md:grid-cols-5">
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Total hours</p><p className="text-xl font-semibold tabular-nums">{payrollTotals.hours.toFixed(2)}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">PTO used</p><p className="text-xl font-semibold tabular-nums">{payrollTotals.pto.toFixed(2)}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Holiday pay</p><p className="text-xl font-semibold tabular-nums">{payrollTotals.holiday.toFixed(2)}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">{t("nav.employees")}</p><p className="text-xl font-semibold tabular-nums">{payrollIncludedEmployeeCount}</p></div>
                    <div className="rounded-lg border p-3"><p className="text-xs text-muted-foreground">Rows</p><p className="text-xl font-semibold tabular-nums">{payrollRows.length}</p></div>
                  </div>

                  <div className="space-y-4">
                    {payrollIncludedEmployeeIds
                      .map((employeeId) => ({ employeeId, name: employeeLabel(employeeId), rows: payrollRows.filter((row) => row.key.startsWith(`${employeeId}:`)) }))
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(({ employeeId, name, rows }) => {
                        const empHours = rows.reduce((s, r) => s + r.hoursWorked, 0);
                        const empPto = rows.reduce((s, r) => s + r.ptoUsed, 0);
                        const empHoliday = rows.reduce((s, r) => s + r.holidayHours, 0);
                        const hasEntries = rows.some((r) => r.entryCount > 0);
                        return (
                          <div key={employeeId} className="rounded-lg border p-4 break-inside-avoid">
                            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b pb-2 mb-3">
                              {payrollSettings.include_employee_names ? <h3 className="text-lg font-semibold">{name}</h3> : <h3 className="text-lg font-semibold text-muted-foreground">Employee</h3>}
                              <div className="flex gap-4 text-sm">
                                {payrollSettings.include_hours_worked ? <span><span className="text-muted-foreground">Hours:</span> <span className="font-semibold tabular-nums">{empHours.toFixed(2)}</span></span> : null}
                                {payrollSettings.include_pto_used ? <span><span className="text-muted-foreground">PTO:</span> <span className="font-semibold tabular-nums">{empPto.toFixed(2)}</span></span> : null}
                                {payrollSettings.include_holiday_pay ? <span><span className="text-muted-foreground">Holiday:</span> <span className="font-semibold tabular-nums">{empHoliday.toFixed(2)}</span></span> : null}
                              </div>
                            </div>
                            {payrollSettings.include_jobs_assigned && rows[0] ? (
                              <p className="text-xs text-muted-foreground mb-3"><span className="font-medium">Jobs assigned:</span> {rows[0].assignedJobs}</p>
                            ) : null}
                            {hasEntries ? (
                              <table className="w-full text-sm">
                                <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground border-b">
                                  <tr>
                                    <th className="py-2 pr-2 font-medium">Job site</th>
                                    {payrollSettings.include_hours_worked ? <th className="py-2 px-2 text-right font-medium">Hours</th> : null}
                                    <th className="py-2 px-2 text-right font-medium">Entries</th>
                                    {payrollSettings.include_work_locations ? <th className="py-2 pl-2 font-medium">Work locations</th> : null}
                                  </tr>
                                </thead>
                                <tbody>
                                  {rows.filter((r) => r.entryCount > 0).map((row) => (
                                    <tr key={row.key} className="border-b last:border-0 align-top">
                                      <td className="py-2 pr-2">{row.jobName}</td>
                                      {payrollSettings.include_hours_worked ? <td className="py-2 px-2 text-right tabular-nums">{row.hoursWorked.toFixed(2)}</td> : null}
                                      <td className="py-2 px-2 text-right tabular-nums">{row.entryCount}</td>
                                      {payrollSettings.include_work_locations ? <td className="py-2 pl-2 text-xs text-muted-foreground whitespace-pre-wrap">{row.workLocations}</td> : null}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            ) : (
                              <p className="text-sm text-muted-foreground italic">No clocked time this period.</p>
                            )}
                          </div>
                        );
                      })}
                    {payrollIncludedEmployeeIds.length === 0 ? <p className="text-sm text-muted-foreground">No employees are included. Adjust selection in the payroll settings.</p> : null}
                  </div>

                  <p className="text-xs text-muted-foreground border-t pt-3">Sender-domain setup is pending — emails will start sending automatically once it's verified.</p>
                </div>
                <DialogFooter className="print:hidden">
                  <Button type="button" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Print / Save as PDF</Button>
                  <Button type="button" onClick={() => setPayrollReportOpen(false)}>Close</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
              </TabsContent>

              <TabsContent value="jobtotals" className="space-y-5">
                {(() => {
                  const todayStr = today();
                  let rangeStart = "";
                  let rangeEnd = "";
                  if (jobTotalsRange === "month") { rangeStart = todayStr.slice(0, 7) + "-01"; rangeEnd = todayStr; }
                  else if (jobTotalsRange === "quarter") { const m = new Date(`${todayStr}T00:00:00`).getUTCMonth(); const qStart = Math.floor(m / 3) * 3; const y = new Date(`${todayStr}T00:00:00`).getUTCFullYear(); rangeStart = `${y}-${String(qStart + 1).padStart(2, "0")}-01`; rangeEnd = todayStr; }
                  else if (jobTotalsRange === "year") { rangeStart = `${new Date().getFullYear()}-01-01`; rangeEnd = todayStr; }
                  else if (jobTotalsRange === "custom") { rangeStart = jobTotalsStart; rangeEnd = jobTotalsEnd; }

                  const inRange = (workDate: string) => {
                    if (rangeStart && workDate < rangeStart) return false;
                    if (rangeEnd && workDate > rangeEnd) return false;
                    return true;
                  };
                  const relevantEntries = adminTimeEntries.filter((e) => e.job_id && inRange(e.work_date) && (e.total_minutes ?? 0) > 0);

                  type JobAgg = { jobId: string; minutes: number; entries: number; employees: Set<string>; firstDate: string; lastDate: string };
                  const byJob = new Map<string, JobAgg>();
                  for (const e of relevantEntries) {
                    const jid = e.job_id as string;
                    let agg = byJob.get(jid);
                    if (!agg) { agg = { jobId: jid, minutes: 0, entries: 0, employees: new Set(), firstDate: e.work_date, lastDate: e.work_date }; byJob.set(jid, agg); }
                    agg.minutes += e.total_minutes ?? 0;
                    agg.entries += 1;
                    agg.employees.add(e.employee_user_id);
                    if (e.work_date < agg.firstDate) agg.firstDate = e.work_date;
                    if (e.work_date > agg.lastDate) agg.lastDate = e.work_date;
                  }

                  const searchLower = jobTotalsSearch.trim().toLowerCase();
                  const jobRows = jobs
                    .filter((j) => jobTotalsStatus === "all" ? true : jobTotalsStatus === "archived" ? !!j.archived_at : !j.archived_at)
                    .filter((j) => !searchLower || `${j.job_name} ${j.address} ${j.city ?? ""}`.toLowerCase().includes(searchLower))
                    .map((j) => ({ job: j, agg: byJob.get(j.id) }))
                    .sort((a, b) => (b.agg?.minutes ?? 0) - (a.agg?.minutes ?? 0));

                  const grandMinutes = jobRows.reduce((s, r) => s + (r.agg?.minutes ?? 0), 0);
                  const grandEntries = jobRows.reduce((s, r) => s + (r.agg?.entries ?? 0), 0);
                  const grandEmployees = new Set<string>();
                  jobRows.forEach((r) => r.agg?.employees.forEach((id) => grandEmployees.add(id)));

                  const exportAllJobsCsv = () => {
                    const headers = ["Job", "Address", "Status", "First entry", "Last entry", "Total hours", "Employees", "Entries"];
                    const lines = jobRows.map((r) => [
                      r.job.job_name,
                      `${r.job.address}${r.job.city ? `, ${r.job.city}` : ""}`,
                      r.job.archived_at ? "Archived" : "Active",
                      r.agg?.firstDate ?? "",
                      r.agg?.lastDate ?? "",
                      ((r.agg?.minutes ?? 0) / 60).toFixed(2),
                      r.agg?.employees.size ?? 0,
                      r.agg?.entries ?? 0,
                    ]);
                    const csv = [headers, ...lines].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
                    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `job-hours-totals-${todayStr}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                  };

                  const exportDetailedCsv = () => {
                    const headers = ["Job", "Address", "Employee", "Hours", "Entries", "First date", "Last date"];
                    const lines: (string | number)[][] = [];
                    for (const { job } of jobRows) {
                      const jobEntries = relevantEntries.filter((e) => e.job_id === job.id);
                      const byEmp = new Map<string, { minutes: number; entries: number; first: string; last: string }>();
                      for (const e of jobEntries) {
                        let row = byEmp.get(e.employee_user_id);
                        if (!row) { row = { minutes: 0, entries: 0, first: e.work_date, last: e.work_date }; byEmp.set(e.employee_user_id, row); }
                        row.minutes += e.total_minutes ?? 0;
                        row.entries += 1;
                        if (e.work_date < row.first) row.first = e.work_date;
                        if (e.work_date > row.last) row.last = e.work_date;
                      }
                      Array.from(byEmp.entries()).sort((a, b) => b[1].minutes - a[1].minutes).forEach(([empId, v]) => {
                        lines.push([job.job_name, `${job.address}${job.city ? `, ${job.city}` : ""}`, employeeLabel(empId), (v.minutes / 60).toFixed(2), v.entries, v.first, v.last]);
                      });
                    }
                    const csv = [headers, ...lines].map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")).join("\n");
                    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = `job-hours-detailed-${todayStr}.csv`;
                    link.click();
                    URL.revokeObjectURL(url);
                  };

                  const breakdownJob = jobTotalsBreakdownId ? jobs.find((j) => j.id === jobTotalsBreakdownId) : null;
                  const breakdownEntries = breakdownJob ? relevantEntries.filter((e) => e.job_id === breakdownJob.id) : [];
                  const breakdownByEmp = (() => {
                    const m = new Map<string, { minutes: number; entries: number; first: string; last: string }>();
                    for (const e of breakdownEntries) {
                      let row = m.get(e.employee_user_id);
                      if (!row) { row = { minutes: 0, entries: 0, first: e.work_date, last: e.work_date }; m.set(e.employee_user_id, row); }
                      row.minutes += e.total_minutes ?? 0;
                      row.entries += 1;
                      if (e.work_date < row.first) row.first = e.work_date;
                      if (e.work_date > row.last) row.last = e.work_date;
                    }
                    return Array.from(m.entries()).map(([empId, v]) => ({ empId, ...v })).sort((a, b) => b.minutes - a.minutes);
                  })();
                  const breakdownTotalMinutes = breakdownByEmp.reduce((s, r) => s + r.minutes, 0);
                  const breakdownFirst = breakdownEntries.reduce<string | null>((acc, e) => (!acc || e.work_date < acc) ? e.work_date : acc, null);
                  const breakdownLast = breakdownEntries.reduce<string | null>((acc, e) => (!acc || e.work_date > acc) ? e.work_date : acc, null);

                  return (
                    <>
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">Total hours per job</h3>
                        <p className="text-sm text-muted-foreground">Hours logged on each job by all employees combined. Default view covers the entire history of every job.</p>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto]">
                        <div className="space-y-2">
                          <Label>Date range</Label>
                          <Select value={jobTotalsRange} onValueChange={(v) => setJobTotalsRange(v as typeof jobTotalsRange)}>
                            <SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All time</SelectItem>
                              <SelectItem value="month">This month</SelectItem>
                              <SelectItem value="quarter">This quarter</SelectItem>
                              <SelectItem value="year">This year</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select value={jobTotalsStatus} onValueChange={(v) => setJobTotalsStatus(v as typeof jobTotalsStatus)}>
                            <SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All jobs</SelectItem>
                              <SelectItem value="active">Active only</SelectItem>
                              <SelectItem value="archived">Archived only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Search</Label>
                          <Input className="h-11 bg-card" placeholder="Job name or address" value={jobTotalsSearch} onChange={(e) => setJobTotalsSearch(e.target.value)} />
                        </div>
                        <div className="flex items-end gap-2">
                          <Button type="button" variant="outline" className="h-11" onClick={exportAllJobsCsv}><Download className="h-4 w-4" />Export CSV</Button>
                          <Button type="button" variant="outline" className="h-11" onClick={exportDetailedCsv}><Download className="h-4 w-4" />Detailed CSV</Button>
                        </div>
                      </div>

                      {jobTotalsRange === "custom" ? (
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2"><Label>From</Label><Input type="date" className="h-11 bg-card" value={jobTotalsStart} onChange={(e) => setJobTotalsStart(e.target.value)} /></div>
                          <div className="space-y-2"><Label>To</Label><Input type="date" className="h-11 bg-card" value={jobTotalsEnd} onChange={(e) => setJobTotalsEnd(e.target.value)} /></div>
                        </div>
                      ) : null}

                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Total hours</p><p className="text-2xl font-semibold">{(grandMinutes / 60).toFixed(2)}</p></div>
                        <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{t("nav.employees")}</p><p className="text-2xl font-semibold">{grandEmployees.size}</p></div>
                        <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Time entries</p><p className="text-2xl font-semibold">{grandEntries}</p></div>
                      </div>

                      <div className="overflow-x-auto rounded-lg border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Job</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>First → Last</TableHead>
                              <TableHead className="text-right">Hours</TableHead>
                              <TableHead className="text-right">{t("nav.employees")}</TableHead>
                              <TableHead className="text-right">Entries</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {jobRows.length === 0 ? (
                              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No jobs match these filters.</TableCell></TableRow>
                            ) : jobRows.map(({ job, agg }) => (
                              <TableRow key={job.id}>
                                <TableCell>
                                  <div className="font-medium">{job.job_name}</div>
                                  <div className="text-xs text-muted-foreground">{job.address}{job.city ? `, ${job.city}` : ""}</div>
                                </TableCell>
                                <TableCell><span className={`inline-flex rounded-full px-2 py-0.5 text-xs ${job.archived_at ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"}`}>{job.archived_at ? "Archived" : "Active"}</span></TableCell>
                                <TableCell className="text-xs text-muted-foreground">{agg ? `${formatDate(agg.firstDate)} → ${formatDate(agg.lastDate)}` : "—"}</TableCell>
                                <TableCell className="text-right font-semibold">{((agg?.minutes ?? 0) / 60).toFixed(2)}</TableCell>
                                <TableCell className="text-right">{agg?.employees.size ?? 0}</TableCell>
                                <TableCell className="text-right">{agg?.entries ?? 0}</TableCell>
                                <TableCell className="text-right">
                                  <Button type="button" size="sm" variant="ghost" disabled={!agg} onClick={() => setJobTotalsBreakdownId(job.id)}><Eye className="h-4 w-4" />View</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      <Dialog open={!!jobTotalsBreakdownId} onOpenChange={(open) => { if (!open) setJobTotalsBreakdownId(null); }}>
                        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{breakdownJob?.job_name ?? "Job"}</DialogTitle>
                            <DialogDescription>{breakdownJob ? `${breakdownJob.address}${breakdownJob.city ? `, ${breakdownJob.city}` : ""}` : ""}</DialogDescription>
                          </DialogHeader>
                          <div id="payroll-report-print" className="space-y-5 print:p-0">
                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Total hours</p><p className="text-2xl font-semibold">{(breakdownTotalMinutes / 60).toFixed(2)}</p></div>
                              <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">{t("nav.employees")}</p><p className="text-2xl font-semibold">{breakdownByEmp.length}</p></div>
                              <div className="rounded-lg border bg-card p-4"><p className="text-xs text-muted-foreground">Entries</p><p className="text-2xl font-semibold">{breakdownEntries.length}</p></div>
                            </div>
                            <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">Date range covered:</span> {breakdownFirst ? formatDate(breakdownFirst) : "—"} → {breakdownLast ? formatDate(breakdownLast) : "—"}
                              {breakdownJob?.archived_at ? <> · <span className="font-medium text-foreground">Archived</span> {formatDate(breakdownJob.archived_at.slice(0, 10))}</> : null}
                            </div>
                            <div className="overflow-x-auto rounded-lg border">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead className="text-right">Hours</TableHead>
                                    <TableHead className="text-right">Entries</TableHead>
                                    <TableHead>First date</TableHead>
                                    <TableHead>Last date</TableHead>
                                    <TableHead className="text-right">% of job</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {breakdownByEmp.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground">No hours recorded.</TableCell></TableRow>
                                  ) : breakdownByEmp.map((row) => (
                                    <TableRow key={row.empId}>
                                      <TableCell className="font-medium">{employeeLabel(row.empId)}</TableCell>
                                      <TableCell className="text-right">{(row.minutes / 60).toFixed(2)}</TableCell>
                                      <TableCell className="text-right">{row.entries}</TableCell>
                                      <TableCell className="text-xs text-muted-foreground">{formatDate(row.first)}</TableCell>
                                      <TableCell className="text-xs text-muted-foreground">{formatDate(row.last)}</TableCell>
                                      <TableCell className="text-right">{breakdownTotalMinutes ? `${((row.minutes / breakdownTotalMinutes) * 100).toFixed(1)}%` : "—"}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                          <DialogFooter className="gap-2 print:hidden">
                            <Button type="button" variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Print / PDF</Button>
                            <Button type="button" onClick={() => setJobTotalsBreakdownId(null)}>Close</Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  );
                })()}
              </TabsContent>

              <TabsContent value="weekly" className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {reportFields.map((field) => (
                <label key={field.key} className="flex items-center gap-3 rounded-lg border bg-secondary p-3 text-sm">
                  <Checkbox checked={reportSettings[field.key] === true} onCheckedChange={(value) => setReportSettings({ ...reportSettings, [field.key]: value === true })} />
                  <span>{field.label}</span>
                </label>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button className="h-12" type="button" onClick={saveReportSettings}><Save className="h-4 w-4" />Save company defaults</Button>
              <Button className="h-12" variant="outline" type="button" onClick={sendWeeklyReportNow}><MailCheck className="h-4 w-4" />Send weekly report now</Button>
            </div>
            <p className="text-sm text-muted-foreground">All boxes start checked for the company. Uncheck company defaults here, then override individual employees inside their cards when needed.</p>
              </TabsContent>
            
              <TabsContent value="autoreport" className="space-y-4">
                <div className="rounded-2xl border bg-card p-5 space-y-4">
                  <div>
                    <h3 className="text-base font-semibold">Automated activity report</h3>
                    <p className="text-sm text-muted-foreground">Sends a branded summary email every Monday at 8:00 AM Eastern (or every other Monday for bi-weekly). Includes active employee count, total hours, employees with no punches, and a per–job-site breakdown.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="activity-active" checked={activityReport.is_active} onCheckedChange={(v) => setActivityReport((p) => ({ ...p, is_active: v === true }))} />
                    <Label htmlFor="activity-active">{activityReport.is_active ? "Enabled" : "Disabled"}</Label>
                  </div>
                  <div className="space-y-2 max-w-xs">
                    <Label>Frequency</Label>
                    <Select value={activityReport.frequency} onValueChange={(v) => setActivityReport((p) => ({ ...p, frequency: v as "weekly" | "biweekly" }))}>
                      <SelectTrigger className="h-11 bg-card"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly (every Monday)</SelectItem>
                        <SelectItem value="biweekly">Bi-weekly (every other Monday)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Recipients</Label>
                    <div className="flex gap-2">
                      <Input placeholder="name@example.com" value={activityRecipientDraft} onChange={(e) => setActivityRecipientDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addActivityRecipient(); } }} className="bg-card" />
                      <Button type="button" variant="outline" onClick={addActivityRecipient}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {activityReport.recipients.length === 0 ? <span className="text-sm text-muted-foreground">No recipients yet.</span> : activityReport.recipients.map((r) => (
                        <span key={r} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-sm">
                          {r}
                          <button type="button" aria-label={`Remove ${r}`} className="text-muted-foreground hover:text-foreground" onClick={() => removeActivityRecipient(r)}>×</button>
                        </span>
                      ))}
                    </div>
                  </div>
                  {activityReport.last_sent_period_end ? <p className="text-xs text-muted-foreground">Last sent for period ending {activityReport.last_sent_period_end}.</p> : null}
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={saveActivityReportSettings} disabled={savingActivityReport}>{savingActivityReport ? "Saving…" : "Save settings"}</Button>
                    <Button variant="outline" onClick={sendActivityReportNow} disabled={sendingActivityReport}>{sendingActivityReport ? "Sending…" : "Send test now"}</Button>
                  </div>
                </div>
              </TabsContent>
              {!managerOnly ? <TabsContent value="deletion" className="space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-muted-foreground">Most recent 100 deletions for your company.</p>
                  <Button type="button" size="sm" variant="outline" onClick={loadDeletionLog} disabled={loadingDeletionLog}>{loadingDeletionLog ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Refresh</Button>
                </div>
                {deletionLog.length ? (
                  <div className="space-y-2">
                    {deletionLog.map((row) => (
                      <div key={row.id} className="rounded-lg border bg-card p-3 text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{employeeLabel(row.employee_user_id)} · {row.work_date}</p>
                          <p className="text-xs text-muted-foreground">Deleted {formatDateTime(row.deleted_at)}</p>
                        </div>
                        <div className="mt-1 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                          <p>Job: {jobLabel(row.job_id)}</p>
                          <p>Hours: {formatHours(row.total_minutes ?? 0)} (break {row.break_minutes ?? 0} min)</p>
                          <p>Shift: {row.clock_in_at ? formatDateTime(row.clock_in_at) : "—"} — {row.clock_out_at ? formatDateTime(row.clock_out_at) : "—"}</p>
                          <p>By: {row.deleted_by_name || row.deleted_by_email || row.deleted_by_user_id}</p>
                        </div>
                        {row.deletion_reason ? <p className="mt-2 text-xs"><span className="font-medium">Reason:</span> {row.deletion_reason}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-muted-foreground">{loadingDeletionLog ? "Loading…" : "No deletions recorded yet."}</p>}
              </TabsContent> : null}
            </Tabs>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="time-off-holiday" className="rounded-lg border border-primary/20 bg-card px-5 shadow-[var(--shadow-panel)] sm:px-7">
          <AccordionTrigger className="py-5 text-left hover:no-underline">
            <span className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><ShieldCheck className="h-6 w-6" /></span><span><span className="block text-2xl font-semibold tracking-normal">Time off & holiday pay</span><span className="mt-1 block text-sm font-normal text-muted-foreground">{pendingPtoCount} pending {pendingPtoCount === 1 ? "request" : "requests"} · holiday qualification</span></span></span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <Tabs defaultValue="requests" className="space-y-4">
              <TabsList className="grid w-full max-w-md grid-cols-2">
                <TabsTrigger value="requests">Time-off requests</TabsTrigger>
                <TabsTrigger value="holiday">Holiday pay</TabsTrigger>
              </TabsList>
              <TabsContent value="requests" className="space-y-3">
            {timeOffRequests.length ? timeOffRequests.map((request) => {
              const employee = employees.find((item) => item.user_id === request.employee_user_id);
              return (
                <div key={request.id} className="rounded-lg border bg-secondary p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{employee?.display_name || employee?.email || "Employee"} · {ptoLabel(request.request_type)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{request.start_date} to {request.end_date} · {Number(request.requested_hours).toFixed(2)} hrs · {request.status}</p>
                      {request.note ? <p className="mt-2 text-sm">{request.note}</p> : null}
                    </div>
                  </div>
                  {request.status === "pending" ? (
                    <div className="mt-3 space-y-3">
                      <Textarea maxLength={1000} value={adminNotes[request.id] ?? ""} placeholder="Admin response note" onChange={(event) => setAdminNotes({ ...adminNotes, [request.id]: event.target.value })} />
                      <div className="grid grid-cols-2 gap-3">
                        <Button type="button" className="h-11" onClick={() => reviewRequest(request, "approved")}><CheckCircle2 className="h-4 w-4" />Approve</Button>
                        <Button type="button" variant="outline" className="h-11" onClick={() => reviewRequest(request, "denied")}><XCircle className="h-4 w-4" />Deny</Button>
                      </div>
                    </div>
                  ) : request.admin_response_note ? <p className="mt-2 text-sm text-muted-foreground">Admin note: {request.admin_response_note}</p> : null}
                </div>
              );
            }) : <p className="text-sm text-muted-foreground">Employee time-off requests will appear here.</p>}
          </TabsContent>
              <TabsContent value="holiday" className="grid gap-3 lg:grid-cols-2">
            {holidayQualificationRows.map(({ employee, holiday, dayBefore, dayAfter, qualifies }) => (
              <div key={`${employee.user_id}-${holiday.name}`} className="rounded-lg border bg-secondary p-4 text-sm">
                <p className="font-medium">{employee.display_name || employee.email || "Employee"} · {holiday.name}</p>
                <p className="mt-1 text-muted-foreground">{formatDate(holiday.date)} · {qualifies ? "Qualified" : `Needs ${formatDate(dayBefore)} and ${formatDate(dayAfter)}`}</p>
              </div>
            ))}
          </TabsContent>
            </Tabs>
          </AccordionContent>
        </AccordionItem>

        {managerOnly ? <AccordionItem value="manager-employees" className="rounded-lg border border-primary/20 bg-card px-5 shadow-[var(--shadow-panel)] sm:px-7">
          <AccordionTrigger className="py-5 text-left hover:no-underline">
            <span className="flex items-center gap-3"><span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground"><UsersRound className="h-6 w-6" /></span><span><span className="block text-2xl font-semibold tracking-normal">{t("nav.employees")}</span><span className="mt-1 block text-sm font-normal text-muted-foreground">Assign employees to jobs and adjust saved hours.</span></span></span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="flex justify-end">
              <Button type="button" onClick={() => setAddingEmployee(true)}><UserPlus className="h-4 w-4" />Add Employee</Button>
            </div>
            {addEmployeePanel}
            {employees.length ? employees.filter((employee) => employee.user_id !== userId).map((employee) => {
              const balance = ptoBalances[employee.user_id] ?? emptyPtoBalance(employee.user_id);
              const assignedJobs = assignedJobsFor(employee.user_id);
              const totalMinutes = employeeHours(employee.user_id);
              const tallies = employeeHourTallies(employee.user_id);
              const ptoSummary = employeePtoSummary(employee, balance);
              const employeeRequests = timeOffRequests.filter((request) => request.employee_user_id === employee.user_id).slice(0, 3);
              const assignedJobId = managerAssignmentDrafts[employee.user_id] ?? assignedJobIdFor(employee.user_id);
              const employeeEntries = adminTimeEntries.filter((entry) => entry.employee_user_id === employee.user_id).slice(0, 3);
              const isOpen = expandedEmployeeId === employee.user_id;
              return (
                <div key={employee.user_id} className="rounded-lg border bg-secondary p-4">
                  <button type="button" className="flex w-full items-center justify-between gap-3 text-left" onClick={() => setExpandedEmployeeId(isOpen ? "" : employee.user_id)}>
                    <span><span className="block font-medium">{employee.display_name || employee.email || "Employee"}</span><span className="mt-1 block text-sm text-muted-foreground">{employee.email || "No email"}</span></span>
                    <span className="text-sm font-medium text-primary">{isOpen ? "Close" : "View profile"}</span>
                  </button>
                  {isOpen ? (
                    <div className="mt-4 space-y-4 rounded-lg border bg-card p-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <p><span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("emp.name")}</span>{employee.display_name || "Not set"}</p>
                        <p><span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("emp.email")}</span>{employee.email || "Not set"}</p>
                        <p><span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("emp.phone")}</span>{employee.phone || "Not set"}</p>
                        <p><span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">Emergency contact</span>{employee.emergency_contact || "Not set"}</p>
                        <p><span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">PTO balance</span>Vacation {Number(balance.vacation_hours || 0).toFixed(2)} · Sick {Number(balance.sick_hours || 0).toFixed(2)} · Holiday {Number(balance.holiday_hours || 0).toFixed(2)} · Days off {Number(balance.day_off_hours || 0).toFixed(2)}</p>
                        <p><span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">PTO tier</span>{ptoSummary.tierLabel} · {ptoSummary.accrued.toFixed(2)} hrs accrued this anniversary year{ptoSummary.nextTier ? ` · Next tier ${formatDate(ptoSummary.nextTier)}` : ""}</p>
                        <p><span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">Hours worked</span>Daily {formatHours(tallies.daily)} · Weekly {formatHours(tallies.weekly)} · Yearly {formatHours(tallies.yearly)} · Total {formatHours(totalMinutes)}</p>
                        <p className="sm:col-span-2"><span className="block text-xs uppercase tracking-[0.14em] text-muted-foreground">Assigned jobs</span>{assignedJobs.length ? assignedJobs.map((job) => job.job_name).join(", ") : "No jobs assigned"}</p>
                      </div>
                      <div className="rounded-lg border bg-secondary p-3">
                        <p className="font-medium">PTO requests</p>
                        <div className="mt-2 space-y-2 text-sm text-muted-foreground">{employeeRequests.length ? employeeRequests.map((request) => <p key={request.id}>{ptoLabel(request.request_type)} · {request.start_date} to {request.end_date} · {request.status}</p>) : <p>No PTO requests yet.</p>}</div>
                      </div>
                      <div className="grid gap-3 rounded-lg border bg-secondary p-3 sm:grid-cols-[1fr_auto] sm:items-end">
                        <div className="space-y-2"><Label>Assign to Job</Label><Select value={assignedJobId || undefined} onValueChange={(value) => setManagerAssignmentDrafts((current) => ({ ...current, [employee.user_id]: value }))}><SelectTrigger className="h-11 bg-card"><SelectValue placeholder="Choose job" /></SelectTrigger><SelectContent>{jobs.map((job) => <SelectItem key={job.id} value={job.id}>{job.address}</SelectItem>)}</SelectContent></Select></div>
                        <Button className="h-11" type="button" onClick={() => saveEmployeeAssignmentsFromProfile(employee.user_id)}><Save className="h-4 w-4" />Assign to Job</Button>
                      </div>
                      <div className="space-y-3">
                        <p className="font-medium">Recent hours</p>
                        {employeeEntries.length ? employeeEntries.map((entry) => {
                          const draft = managerEntryDrafts[entry.id] ?? { break_minutes: String(entry.break_minutes ?? 0), total_hours: ((entry.total_minutes || elapsedMinutes(entry)) / 60).toFixed(2) };
                          return (
                            <div key={entry.id} className="grid gap-3 rounded-lg border bg-secondary p-3 lg:grid-cols-[1fr_110px_110px_auto] lg:items-end">
                              <div><p className="font-medium">{jobLabel(entry.job_id)}{entry.is_late ? <span className="ml-2 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">Late +{entry.late_minutes ?? 0}m</span> : null}</p><p className="text-sm text-muted-foreground">{entry.work_date} · {formatDateTime(entry.clock_in_at)} — {formatDateTime(entry.clock_out_at)}{entry.paid_start_at && entry.clock_in_at && entry.paid_start_at !== entry.clock_in_at ? <span className="ml-2 italic">(paid from {formatDateTime(entry.paid_start_at)})</span> : null}</p></div>
                              <div className="space-y-2"><Label>Break min</Label><Input type="number" min="0" value={draft.break_minutes} onChange={(event) => setManagerEntryDrafts((current) => ({ ...current, [entry.id]: { ...draft, break_minutes: event.target.value } }))} /></div>
                              <div className="space-y-2"><Label>Total hrs</Label><Input type="number" min="0" step="0.01" value={draft.total_hours} onChange={(event) => setManagerEntryDrafts((current) => ({ ...current, [entry.id]: { ...draft, total_hours: event.target.value } }))} /></div>
                              <Button className="h-11" type="button" variant="outline" onClick={() => saveManagerEntry(entry)}><Save className="h-4 w-4" />{t("common.save")}</Button>
                            </div>
                          );
                        }) : <p className="text-sm text-muted-foreground">No recent hours for this employee.</p>}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            }) : <p className="text-sm text-muted-foreground">Employees will appear here after they are added.</p>}
          </AccordionContent>
        </AccordionItem> : null}

        {!managerOnly ? <AccordionItem value="employees" className="rounded-lg border border-primary/20 bg-card px-5 shadow-[var(--shadow-panel)] sm:px-7">
          <AccordionTrigger className="py-5 text-left hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground"><UserRound className="h-6 w-6" /></span>
              <span>
                <span className="block text-2xl font-semibold tracking-normal">{t("nav.employees")}</span>
                <span className="mt-1 block text-sm font-normal text-muted-foreground">Ver perfiles, trabajos asignados, horas, PTO y correos.</span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pb-6">
            <div className="flex justify-end">
              <Button type="button" onClick={() => setAddingEmployee(true)}><UserPlus className="h-4 w-4" />Add Employee</Button>
            </div>
            {addEmployeePanel}
            {employees.length ? employees.map((employee) => {
              const balance = ptoBalances[employee.user_id] ?? emptyPtoBalance(employee.user_id);
              const assignedJobs = assignedJobsFor(employee.user_id);
              const totalMinutes = employeeHours(employee.user_id);
              const tallies = employeeHourTallies(employee.user_id);
              const ptoSummary = employeePtoSummary(employee, balance);
              const employeeRequests = timeOffRequests.filter((request) => request.employee_user_id === employee.user_id).slice(0, 3);
              const eligibilityDate = vacationEligibilityDate(employee.hire_date);
              const vacationEligible = isVacationEligible(employee.hire_date);
              const isProfileEditing = editingEmployeeUserId === employee.user_id;
              const draft = employeeDrafts[employee.user_id] ?? employeeProfileDraftFor(employee);
              const employeeRole = roleForUser(employee.user_id);
              return (
                <div key={employee.user_id} className="rounded-lg border bg-secondary p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">{employee.display_name || employee.email || "Employee"}</p>
                      <p className="text-sm text-muted-foreground">{employee.email || "No email"} · {employee.phone || "No phone"}</p>
                      <p className="mt-2 text-sm text-muted-foreground">Assigned jobs: {assignedJobs.length ? assignedJobs.map((job) => job.job_name).join(", ") : "No jobs assigned"}</p>
                      <p className="mt-1 text-sm font-medium">Recorded hours: {formatHours(totalMinutes)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">Vacation PTO: {vacationEligible ? "Eligible" : eligibilityDate ? `Eligible ${formatDate(eligibilityDate)}` : "Hire date needed"}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {isProfileEditing ? (
                        <>
                          <Button className="h-11" type="button" onClick={() => saveEmployeeProfile(employee.user_id)}><Save className="h-4 w-4" />Save profile</Button>
                          <Button className="h-11" type="button" variant="outline" onClick={() => cancelEmployeeProfileEdit(employee.user_id)}>{t("common.cancel")}</Button>
                        </>
                      ) : <Button className="h-11" type="button" variant="outline" onClick={() => startEmployeeProfileEdit(employee)}><Edit3 className="h-4 w-4" />Edit profile</Button>}
                      <Button className="h-11" type="button" variant="outline" onClick={() => sendEmployeePasswordReset(employee)} disabled={!employee.email} title="Emails the employee a one-time link to set or reset their login password."><LockKeyhole className="h-4 w-4" />Send password setup/reset link</Button>
                      <Button className="h-11" type="button" variant="outline" onClick={() => openSetPasswordDialog(employee)} title="Set a temporary password for this employee right now."><LockKeyhole className="h-4 w-4" />Set temporary password</Button>
                      {employeeRole === "employee" ? <Button className="h-11" type="button" variant="destructive" onClick={() => setPendingEmployeeDelete(employee)}><Trash2 className="h-4 w-4" />Archive</Button> : null}
                      <Button className="h-11" type="button" onClick={() => savePtoBalance(employee.user_id)}><Save className="h-4 w-4" />Save PTO</Button>
                    </div>
                  </div>
                  <button type="button" className="mt-4 flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-3 text-left" onClick={() => setExpandedEmployeeId(expandedEmployeeId === employee.user_id ? "" : employee.user_id)}>
                    <span><span className="block font-medium">Profile details</span><span className="mt-1 block text-sm text-muted-foreground">PTO, hours, requests, and editable employee information</span></span>
                    <span className="text-sm font-medium text-primary">{expandedEmployeeId === employee.user_id ? "Close" : "View profile"}</span>
                  </button>
                  {expandedEmployeeId === employee.user_id ? <div className="mt-4 space-y-4 rounded-lg border bg-card p-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border bg-secondary p-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Daily</p><p className="mt-1 font-semibold">{formatHours(tallies.daily)}</p></div>
                      <div className="rounded-lg border bg-secondary p-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Weekly</p><p className="mt-1 font-semibold">{formatHours(tallies.weekly)}</p></div>
                      <div className="rounded-lg border bg-secondary p-3"><p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Yearly</p><p className="mt-1 font-semibold">{formatHours(tallies.yearly)}</p></div>
                    </div>
                    <div className="rounded-lg border bg-secondary p-3 text-sm">
                      <p className="font-medium">PTO schedule</p>
                      <p className="mt-1 text-muted-foreground">{ptoSummary.tierLabel} · {ptoSummary.accrued.toFixed(2)} hrs accrued this anniversary year · Annual cap {ptoSummary.annual.toFixed(2)} hrs{ptoSummary.nextTier ? ` · Next tier ${formatDate(ptoSummary.nextTier)}` : ""}</p>
                    </div>
                    <div className="rounded-lg border bg-secondary p-3 text-sm">
                      <p className="font-medium">Recent PTO requests</p>
                      <div className="mt-2 space-y-2 text-muted-foreground">{employeeRequests.length ? employeeRequests.map((request) => <p key={request.id}>{ptoLabel(request.request_type)} · {request.start_date} to {request.end_date} · {request.status}</p>) : <p>No PTO requests yet.</p>}</div>
                    </div>
                  <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2">
                    <div className="space-y-2"><Label>{t("emp.name")}</Label><Input disabled={!isProfileEditing} value={draft.display_name} onChange={(event) => updateEmployeeDraft(employee.user_id, { display_name: event.target.value })} /></div>
                    <div className="space-y-2"><Label>{t("emp.email")}</Label><Input disabled={!isProfileEditing} type="email" value={draft.email} onChange={(event) => updateEmployeeDraft(employee.user_id, { email: event.target.value })} /></div>
                    <div className="space-y-2"><Label>{t("emp.phone")}</Label><Input disabled={!isProfileEditing} value={draft.phone} onChange={(event) => updateEmployeeDraft(employee.user_id, { phone: event.target.value })} /></div>
                    <div className="space-y-2"><Label>Emergency contact</Label><Input disabled={!isProfileEditing} value={draft.emergency_contact} onChange={(event) => updateEmployeeDraft(employee.user_id, { emergency_contact: event.target.value })} /></div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="space-y-2 rounded-lg border bg-card p-3 sm:col-span-1">
                      <Label>Date of hire</Label>
                      <Input className="h-12" type="date" value={isProfileEditing ? draft.hire_date : employee.hire_date ?? ""} onChange={(event) => isProfileEditing ? updateEmployeeDraft(employee.user_id, { hire_date: event.target.value }) : updateEmployeeProfile(employee.user_id, { hire_date: event.target.value || null })} />
                      <p className="text-xs text-muted-foreground">Vacation accrual starts after one year.</p>
                    </div>
                    <div className="space-y-2 rounded-lg border bg-card p-3 sm:col-span-2">
                      <Label>Vacation accrual per paycheck</Label>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <Input className="h-12" type="number" min="0" step="0.01" value={Number(balance.pto_accrual_rate_hours_per_paycheck) || ptoSummary.accrualRate || DEFAULT_PTO_ACCRUAL_RATE} onChange={(event) => updatePtoBalance(employee.user_id, { pto_accrual_rate_hours_per_paycheck: event.target.value })} />
                        <Input className="h-12" type="number" min="1" step="1" value={Number(balance.pto_pay_periods_per_year) || DEFAULT_PAY_PERIODS_PER_YEAR} onChange={(event) => updatePtoBalance(employee.user_id, { pto_pay_periods_per_year: event.target.value })} />
                        <Input className="h-12" type="date" value={balance.pto_last_accrual_date ?? ""} onChange={(event) => updatePtoBalance(employee.user_id, { pto_last_accrual_date: event.target.value || null })} />
                      </div>
                      <p className="text-xs text-muted-foreground">Tier-based bi-weekly accrual: {ptoSummary.accrualRate.toFixed(2)} hours across {Number(balance.pto_pay_periods_per_year) || DEFAULT_PAY_PERIODS_PER_YEAR} paychecks, capped at {ptoSummary.annual.toFixed(2)} hours per year.</p>
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {ptoTypes.map((item) => (
                      <div key={item.key} className="rounded-lg border bg-card p-3">
                        <div className="flex items-center gap-3">
                          <Checkbox checked={!!balance[item.enabled]} onCheckedChange={(checked) => updatePtoBalance(employee.user_id, { [item.enabled]: checked === true } as Partial<PtoBalance>)} />
                          <Label>{item.label} earned</Label>
                        </div>
                        <Input className="mt-3 h-12" type="number" min="0" step="0.25" value={Number(balance[item.hours]) || 0} onChange={(event) => updatePtoBalance(employee.user_id, { [item.hours]: event.target.value } as Partial<PtoBalance>)} />
                      </div>
                    ))}
                  </div>
                  {employeeRole === "employee" ? <div className="mt-4">{employeeAssignmentEditor(employee)}</div> : <p className="mt-4 rounded-lg border bg-card p-3 text-sm text-muted-foreground">Admins and managers are assigned to every new job automatically.</p>}
                  <div className="mt-4 rounded-lg border bg-card p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <p className="font-medium">Weekly email boxes</p>
                      <Button className="h-10" variant="outline" type="button" onClick={() => saveReportOverride(employee.user_id)}><Save className="h-4 w-4" />Save boxes</Button>
                    </div>
                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                      {reportFields.map((field) => {
                        const override = reportOverrides[employee.user_id];
                        const checked = override?.[field.key] ?? reportSettings[field.key];
                        return (
                          <label key={field.key} className="flex items-center gap-3 rounded-md border bg-secondary p-3 text-sm">
                            <Checkbox checked={checked === true} onCheckedChange={(value) => updateReportOverride(employee.user_id, field.key, value === true)} />
                            <span>{field.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                  </div> : null}
                </div>
              );
            }) : <p className="text-sm text-muted-foreground">Employees will appear here after accounts are created.</p>}
          </AccordionContent>
        </AccordionItem> : null}

        {!managerOnly ? <AccordionItem value="company" className="rounded-lg border border-primary/30 bg-card px-5 shadow-[var(--shadow-panel)] sm:px-7">
          <AccordionTrigger className="py-5 text-left hover:no-underline">
            <span className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Building2 className="h-6 w-6" /></span>
              <span>
                <span className="block text-sm font-semibold uppercase tracking-[0.16em] text-primary">Admin setup</span>
                <span className="mt-1 block text-2xl font-semibold tracking-normal">{t("nav.company")}</span>
              </span>
            </span>
          </AccordionTrigger>
          <AccordionContent className="pb-6">
            <div className="mb-4 flex justify-end">
              <Button type="button" variant="outline" onClick={() => editing ? saveCompanyInfo() : setEditing(true)} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                {editing ? "Save" : "Edit"}
              </Button>
            </div>
            <form className="grid gap-4 sm:grid-cols-2" onSubmit={saveCompanyInfo}>
              {adminProfileFields.map(({ label, key, placeholder }) => (
                <div className="space-y-2" key={key}>
                  <Label>{label}</Label>
                  <Input disabled={!editing} type={key.includes("email") ? "email" : "text"} value={profile[key] ?? ""} placeholder={placeholder} onChange={(event) => setProfile({ ...profile, [key]: event.target.value })} />
                </div>
              ))}
            </form>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border bg-secondary p-4">
                <MailCheck className="mb-2 h-5 w-5 text-primary" />
                <p className="font-medium">Recovery contact</p>
                <p className="mt-1 text-sm text-muted-foreground">The login email is kept with the admin profile for account recovery and secure access.</p>
              </div>
              <div className="rounded-lg border bg-secondary p-4">
                <ShieldCheck className="mb-2 h-5 w-5 text-primary" />
                <p className="font-medium">Alerts contact</p>
                <p className="mt-1 text-sm text-muted-foreground">The default alert email receives weekly and 35-hour threshold notices when configured.</p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem> : null}
      </Accordion>
    </div>
  );
};

const EmployeeDashboard = () => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileEditing, setProfileEditing] = useState(false);
  const [pinVerified, setPinVerified] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [profile, setProfile] = useState<Profile>({ display_name: "", phone: "", emergency_contact: "", email: "", payroll_email: "", employee_pin: "" });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assignedJobIds, setAssignedJobIds] = useState<string[]>([]);
  const [assignmentNotes, setAssignmentNotes] = useState<Record<string, string | null>>({});
  const [selectedJobId, setSelectedJobId] = useState("");
  const [timeEntry, setTimeEntry] = useState<TimeEntry | null>(null);
  const [timeActionSaving, setTimeActionSaving] = useState(false);
  const [queuedTimeActionCount, setQueuedTimeActionCount] = useState(0);
  const [timeSyncStatus, setTimeSyncStatus] = useState("All time entries are saved.");
  const [weekEntries, setWeekEntries] = useState<TimeEntry[]>([]);
  const [ptoBalance, setPtoBalance] = useState<PtoBalance | null>(null);
  const [approvedTimeOff, setApprovedTimeOff] = useState<TimeOffRequest[]>([]);
  const [companyName, setCompanyName] = useState("");
  const [companyInfo, setCompanyInfo] = useState<{ name?: string | null; contact_email?: string | null; contact_phone?: string | null; admin_alert_email?: string | null } | null>(null);
  const [locationCheck, setLocationCheck] = useState<LocationCheckState>({ status: "idle", message: "Refresh your GPS location before clocking in or out." });
  const [calendarMonth, setCalendarMonth] = useState(today().slice(0, 7));
  const [endShiftDialogOpen, setEndShiftDialogOpen] = useState(false);
  const [endShiftNote, setEndShiftNote] = useState("");
  const [missedClockInDialogOpen, setMissedClockInDialogOpen] = useState(false);
  const [missedClockInForm, setMissedClockInForm] = useState<{ job_id: string; clock_in_at: string; clock_out_at: string; note: string }>({ job_id: "", clock_in_at: "", clock_out_at: "", note: "" });

  const selectedJob = jobs.find((job) => job.id === selectedJobId);
  const activeJob = jobs.find((job) => job.id === timeEntry?.job_id);
  const isClockedIn = !!timeEntry?.clock_in_at && !timeEntry.clock_out_at;
  const clockInJobs = jobs.filter((job) => !job.archived_at || (isClockedIn && job.id === timeEntry?.job_id));
  const isSelectedJobAssigned = !!selectedJobId && assignedJobIds.includes(selectedJobId);
  const dailyMinutes = elapsedMinutes(timeEntry);
  const weeklyMinutes = useMemo(() => weekEntries.reduce((sum, entry) => sum + (entry.work_date === today() ? dailyMinutes : entry.total_minutes), 0), [dailyMinutes, weekEntries]);
  const monthStart = monthStartIso(calendarMonth);
  const monthEnd = monthEndIso(calendarMonth);
  const calendarPto = approvedTimeOff.filter((request) => dateRangesOverlap(request.start_date, request.end_date, monthStart, monthEnd));
  const calendarHolidays = majorHolidays().filter((holiday) => holiday.date >= monthStart && holiday.date <= monthEnd);
  const calendarJobDays = weekEntries.filter((entry) => entry.work_date >= monthStart && entry.work_date <= monthEnd && entry.job_id);
  const calendarDays = Array.from(new Set([
    ...calendarPto.flatMap((request) => [request.start_date, request.end_date]),
    ...calendarHolidays.map((holiday) => holiday.date),
    ...calendarJobDays.map((entry) => entry.work_date),
  ])).sort();

  useEffect(() => {
    const loadDashboard = async () => {
      if (demoRole() === "employee") {
        setUserId("demo-employee-1");
        setProfile({ display_name: "Jordan Lee", phone: "(555) 013-4481", emergency_contact: "Taylor Lee — (555) 013-4499", email: "jordan@ridgewaydemo.com", payroll_email: "payroll@ridgewaydemo.com", employee_pin: "", hire_date: "2023-03-15", company_id: "demo-company", company_name: "Ridgeway Electrical" });
        setCompanyName("Ridgeway Electrical");
        setJobs(demoJobs);
        setAssignedJobIds(["demo-job-1", "demo-job-2"]);
        setAssignmentNotes({ "demo-job-1": "Lead on panel trim", "demo-job-2": null });
        setSelectedJobId("demo-job-1");
        setLocationCheck({ status: "confirmed", message: "Location confirmed — within 100 meters", latitude: 42.53491, longitude: -92.44529, accuracy: 12, distance: 2 });
        setTimeEntry({ id: "demo-entry-today", employee_user_id: "demo-employee-1", job_id: "demo-job-1", work_date: today(), clock_in_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), break_minutes: 30, clock_out_at: null, total_minutes: 0, is_saved: false });
        const demoEmployeeEntries = [
          { id: "demo-entry-today", employee_user_id: "demo-employee-1", job_id: "demo-job-1", work_date: today(), clock_in_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), break_minutes: 30, clock_out_at: null, total_minutes: 0, is_saved: false },
          { id: "demo-entry-2", employee_user_id: "demo-employee-1", job_id: "demo-job-2", work_date: new Date(Date.now() - 86400000).toISOString().slice(0, 10), clock_in_at: null, break_minutes: 30, clock_out_at: null, total_minutes: 450, is_saved: true },
        ];
        setWeekEntries(demoEmployeeEntries);
        setPtoBalance({ employee_user_id: "demo-employee-1", vacation_enabled: true, vacation_hours: 32, sick_enabled: true, sick_hours: 12, holiday_enabled: true, holiday_hours: 8, day_off_enabled: true, day_off_hours: 16 });
        setApprovedTimeOff(demoRequests.filter((request) => request.employee_user_id === "demo-employee-1" && request.status === "approved"));
        setCompanyInfo({ name: "Ridgeway Electrical", contact_email: "office@ridgewaydemo.com", contact_phone: "(555) 013-0100", admin_alert_email: "alerts@ridgewaydemo.com" });
        setPinVerified(true);
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase.auth.getUser();
      const currentUserId = userData.user?.id;
      if (!currentUserId) {
        navigate("/employee-login");
        return;
      }

      // Verify the user actually holds the employee role before rendering the employee portal.
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", currentUserId)
        .maybeSingle();
      const actualRole = roleRow?.role ?? null;
      if (actualRole && actualRole !== "employee") {
        if (actualRole === "admin") navigate("/admin");
        else if (actualRole === "manager") navigate("/manager");
        return;
      }

      setUserId(currentUserId);
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));

      // Pull a wider month-window of entries so the Company Calendar can show this employee's job activity for the selected month.
      const calendarRangeStart = new Date();
      calendarRangeStart.setDate(1);
      calendarRangeStart.setMonth(calendarRangeStart.getMonth() - 1);
      const monthlyStartIso = calendarRangeStart.toISOString().slice(0, 10);
      const [{ data: profileData }, { data: assignmentData }, { data: todayEntry }, { data: activeEntry }, { data: monthlyData }, { data: ptoData }, { data: approvedData }] = await Promise.all([
        db.from("profiles").select("display_name, phone, emergency_contact, email, payroll_email, employee_pin, hire_date, company_id, company_name").eq("user_id", currentUserId).maybeSingle(),
        db.from("employee_job_assignments").select("job_id, assignment_note").eq("employee_user_id", currentUserId),
        db.from("time_entries").select("*").eq("employee_user_id", currentUserId).eq("work_date", today()).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("time_entries").select("*").eq("employee_user_id", currentUserId).not("clock_in_at", "is", null).is("clock_out_at", null).maybeSingle(),
        db.from("time_entries").select("*").eq("employee_user_id", currentUserId).gte("work_date", monthlyStartIso).order("work_date", { ascending: false }),
        db.from("employee_pto_balances").select("*").eq("employee_user_id", currentUserId).maybeSingle(),
        db.from("time_off_requests").select("*").eq("employee_user_id", currentUserId).eq("status", "approved").order("start_date", { ascending: false }),
      ]);

      if (profileData) {
        setProfile(profileData);
        setCompanyName(profileData.company_name ?? "");
        if (profileData.company_id) {
          const { data: companyData } = await db.from("companies").select("name, contact_email, contact_phone, admin_alert_email").eq("id", profileData.company_id).maybeSingle();
          if (companyData) {
            setCompanyInfo(companyData);
            if (companyData.name) setCompanyName(companyData.name);
          }
        }
        setPinVerified(!profileData.employee_pin);
      }
      const currentEntry = activeEntry ?? todayEntry;
      const assignedIds: string[] = Array.from(new Set((assignmentData ?? []).map((assignment: { job_id: string }) => assignment.job_id).filter((jobId): jobId is string => typeof jobId === "string" && !!jobId)));
      setAssignedJobIds(assignedIds);
      const assignmentNotesMap: Record<string, string | null> = {};
      (assignmentData ?? []).forEach((assignment: { job_id: string; assignment_note?: string | null }) => { if (assignment.job_id) assignmentNotesMap[assignment.job_id] = assignment.assignment_note ?? null; });
      setAssignmentNotes(assignmentNotesMap);
      const visibleJobIds = Array.from(new Set([...assignedIds, currentEntry?.job_id].filter(Boolean) as string[]));
      if (visibleJobIds.length) {
          const { data: jobsData } = await db.from("jobs").select("id, job_name, job_description, manager_notes, address, city, state, latitude, longitude, archived_at").in("id", visibleJobIds).order("job_name");
        setJobs(jobsData ?? []);
      } else {
        setJobs([]);
      }
      if (currentEntry) {
        setTimeEntry(currentEntry);
        setSelectedJobId(currentEntry.job_id ?? "");
      }
      setWeekEntries(monthlyData ?? []);
      setPtoBalance(ptoData ?? emptyPtoBalance(currentUserId));
      setApprovedTimeOff(approvedData ?? []);
      setLoading(false);
    };

    loadDashboard();
  }, [navigate]);

  const signOut = async () => {
    sessionStorage.removeItem("punchCardProDemoRole");
    await supabase.auth.signOut();
    navigate("/");
  };

  const saveProfile = async (event?: FormEvent) => {
    event?.preventDefault();
    if (demoRole() === "employee") {
      demoToast();
      setProfileEditing(false);
      return;
    }
    if (!isEmail(profile.payroll_email)) {
      toast.error("Enter a valid payroll report email");
      return;
    }
    if (profile.employee_pin && !/^\d{4}$/.test(profile.employee_pin)) {
      toast.error("PIN must be exactly four digits");
      return;
    }

    setSavingProfile(true);
    const { error } = await db.from("profiles").update({
      display_name: profile.display_name,
      phone: profile.phone,
      emergency_contact: profile.emergency_contact,
      payroll_email: profile.payroll_email,
      employee_pin: profile.employee_pin,
    }).eq("user_id", userId);
    setSavingProfile(false);

    if (error) toast.error(error.message);
    else {
      toast.success("Profile saved");
      setProfileEditing(false);
      if (profile.employee_pin) setPinVerified(true);
    }
  };

  const verifyPin = (event: FormEvent) => {
    event.preventDefault();
    if (pinInput === profile.employee_pin) setPinVerified(true);
    else toast.error("PIN does not match");
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    if (demoRole() === "employee") {
      demoToast();
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPassword("");
    setConfirmPassword("");
    toast.success("Password updated");
  };

  const refreshQueuedTimeActions = (targetUserId = userId) => {
    if (!targetUserId) return 0;
    const count = queuedTimeEntriesForUser(targetUserId).length;
    setQueuedTimeActionCount(count);
    return count;
  };

  const removeQueuedTimeAction = (queueId: string) => {
    writeTimeEntryQueue(readTimeEntryQueue().filter((item) => item.id !== queueId));
    refreshQueuedTimeActions();
  };

  const syncQueuedTimeActions = async (showSuccess = false) => {
    if (!userId || demoRole() === "employee") return;
    const pending = queuedTimeEntriesForUser(userId);
    if (!pending.length) {
      setTimeSyncStatus("All time entries are saved.");
      setQueuedTimeActionCount(0);
      return;
    }
    if (!navigator.onLine) {
      setTimeSyncStatus(`${pending.length} time ${pending.length === 1 ? "entry is" : "entries are"} saved on this device and waiting to sync.`);
      setQueuedTimeActionCount(pending.length);
      return;
    }

    setTimeActionSaving(true);
    setTimeSyncStatus("Syncing saved time entries...");
    try {
      for (const item of pending) {
        let data: TimeEntry | null = null;
        if (item.action === "insert") {
          const { data: inserted, error } = await db
            .from("time_entries")
            .upsert({ ...item.updates, employee_user_id: item.userId, client_sync_id: item.clientSyncId, is_saved: true }, { onConflict: "employee_user_id,client_sync_id" })
            .select("*")
            .single();
          if (error) throw error;
          data = inserted;
        } else {
          let entryId = item.entryId;
          if (!entryId || entryId.startsWith("local-")) {
            const { data: existing, error: lookupError } = await db
              .from("time_entries")
              .select("id")
              .eq("employee_user_id", item.userId)
              .eq("client_sync_id", item.clientSyncId)
              .maybeSingle();
            if (lookupError) throw lookupError;
            entryId = existing?.id;
          }
          if (!entryId) throw new Error("Waiting for clock-in to sync before applying this time update");
          const { data: updated, error } = await db
            .from("time_entries")
            .update({ ...item.updates, is_saved: true })
            .eq("id", entryId)
            .select("*")
            .single();
          if (error) throw error;
          data = updated;
        }

        if (data) {
          setTimeEntry((current) => current?.id === item.localEntryId || current?.id === data.id || data.work_date === today() ? data : current);
          setWeekEntries((entries) => [data, ...entries.filter((entry) => entry.id !== data!.id && entry.id !== item.localEntryId)]);
          
        }
        removeQueuedTimeAction(item.id);
      }
      setTimeSyncStatus("All time entries are saved.");
      if (showSuccess) toast.success("Queued time entries synced");
    } catch (error) {
      const err = error as { code?: string; message?: string; name?: string };
      const rawMessage = err?.message ?? "";
      const isNetworkError = !navigator.onLine
        || err?.name === "TypeError"
        || /failed to fetch|network|fetcherror|load failed/i.test(rawMessage);

      // Permanent server-side rejections — surface to user and stop looping.
      let permanentMessage: string | null = null;
      if (err?.code === "23505") {
        permanentMessage = "You're already clocked into a job. Clock out first before clocking in again.";
      } else if (/not assigned to this job/i.test(rawMessage)) {
        permanentMessage = "You're no longer assigned to this job. Ask an admin to assign you, then clock in again.";
      } else if (/archived/i.test(rawMessage)) {
        permanentMessage = "This job is archived. Ask an admin to reopen it before clocking in.";
      } else if (/shift already ended/i.test(rawMessage)) {
        permanentMessage = "Your shift was already ended for the day. Clock-ins are locked until tomorrow.";
      } else if (/row-level security|permission denied/i.test(rawMessage)) {
        permanentMessage = "You don't have permission to save this time entry. Sign out and back in, then try again.";
      } else if (!isNetworkError && rawMessage) {
        permanentMessage = `Couldn't save time entry: ${rawMessage}`;
      }

      if (permanentMessage) {
        // Drop pending items so the user isn't stuck in a retry loop.
        const pendingNow = queuedTimeEntriesForUser(userId);
        writeTimeEntryQueue(readTimeEntryQueue().filter((item) => !pendingNow.some((p) => p.id === item.id)));
        refreshQueuedTimeActions();
        setTimeSyncStatus(permanentMessage);
        toast.error(permanentMessage);
        // Reload latest server state so the UI reflects reality.
        try {
          const { data: activeEntry } = await db
            .from("time_entries")
            .select("*")
            .eq("employee_user_id", userId)
            .not("clock_in_at", "is", null)
            .is("clock_out_at", null)
            .maybeSingle();
          setTimeEntry(activeEntry ?? null);
        } catch { /* noop */ }
      } else {
        const message = "Time entry saved on this device — will retry when online.";
        setTimeSyncStatus(message);
        refreshQueuedTimeActions();
        if (showSuccess) toast.info(message);
      }
    } finally {
      setTimeActionSaving(false);
    }
  };

  useEffect(() => {
    if (!userId || demoRole() === "employee") return;
    refreshQueuedTimeActions(userId);
    syncQueuedTimeActions();
    const handleOnline = () => syncQueuedTimeActions(true);
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const employeeLocationRequestRef = useRef(0);
  const checkLocation = async () => {
    if (!selectedJob) {
      setLocationCheck({ status: "blocked", message: "Select a work location first." });
      return;
    }
    if (!isValidCoordinate(selectedJob.latitude, selectedJob.longitude)) {
      setLocationCheck({ status: "confirmed", message: "No GPS pin for this location — clock in ready.", jobId: selectedJob.id });
      return;
    }
    if (!navigator.geolocation) {
      setLocationCheck({ status: "error", message: "GPS is not available on this device." });
      return;
    }
    const requestId = ++employeeLocationRequestRef.current;
    setLocationCheck({ status: "checking", message: "Refreshing your GPS location...", jobId: selectedJob.id });
    try {
      const position = await getBestCurrentPosition();
      if (requestId !== employeeLocationRequestRef.current) return;
      setLocationCheck(evaluateJobGeofence(selectedJob, position));
    } catch (error) {
      if (requestId !== employeeLocationRequestRef.current) return;
      setLocationCheck({ status: "error", message: error instanceof Error && !("code" in error) ? error.message : locationErrorMessage(error as GeolocationPositionError), jobId: selectedJob.id });
    }
  };

  const upsertEntry = async (updates: Partial<TimeEntry>) => {
    if (demoRole() === "employee") {
      demoToast();
      return;
    }
    if (!selectedJobId && !timeEntry?.job_id) {
      toast.error("Select a work location first");
      return;
    }
    if (updates.clock_in_at && isClockedIn) {
      toast.error(`Clock out of ${activeJob?.job_name ?? "your current job"} before clocking into a new job.`);
      return;
    }
    const actionJobId = updates.clock_out_at ? timeEntry?.job_id : selectedJobId || timeEntry?.job_id;
    if (updates.clock_in_at && actionJobId && !assignedJobIds.includes(actionJobId)) {
      toast.error("You are not assigned to this job. Ask an admin to update your job assignments before clocking in.");
      return;
    }
    if (updates.clock_in_at && selectedJob?.archived_at) {
      toast.error("This job is archived. Ask an admin to unarchive it before clocking in.");
      return;
    }
    if ((updates.clock_in_at || updates.clock_out_at) && !isLocationReady(locationCheck, actionJob)) {
      toast.error(locationCheck.status === "checking" ? "GPS check is still running — wait for it to finish." : updates.clock_out_at ? "Tap Refresh GPS, then clock out." : locationCheck.status === "blocked" && locationCheck.distance != null ? `You are too far from the job site. Current distance: ${Math.round(locationCheck.distance)} meters.` : locationCheck.status === "error" ? locationCheck.message : "Tap Refresh GPS, then clock in.");
      return;
    }

    const isNewEntry = !timeEntry?.id || timeEntry.id.startsWith("local-");
    const clientSyncId = timeEntry?.client_sync_id || localQueueId();
    const payload = {
      employee_user_id: userId,
      job_id: actionJobId,
      ...(updates.clock_in_at ? {
        clock_in_latitude: locationCheck.latitude,
        clock_in_longitude: locationCheck.longitude,
        clock_in_accuracy_meters: locationCheck.accuracy,
        clock_in_distance_meters: locationCheck.distance,
      } : {}),
      ...(updates.clock_out_at ? {
        clock_out_latitude: locationCheck.latitude,
        clock_out_longitude: locationCheck.longitude,
        clock_out_accuracy_meters: locationCheck.accuracy,
        clock_out_distance_meters: locationCheck.distance,
      } : {}),
      work_date: today(),
      client_sync_id: clientSyncId,
      is_saved: true,
      ...updates,
    };
    const localEntryId = timeEntry?.id || clientSyncId;
    const fallback: TimeEntry = {
      id: localEntryId,
      employee_user_id: userId,
      job_id: payload.job_id ?? null,
      work_date: today(),
      clock_in_at: null,
      clock_out_at: null,
      break_minutes: 0,
      total_minutes: 0,
      is_saved: false,
      client_sync_id: clientSyncId,
    };
    const optimisticEntry = timeEntryWithUpdate(timeEntry, payload, fallback);
    setTimeEntry(optimisticEntry);
    setWeekEntries((entries) => [optimisticEntry, ...entries.filter((entry) => entry.id !== optimisticEntry.id)]);
    

    const queueItem: TimeEntryQueueItem = {
      id: localQueueId(),
      userId,
      entryId: isNewEntry ? null : timeEntry.id,
      localEntryId,
      clientSyncId,
      action: isNewEntry ? "insert" : "update",
      updates: payload,
      createdAt: new Date().toISOString(),
    };
    writeTimeEntryQueue([...readTimeEntryQueue(), queueItem]);
    refreshQueuedTimeActions();

    const actionLabel = updates.clock_in_at ? "Clock-in" : updates.clock_out_at ? "Clock-out" : "Break";
    if (!navigator.onLine) {
      setTimeSyncStatus("Time entry saved on this device — will sync when online.");
      toast.info(`${actionLabel} saved on this device — will sync when online.`);
      return;
    }

    await syncQueuedTimeActions();
    if (!queuedTimeEntriesForUser(userId).some((item) => item.id === queueItem.id)) {
      toast.success(`${actionLabel} saved`);
    }
    if (updates.clock_in_at) {
      emitHoursWarnings(checkHoursWarnings({ entries: weekEntries, employeeUserId: userId, workDate: today(), newMinutes: 0, newClockInAt: updates.clock_in_at, excludeEntryId: timeEntry?.id }));
    }
  };

  const switchJob = async (newJobId: string) => {
    if (!isClockedIn || !timeEntry) {
      toast.error("You are not currently clocked in.");
      return;
    }
    if (timeEntry.job_id === newJobId) return;
    if (!assignedJobIds.includes(newJobId)) {
      toast.error("You are not assigned to this job.");
      return;
    }
    const newJob = jobs.find((j) => j.id === newJobId);
    if (!newJob) return;
    if (newJob.archived_at) {
      toast.error("This job is archived.");
      return;
    }
    const newJobHasGps = isValidCoordinate(newJob.latitude, newJob.longitude);
    if (newJobHasGps && (!isLocationCleared(locationCheck) || locationCheck.jobId !== newJobId)) {
      toast.error("Tap Refresh GPS at the new job before switching.");
      return;
    }
    setTimeActionSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const { error: closeError } = await db.from("time_entries").update({
        clock_out_at: nowIso,
        clock_out_latitude: locationCheck.latitude,
        clock_out_longitude: locationCheck.longitude,
        clock_out_accuracy_meters: locationCheck.accuracy,
        clock_out_distance_meters: locationCheck.distance,
        is_saved: true,
      }).eq("id", timeEntry.id);
      if (closeError) throw closeError;
      const clientSyncId = localQueueId();
      const { data: inserted, error: insertError } = await db.from("time_entries").insert({
        employee_user_id: userId,
        job_id: newJobId,
        work_date: today(),
        clock_in_at: nowIso,
        clock_in_latitude: locationCheck.latitude,
        clock_in_longitude: locationCheck.longitude,
        clock_in_accuracy_meters: locationCheck.accuracy,
        clock_in_distance_meters: locationCheck.distance,
        client_sync_id: clientSyncId,
        is_saved: true,
      }).select("*").single();
      if (insertError) throw insertError;
      setTimeEntry(inserted);
      setSelectedJobId(newJobId);
      setWeekEntries((entries) => {
        const withClosed = entries.map((e) => e.id === timeEntry.id ? { ...e, clock_out_at: nowIso } : e);
        return [inserted, ...withClosed.filter((e) => e.id !== inserted.id)];
      });
      toast.success(`Switched to ${newJob.job_name}`);
      emitHoursWarnings(checkHoursWarnings({ entries: weekEntries, employeeUserId: userId, workDate: today(), newMinutes: 0, newClockInAt: nowIso, excludeEntryId: timeEntry.id }));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to switch jobs";
      toast.error(msg);
    } finally {
      setTimeActionSaving(false);
    }
  };

  const todaySummary = useMemo(
    () => summarizeDay(timeEntry ? [...weekEntries.filter((e) => e.id !== timeEntry.id), timeEntry] : weekEntries, userId, today()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekEntries, timeEntry, dailyMinutes, userId]
  );

  const shiftEndedToday = useMemo(() => {
    const todayIso = today();
    const all = timeEntry ? [...weekEntries.filter((e) => e.id !== timeEntry.id), timeEntry] : weekEntries;
    return all.some((e) => e.employee_user_id === userId && e.work_date === todayIso && e.is_shift_end);
  }, [weekEntries, timeEntry, userId]);

  const endShift = () => {
    if (!timeEntry?.id || !timeEntry.clock_in_at || timeEntry.clock_out_at) {
      toast.error("No active shift to end.");
      return;
    }
    const currentJob = jobs.find((j) => j.id === timeEntry.job_id);
    const currentJobHasGps = currentJob ? isValidCoordinate(currentJob.latitude, currentJob.longitude) : false;
    if (currentJobHasGps && (!isLocationCleared(locationCheck) || locationCheck.jobId !== timeEntry.job_id)) {
      toast.error("Tap Refresh GPS before ending the shift.");
      return;
    }
    setEndShiftNote("");
    setEndShiftDialogOpen(true);
  };

  const confirmEndShift = async () => {
    if (!timeEntry?.id || !timeEntry.clock_in_at || timeEntry.clock_out_at) return;
    setTimeActionSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const { data, error } = await db.from("time_entries").update({
        clock_out_at: nowIso,
        clock_out_latitude: locationCheck.latitude,
        clock_out_longitude: locationCheck.longitude,
        clock_out_accuracy_meters: locationCheck.accuracy,
        clock_out_distance_meters: locationCheck.distance,
        is_shift_end: true,
        is_saved: true,
        note: endShiftNote.trim() || null,
      }).eq("id", timeEntry.id).select("*").single();
      if (error) throw error;
      setTimeEntry(data);
      setWeekEntries((entries) => [data, ...entries.filter((e) => e.id !== data.id)]);
      toast.success("Shift ended. You can clock back in if you work more today.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to end shift");
    } finally {
      setTimeActionSaving(false);
      setEndShiftDialogOpen(false);
    }
  };

  const submitMissedClockIn = async () => {
    if (!missedClockInForm.job_id || !missedClockInForm.clock_in_at) {
      toast.error("Select a job and enter a clock-in time.");
      return;
    }
    if (!assignedJobIds.includes(missedClockInForm.job_id)) {
      toast.error("You are not assigned to this job.");
      return;
    }
    setTimeActionSaving(true);
    try {
      const clockInIso = new Date(missedClockInForm.clock_in_at).toISOString();
      const clockOutIso = missedClockInForm.clock_out_at ? new Date(missedClockInForm.clock_out_at).toISOString() : null;
      const totalMinutes = clockOutIso
        ? Math.max(0, Math.floor((new Date(clockOutIso).getTime() - new Date(clockInIso).getTime()) / 60000))
        : 0;
      const clientSyncId = localQueueId();
      const { data, error } = await db.from("time_entries").insert({
        employee_user_id: userId,
        job_id: missedClockInForm.job_id,
        work_date: clockInIso.slice(0, 10),
        clock_in_at: clockInIso,
        clock_out_at: clockOutIso,
        break_minutes: 0,
        total_minutes: totalMinutes,
        note: missedClockInForm.note.trim() || "Employee added missed clock-in",
        client_sync_id: clientSyncId,
        is_saved: true,
      }).select("*").single();
      if (error) throw error;
      setWeekEntries((entries) => [data, ...entries]);
      setMissedClockInDialogOpen(false);
      setMissedClockInForm({ job_id: "", clock_in_at: "", clock_out_at: "", note: "" });
      toast.success("Missed clock-in added.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add missed clock-in");
    } finally {
      setTimeActionSaving(false);
    }
  };


  if (loading) {
    return <div className="flex min-h-[70vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!pinVerified) {
    return (
      <section className="mx-auto flex min-h-[78vh] max-w-md items-center px-5">
        <Card className="w-full border-primary/30 shadow-[var(--shadow-panel)]">
          <CardHeader>
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-lg bg-primary text-primary-foreground"><LockKeyhole className="h-7 w-7" /></div>
            <CardTitle className="text-3xl tracking-normal">Enter employee PIN</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={verifyPin}>
              <Input inputMode="numeric" maxLength={4} value={pinInput} onChange={(event) => setPinInput(event.target.value.replace(/\D/g, ""))} className="h-16 text-center text-3xl tracking-[0.35em]" placeholder="0000" />
              <Button className="h-14 w-full text-base" type="submit">Unlock dashboard</Button>
              <Button className="h-12 w-full" variant="ghost" type="button" onClick={signOut}>{t("prof.logout")}</Button>
            </form>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 px-4 pb-10 pt-5 sm:px-6 lg:px-8">
      {companyName ? (
        <div className="rounded-lg border border-primary/30 bg-card p-4 shadow-[var(--shadow-panel)]">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Company timesheet</p>
          <p className="mt-1 text-2xl font-semibold tracking-normal">{companyName}</p>
        </div>
      ) : null}

      {/* Top: Jobs to work on + clock controls */}
      <section className="space-y-4">
        <div className="rounded-lg border border-primary/30 bg-card p-4 shadow-[var(--shadow-panel)] sm:p-5">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Jobs to work on</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {clockInJobs.length ? clockInJobs.map((job) => {
              const isActiveJob = isClockedIn && timeEntry?.job_id === job.id;
              const isAssigned = assignedJobIds.includes(job.id);
              return (
                <Button key={job.id} type="button" variant={selectedJobId === job.id ? "default" : "outline"} className="h-auto min-h-24 justify-start p-4 text-left" onClick={() => { if (selectedJobId === job.id) return; setSelectedJobId(job.id); setLocationCheck({ status: "idle", message: isClockedIn && timeEntry?.job_id !== job.id ? `Clock out of ${activeJob?.job_name ?? "your current job"} before clocking into this job.` : "Tap Refresh GPS to confirm your location.", jobId: job.id }); }}>
                  {isActiveJob ? <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-success" /> : <XCircle className="mt-1 h-5 w-5 shrink-0 text-destructive" />}
                  <span className="min-w-0">
                    <span className="block font-semibold">{job.address}</span>
                    <span className="mt-1 block text-sm opacity-80">{job.city}, {job.state}</span>
                    <span className="mt-1 block text-xs opacity-80">{job.archived_at ? `Archived ${formatDate(job.archived_at)}` : isActiveJob ? "Clocked in" : isAssigned ? "Clocked out" : "No longer assigned"}</span>
                  </span>
                </Button>
              );
            }) : <p className="text-sm text-muted-foreground">Assigned active job site addresses will appear here after an admin adds them.</p>}
          </div>
          {isClockedIn ? <p className="mt-3 text-sm text-muted-foreground">Current job: {activeJob ? `${activeJob.job_name} — ${activeJob.address}` : "active clock-in"}{timeEntry?.is_late ? <span className="ml-2 inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-destructive-foreground">Late +{timeEntry.late_minutes ?? 0}m</span> : null}{timeEntry?.paid_start_at && timeEntry.clock_in_at && timeEntry.paid_start_at !== timeEntry.clock_in_at ? <span className="ml-2 italic">Paid time starts at {formatDateTime(timeEntry.paid_start_at)}</span> : null}</p> : null}
        </div>

        {selectedJob ? (
          <div className="space-y-3 rounded-lg border bg-secondary p-3 text-sm">
            <p className="font-medium text-foreground">{selectedJob.address}, {selectedJob.city}, {selectedJob.state}</p>
            <p className="text-sm font-medium text-foreground">{selectedJob.job_name}</p>
            <p className="text-muted-foreground">{selectedJob.job_description || "No job description added yet."}</p>
            {selectedJob.manager_notes ? <div className="rounded-md border border-primary/30 bg-primary/5 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Manager Notes</p><p className="mt-1 text-foreground">{selectedJob.manager_notes}</p></div> : null}
            {assignmentNotes[selectedJob.id] ? <div className="rounded-md border border-primary/30 bg-primary/5 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-primary">Your Assignment Notes</p><p className="mt-1 text-foreground">{assignmentNotes[selectedJob.id]}</p></div> : null}
            <p className="text-muted-foreground">{selectedJob.latitude != null && selectedJob.longitude != null ? `GPS pin active · 100 meter clock-in and clock-out radius` : "No GPS pin — clock in available without location check."}</p>
            <div className={locationCheck.status === "blocked" ? "rounded-md border border-destructive/40 bg-card p-3" : "rounded-md border bg-card p-3"}>
              <p className={locationCheck.status === "confirmed" ? "font-medium text-primary" : locationCheck.status === "blocked" ? "font-medium text-destructive" : "font-medium"}>{locationCheck.message}</p>
              {locationCheck.distance != null ? <p className="mt-1 text-xs text-muted-foreground">Current distance: {Math.round(locationCheck.distance)} meters from job site · GPS accuracy: {Math.round(locationCheck.accuracy ?? 0)} meters</p> : <p className="mt-1 text-xs text-muted-foreground">Location permission is required on mobile before clocking in or out.</p>}
            </div>
            <Button type="button" variant="outline" className="h-11 w-full" onClick={checkLocation} disabled={locationCheck.status === "checking"}>
              {locationCheck.status === "checking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              {locationCheck.latitude != null ? "Refresh Location" : "Check my location"}
            </Button>
          </div>
        ) : null}

        <Card className="border-primary/30 bg-[image:var(--gradient-hero)] shadow-[var(--shadow-panel)]">
          <CardContent className="p-5 sm:p-7">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Today</p>
            <h1 className="mt-2 text-5xl font-semibold tracking-normal sm:text-6xl">{formatHours(dailyMinutes)}</h1>
            <p className="mt-2 text-muted-foreground">Week total: {formatHours(weeklyMinutes)}</p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {isClockedIn && selectedJobId && selectedJobId !== timeEntry?.job_id ? (
                <Button className="h-20 flex-col text-base" disabled={timeActionSaving || !isSelectedJobAssigned || !!selectedJob?.archived_at || !isLocationReady(locationCheck, selectedJob)} onClick={() => switchJob(selectedJobId)}>{timeActionSaving ? <Loader2 className="h-7 w-7 animate-spin" /> : <Play className="h-7 w-7" />}Switch to {selectedJob?.job_name ?? "this job"}</Button>
              ) : (
                <Button className="h-20 flex-col text-base" disabled={timeActionSaving || !selectedJobId || !isSelectedJobAssigned || !!selectedJob?.archived_at || !isLocationReady(locationCheck, selectedJob) || isClockedIn} onClick={() => upsertEntry({ clock_in_at: new Date().toISOString() })}>{timeActionSaving ? <Loader2 className="h-7 w-7 animate-spin" /> : <Play className="h-7 w-7" />}Clock in</Button>
              )}
              <Button className="h-20 flex-col text-base" variant="outline" disabled={timeActionSaving || !timeEntry?.clock_in_at || !!timeEntry?.clock_out_at} onClick={() => upsertEntry({ break_minutes: (timeEntry?.break_minutes ?? 0) + 30 })}>{timeActionSaving ? <Loader2 className="h-7 w-7 animate-spin" /> : <Coffee className="h-7 w-7" />}Break +30</Button>
              <Button className="h-20 flex-col text-base" variant="secondary" disabled={timeActionSaving || !timeEntry?.clock_in_at || !!timeEntry?.clock_out_at || !isLocationReady(locationCheck, jobs.find((j) => j.id === timeEntry?.job_id))} onClick={endShift}>{timeActionSaving ? <Loader2 className="h-7 w-7 animate-spin" /> : <Square className="h-7 w-7" />}End shift</Button>
            </div>
            {shiftEndedToday ? (
              <div className="mt-3 rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
                <p className="font-semibold text-primary">Shift ended for today</p>
                <p className="mt-1 text-xs text-muted-foreground">You can still clock in for another job if needed. Tap a job above to get started.</p>
              </div>
            ) : null}
            {todaySummary.count > 0 ? (
              <div className="mt-4 rounded-lg border bg-card p-4 text-sm">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">Today's shift</p>
                  <p className="font-semibold text-primary">{formatHours(todaySummary.totalMinutes)}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {todaySummary.shiftStart ? `Started ${formatDateTime(todaySummary.shiftStart)}` : "Not started"}
                  {todaySummary.isActive ? " · on shift" : todaySummary.shiftEnd ? ` · ended ${formatDateTime(todaySummary.shiftEnd)}` : ""}
                </p>
                <ul className="mt-3 space-y-1">
                  {todaySummary.perJob.map(({ job_id, minutes }) => {
                    const job = jobs.find((j) => j.id === job_id);
                    const label = job ? job.job_name : "Unassigned";
                    const isCurrent = isClockedIn && timeEntry?.job_id === job_id;
                    return (
                      <li key={job_id} className="flex items-center justify-between">
                        <span className={isCurrent ? "font-medium text-primary" : ""}>{label}{isCurrent ? " · active" : ""}</span>
                        <span className="tabular-nums">{formatHours(minutes)}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            <div className="mt-4 rounded-lg border bg-card p-3 text-sm">
              <p className={queuedTimeActionCount ? "font-medium text-primary" : "font-medium text-foreground"}>{timeSyncStatus}</p>
              {queuedTimeActionCount ? <p className="mt-1 text-xs text-muted-foreground">{queuedTimeActionCount} pending {queuedTimeActionCount === 1 ? "action" : "actions"} will retry automatically.</p> : <p className="mt-1 text-xs text-muted-foreground">Clock actions auto-save immediately; no manual save is required.</p>}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">GPS verification is required to clock in and clock out within 100 meters of the job pin.</p>
            <div className="mt-3 flex gap-2">
              <Button type="button" variant="outline" className="h-10" onClick={() => { setMissedClockInForm({ job_id: assignedJobIds[0] ?? "", clock_in_at: "", clock_out_at: "", note: "" }); setMissedClockInDialogOpen(true); }}>
                <Plus className="h-4 w-4" /> Missed clock-in
              </Button>
            </div>

            {/* End of shift dialog — single description prompt */}
            <Dialog open={endShiftDialogOpen} onOpenChange={setEndShiftDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>End your shift</DialogTitle>
                  <DialogDescription>Add a note about what you worked on today (optional), then confirm to end your shift.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <Label htmlFor="end-shift-note">What did you work on today?</Label>
                  <Textarea id="end-shift-note" maxLength={500} value={endShiftNote} onChange={(e) => setEndShiftNote(e.target.value)} placeholder="e.g. Finished siding on the south side, cleaned up debris" />
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEndShiftDialogOpen(false)}>{t("common.cancel")}</Button>
                  <Button onClick={confirmEndShift} disabled={timeActionSaving}>
                    {timeActionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Square className="h-4 w-4" />}
                    End shift
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Missed clock-in dialog */}
            <Dialog open={missedClockInDialogOpen} onOpenChange={setMissedClockInDialogOpen}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Add missed clock-in</DialogTitle>
                  <DialogDescription>Forgot to clock in for a job? Add it here. Your admin will see the note.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-2">
                  <div className="space-y-2">
                    <Label>Job</Label>
                    <Select value={missedClockInForm.job_id} onValueChange={(v) => setMissedClockInForm((c) => ({ ...c, job_id: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
                      <SelectContent>
                        {clockInJobs.filter((j) => !j.archived_at && assignedJobIds.includes(j.id)).map((job) => (
                          <SelectItem key={job.id} value={job.id}>{job.job_name} — {job.address}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="missed-clock-in-time">Clock in time</Label>
                    <Input id="missed-clock-in-time" type="datetime-local" value={missedClockInForm.clock_in_at} onChange={(e) => setMissedClockInForm((c) => ({ ...c, clock_in_at: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="missed-clock-out-time">Clock out time (optional)</Label>
                    <Input id="missed-clock-out-time" type="datetime-local" value={missedClockInForm.clock_out_at} onChange={(e) => setMissedClockInForm((c) => ({ ...c, clock_out_at: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="missed-note">Note</Label>
                    <Textarea id="missed-note" maxLength={500} value={missedClockInForm.note} onChange={(e) => setMissedClockInForm((c) => ({ ...c, note: e.target.value }))} placeholder="e.g. Forgot to clock in when I switched jobs at lunch" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setMissedClockInDialogOpen(false)}>{t("common.cancel")}</Button>
                  <Button onClick={submitMissedClockIn} disabled={timeActionSaving || !missedClockInForm.job_id || !missedClockInForm.clock_in_at}>
                    {timeActionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add clock-in
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            {timeEntry?.clock_out_at ? (
              <div className="mt-5 rounded-lg border bg-card p-4">
                <p className="font-medium">End of day total: {formatHours(timeEntry.total_minutes || dailyMinutes)}</p>
                <p className="mt-1 text-sm text-muted-foreground">Clock-out is auto-saved when submitted.</p>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>

      {/* Middle: Profile + Company calendar */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="border-primary/20 shadow-[var(--shadow-panel)]">
          <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 p-5">
            <div>
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground"><UserRound className="h-6 w-6" /></div>
              <CardTitle className="text-2xl tracking-normal">Profile</CardTitle>
            </div>
            <Button type="button" variant="outline" onClick={() => profileEditing ? saveProfile() : setProfileEditing(true)} disabled={savingProfile}>
              {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : profileEditing ? <Save className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
              {profileEditing ? "Save" : "Edit"}
            </Button>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <form className="space-y-4" onSubmit={saveProfile}>
              {employeeProfileFields.map(({ label, key, placeholder }) => (
                <div className="space-y-2" key={key}>
                  <Label>{label}</Label>
                  <Input disabled={!profileEditing} value={profile[key] ?? ""} placeholder={placeholder} onChange={(event) => setProfile({ ...profile, [key]: event.target.value })} />
                </div>
              ))}
              <div className="space-y-2">
                <Label>Four-digit PIN</Label>
                <Input disabled={!profileEditing} inputMode="numeric" maxLength={4} value={profile.employee_pin ?? ""} placeholder="Set PIN" onChange={(event) => setProfile({ ...profile, employee_pin: event.target.value.replace(/\D/g, "") })} />
              </div>
              <div className="rounded-lg border bg-secondary p-3 text-sm">
                <p className="font-medium">Date of hire: {formatDate(profile.hire_date)}</p>
              </div>
            </form>
            <div className="mt-4 rounded-lg border bg-card p-4">
              <p className="font-medium">Change login password</p>
              <p className="mt-1 text-sm text-muted-foreground">Update the password you use to sign in. This is separate from your four-digit PIN.</p>
              <form className="mt-3 space-y-3" onSubmit={changePassword}>
                <div className="space-y-2">
                  <Label htmlFor="employee-new-password">New password</Label>
                  <Input id="employee-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="At least 8 characters" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employee-confirm-password">Confirm new password</Label>
                  <Input id="employee-confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Re-enter your password" />
                </div>
                <Button type="submit" className="h-11 w-full" disabled={savingPassword}>
                  {savingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockKeyhole className="h-4 w-4" />}
                  Update password
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 shadow-[var(--shadow-panel)]">
          <CardHeader className="p-5">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground"><CalendarDays className="h-6 w-6" /></div>
            <CardTitle className="text-2xl tracking-normal">Calendario de Empresa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0">
            <Input type="month" value={calendarMonth} onChange={(event) => setCalendarMonth(event.target.value || today().slice(0, 7))} className="h-11 bg-card" />
            <div className="space-y-2">
              {calendarDays.length ? calendarDays.map((day) => {
                const ptoOnDay = calendarPto.filter((request) => day >= request.start_date && day <= request.end_date);
                const holidaysOnDay = calendarHolidays.filter((holiday) => holiday.date === day);
                const jobsOnDay = calendarJobDays.filter((entry) => entry.work_date === day);
                return (
                  <div key={day} className="rounded-lg border bg-secondary p-3 text-sm">
                    <p className="font-medium">{formatDate(day)}</p>
                    {holidaysOnDay.map((holiday) => <p key={`h-${holiday.name}`} className="mt-1 text-muted-foreground">Holiday: {holiday.name}</p>)}
                    {ptoOnDay.map((request) => <p key={`p-${request.id}`} className="mt-1 text-muted-foreground">Approved {ptoLabel(request.request_type)} ({Number(request.requested_hours).toFixed(2)} hrs)</p>)}
                    {jobsOnDay.map((entry) => {
                      const job = jobs.find((item) => item.id === entry.job_id);
                      return <p key={`j-${entry.id}`} className="mt-1 text-muted-foreground">Job: {job ? `${job.job_name} — ${job.address}` : "Scheduled job"}</p>;
                    })}
                  </div>
                );
              }) : <p className="text-sm text-muted-foreground">No scheduled days for the selected month.</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer: Company information */}
      <Card className="border-primary/20 shadow-[var(--shadow-panel)]">
        <CardHeader className="p-5">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-accent text-accent-foreground"><BriefcaseBusiness className="h-6 w-6" /></div>
          <CardTitle className="text-2xl tracking-normal">{t("nav.company")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-5 pt-0 sm:grid-cols-2">
          <div className="rounded-lg border bg-secondary p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Company</p>
            <p className="mt-1 font-medium">{companyInfo?.name || companyName || "Not set"}</p>
          </div>
          <div className="rounded-lg border bg-secondary p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">{t("emp.phone")}</p>
            <p className="mt-1 font-medium">{companyInfo?.contact_phone || "Not set"}</p>
          </div>
          <div className="rounded-lg border bg-secondary p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Contact email</p>
            <p className="mt-1 font-medium">{companyInfo?.contact_email || "Not set"}</p>
          </div>
          <div className="rounded-lg border bg-secondary p-3 text-sm">
            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Admin alert email</p>
            <p className="mt-1 font-medium">{companyInfo?.admin_alert_email || "Not set"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const Portal = ({ role }: PortalProps) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const isAdmin = role === "admin";

  const signOut = async () => {
    sessionStorage.removeItem("punchCardProDemoRole");
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-[image:var(--gradient-hero)] px-5 py-8 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 text-lg font-semibold">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-[var(--shadow-brand)]">
              <Clock3 className="h-5 w-5" />
            </span>
            Punch Card Pro
          </Link>
          <div className="flex items-center gap-2"><LanguageToggle /><Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4" /> Sign out</Button></div>
        </header>

        {role === "admin" ? <AdminDashboard /> : role === "manager" ? <AdminDashboard managerOnly loginPath="/manager-login" /> : <EmployeeDashboard />}
      </div>
    </main>
  );
};

export default Portal;
