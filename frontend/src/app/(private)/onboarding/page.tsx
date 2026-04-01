'use client'

/**
 * OnboardingPage — Multi-step onboarding
 *
 * Step 1: Collect full name + profession
 * Step 2: Choose a plan (Free or Pro)
 *
 * On completion:
 * - Updates user_profiles with data + sets onboarded = true
 * - Redirects to /dashboard
 */

import { useState } from 'react'
import { motion, AnimatePresence, type Variants } from 'framer-motion'
import { ArrowRight, ArrowLeft, User, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PlanCard } from '@/components/cards/plan-card'
import { SUBSCRIPTION_PLANS } from '@/constants/subscription-plans'
import { useAuthStore } from '@/store/auth.store'
import { createBrowserSupabaseClient } from '@/server/supabase/supabase-browser'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/* ── Animation variants ── */
const slideVariants: Variants = {
    enter: (direction: number) => ({
        x: direction > 0 ? 80 : -80,
        opacity: 0,
    }),
    center: {
        x: 0,
        opacity: 1,
        transition: { duration: 0.35, ease: 'easeOut' },
    },
    exit: (direction: number) => ({
        x: direction > 0 ? -80 : 80,
        opacity: 0,
        transition: { duration: 0.25, ease: 'easeIn' },
    }),
}

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

/* ── Predefined profession types ── */
const PROFESSION_OPTIONS = [
    'Content Creator',
    'YouTuber',
    'Social Media Manager',
    'Digital Marketer',
    'Copywriter',
    'Blogger',
    'Podcaster',
    'Freelancer',
    'Startup Founder',
    'Product Manager',
    'Developer',
    'Designer',
    'Student',
    'Other',
]

export default function OnboardingPage() {
    const { user } = useAuthStore()
    const router = useRouter()
    const supabase = createBrowserSupabaseClient()

    /* State */
    const [step, setStep] = useState(0)
    const [direction, setDirection] = useState(1)
    const [fullName, setFullName] = useState(
        () => user?.user_metadata?.full_name || user?.user_metadata?.name || ''
    )
    const [profession, setProfession] = useState('')
    const [selectedPlan, setSelectedPlan] = useState<string>('free')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const TOTAL_STEPS = 2

    /* Navigation */
    async function goNext() {
        if (step === 0) {
            if (!fullName.trim()) {
                toast.error('Please enter your name')
                return
            }
            if (!user) return

            setIsSubmitting(true)
            try {
                // Save profile first so they aren't forced to re-enter if they bounce during payment
                const { error } = await supabase.rpc('upsert_user_profile', {
                    p_full_name: fullName.trim(),
                    p_profession: profession.trim() || null
                })

                if (error) throw new Error(error.message)

                setDirection(1)
                setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1))
            } catch {
                toast.error('Failed to save profile. Please try again.')
            } finally {
                setIsSubmitting(false)
            }
        }
    }

    function goBack() {
        setDirection(-1)
        setStep((s) => Math.max(s - 1, 0))
    }

    /* Submit */
    async function handleComplete() {
        if (!user) return
        setIsSubmitting(true)
        try {
            if (selectedPlan === 'free') {
                // Just use the free plan limits already enforced
                toast.success('Welcome aboard!')
                router.push('/dashboard')
                router.refresh()
            } else if (selectedPlan === 'pro') {
                // Start Dodo checkout
                const res = await fetch('/api/payments/create-checkout', { method: 'POST' })
                if (!res.ok) {
                    throw new Error('Failed to create checkout session')
                }
                const data = await res.json()
                if (data.url) {
                    // Redirect to Dodo hosted checkout page
                    window.location.href = data.url
                } else {
                    throw new Error('Invalid checkout session received')
                }
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Something went wrong')
            setIsSubmitting(false)
        }
    }

    return (
        <div className="w-full max-w-xl mx-auto space-y-8">
            {/* Progress dots */}
            <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="show"
                className="flex items-center justify-center gap-2"
            >
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                    <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === step
                                ? 'w-8 bg-primary'
                                : i < step
                                  ? 'w-4 bg-primary/40'
                                  : 'w-4 bg-foreground/10'
                        }`}
                    />
                ))}
            </motion.div>

            {/* Step content */}
            <AnimatePresence mode="wait" custom={direction}>
                {step === 0 && (
                    <motion.div
                        key="step-0"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="space-y-8"
                    >
                        {/* Heading */}
                        <div className="text-center space-y-2">
                            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                                <Sparkles className="size-6 text-primary" />
                            </div>
                            <h1 className="text-2xl font-bold tracking-tight font-suse">
                                Tell us about yourself
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Help us personalize your experience.
                            </p>
                        </div>

                        {/* Form */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label htmlFor="fullName" className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
                                    Full Name
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/40" />
                                    <input
                                        id="fullName"
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="John Doe"
                                        className="w-full rounded-lg border border-border bg-background pl-10 pr-4 py-2.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/40"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground/60">
                                    What best describes you?
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {PROFESSION_OPTIONS.map((option) => (
                                        <button
                                            key={option}
                                            type="button"
                                            onClick={() => setProfession(option)}
                                            className={`px-3.5 py-1.5 rounded-lg text-sm transition-all duration-200 cursor-pointer border ${
                                                profession === option
                                                    ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                                                    : 'bg-background text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground'
                                            }`}
                                        >
                                            {option}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="flex justify-end">
                            <Button
                                onClick={goNext}
                                disabled={isSubmitting}
                                variant="default"
                                className="cursor-pointer"
                                state={isSubmitting ? 'loading' : 'idle'}
                                icon={<ArrowRight className="size-3.5" />}
                                iconPosition="end"
                            >
                                Next
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === 1 && (
                    <motion.div
                        key="step-1"
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        className="space-y-8"
                    >
                        {/* Heading */}
                        <div className="text-center space-y-2">
                            <h1 className="text-2xl font-bold tracking-tight font-suse">
                                Choose your plan
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                You can always upgrade or change later.
                            </p>
                        </div>

                        {/* Plan cards */}
                        <div className="grid gap-6 md:grid-cols-2">
                            {SUBSCRIPTION_PLANS.map((plan) => (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    mode="select"
                                    selected={selectedPlan === plan.id}
                                    onSelect={setSelectedPlan}
                                />
                            ))}
                        </div>

                        {/* CTAs */}
                        <div className="flex items-center justify-between">
                            <Button
                                onClick={goBack}
                                variant="ghost"
                                className="cursor-pointer"
                                icon={<ArrowLeft className="size-3.5" />}
                                iconPosition="start"
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleComplete}
                                disabled={isSubmitting}
                                variant="default"
                                className="cursor-pointer"
                                state={isSubmitting ? 'loading' : 'idle'}
                                loadingText="Setting up..."
                                icon={<ArrowRight className="size-3.5" />}
                                iconPosition="end"
                            >
                                Get Started
                            </Button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
