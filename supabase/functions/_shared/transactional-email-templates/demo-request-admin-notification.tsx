/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'PunchcardPro'

interface DemoAdminProps {
  requesterName?: string
  requesterEmail?: string
  companyName?: string
  phoneNumber?: string
  primaryContactName?: string
  bestTimeToContact?: string
  requestedAt?: string
}

function fmt(value?: string) {
  return value && value.trim().length > 0 ? value : '—'
}

const DemoRequestAdminNotificationEmail = ({
  requesterName,
  requesterEmail,
  companyName,
  phoneNumber,
  primaryContactName,
  bestTimeToContact,
  requestedAt,
}: DemoAdminProps) => {
  const submitted = requestedAt ? new Date(requestedAt).toLocaleString() : '—'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>New {SITE_NAME} demo request from {fmt(companyName)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>New demo request</Heading>
          <Text style={text}>
            A new demo request was submitted on {SITE_NAME}.
          </Text>
          <Section style={card}>
            <Text style={row}><strong>Name:</strong> {fmt(requesterName)}</Text>
            <Text style={row}><strong>Email:</strong> {fmt(requesterEmail)}</Text>
            <Text style={row}><strong>Company:</strong> {fmt(companyName)}</Text>
            <Text style={row}><strong>Phone:</strong> {fmt(phoneNumber)}</Text>
            <Text style={row}><strong>Primary contact:</strong> {fmt(primaryContactName)}</Text>
            <Text style={row}><strong>Best time to contact:</strong> {fmt(bestTimeToContact)}</Text>
            <Text style={row}><strong>Submitted:</strong> {submitted}</Text>
          </Section>
          <Text style={footer}>Reply directly to {fmt(requesterEmail)} to follow up.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DemoRequestAdminNotificationEmail,
  subject: (data: Record<string, any>) =>
    `New demo request${data?.companyName ? ` — ${data.companyName}` : ''}`,
  displayName: 'Demo request — admin notification',
  previewData: {
    requesterName: 'Jane Doe',
    requesterEmail: 'jane@acme.com',
    companyName: 'Acme Construction',
    phoneNumber: '603-555-5555',
    primaryContactName: 'Jane Doe',
    bestTimeToContact: 'Weekday mornings',
    requestedAt: new Date().toISOString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 18px' }
const card = { backgroundColor: '#f6f6f7', borderRadius: '12px', padding: '16px 18px', margin: '0 0 22px' }
const row = { fontSize: '14px', color: '#0a0a0a', margin: '0 0 6px', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
