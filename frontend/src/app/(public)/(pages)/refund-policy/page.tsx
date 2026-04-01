import ContentPageWrapper from '@/components/layout/content-page-wrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { EMAIL_ADDR } from '@/constants/emails'
import { Mail } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'

export const metadata = {
    title: 'Refund Policy | CreatorJot',
    description: 'Our refund and cancellation policy — eligibility window, credit usage rules, and how to request a refund.',
    alternates: { canonical: 'https://creatorjot.com/refund-policy' },
}

export default function RefundPolicyPage() {
    return (
        <ContentPageWrapper title='Refund Policy' pageType='legal' lastUpdated={`30 March, 2026`}>
            <div className="space-y-4">
                <Badge badgeStyle={"modern"} variant={"warning"} >Free tier available - try before you buy</Badge>
            </div>
            <div className="space-y-4">
                <Typography variant={"h2"}>Our commitment</Typography>
                <Typography>
                    We want you to feel confident before spending a rupee. That's why every account starts with a free tier - 2 generations at no cost, so you can experience CreatorJot before committing to a paid plan. We believe this makes our refund window short but fair.
                </Typography>
                <Typography variant={"blockquote"} className='border-l-yellow-400'>
                    <Typography variant={"large"}>Note:</Typography>
                    <Typography variant={"inlineCode"}>Free Tier</Typography> accounts come with 2 generations per month - enough to explore what CreatorJot can do. <Typography variant={"inlineCode"}>Pro Tier</Typography> accounts use a credit-based system designed for heavier use and more transparency. Your dashboard breaks down credit usage by platform, new videos, existing videos, and more, so you always know exactly where your credits are going.
                </Typography>
            </div>
            <hr />
            <div className="space-y-4">
                <Typography variant={"h2"}>Free tier</Typography>
                <Typography>
                    Every new account receives 2 free generations with no credit card required. We encourage you to use these to evaluate the product before upgrading. The availability of a free tier is taken into account in our refund eligibility decisions.
                </Typography>
            </div>
            <hr />
            <div className="space-y-4 st-theme-shadcn">
                <Typography variant={"h2"}>Refund eligibility</Typography>
                <Typography>Paid plan purchases may be eligible for a full refund under the following conditions:</Typography>

                <table className='max-w-xl bg-accent/50 rounded-md overflow-hidden'>
                    {/* heading */}
                    <thead>
                        <tr>
                            <th>
                                <Typography variant={"muted"}>Condition</Typography>
                            </th>
                            <th>
                                <Typography variant={"muted"}>Eligible?</Typography>
                            </th>
                        </tr>
                    </thead>
                    {/* content */}
                    <tbody>
                        <tr>
                            <td>
                                <Typography>Request within 24 hours of purchase</Typography>
                            </td>
                            <td>
                                <Badge variant={"success"} badgeStyle={"modern"}>Required</Badge>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Typography>Credits used less than 5</Typography>
                            </td>
                            <td>
                                <Badge variant={"success"} badgeStyle={"modern"}>Required</Badge>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Typography>Request after 24 hours</Typography>
                            </td>
                            <td>
                                <Badge variant={"destructive"} badgeStyle={"modern"}>Not eligible</Badge>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Typography>Any generations consumed</Typography>
                            </td>
                            <td>
                                <Badge variant={"destructive"} badgeStyle={"modern"}>Not eligible</Badge>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <Typography>After subscription renewal (month 2+)</Typography>
                            </td>
                            <td>
                                <Badge variant={"destructive"} badgeStyle={"modern"}>Not eligible</Badge>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <Typography variant={"blockquote"} className="border-l-4! border-primary/50 font-normal!">
                    <Typography variant={"strong"} className='text-primary'>Why we can't refund after usage:</Typography> Each generation triggers real-time calls to Google's AI APIs on your behalf. These costs are incurred immediately and are non-recoverable on our end. This is standard practice across AI-powered SaaS products.
                </Typography>
            </div>
            <hr />
            <div className="space-y-4 st-theme-shadcn">
                <Typography variant={"h2"}>Cancellations</Typography>
                <Typography>You can cancel your subscription at any time from Settings → Billing. Cancellation stops future charges immediately. Your access and remaining credits continue until the end of your current billing period - no partial refunds are issued for unused time.</Typography>
                <Typography variant={"blockquote"} className="border-l-4! border-primary/50 font-normal!">
                    <Typography variant={"strong"} className='text-primary'>Example:</Typography> If you're on a monthly plan billed on the 1st and you cancel on the 15th, you keep full access until the end of that month. You won't be charged on the next 1st.
                </Typography>
            </div>
            <hr />
            <div className="space-y-4 st-theme-shadcn">
                <Typography variant={"h2"}>Disputes and chargebacks</Typography>
                <Typography>
                    We strongly encourage you to contact us before initiating a chargeback with your bank or card issuer. We respond to every refund request personally and will work to resolve your concern quickly.
                </Typography>
                <Typography>
                    Initiating a chargeback bypasses our support process and results in automatic account suspension during the dispute period. If the dispute is found in our favor, account access will not be restored. If you have a legitimate concern, emailing us is always faster and more reliable than a chargeback.
                </Typography>
            </div>
            <hr />
            <div className="space-y-4 st-theme-shadcn">
                <Typography variant={"h2"}>How to request a refund</Typography>
                <Typography>
                    If you're within the 24-hour window and have not used credits more than 5, you can request a refund directly from Settings → Billing inside your dashboard. Alternatively, email us:
                </Typography>
                <Link href={`mailto:${EMAIL_ADDR.support}`}>
                    <Button size={"lg"} icon={<Mail />}>
                        {EMAIL_ADDR.support}
                    </Button>
                </Link>
                <Typography variant={"muted"} className='mt-4'>
                    Include your registered email address and the date of purchase. We typically respond within 24 hours on business days.
                </Typography>
            </div>
            <hr />
            <div className="space-y-4 st-theme-shadcn">
                <Typography variant={"h2"}>Policy updates</Typography>
                <Typography>
                    This policy may be updated as CreatorJot matures. We'll notify existing subscribers by email before any changes take effect. The current version always lives at <Link href={'/refund-policy'}>creatorjot.com/refund-policy</Link>.
                </Typography>
            </div>
        </ContentPageWrapper>
    )
}
