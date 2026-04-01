'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import ThemeToggle from '@/components/layout/theme-toggle'
import { createBrowserSupabaseClient } from '@/server/supabase/supabase-browser'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { ScaleCard } from '../layout/scale-card'
import { LogoIcon } from '../layout/logo'

/* ------------------------------------------------------------------ */
/*  Google icon (inline SVG to avoid extra dependencies)              */
/* ------------------------------------------------------------------ */
function GoogleIcon({ className }: { className?: string }) {
    return (
        <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
            />
            <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
            />
            <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
            />
            <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
            />
        </svg>
    )
}

/* ------------------------------------------------------------------ */
/*  AuthCard                                                          */
/* ------------------------------------------------------------------ */
export type AuthMode = 'login' | 'signup'

interface AuthCardProps {
    mode: AuthMode
}

export default function AuthCard({ mode }: AuthCardProps) {
    const [loading, setLoading] = useState(false)

    const isLogin = mode === 'login'
    const heading = isLogin ? 'Welcome back' : 'Create your account'
    const subheading = isLogin
        ? 'Sign in to continue to CreatorJot'
        : 'Get started with CreatorJot for free'
    const footerText = isLogin ? "Don't have an account?" : 'Already have an account?'
    const footerLink = isLogin ? '/auth/signup' : '/auth/login'
    const footerLabel = isLogin ? 'Sign up' : 'Log in'

    async function handleGoogleAuth() {
        try {
            setLoading(true)
            const supabase = createBrowserSupabaseClient()

            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            if (error) throw error
        } catch (err) {
            console.error('Google auth error:', err)
            toast.error('Failed to initiate Google sign-in. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div className="mx-auto w-full relative min-h-dvh">

            {/* Subtle background wash */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[520px] w-[720px] rounded-full bg-foreground/3 blur-3xl" />
            </div>

            {/* Center content */}
            <div className="relative z-10 flex min-h-dvh items-center justify-center px-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="w-full max-w-sm"
                >
                    <ScaleCard>
                        {/* Card */}
                        <div className="p-8 md:p-10 space-y-8 shadow-sm">
                            {/* Logo + heading */}
                            <div className="flex flex-col items-center text-center space-y-3">
                                <div className="flex size-12 items-center justify-center rounded-xl bg-secondary mb-1">
                                    <LogoIcon />
                                </div>
                                <div className="space-y-1.5">
                                    <h1 className="text-2xl font-bold tracking-tight font-suse">
                                        {heading}
                                    </h1>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {subheading}
                                    </p>
                                </div>
                            </div>

                            {/* Google button */}
                            <Button
                                variant="outline"
                                size="xl"
                                className="w-full cursor-pointer group relative overflow-hidden"
                                onClick={handleGoogleAuth}
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="size-5 animate-spin" />
                                ) : (
                                    <GoogleIcon className="size-5" />
                                )}
                                <span className="relative z-10">
                                    {loading ? 'Redirecting…' : 'Continue with Google'}
                                </span>
                            </Button>

                            {/* Terms */}
                            <p className="text-center text-[11px] leading-relaxed text-muted-foreground/50">
                                By continuing, you agree to our{' '}
                                <span className="underline underline-offset-2 cursor-pointer hover:text-muted-foreground/70 transition-colors">
                                    Terms of Service
                                </span>{' '}
                                and{' '}
                                <span className="underline underline-offset-2 cursor-pointer hover:text-muted-foreground/70 transition-colors">
                                    Privacy Policy
                                </span>
                            </p>
                        </div>
                    </ScaleCard>

                    {/* Footer link */}
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        {footerText}{' '}
                        <Link
                            href={footerLink}
                            className="font-medium text-foreground underline-offset-4 hover:underline transition-colors"
                        >
                            {footerLabel}
                        </Link>
                    </p>
                </motion.div>
            </div>
        </div>
    )
}
