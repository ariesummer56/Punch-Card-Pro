import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-12 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold">Privacy Policy</h1>
        <p className="mb-4 text-sm text-muted-foreground">Last updated: August 11, 2026</p>

        <div className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-2">Data We Collect</h2>
            <p className="text-muted-foreground">Punch Card Pro collects the following data:</p>
            <ul className="mt-2 ml-6 list-disc text-muted-foreground space-y-1">
              <li><strong>Account data:</strong> Company name, admin name, email, phone, emergency contact</li>
              <li><strong>Employee data:</strong> Name, email, PIN, hire date, assigned jobs</li>
              <li><strong>Location data:</strong> GPS coordinates at clock-in/out (within 300ft geofence of job site)</li>
              <li><strong>Time data:</strong> Clock-in/out timestamps, breaks, hours worked per job</li>
              <li><strong>Job data:</strong> Job name, address, description, manager notes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">How We Use Your Data</h2>
            <p className="text-muted-foreground">Your data is used solely for providing the time tracking service — generating timesheets, payroll reports, and job cost summaries. We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Data Storage</h2>
            <p className="text-muted-foreground">All data is stored in encrypted databases hosted on Supabase (Amazon Web Services, US-East region). Data is encrypted in transit (TLS) and at rest.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Data Retention</h2>
            <p className="text-muted-foreground">Your data is retained for as long as your account is active. Upon account deletion, all data is permanently removed within 30 days.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Your Rights</h2>
            <p className="text-muted-foreground">You have the right to:</p>
            <ul className="mt-2 ml-6 list-disc text-muted-foreground space-y-1">
              <li>Access your data at any time via the admin portal</li>
              <li>Export your data (timesheets, job reports) as CSV</li>
              <li>Delete your account and all associated data</li>
              <li>Request data correction if information is inaccurate</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Location Data</h2>
            <p className="text-muted-foreground">GPS location is captured only during clock-in and clock-out events. We do not track employees continuously. Location is used to verify the employee is within 300 feet of the job site. Location data is visible to company admins and managers only.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Third-Party Services</h2>
            <p className="text-muted-foreground">We use the following third-party services:</p>
            <ul className="mt-2 ml-6 list-disc text-muted-foreground space-y-1">
              <li>Supabase (database hosting and authentication)</li>
              <li>Stripe (payment processing)</li>
              <li>Google Ads (conversion tracking)</li>
            </ul>
            <p className="mt-2 text-muted-foreground">Each service has its own privacy policy. We share only the minimum data necessary for each service to function.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Children's Privacy</h2>
            <p className="text-muted-foreground">Punch Card Pro is designed for businesses and is not intended for use by individuals under 18.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Changes to This Policy</h2>
            <p className="text-muted-foreground">We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated date.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-2">Contact</h2>
            <p className="text-muted-foreground">ToolHouse Labs LLC<br />support@punchcardpro.io</p>
          </section>
        </div>

        <div className="mt-12 flex gap-4">
          <Button asChild variant="outline"><Link to="/terms">Terms of Service</Link></Button>
          <Button asChild variant="ghost"><Link to="/">Back to Home</Link></Button>
        </div>
      </div>
    </main>
  );
}
