/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'PunchcardPro'

interface JobBreakdownRow {
  jobName: string
  hours: number
  employeeCount: number
}

interface NoPunchEmployee {
  name: string
  email?: string
}

interface WeeklyActivityReportProps {
  companyName?: string
  periodLabel?: string
  frequencyLabel?: string
  totalActiveEmployees?: number
  totalHours?: number
  noPunchEmployees?: NoPunchEmployee[]
  jobBreakdown?: JobBreakdownRow[]
}

const fmtHours = (n: number) => `${(Math.round(n * 100) / 100).toFixed(2)} hrs`

const WeeklyActivityReportEmail = ({
  companyName = 'Your company',
  periodLabel = '',
  frequencyLabel = 'Weekly',
  totalActiveEmployees = 0,
  totalHours = 0,
  noPunchEmployees = [],
  jobBreakdown = [],
}: WeeklyActivityReportProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{frequencyLabel} activity report for {companyName} — {periodLabel}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandBand}>
          <Text style={brandText}>{SITE_NAME}</Text>
        </Section>
        <Heading style={h1}>{frequencyLabel} activity report</Heading>
        <Text style={subhead}>{companyName} · {periodLabel}</Text>

        <Section style={statsGrid}>
          <Section style={statCard}>
            <Text style={statValue}>{totalActiveEmployees}</Text>
            <Text style={statLabel}>Active employees</Text>
          </Section>
          <Section style={statCard}>
            <Text style={statValue}>{fmtHours(totalHours)}</Text>
            <Text style={statLabel}>Total hours logged</Text>
          </Section>
          <Section style={statCard}>
            <Text style={statValue}>{noPunchEmployees.length}</Text>
            <Text style={statLabel}>Employees with no punches</Text>
          </Section>
        </Section>

        <Heading as="h2" style={h2}>Job site breakdown</Heading>
        {jobBreakdown.length === 0 ? (
          <Text style={muted}>No time logged against any job during this period.</Text>
        ) : (
          <Section style={tableWrap}>
            <Section style={tableHeader}>
              <Text style={{ ...thCell, flex: '2' }}>Job site</Text>
              <Text style={{ ...thCell, flex: '1', textAlign: 'right' as const }}>Hours</Text>
              <Text style={{ ...thCell, flex: '1', textAlign: 'right' as const }}>Employees</Text>
            </Section>
            {jobBreakdown.map((row, i) => (
              <Section key={i} style={tableRow}>
                <Text style={{ ...tdCell, flex: '2' }}>{row.jobName}</Text>
                <Text style={{ ...tdCell, flex: '1', textAlign: 'right' as const }}>{fmtHours(row.hours)}</Text>
                <Text style={{ ...tdCell, flex: '1', textAlign: 'right' as const }}>{row.employeeCount}</Text>
              </Section>
            ))}
          </Section>
        )}

        <Heading as="h2" style={h2}>Employees without any punches</Heading>
        {noPunchEmployees.length === 0 ? (
          <Text style={muted}>Every active employee punched in at least once. Nice work.</Text>
        ) : (
          <Section style={card}>
            {noPunchEmployees.map((e, i) => (
              <Text key={i} style={row}>
                <strong>{e.name}</strong>{e.email ? ` · ${e.email}` : ''}
              </Text>
            ))}
          </Section>
        )}

        <Text style={footer}>
          You're receiving this because your company admin enabled automated activity reports in {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WeeklyActivityReportEmail,
  subject: (data: Record<string, any>) =>
    `${data?.frequencyLabel ?? 'Weekly'} activity report${data?.companyName ? ` — ${data.companyName}` : ''}`,
  displayName: 'Weekly activity report',
  previewData: {
    companyName: 'Maillet Construction',
    periodLabel: 'May 5 – May 11, 2026',
    frequencyLabel: 'Weekly',
    totalActiveEmployees: 12,
    totalHours: 386.5,
    noPunchEmployees: [
      { name: 'Sam Carter', email: 'sam@example.com' },
    ],
    jobBreakdown: [
      { jobName: 'Riverbend Roofing', hours: 142.25, employeeCount: 6 },
      { jobName: 'Maple Ave Reroof', hours: 98.5, employeeCount: 4 },
      { jobName: 'Shop / Yard', hours: 45.75, employeeCount: 3 },
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
const statCard = { flex: '1', minWidth: '140px', backgroundColor: '#f6f6f7', borderRadius: '12px', padding: '14px 16px', textAlign: 'center' as const }
const statValue = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0f172a', margin: 0 }
const statLabel = { fontSize: '12px', color: '#55575d', margin: '4px 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.4px' }
const tableWrap = { margin: '0 24px', border: '1px solid #e5e7eb', borderRadius: '10px', overflow: 'hidden' as const }
const tableHeader = { display: 'flex', backgroundColor: '#f6f6f7', padding: '10px 14px' }
const tableRow = { display: 'flex', padding: '10px 14px', borderTop: '1px solid #e5e7eb' }
const thCell = { fontSize: '12px', fontWeight: 'bold' as const, color: '#55575d', margin: 0, textTransform: 'uppercase' as const, letterSpacing: '0.4px' }
const tdCell = { fontSize: '14px', color: '#0a0a0a', margin: 0 }
const card = { backgroundColor: '#f6f6f7', borderRadius: '12px', padding: '14px 16px', margin: '0 24px' }
const row = { fontSize: '14px', color: '#0a0a0a', margin: '0 0 6px', lineHeight: '1.5' }
const muted = { fontSize: '14px', color: '#55575d', margin: '0 24px 8px' }
const footer = { fontSize: '12px', color: '#999999', margin: '28px 24px 0' }
