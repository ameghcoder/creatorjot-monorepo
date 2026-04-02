import ContentPageWrapper from '@/components/layout/content-page-wrapper'
import { Typography } from '@/components/ui/typography'
import { EMAIL_ADDR } from '@/constants/emails'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export const metadata = {
    title: 'Terms of Service | CreatorJot',
    description: 'Terms and conditions for using CreatorJot.',
    alternates: { canonical: 'https://creatorjot.com/terms' },
}

export default function TermsPage() {
    return (
        <ContentPageWrapper title="Terms of Service" pageType="legal" lastUpdated="2 April, 2026">

            <div className="space-y-4">
                <Typography>
                    These Terms of Service ("Terms") govern your access to and use of CreatorJot ("the Service"), operated at{' '}
                    <Link href="https://creatorjot.com" className="text-foreground underline underline-offset-4">creatorjot.com</Link>.
                    By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">1. About the Service</Typography>
                <Typography>
                    CreatorJot is an AI-powered SaaS tool that processes YouTube video transcripts and generates platform-specific social media content. The Service is operated by the CreatorJot team. Contact:{' '}
                    <Link href={`mailto:${EMAIL_ADDR.support}`} className="text-foreground underline underline-offset-4">{EMAIL_ADDR.support}</Link>.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">2. Eligibility</Typography>
                <Typography>
                    You must be at least 18 years of age, or the age of legal majority in your jurisdiction (whichever is greater), to use the Service. By registering an account, you represent and warrant that you meet this requirement and that all information you provide is accurate and complete.
                </Typography>
                <Typography>
                    If you are using the Service on behalf of a business or organisation, you represent that you have authority to bind that entity to these Terms.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">3. Account Responsibility</Typography>
                <Typography>
                    You are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify us immediately at{' '}
                    <Link href={`mailto:${EMAIL_ADDR.support}`} className="text-foreground underline underline-offset-4">{EMAIL_ADDR.support}</Link>{' '}
                    if you become aware of any unauthorised access to your account.
                </Typography>
                <Typography>
                    You may not share, transfer, or sell access to your account. Each account is for use by a single individual or authorised entity only.
                </Typography>
                <Typography>
                    We reserve the right to suspend or terminate accounts that violate these Terms, engage in abusive behaviour, or attempt to circumvent usage limits or access controls.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">4. Subscriptions and Billing</Typography>
                <Typography>
                    CreatorJot is offered on a subscription basis. By subscribing, you authorise us to charge your payment method on a recurring basis at the rate associated with your selected plan.
                </Typography>
                <Typography>
                    Payments are processed by DodoPayments. By subscribing, you also agree to DodoPayments' terms of service. We do not store your payment card details.
                </Typography>
                <Typography>
                    Subscription fees are charged at the start of each billing period. If a payment fails, access to the Service may be suspended until payment is resolved.
                </Typography>
                <Typography>
                    You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing period. You will retain access to the Service until that date.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">5. Credits System</Typography>
                <Typography>
                    Certain features of the Service operate on a credit-based system. Credits are consumed when you submit a YouTube URL for processing or generate social media posts. The credit cost for each action is displayed before you confirm the generation.
                </Typography>
                <Typography>
                    Credits are allocated per billing period according to your subscription plan. Unless explicitly stated otherwise, unused credits do not carry over to the next billing period.
                </Typography>
                <Typography>
                    Credits have no monetary value and cannot be transferred, sold, or exchanged for cash.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">6. Refund Policy</Typography>
                <Typography>
                    Subscription fees are non-refundable except where required by applicable law. We do not offer pro-rated refunds for unused portions of a billing period following cancellation.
                </Typography>
                <Typography>
                    If you believe you have been charged in error, contact us at{' '}
                    <Link href={`mailto:${EMAIL_ADDR.support}`} className="text-foreground underline underline-offset-4">{EMAIL_ADDR.support}</Link>{' '}
                    within 14 days of the charge. We will review the request and respond within 5 business days.
                </Typography>
                <Typography>
                    For full details, refer to our{' '}
                    <Link href="/refund-policy" className="text-foreground underline underline-offset-4">Refund Policy</Link>.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">7. Acceptable Use</Typography>
                <Typography>You agree not to use the Service to:</Typography>
                <ul className="list-disc pl-6 space-y-2">
                    <li><Typography>Submit YouTube URLs for content you do not have the right to repurpose or that infringes third-party intellectual property rights.</Typography></li>
                    <li><Typography>Generate content that is unlawful, defamatory, harassing, obscene, or that violates any applicable law or regulation.</Typography></li>
                    <li><Typography>Generate spam, misleading content, or content designed to deceive or manipulate audiences.</Typography></li>
                    <li><Typography>Attempt to reverse-engineer, decompile, scrape, or otherwise extract the underlying technology or data of the Service.</Typography></li>
                    <li><Typography>Use automated scripts, bots, or other tools to submit requests in bulk beyond normal individual use.</Typography></li>
                    <li><Typography>Circumvent, disable, or interfere with security features, rate limits, or access controls.</Typography></li>
                    <li><Typography>Resell, sublicense, or otherwise provide access to the Service to third parties without our written consent.</Typography></li>
                </ul>
                <Typography>
                    Violation of this section may result in immediate account suspension or termination without refund.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">8. AI Output Disclaimer</Typography>
                <Typography>
                    Content generated by the Service is produced by third-party AI models (Google Gemini and Anthropic Claude) based on the transcript data you submit. AI-generated content may be inaccurate, incomplete, misleading, or unsuitable for your intended purpose.
                </Typography>
                <Typography>
                    You are solely responsible for reviewing, editing, and verifying all AI-generated content before publishing or distributing it. CreatorJot makes no representations or warranties regarding the accuracy, quality, or fitness for purpose of any generated output.
                </Typography>
                <Typography>
                    Do not rely on AI-generated content as legal, financial, medical, or professional advice.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">9. Intellectual Property</Typography>

                <Typography variant="h3">9.1 Your Content</Typography>
                <Typography>
                    You retain all ownership rights to the YouTube content you submit and the AI-generated posts produced from your inputs. By using the Service, you grant CreatorJot a limited, non-exclusive, royalty-free licence to process your submitted content solely for the purpose of providing the Service to you. This licence terminates when you delete your account.
                </Typography>

                <Typography variant="h3">9.2 Generated Content</Typography>
                <Typography>
                    The social media posts generated from your submissions are yours to use, edit, and publish. CreatorJot does not claim ownership over AI-generated output produced from your inputs.
                </Typography>

                <Typography variant="h3">9.3 Platform Rights</Typography>
                <Typography>
                    CreatorJot's software, branding, user interface, and underlying technology are the exclusive intellectual property of CreatorJot. Nothing in these Terms grants you any rights to our technology, trademarks, or proprietary materials.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">10. Termination</Typography>
                <Typography>
                    You may terminate your account at any time by contacting us at{' '}
                    <Link href={`mailto:${EMAIL_ADDR.support}`} className="text-foreground underline underline-offset-4">{EMAIL_ADDR.support}</Link>.
                    Upon termination, your access to the Service will cease at the end of the current billing period.
                </Typography>
                <Typography>
                    We may suspend or terminate your account immediately, without prior notice, if you breach these Terms, engage in fraudulent activity, or if we are required to do so by law. In such cases, no refund will be issued.
                </Typography>
                <Typography>
                    Upon account deletion, your personal data will be deleted in accordance with our Privacy Policy.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">11. Limitation of Liability</Typography>
                <Typography>
                    To the maximum extent permitted by applicable law, CreatorJot and its operators shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service, including but not limited to loss of data, loss of revenue, loss of business, or reputational harm.
                </Typography>
                <Typography>
                    Our total aggregate liability to you for any claim arising from or related to the Service shall not exceed the total amount you paid to CreatorJot in the 30 days immediately preceding the event giving rise to the claim.
                </Typography>
                <Typography>
                    Some jurisdictions do not allow the exclusion or limitation of certain damages. In such jurisdictions, our liability is limited to the fullest extent permitted by law.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">12. Indemnification</Typography>
                <Typography>
                    You agree to indemnify, defend, and hold harmless CreatorJot and its operators from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or related to: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights, including intellectual property rights; or (d) any content you submit through the Service.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">13. Governing Law and Dispute Resolution</Typography>
                <Typography>
                    These Terms are governed by and construed in accordance with applicable law. Any dispute arising from or relating to these Terms or the Service shall first be attempted to be resolved through good-faith negotiation by contacting us at{' '}
                    <Link href={`mailto:${EMAIL_ADDR.support}`} className="text-foreground underline underline-offset-4">{EMAIL_ADDR.support}</Link>.
                </Typography>
                <Typography>
                    If a dispute cannot be resolved through negotiation within 30 days, either party may pursue resolution through the courts of competent jurisdiction. Nothing in this section limits your statutory rights as a consumer under applicable law.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">14. Changes to These Terms</Typography>
                <Typography>
                    We may update these Terms from time to time. We will notify you by email at least 14 days before any material changes take effect. The updated Terms will be posted at{' '}
                    <Link href="/terms" className="text-foreground underline underline-offset-4">creatorjot.com/terms</Link>.
                    Continued use of the Service after the effective date of changes constitutes your acceptance of the updated Terms.
                </Typography>
                <Typography>
                    If you do not agree to the updated Terms, you must stop using the Service and may cancel your account before the changes take effect.
                </Typography>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">15. Contact</Typography>
                <Typography>Questions about these Terms? Reach us at:</Typography>
                <Typography>CreatorJot — <Link href="https://creatorjot.com" className="text-foreground underline underline-offset-4">creatorjot.com</Link></Typography>
                <Link href={`mailto:${EMAIL_ADDR.support}`}>
                    <Button size="lg" icon={<Mail />}>{EMAIL_ADDR.support}</Button>
                </Link>
            </div>

        </ContentPageWrapper>
    )
}
