
import Link from 'next/link'
import { SUBSCRIPTION_PLANS } from '@/constants/subscription-plans'
import { PlanCard } from '@/components/cards/plan-card'
import { Reveal } from '../ui/reveal'

export function PricingCards() {
    return (
        <div className="w-full mx-auto max-w-2xl grid gap-6 md:gap-8 md:grid-cols-2">
            {SUBSCRIPTION_PLANS.map((plan, i) => (
                <PlanCard key={plan.id} plan={plan} delay={i * 100} />
            ))}
        </div>
    )
}

export function PricingSection() {
    return (
        <section className="relative px-6 py-24 md:py-32 border-t border-border overflow-hidden">
            {/* Gradient orbs behind pricing */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute top-10 left-1/4 h-[350px] w-[350px] rounded-full bg-blue-500/3 blur-[100px]" style={{ animation: 'float-slow 14s ease-in-out infinite' }} />
                <div className="absolute bottom-10 right-1/4 h-[300px] w-[300px] rounded-full bg-purple-500/3 blur-[100px]" style={{ animation: 'float-slow-reverse 16s ease-in-out infinite' }} />
            </div>
            <Reveal>
                <div className="mb-14 text-center space-y-3">
                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Pricing</p>
                    <h2 className="text-3xl font-bold tracking-tight font-suse md:text-4xl">
                        Simple, transparent pricing.
                    </h2>
                </div>
            </Reveal>
            <PricingCards />
            <div className="mt-6 text-center">
                <Link href="/refund-policy" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    View refund policy ↗
                </Link>
            </div>
        </section>
    );
}
