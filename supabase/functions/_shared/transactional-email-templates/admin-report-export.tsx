/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'PunchcardPro'

interface ReportRow {
  employeeName?: string
  jobSite?: string
  assignedJobs?: string
  dates?: string
  hoursWorked?: string
  ptoUsed?: string
  ptoBalance?: string
  holidayPay?: string
  jobNotes?: string
  workLocations?: string
}

interface AdminReportExportProps {
  companyName?: string
  periodLabel?: string
  filters?: { employee?: string; job?: string }
  includedFields?: string[]
  totals?: {
    hoursWorked?: string
    ptoUsed?: string
    holidayPay?: string
    rows?: number
  }
  rows?: ReportRow[]
}

const AdminReportExportEmail = ({
  companyName = 'Your company',
  periodLabel = '',
  filters = {},
  includedFields = [],
  totals = {},
  rows = [],
}: AdminReportExportProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Activity report export for {companyName} — {periodLabel}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBand}>
          <Text style={brandText}>{SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>Activity report export</Heading>
        <Text style={subhead}>{companyName} · {periodLabel}</Text>

        <Section style={statsGrid}>
          <Section style={statCard}>
            <Text style={statValue}>{totals.hoursWorked ?? '0.00'}</Text>
            <Text style={statLabel}>Hours worked</Text>
          </Section>
          <Section style={statCard}>
            <Text style={statValue}>{totals.ptoUsed ?? '0.00'}</Text>
            <Text style={statLabel}>PTO used</Text>
          </Section>
          <Section style={statCard}>
            <Text style={statValue}>{totals.holidayPay ?? '0.00'}</Text>
            <Text style={statLabel}>Holiday pay</Text>
          </Section>
          <Section style={statCard}>
            <Text style={statValue}>{totals.rows ?? rows.length}</Text>
            <Text style={statLabel}>Rows</Text>
          </Section>
        </Section>

        <Heading as="h2" style={h2}>Filters</Heading>
        <Section style={card}>
          <Text style={rowText}><strong>Employee:</strong> {filters.employee ?? 'All employees'}</Text>
          <Text style={rowText}><strong>Job:</strong> {filters.job ?? 'All jobs'}</Text>
          {includedFields.length > 0 && (
            <Text style={rowText}><strong>Included fields:</strong> {includedFields.join(', ')}</Text>
          )}
        </Section>

        <Heading as="h2" style={h2}>Report rows</Heading>
        {rows.length === 0 ? (
          <Text style={muted}>No rows matched the selected filters.</Text>
        ) : (
          <Section style={tableWrap}>
            {rows.map((r, i) => (
              <Section key={i} style={tableRow}>
                <Text style={rowText}>
                  <strong>{r.employeeName || 'Unnamed'}</strong>
                  {r.jobSite ? ` · ${r.jobSite}` : ''}
                </Text>
                {r.dates && <Text style={smallMuted}>{r.dates}</Text>}
                <Text style={smallMuted}>
                  {r.hoursWorked ? `${r.hoursWorked} hrs worked` : ''}
                  {r.ptoUsed ? ` · ${r.ptoUsed} PTO` : ''}
                  {r.ptoBalance ? ` · Balance: ${r.ptoBalance}` : ''}
                  {r.holidayPay ? ` · ${r.holidayPay} holiday` : ''}
                </Text>
                {r.assignedJobs && <Text style={smallMuted}>Jobs: {r.assignedJobs}</Text>}
                {r.workLocations && <Text style={smallMuted}>Locations: {r.workLocations}</Text>}
                {r.jobNotes && <Text style={smallMuted}>Notes: {r.jobNotes}</Text>}
              </Section>
            ))}
          </Section>
        )}

        <Text style={footer}>
          This report was generated on demand from the {SITE_NAME} admin dashboard.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AdminReportExportEmail,
  subject: (data: Record<string, any>) =>
    `Activity report${data?.companyName ? ` — ${data.companyName}` : ''}${data?.periodLabel ? ` (${data.periodLabel})` : ''}`,
  displayName: 'Admin report export',
  previewData: {
    companyName: 'Maillet Construction',
    periodLabel: 'May 5 – May 11, 2026',
    filters: { employee: 'All employees', job: 'All jobs' },
    includedFields: ['Employee', 'Dates', 'Hours worked'],
    totals: { hoursWorked: '386.50', ptoUsed: '12.00', holidayPay: '8.00', rows: 2 },
    rows: [
      { employeeName: 'Sam Carter', jobSite: 'Riverbend Roofing', dates: 'May 5 – May 11', hoursWorked: '42.50', ptoUsed: '0.00', ptoBalance: '24 hrs', holidayPay: '0.00' },
      { employeeName: 'Jamie Lee', jobSite: 'Maple Ave Reroof', dates: 'May 5 – May 11', hoursWorked: '38.25', ptoUsed: '4.00', ptoBalance: '40 hrs', holidayPay: '8.00' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }
const container = { padding: '0 0 24px', maxWidth: '600px', margin: '0 auto' }
const brandBand = { backgroundColor: '#0f172a', padding: '18px 24px', borderRadius: '0 0 4px 4px' as const }
const brandText = { color: '#ffffff', fontSize: '18px', fontWeight: 'bold' as const, margin: 0, letterSpacing: '0.5px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '24px 24px 4px' }
const h2 = { fontSize: '16px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '28px 24px 10px' }
const subhead = { fontSize: '14px', color: '#55575d', margin: '0 24px 20px' }
const statsGrid = { display: 'flex', gap: '8px', padding: '0 24px', flexWrap: 'wrap' as const }
const statCard = { flex: '1', minWidth: '120px', backgroundColor: '#f6f6f7', borderRadius: '12px', padding: '14px 16px', textAlign: 'center' as const }
const statValue = { fontSize: '20px', fontWeight: 'bold' as const, color: '#0f172a', margin: 0 }
const statLabel = { fontSize: '11px', color: '#55575d', margin: '4px 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }
const tableWrap = { margin: '0 24px', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' as const }
const tableRow = { padding: '12px 14px', borderTop: '1px solid #e5e7eb' }
const card = { backgroundColor: '#f6f6f7', borderRadius: '12px', padding: '14px 16px', margin: '0 24px' }
const rowText = { fontSize: '14px', color: '#0a0a0a', margin: '0 0 6px', lineHeight: '1.5' }
const smallMuted = { fontSize: '12px', color: '#55575d', margin: '2px 0 0', lineHeight: '1.5' }
const muted = { fontSize: '14px', color: '#55575d', margin: '0 24px 8px' }
const footer = { fontSize: '12px', color: '#999999', margin: '28px 24px 0' }
