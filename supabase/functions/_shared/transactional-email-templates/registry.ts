/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as demoRequestThankYou } from './demo-request-thank-you.tsx'
import { template as demoRequestAdminNotification } from './demo-request-admin-notification.tsx'
import { template as weeklyActivityReport } from './weekly-activity-report.tsx'
import { template as adminReportExport } from './admin-report-export.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'demo-request-thank-you': demoRequestThankYou,
  'demo-request-admin-notification': demoRequestAdminNotification,
  'weekly-activity-report': weeklyActivityReport,
  'admin-report-export': adminReportExport,
}
