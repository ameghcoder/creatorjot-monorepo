import { ScaleCard } from '@/components/layout/scale-card'
import { Button } from '@/components/ui/button'
import { EMAIL_ADDR } from '@/constants/emails'
import { Mail } from 'lucide-react'

export const metadata = {
    title: 'Contact Us | CreatorJot',
    description: 'Get in touch with the CreatorJot team for support, feedback, or general enquiries.',
    alternates: { canonical: 'https://creatorjot.com/contact-us' },
}

export default function ContactPage() {
    return (
        <div className="mx-auto w-full border-l border-r border-border bg-background min-h-screen relative flex flex-col pt-16">
            <main className="flex-1 relative z-10 w-full flex flex-col">
                <section className="relative px-6 py-24 md:py-32 overflow-hidden flex-1">
                    <div className="mb-14 text-center space-y-3">
                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700">Contact</p>
                        <h1 className="text-4xl font-bold tracking-tight font-suse md:text-5xl animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
                            Get in Touch
                        </h1>
                        <p className="mx-auto max-w-md text-base leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
                            Have a question or need support? We&apos;re here to help.
                        </p>
                    </div>

                    <ScaleCard bodyClassName='w-full flex flex-col items-center text-center' className='w-full max-w-md mx-auto'>
                        <div className="size-12 rounded-full bg-secondary flex items-center justify-center text-foreground/80">
                            <Mail className="size-6" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-semibold">Email Us</h3>
                            <p className="text-sm text-muted-foreground">We usually respond within 24 hours.</p>
                        </div>
                        <a href={`mailto:${EMAIL_ADDR.support}`} className="w-full">
                            <Button variant="default" className="w-full">
                                support@creatorjot.com
                            </Button>
                        </a>
                    </ScaleCard>
                </section>
            </main>
        </div>
    )
}
