/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
  token,
}: RecoveryEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Reset your password for {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Reset your password</Heading>
        <Text style={text}>
          We received a request to reset your password for {siteName}. Click
          the button below to choose a new password.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Reset Password
        </Button>
        {token ? (
          <Section style={codeWrap}>
            <Text style={codeLabel}>
              Or, if the button sends you in circles, enter this verification
              code on the reset page:
            </Text>
            <Text style={code}>{token}</Text>
            <Text style={codeHint}>
              Open the reset page, choose "Use a code instead", enter your
              email and the code above, then pick a new password.
            </Text>
          </Section>
        ) : null}
        <Text style={footer}>
          If you didn't request a password reset, you can safely ignore this
          email. Your password will not be changed.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0a0a0a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const button = {
  backgroundColor: '#da1f29',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '12px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const codeWrap = { margin: '28px 0 0', padding: '16px 18px', backgroundColor: '#f6f6f7', borderRadius: '12px' }
const codeLabel = { fontSize: '13px', color: '#55575d', margin: '0 0 8px' }
const code = { fontSize: '24px', fontWeight: 'bold' as const, letterSpacing: '4px', color: '#0a0a0a', margin: '0 0 8px', fontFamily: 'Menlo, Consolas, monospace' }
const codeHint = { fontSize: '12px', color: '#55575d', margin: 0 }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
