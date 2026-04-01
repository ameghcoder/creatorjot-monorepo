import ContentPageWrapper from '@/components/layout/content-page-wrapper'
import { Typography } from '@/components/ui/typography'
import { EMAIL_ADDR } from '@/constants/emails'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Mail, BookOpen, CreditCard, Zap, AlertCircle, RefreshCw } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
    title: 'Help & Support | CreatorJot',
    description: 'Get help with CreatorJot — troubleshooting, billing, account issues, and how to get the most out of your generations.',
    alternates: { canonical: 'https://creatorjot.com/support' },
}

const topics = [
    {
        icon: Zap,
        title: 'Generations & content',
        items: [
            {
                q: 'My generation is stuck on "Processing"',
                a: 'This usually means the transcript is still being extracted. Long videos (60+ min) can take up to 2 minutes. If it\'s been more than 5 minutes, try refreshing the page. If the issue persists, email us with the YouTube URL.',
            },
            {
                q: 'The generated content doesn\'t match my video',
                a: 'This can happen if the transcript API returned a partial or low-quality transcript. Try regenerating — each run uses a fresh AI call. If the quality is consistently poor for a specific video, let us know.',
            },
            {
                q: 'Can I regenerate with a different hook?',
                a: 'Yes. After your first generation completes, the Hooks panel appears on the right sidebar. Select any hook and click Generate again — it will use that angle for the new post.',
            },
            {
                q: 'What video length is supported?',
                a: 'Free accounts support videos up to 10 minutes. Pro accounts support up to 90 minutes.',
            },
        ],
    },
    {
        icon: CreditCard,
        title: 'Billing & credits',
        items: [
            {
                q: 'How are credits calculated?',
                a: 'Credits are charged in two stages: once when you process a new video (based on duration), and once per post generated (based on platform). Your dashboard shows a full breakdown. Cached videos (already processed) don\'t cost video processing credits again.',
            },
            {
                q: 'Do unused credits roll over?',
                a: 'No. Credits reset at the start of each billing cycle. We recommend using your credits before renewal.',
            },
            {
                q: 'I was charged but got no credits',
                a: 'This is rare but can happen if there was a payment webhook delay. Wait 5 minutes and refresh your dashboard. If credits still haven\'t appeared, email us with your payment confirmation.',
            },
            {
                q: 'How do I cancel my subscription?',
                a: 'Go to Settings → Billing → Cancel Plan. Your access continues until the end of the current billing period. No partial refunds are issued for unused time.',
            },
        ],
    },
    {
        icon: RefreshCw,
        title: 'Account & access',
        items: [
            {
                q: 'I can\'t log in with Google',
                a: 'Make sure you\'re using the same Google account you signed up with. If you\'re getting an error, try clearing cookies and logging in again. If the issue persists, email us.',
            },
            {
                q: 'How do I delete my account?',
                a: 'Email us at support and we\'ll delete your account and all associated data within 30 days, per our Privacy Policy.',
            },
            {
                q: 'I forgot which email I used',
                a: 'Try logging in with Google — if you signed up via Google OAuth, the email is your Google account email.',
            },
        ],
    },
    {
        icon: AlertCircle,
        title: 'Known limitations',
        items: [
            {
                q: 'Private or age-restricted videos',
                a: 'CreatorJot cannot process private, unlisted (without access), or age-restricted YouTube videos. The video must be publicly accessible.',
            },
            {
                q: 'Videos without captions',
                a: 'If a video has no auto-generated or manual captions on YouTube, transcript extraction may fail. This is a limitation of the underlying transcript API.',
            },
            {
                q: 'Non-English videos',
                a: 'We support English, Hindi, Spanish, and German. Output quality may vary for languages with limited transcript data.',
            },
        ],
    },
]

export default function SupportPage() {
    return (
        <ContentPageWrapper title="Help & Support" pageType="support">
            <div className="space-y-4">
                <Typography>
                    Find answers to common questions below. If you can't find what you need, email us directly — we respond to every message.
                </Typography>
            </div>

            {topics.map((topic) => {
                const Icon = topic.icon
                return (
                    <div key={topic.title} className="space-y-6">
                        <hr />
                        <div className="flex items-center gap-2">
                            <Icon className="size-4 text-muted-foreground" />
                            <Typography variant="h2">{topic.title}</Typography>
                        </div>
                        <div className="space-y-5">
                            {topic.items.map((item) => (
                                <div key={item.q} className="space-y-1.5">
                                    <Typography variant="large" className="text-foreground">{item.q}</Typography>
                                    <Typography>{item.a}</Typography>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            })}

            <hr />

            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <BookOpen className="size-4 text-muted-foreground" />
                    <Typography variant="h2">Other resources</Typography>
                </div>
                <div className="flex flex-wrap gap-3">
                    <Link href="/faq">
                        <Badge variant="outline" badgeStyle="modern" className="cursor-pointer text-sm px-3 py-1.5">FAQ</Badge>
                    </Link>
                    <Link href="/refund-policy">
                        <Badge variant="outline" badgeStyle="modern" className="cursor-pointer text-sm px-3 py-1.5">Refund Policy</Badge>
                    </Link>
                    <Link href="/privacy">
                        <Badge variant="outline" badgeStyle="modern" className="cursor-pointer text-sm px-3 py-1.5">Privacy Policy</Badge>
                    </Link>
                    <Link href="/terms">
                        <Badge variant="outline" badgeStyle="modern" className="cursor-pointer text-sm px-3 py-1.5">Terms of Service</Badge>
                    </Link>
                </div>
            </div>

            <hr />

            <div className="space-y-4">
                <Typography variant="h2">Still need help?</Typography>
                <Typography>
                    Email us and we'll get back to you within 24 hours on business days. Include your registered email and a description of the issue — screenshots help.
                </Typography>
                <Link href={`mailto:${EMAIL_ADDR.support}`}>
                    <Button size="lg" icon={<Mail />}>{EMAIL_ADDR.support}</Button>
                </Link>
            </div>
        </ContentPageWrapper>
    )
}
