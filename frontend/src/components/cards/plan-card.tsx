'use client'

/**
 * PlanCard — Reusable pricing plan card
 *
 * Renders a plan from the subscription-plans constants inside a ScaleCard.
 * Supports two modes:
 * - Link mode (default): CTA is a <Link> — for homepage & pricing page
 * - Select mode: card is selectable — for onboarding
 */

import { ScaleCard } from '@/components/layout/scale-card'
import { DottedGlowBackground } from '@/components/ui/dotted-glow-bg'
import { Reveal } from '@/components/ui/reveal'
import { Button } from '@/components/ui/button'
import type { SubscriptionPlan } from '@/constants/subscription-plans'
import { SimpleIcons } from '@/components/icon-wrapper'
import { siX } from 'simple-icons'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
    Zap,
    Infinity,
    Users,
    SlidersHorizontal,
    Lightbulb,
    Crown,
    Check,
} from 'lucide-react'

/* ── Icon resolver ── */
const ICON_MAP: Record<string, React.ReactNode> = {
    Zap: <Zap className="size-3.5" />,
    Infinity: <Infinity className="size-3.5" />,
    Users: <Users className="size-3.5" />,
    SlidersHorizontal: <SlidersHorizontal className="size-3.5" />,
    Lightbulb: <Lightbulb className="size-3.5" />,
    siX: <SimpleIcons path={siX.path} className="size-3 fill-current" />,
}

function resolveIcon(name: string): React.ReactNode {
    return ICON_MAP[name] ?? <Zap className="size-3.5" />
}

/* ── Props ── */
export interface PlanCardProps {
    plan: SubscriptionPlan
    /** Reveal animation delay in ms */
    delay?: number
    /** Select mode — makes the card clickable+highlightable (used in onboarding) */
    mode?: 'link' | 'select'
    /** Whether this card is currently selected (select mode only) */
    selected?: boolean
    /** Callback when the card is selected (select mode only) */
    onSelect?: (planId: string) => void
}

export function PlanCard({
    plan,
    delay = 0,
    mode = 'link',
    selected = false,
    onSelect,
}: PlanCardProps) {
    const isPro = plan.popular

    /* Glow config */
    const glowColor = isPro ? '--color-primary' : '--color-foreground'
    const glowOpacity = isPro ? 0.15 : 0.06
    const glowInitialOpacity = isPro ? 'opacity-40' : 'opacity-0'

    /* Footer CTA — only shown in link mode */
    const footer =
        mode === 'link' ? (
            <Link href={plan.cta.href} className="w-full">
                {isPro ? (
                    <Button
                        variant="default"
                        size="lg"
                        className="w-full cursor-pointer group/btn relative overflow-hidden shadow-md"
                    >
                        <span className="relative z-10 transition-transform group-hover/btn:scale-[1.02]">
                            {plan.cta.label}
                        </span>
                    </Button>
                ) : (
                    <Button
                        variant="outline"
                        size="lg"
                        className="w-full cursor-pointer bg-background/50 backdrop-blur-md hover:bg-muted/80"
                    >
                        {plan.cta.label}
                    </Button>
                )}
            </Link>
        ) : undefined

    /* Header action — popular badge */
    const headerAction = plan.popular ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-foreground/5 border border-foreground/10 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/60 backdrop-blur-sm">
            <Crown className="size-3" />
            Popular
        </span>
    ) : undefined

    /* Wrapper for select mode */
    const handleClick = () => {
        if (mode === 'select' && onSelect) {
            onSelect(plan.id)
        }
    }

    const card = (
        <ScaleCard
            title={plan.name}
            headerAction={headerAction}
            bodyClassName="space-y-6"
            footer={footer}
            className={cn(
                'group',
                mode === 'select' && 'cursor-pointer transition-all duration-200',
                mode === 'select' && selected && 'ring-2 ring-primary ring-offset-2 ring-offset-background'
            )}
        >
            <DottedGlowBackground
                className={cn(
                    'absolute inset-0 pointer-events-none transition-opacity duration-700 z-0',
                    glowInitialOpacity,
                    'group-hover:opacity-100'
                )}
                colorLightVar={glowColor}
                colorDarkVar={glowColor}
                glowColorLightVar={glowColor}
                glowColorDarkVar={glowColor}
                gap={24}
                opacity={glowOpacity}
            />

            {/* Price */}
            <p className="text-3xl font-bold font-suse relative z-10">
                ${plan.price}
                <span className="text-sm font-normal text-muted-foreground">
                    /{plan.interval}
                </span>
            </p>

            {/* Features list */}
            <div className="space-y-3 relative z-10">
                {plan.features.map((f) => (
                    <div
                        key={f.text}
                        className="flex items-center gap-2.5 text-sm text-muted-foreground"
                    >
                        <div className="text-foreground/50">{resolveIcon(f.icon)}</div>
                        {f.text}
                    </div>
                ))}
            </div>

            {/* Select mode: selected indicator */}
            {mode === 'select' && selected && (
                <div className="absolute top-3 right-3 z-20 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3.5" />
                </div>
            )}
        </ScaleCard>
    )

    if (mode === 'select') {
        return (
            <Reveal delay={delay}>
                <div onClick={handleClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && handleClick()}>
                    {card}
                </div>
            </Reveal>
        )
    }

    return <Reveal delay={delay}>{card}</Reveal>
}
