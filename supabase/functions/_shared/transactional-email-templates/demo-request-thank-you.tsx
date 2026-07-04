/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'PunchcardPro'

interface DemoThankYouProps {
  requesterName?: string
  companyName?: string
  phoneNumber?: string
  primaryContactName?: string
  bestTimeToContact?: string
}

const DemoRequestThankYouEmail = ({
  requesterName,
  companyName,
  phoneNumber,
  primaryContactName,
  bestTimeToContact,
}: DemoThankYouProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Thanks for requesting a {SITE_NAME} demo</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {requesterName ? `Thanks, ${requesterName}!` : 'Thanks for your interest!'}
        </Heading>
        <Text style={text}>
          We received your request for a {SITE_NAME} demo and will be in touch shortly to schedule a time that works for you.
        </Text>
        {(companyName || phoneNumber || primaryContactName || bestTimeToContact) && (
          <Section style={summary}>
            <Text style={summaryHeading}>Your request details</Text>
            {companyName && <Text style={summaryRow}><strong>Company:</strong> {companyName}</Text>}
            {primaryContactName && <Text style={summaryRow}><strong>Primary contact:</strong> {primaryContactName}</Text>}
            {phoneNumber && <Text style={summaryRow}><strong>Phone:</strong> {phoneNumber}</Text>}
            {bestTimeToContact && <Text style={summaryRow}><strong>Best time to reach you:</strong> {bestTimeToContact}</Text>}
          </Section>
        )}
        <Text style={text}>
          If anything changes, simply reply to this email and we'll update your request.
        </Text>
        <Text style={footer}>— The {SITE_NAME} Team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: DemoRequestThankYouEmail,
  subject: `Thanks for requesting a ${SITE_NAME} demo`,
  displayName: 'Demo request — thank you',
  previewData: {
    requesterName: 'Jane Doe',
    companyName: 'Acme Construction',
    phoneNumber: '603-555-5555',
    primaryContactName: 'Jane Doe',
    bestTimeToContact: 'Weekday mornings',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }
const container = { padding: '20px 25px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#55575d', lineHeight: '1.5', margin: '0 0 18px' }
const summary = { backgroundColor: '#f6f6f7', borderRadius: '12px', padding: '16px 18px', margin: '12px 0 22px' }
const summaryHeading = { fontSize: '13px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 8px', textTransform: 'uppercase' as const, letterSpacing: '0.04em' }
const summaryRow = { fontSize: '14px', color: '#0a0a0a', margin: '0 0 4px', lineHeight: '1.5' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
