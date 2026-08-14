import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold">Terms of Service</h1>
        <p className="mb-4 text-sm text-muted-foreground">Last updated: August 11, 2026</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">By creating an account or using Punch Card Pro, you agree to these Terms of Service. If you do not agree, do not use the service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">2. Service Description</h2>
            <p className="text-muted-foreground">Punch Card Pro is a time tracking and job cost management application for field crews. The service includes GPS clock-in/out, job assignment, payroll approval workflows, and reporting features.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">3. Account Responsibilities</h2>
            <p className="text-muted-foreground">You are responsible for maintaining the security of your account credentials. You must provide accurate information during signup. Company administrators are responsible for managing employee access and PINs.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">4. Acceptable Use</h2>
            <p className="text-muted-foreground">You agree not to: (a) use the service for illegal activities, (b) attempt to access another company's data, (c) share your credentials with unauthorized users, (d) reverse engineer or decompile the application.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">5. Billing & Subscriptions</h2>
            <p className="text-muted-foreground">Punch Card Pro offers monthly ($49/mo) and annual ($399/yr) subscription plans. A free trial may be offered. Subscriptions auto-renew unless cancelled. A 72-hour grace period applies to failed payments before account access is restricted.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">6. Data & Privacy</h2>
            <p className="text-muted-foreground">We collect location data during clock-in events to verify work locations. Your data is stored securely and is not sold to third parties. See our Privacy Policy for details. You can export or delete your data at any time.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">7. Account Deletion</h2>
            <p className="text-muted-foreground">You can delete your account at any time from the admin settings or by contacting support@punchcardpro.io. Account deletion removes all time entries, jobs, and employee records within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">8. Limitation of Liability</h2>
            <p className="text-muted-foreground">Punch Card Pro is provided "as is." We are not liable for lost wages, missed clock-ins, or payroll errors resulting from service outages. Our liability is limited to the amount paid in the preceding 12 months.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">9. Cancellation</h2>
            <p className="text-muted-foreground">You can cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. No refunds are issued for partial billing periods.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">10. Contact</h2>
            <p className="text-muted-foreground">ToolHouse Labs LLC<br />support@punchcardpro.io</p>
          </section>
        </div>

        <div className="mt-12 flex gap-4">
          <Button asChild variant="outline"><Link to="/privacy">Privacy Policy</Link></Button>
          <Button asChild variant="ghost"><Link to="/">Back to Home</Link></Button>
        </div>
      </div>
    </main>
  );
}
