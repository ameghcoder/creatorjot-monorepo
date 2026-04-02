import ContentPageWrapper from '@/components/layout/content-page-wrapper'
import { Typography } from '@/components/ui/typography'
import { EMAIL_ADDR } from '@/constants/emails'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = {
    title: 'Privacy Policy | CreatorJot',
    description: 'How CreatorJot collects, uses, and protects your personal data.',
    alternates: { canonical: 'https://creatorjot.com/privacy' },
}

export default function PrivacyPage() {
    return (
        <ContentPageWrapper title="Privacy Policy" pageType="legal" lastUpdated="2 April, 2026">

            <div className="space-y-4">
                <Typography>
                    This Privacy Policy describes how CreatorJot ("we", "us", or "our"), operated at{' '}
                    <Link href="https://creatorjot.com" className="text-foreground underline underline-offset-4">creatorjot.com</Link>,
                    collects, uses, stores, and shares information when you use our Service. By creating an account or using CreatorJot, you agree to the practices described in this policy.
                </Typography>
                <Typography>
                    For questions or data requests, contact us at{' '}
                    <Link href={`mailto:${EMAIL_ADDR.support}`} className="text-foreground underline underline-offset-4">{EMAIL_ADDR.support}</Link>.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">1. Data We Collect</Typography>
                <Typography>We collect the following categories of personal data:</Typography>

                <Typography variant="h3">1.1 Account Data</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>Email address (required for all accounts)</Typography></li>
                    <li><Typography>Name and profile photo (only if you authenticate via Google OAuth)</Typography></li>
                </ul>

                <Typography variant="h3">1.2 Usage Data</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>YouTube URLs you submit for processing</Typography></li>
                    <li><Typography>AI-generated social media posts produced from your submissions</Typography></li>
                    <li><Typography>Platform preferences and tone settings you configure</Typography></li>
                    <li><Typography>Credit usage logs tied to your account</Typography></li>
                </ul>

                <Typography variant="h3">1.3 Billing Data</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>Subscription plan and status</Typography></li>
                    <li><Typography>Transaction IDs from DodoPayments</Typography></li>
                    <li><Typography>We do not store payment card details. All payment data is handled by DodoPayments.</Typography></li>
                </ul>

                <Typography variant="h3">1.4 Technical Data</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>IP address and request timestamps</Typography></li>
                    <li><Typography>Browser type and operating system</Typography></li>
                    <li><Typography>Error logs and stack traces collected via Sentry for debugging purposes</Typography></li>
                </ul>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">2. Lawful Basis for Processing</Typography>
                <Typography>We process your personal data on the following legal bases:</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>Contractual necessity: Processing required to deliver the Service you have signed up for, including account management, content generation, and billing.</Typography></li>
                    <li><Typography>Consent: Where you have explicitly agreed to data processing, such as when authenticating via Google OAuth.</Typography></li>
                    <li><Typography>Legitimate interests: Security monitoring, fraud prevention, and service improvement, where these interests are not overridden by your rights.</Typography></li>
                    <li><Typography>Legal obligation: Where we are required to retain or disclose data under applicable law.</Typography></li>
                </ul>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">3. Google OAuth and Google API Services</Typography>

                <Typography variant="h3">3.1 Data Accessed via Google OAuth</Typography>
                <Typography>
                    When you sign in with Google, we request access only to your basic profile information (name, profile photo) and email address. We do not request access to Gmail, Google Drive, Google Calendar, or any other Google service or data.
                </Typography>

                <Typography variant="h3">3.2 How Google Data Is Used</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>Your Google account data is used solely to create and identify your CreatorJot account.</Typography></li>
                    <li><Typography>It is not used for advertising, profiling, or any purpose beyond authentication and account display.</Typography></li>
                    <li><Typography>It is not sold, shared with third parties for marketing, or used to train AI models.</Typography></li>
                </ul>

                <Typography variant="h3">3.3 Google API Services User Data Policy</Typography>
                <Typography>
                    CreatorJot's use and transfer of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">4. AI Processing Disclosure</Typography>
                <Typography>
                    When you submit a YouTube URL, we retrieve the video transcript and send it to one or more AI providers to generate social media content. The AI providers we use are:
                </Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>Google Gemini (operated by Google LLC)</Typography></li>
                    <li><Typography>Anthropic Claude (operated by Anthropic, PBC)</Typography></li>
                </ul>
                <Typography>
                    Transcript data is transmitted to these providers solely for the purpose of generating content on your behalf. We do not use your transcript data or generated content to train AI models. Transcript data is not retained by us beyond what is necessary to deliver and display your results within the Service.
                </Typography>
                <Typography>
                    Each AI provider processes data under their own terms of service and privacy policies. By using CreatorJot, you acknowledge that transcript content is processed by these third-party AI services.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">5. Third-Party Processors</Typography>
                <Typography>We share data with the following sub-processors only to the extent necessary to operate the Service:</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography><span className="text-foreground font-medium">Supabase</span> — database storage, user authentication, and file storage</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">Railway</span> — cloud infrastructure and backend hosting</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">Google Gemini</span> — AI content generation from transcript data</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">Anthropic Claude</span> — AI content generation from transcript data</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">DodoPayments</span> — subscription billing and payment processing</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">Resend</span> — transactional email delivery (e.g. generation complete, billing receipts)</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">Sentry</span> — error monitoring and diagnostics (may include request context and stack traces)</Typography></li>
                </ul>
                <Typography>
                    We do not sell your data to any third party. We do not share your data with advertisers or data brokers.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">6. Data Retention</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>Account data and generated content are retained for as long as your account remains active.</Typography></li>
                    <li><Typography>Server logs and job queue logs are retained for 90 days, after which they are automatically deleted.</Typography></li>
                    <li><Typography>If you request account deletion, your personal data and associated content will be permanently deleted within 30 days of the request.</Typography></li>
                    <li><Typography>Billing records may be retained longer where required by applicable financial or tax regulations.</Typography></li>
                </ul>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">7. Cookies</Typography>
                <Typography>
                    CreatorJot uses cookies solely for authentication and session management, implemented through Supabase Auth. These cookies are strictly necessary for the Service to function.
                </Typography>
                <Typography>
                    We do not use advertising cookies, third-party tracking cookies, or analytics scripts. No data is shared with advertising networks through cookies.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">8. Security Measures</Typography>
                <Typography>We implement the following technical and organisational measures to protect your data:</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>All data in transit is encrypted using TLS (Transport Layer Security).</Typography></li>
                    <li><Typography>Data at rest is encrypted within Supabase infrastructure.</Typography></li>
                    <li><Typography>Row-level security (RLS) is enforced at the database level, ensuring users can only access their own data.</Typography></li>
                    <li><Typography>Access to production systems is restricted to authorised personnel only.</Typography></li>
                    <li><Typography>Error monitoring via Sentry is configured to minimise exposure of sensitive data in logs.</Typography></li>
                </ul>
                <Typography>
                    No method of transmission or storage is 100% secure. We will notify affected users in the event of a data breach as required by applicable law.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">9. Your Rights</Typography>
                <Typography>Depending on your jurisdiction, you may have the following rights regarding your personal data:</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>Access: Request a copy of the personal data we hold about you.</Typography></li>
                    <li><Typography>Correction: Request correction of inaccurate or incomplete data.</Typography></li>
                    <li><Typography>Deletion: Request deletion of your account and associated personal data.</Typography></li>
                    <li><Typography>Data export: Export your generated content directly from your dashboard.</Typography></li>
                    <li><Typography>Objection: Object to processing based on legitimate interests.</Typography></li>
                    <li><Typography>Restriction: Request that we restrict processing of your data in certain circumstances.</Typography></li>
                </ul>
                <Typography>
                    To exercise any of these rights, email{' '}
                    <Link href={`mailto:${EMAIL_ADDR.support}`} className="text-foreground underline underline-offset-4">{EMAIL_ADDR.support}</Link>.
                    We will respond within 5 business days.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">10. International Users and GDPR</Typography>
                <Typography>
                    CreatorJot is accessible globally. If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have additional rights under the General Data Protection Regulation (GDPR) or equivalent legislation, including the right to lodge a complaint with your local supervisory authority.
                </Typography>
                <Typography>
                    Where we transfer personal data outside the EEA, we ensure appropriate safeguards are in place, including reliance on Standard Contractual Clauses or adequacy decisions where applicable.
                </Typography>
                <Typography>
                    For California residents, we comply with the California Consumer Privacy Act (CCPA). We do not sell personal information as defined under the CCPA.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">11. Changes to This Policy</Typography>
                <Typography>
                    We will notify you by email before any material changes to this Privacy Policy take effect. The current version is always available at{' '}
                    <Link href="/privacy" className="text-foreground underline underline-offset-4">creatorjot.com/privacy</Link>.
                    Continued use of the Service after changes take effect constitutes acceptance of the updated policy.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">12. Contact</Typography>
                <Typography>For privacy questions, data requests, or concerns:</Typography>
                <Typography>CreatorJot — <Link href="https://creatorjot.com" className="text-foreground underline underline-offset-4">creatorjot.com</Link></Typography>
                <Link href={`mailto:${EMAIL_ADDR.support}`}>
                    <Button size="lg" icon={<Mail />}>{EMAIL_ADDR.support}</Button>
                </Link>
            </div>

        </ContentPageWrapper>
    )
}
