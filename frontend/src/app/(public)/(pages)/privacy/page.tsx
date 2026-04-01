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
        <ContentPageWrapper title="Privacy Policy" pageType="legal" lastUpdated="1 April, 2026">
            <div className="space-y-4">
                <Typography>
                    This Privacy Policy explains what data CreatorJot collects, how we use it, and your rights. We keep it short and plain — no legal fog.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">1. What we collect</Typography>
                <Typography variant="h3">Account data</Typography>
                <Typography>
                    When you sign up, we collect your email address and, if you use Google OAuth, your name and profile picture. This is handled by Supabase Auth.
                </Typography>
                <Typography variant="h3">Usage data</Typography>
                <Typography>
                    We store the YouTube URLs you submit, the generated posts, your selected platforms, tone preferences, and credit usage logs. This is necessary to provide the Service and show you your history.
                </Typography>
                <Typography variant="h3">Billing data</Typography>
                <Typography>
                    Payments are processed by DodoPayments. We do not store your card details. We receive and store subscription status, plan type, and transaction IDs.
                </Typography>
                <Typography variant="h3">Technical data</Typography>
                <Typography>
                    We collect standard server logs including IP addresses, browser type, and request timestamps for security and debugging purposes. We use Sentry for error tracking.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">2. How we use your data</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>To provide and improve the Service</Typography></li>
                    <li><Typography>To process your YouTube transcripts through AI providers (Google Gemini, Anthropic Claude) to generate content</Typography></li>
                    <li><Typography>To manage your subscription and credits</Typography></li>
                    <li><Typography>To send transactional emails (generation complete, billing receipts)</Typography></li>
                    <li><Typography>To detect and prevent abuse</Typography></li>
                </ul>
                <Typography>
                    We do not sell your data. We do not use your content to train AI models.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">3. Third-party processors</Typography>
                <Typography>We share data with the following processors only as necessary to run the Service:</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography><span className="text-foreground font-medium">Supabase</span> — database, authentication, and file storage</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">Google Gemini</span> — AI content generation (transcript data is sent)</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">Anthropic Claude</span> — AI content generation (transcript data is sent)</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">DodoPayments</span> — payment processing</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">Resend</span> — transactional email delivery</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">Sentry</span> — error monitoring (may include stack traces and request context)</Typography></li>
                    <li><Typography><span className="text-foreground font-medium">Railway</span> — cloud infrastructure hosting</Typography></li>
                </ul>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">4. Data retention</Typography>
                <Typography>
                    We retain your account data and generated content for as long as your account is active. Queue and job logs are retained for 90 days. If you delete your account, your personal data and generated content are deleted within 30 days.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">5. Cookies</Typography>
                <Typography>
                    We use cookies solely for authentication (session management via Supabase). We do not use advertising or tracking cookies. No third-party analytics scripts are loaded on the site.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">6. Your rights</Typography>
                <Typography>You have the right to:</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>Access the personal data we hold about you</Typography></li>
                    <li><Typography>Request correction of inaccurate data</Typography></li>
                    <li><Typography>Request deletion of your account and associated data</Typography></li>
                    <li><Typography>Export your generated content from your dashboard</Typography></li>
                </ul>
                <Typography>
                    To exercise any of these rights, email us at{' '}
                    <Link href={`mailto:${EMAIL_ADDR.support}`} className="text-foreground underline underline-offset-4">{EMAIL_ADDR.support}</Link>.
                    We respond within 5 business days.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">7. Security</Typography>
                <Typography>
                    All data is encrypted in transit (TLS) and at rest. Access to production systems is restricted to the core team. We use row-level security in our database to ensure users can only access their own data.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">8. Changes to this policy</Typography>
                <Typography>
                    We'll notify you by email before any material changes to this policy take effect. The current version always lives at{' '}
                    <Link href="/privacy" className="text-foreground underline underline-offset-4">creatorjot.com/privacy</Link>.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">9. Contact</Typography>
                <Typography>Privacy questions or data requests:</Typography>
                <Link href={`mailto:${EMAIL_ADDR.support}`}>
                    <Button size="lg" icon={<Mail />}>{EMAIL_ADDR.support}</Button>
                </Link>
            </div>
        </ContentPageWrapper>
    )
}
