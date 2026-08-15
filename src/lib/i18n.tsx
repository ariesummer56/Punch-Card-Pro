import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "en" | "es";

type Dict = Record<string, { en: string; es: string }>;

const dict: Dict = {
  // Navigation
  "nav.dashboard": { en: "Dashboard", es: "Panel" },
  "nav.jobs": { en: "Jobs", es: "Trabajos" },
  "nav.employees": { en: "Employees", es: "Empleados" },
  "nav.payroll": { en: "Payroll", es: "Nómina" },
  "nav.reports": { en: "Reports", es: "Reportes" },
  "nav.settings": { en: "Settings", es: "Configuración" },
  "nav.company": { en: "Company Setup", es: "Config. Empresa" },
  "nav.profile": { en: "My Profile", es: "Mi Perfil" },

  // Jobs
  "jobs.title": { en: "Jobs", es: "Trabajos" },
  "jobs.add": { en: "Add Job", es: "Nuevo Trabajo" },
  "jobs.name": { en: "Job Name", es: "Nombre del Trabajo" },
  "jobs.description": { en: "Description", es: "Descripción" },
  "jobs.address": { en: "Address", es: "Dirección" },
  "jobs.city": { en: "City", es: "Ciudad" },
  "jobs.state": { en: "State", es: "Estado" },
  "jobs.archived": { en: "Archived", es: "Archivado" },
  "jobs.active": { en: "Active", es: "Activo" },
  "jobs.assign": { en: "Assign Employees", es: "Asignar Empleados" },
  "jobs.notes": { en: "Manager Notes", es: "Notas del Supervisor" },
  "jobs.assignment_note": { en: "Assignment Note", es: "Nota de Asignación" },
  "jobs.empty": { en: "No jobs yet", es: "Sin trabajos aún" },
  "jobs.scheduled_start": { en: "Scheduled Start", es: "Inicio Programado" },
  "jobs.grace_minutes": { en: "Grace Period (min)", es: "Período de Gracia (min)" },
  "jobs.estimated_duration": { en: "Estimated Duration", es: "Duración Estimada" },

  // Clock
  "clock.in": { en: "Clock In", es: "Entrar" },
  "clock.out": { en: "Clock Out", es: "Salir" },
  "clock.in_short": { en: "IN", es: "ENTR" },
  "clock.out_short": { en: "OUT", es: "SAL" },
  "clock.today": { en: "Today", es: "Hoy" },
  "clock.this_week": { en: "This Week", es: "Esta Semana" },
  "clock.clocked_in": { en: "Clocked In", es: "Trabajando" },
  "clock.clocked_out": { en: "Clocked Out", es: "Salida Registrada" },
  "clock.no_entry": { en: "No time entry today", es: "Sin registro de hoy" },
  "clock.end_shift": { en: "End Shift", es: "Terminar Turno" },
  "clock.end_shift_note": { en: "Shift summary (optional)", es: "Resumen del turno (opcional)" },
  "clock.missed_clockin": { en: "Missed Clock-In", es: "Entrada Perdida" },
  "clock.missed_desc": { en: "Add a clock entry you forgot to record", es: "Agregar una entrada que olvidó registrar" },
  "clock.clock_in_at": { en: "Clock In Time", es: "Hora de Entrada" },
  "clock.clock_out_at": { en: "Clock Out Time (optional)", es: "Hora de Salida (opcional)" },
  "clock.note": { en: "Note", es: "Nota" },
  "clock.location": { en: "Location", es: "Ubicación" },
  "clock.refresh_gps": { en: "Refresh GPS", es: "Actualizar GPS" },
  "clock.out_of_range": { en: "You are outside the job geofence", es: "Está fuera de la zona del trabajo" },
  "clock.in_range": { en: "You are at the job site", es: "Está en el sitio de trabajo" },
  "clock.checking_location": { en: "Checking location...", es: "Verificando ubicación..." },
  "clock.queued": { en: "Queued", es: "En cola" },
  "clock.saved": { en: "Saved", es: "Guardado" },
  "clock.syncing": { en: "Syncing...", es: "Sincronizando..." },

  // Employees
  "emp.title": { en: "Employees", es: "Empleados" },
  "emp.add": { en: "Add Employee", es: "Agregar Empleado" },
  "emp.name": { en: "Name", es: "Nombre" },
  "emp.email": { en: "Email", es: "Correo" },
  "emp.phone": { en: "Phone", es: "Teléfono" },
  "emp.pin": { en: "PIN", es: "PIN" },
  "emp.role": { en: "Role", es: "Rol" },
  "emp.hourly_rate": { en: "Hourly Rate", es: "Tarifa por Hora" },
  "emp.active": { en: "Active", es: "Activo" },
  "emp.inactive": { en: "Inactive", es: "Inactivo" },
  "emp.emergency": { en: "Emergency Contact", es: "Contacto de Emergencia" },
  "emp.payroll_email": { en: "Payroll Email", es: "Correo de Nómina" },
  "emp.empty": { en: "No employees yet", es: "Sin empleados aún" },

  // Payroll
  "pay.title": { en: "Payroll", es: "Nómina" },
  "pay.week": { en: "Week", es: "Semana" },
  "pay.hours": { en: "Hours", es: "Horas" },
  "pay.regular": { en: "Regular", es: "Regular" },
  "pay.overtime": { en: "Overtime", es: "Horas Extra" },
  "pay.total": { en: "Total", es: "Total" },
  "pay.approve": { en: "Approve", es: "Aprobar" },
  "pay.approved": { en: "Approved", es: "Aprobado" },
  "pay.export": { en: "Export", es: "Exportar" },
  "pay.send_email": { en: "Send Payroll Email", es: "Enviar Nómina" },
  "pay.rate": { en: "Rate", es: "Tarifa" },
  "pay.gross": { en: "Gross", es: "Bruto" },

  // Settings
  "set.title": { en: "Settings", es: "Configuración" },
  "set.company_name": { en: "Company Name", es: "Nombre de Empresa" },
  "set.contact_email": { en: "Contact Email", es: "Correo de Contacto" },
  "set.contact_phone": { en: "Contact Phone", es: "Teléfono de Contacto" },
  "set.overtime_threshold": { en: "Overtime Threshold (hrs)", es: "Umbral de Horas Extra (hrs)" },
  "set.save": { en: "Save Changes", es: "Guardar Cambios" },
  "set.saved": { en: "Settings saved", es: "Configuración guardada" },

  // Profile
  "prof.title": { en: "My Profile", es: "Mi Perfil" },
  "prof.display_name": { en: "Display Name", es: "Nombre para Mostrar" },
  "prof.change_password": { en: "Change Password", es: "Cambiar Contraseña" },
  "prof.new_password": { en: "New Password", es: "Nueva Contraseña" },
  "prof.confirm": { en: "Confirm Password", es: "Confirmar Contraseña" },
  "prof.save": { en: "Save", es: "Guardar" },
  "prof.logout": { en: "Log Out", es: "Cerrar Sesión" },

  // Common
  "common.save": { en: "Save", es: "Guardar" },
  "common.cancel": { en: "Cancel", es: "Cancelar" },
  "common.delete": { en: "Delete", es: "Eliminar" },
  "common.edit": { en: "Edit", es: "Editar" },
  "common.close": { en: "Close", es: "Cerrar" },
  "common.confirm": { en: "Confirm", es: "Confirmar" },
  "common.search": { en: "Search", es: "Buscar" },
  "common.yes": { en: "Yes", es: "Sí" },
  "common.no": { en: "No", es: "No" },
  "common.loading": { en: "Loading...", es: "Cargando..." },
  "common.error": { en: "Something went wrong", es: "Algo salió mal" },
  "common.success": { en: "Done", es: "Listo" },
  "common.none": { en: "None", es: "Ninguno" },
  "common.all": { en: "All", es: "Todos" },
  "common.actions": { en: "Actions", es: "Acciones" },
  "common.status": { en: "Status", es: "Estado" },
  "common.date": { en: "Date", es: "Fecha" },
  "common.time": { en: "Time", es: "Hora" },
  "common.hours": { en: "Hours", es: "Horas" },
  "common.minutes": { en: "Minutes", es: "Minutos" },

  // Time Off
  "pto.title": { en: "Time Off", es: "Tiempo Libre" },
  "pto.request": { en: "Request Time Off", es: "Solicitar Tiempo Libre" },
  "pto.balance": { en: "PTO Balance", es: "Saldo de PTO" },
  "pto.start": { en: "Start Date", es: "Fecha de Inicio" },
  "pto.end": { en: "End Date", es: "Fecha de Fin" },
  "pto.reason": { en: "Reason", es: "Motivo" },
  "pto.pending": { en: "Pending", es: "Pendiente" },
  "pto.approved": { en: "Approved", es: "Aprobado" },
  "pto.denied": { en: "Denied", es: "Rechazado" },

  // Geofence
  "geo.on_site": { en: "On Site", es: "En Sitio" },
  "geo.off_site": { en: "Off Site", es: "Fuera de Sitio" },
  "geo.within": { en: "Within range", es: "Dentro del rango" },

  // Toast messages
  "toast.clockin_success": { en: "Clocked in successfully", es: "Entrada registrada" },
  "toast.clockout_success": { en: "Clocked out successfully", es: "Salida registrada" },
  "toast.job_added": { en: "Job added", es: "Trabajo agregado" },
  "toast.job_updated": { en: "Job updated", es: "Trabajo actualizado" },
  "toast.emp_added": { en: "Employee added", es: "Empleado agregado" },
  "toast.emp_updated": { en: "Employee updated", es: "Empleado actualizado" },
  "toast.save_ok": { en: "Saved successfully", es: "Guardado correctamente" },
  "toast.delete_ok": { en: "Deleted", es: "Eliminado" },
  "toast.approve_ok": { en: "Payroll approved", es: "Nómina aprobada" },
};

type I18nContextType = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
};

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = typeof window !== "undefined" ? localStorage.getItem("pcp_lang") : null;
    return (saved as Lang) || "en";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("pcp_lang", l);
  };

  const t = (key: string): string => {
    const entry = dict[key];
    if (!entry) return key;
    return entry[lang] || entry.en;
  };

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
