import ContentPageWrapper from '@/components/layout/content-page-wrapper'
import { Typography } from '@/components/ui/typography'
import { EMAIL_ADDR } from '@/constants/emails'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = {
    title: 'Terms of Service | CreatorJot',
    description: 'Terms and conditions for using CreatorJot — the AI-powered tool that turns YouTube videos into social media posts.',
    alternates: { canonical: 'https://creatorjot.com/terms' },
}

export default function TermsPage() {
    return (
        <ContentPageWrapper title="Terms of Service" pageType="legal" lastUpdated="1 April, 2026">
            <div className="space-y-4">
                <Typography>
                    By accessing or using CreatorJot ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">1. Who we are</Typography>
                <Typography>
                    CreatorJot is an AI-powered content repurposing tool that converts YouTube video transcripts into platform-specific social media posts. The Service is operated by the CreatorJot team.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">2. Eligibility</Typography>
                <Typography>
                    You must be at least 13 years old to use the Service. By using CreatorJot, you represent that you meet this requirement and that all information you provide is accurate.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">3. Your account</Typography>
                <Typography>
                    You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. Notify us immediately at{' '}
                    <Link href={`mailto:${EMAIL_ADDR.support}`} className="text-foreground underline underline-offset-4">{EMAIL_ADDR.support}</Link>{' '}
                    if you suspect unauthorized access.
                </Typography>
                <Typography>
                    We reserve the right to suspend or terminate accounts that violate these Terms, engage in abuse, or attempt to circumvent usage limits.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">4. Acceptable use</Typography>
                <Typography>You agree not to:</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>Submit YouTube URLs you do not have rights to repurpose</Typography></li>
                    <li><Typography>Use the Service to generate spam, misleading content, or content that violates any platform's terms</Typography></li>
                    <li><Typography>Attempt to reverse-engineer, scrape, or abuse the API</Typography></li>
                    <li><Typography>Share, resell, or sublicense access to your account</Typography></li>
                    <li><Typography>Use automated scripts to submit videos in bulk beyond normal usage</Typography></li>
                </ul>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">5. Content and intellectual property</Typography>
                <Typography>
                    You retain ownership of the YouTube content you submit. By using the Service, you grant CreatorJot a limited, non-exclusive license to process that content solely to provide the Service to you.
                </Typography>
                <Typography>
                    The generated posts are yours to use, edit, and publish. CreatorJot does not claim ownership over AI-generated output produced from your inputs.
                </Typography>
                <Typography>
                    CreatorJot's branding, UI, and underlying technology remain the exclusive property of CreatorJot.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">6. Credits and billing</Typography>
                <Typography>
                    The Service operates on a credit-based system. Credits are consumed when you process a new video or generate a post. Credit costs vary by platform and are shown before you generate.
                </Typography>
                <Typography>
                    Unused credits do not roll over between billing periods unless explicitly stated. Refunds are governed by our{' '}
                    <Link href="/refund-policy" className="text-foreground underline underline-offset-4">Refund Policy</Link>.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">7. Third-party services</Typography>
                <Typography>
                    CreatorJot uses third-party AI providers (Google Gemini, Anthropic Claude) and transcript APIs to process your content. By using the Service, you acknowledge that your video transcripts are processed by these providers under their respective terms.
                </Typography>
                <Typography>
                    We are not responsible for the availability, accuracy, or output of third-party services.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">8. Disclaimers</Typography>
                <Typography>
                    The Service is provided "as is" without warranties of any kind. We do not guarantee that generated content will be accurate, complete, or suitable for any particular purpose. AI-generated content may contain errors — always review before publishing.
                </Typography>
                <Typography>
                    We do not guarantee uninterrupted availability of the Service.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">9. Limitation of liability</Typography>
                <Typography>
                    To the maximum extent permitted by law, CreatorJot shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service, including but not limited to loss of data, revenue, or reputation.
                </Typography>
                <Typography>
                    Our total liability to you for any claim shall not exceed the amount you paid us in the 30 days preceding the claim.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">10. Changes to these terms</Typography>
                <Typography>
                    We may update these Terms from time to time. We'll notify you by email before material changes take effect. Continued use of the Service after changes constitutes acceptance of the updated Terms.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">11. Contact</Typography>
                <Typography>Questions about these Terms? Reach us at:</Typography>
                <Link href={`mailto:${EMAIL_ADDR.support}`}>
                    <Button size="lg" icon={<Mail />}>{EMAIL_ADDR.support}</Button>
                </Link>
            </div>
        </ContentPageWrapper>
    )
}
