import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft, Home, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LogoIcon, LogoText } from '@/components/layout/logo'

export const metadata: Metadata = {
    title: '404 — Page Not Found | CreatorJot',
    description: 'The page you were looking for does not exist.',
    robots: { index: false, follow: false },
}

export default function NotFound() {
    return (
        <div className="min-h-dvh flex flex-col bg-background">
            {/* Minimal nav */}
            <header className="px-6 py-4 border-b border-border/40">
                <Link href="/" className="flex items-center gap-2 w-fit">
                    <LogoIcon className="size-7" />
                    <LogoText className="text-base" />
                </Link>
            </header>

            {/* Content */}
            <main className="flex-1 flex flex-col items-center justify-center px-6 text-center">
                {/* Decorative glow */}
                <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[600px] rounded-full bg-foreground/3 blur-[100px]" />
                </div>

                <div className="relative space-y-6 max-w-md">
                    {/* 404 number */}
                    <p className="text-[120px] font-bold leading-none tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-foreground/80 to-foreground/10 select-none font-suse">
                        404
                    </p>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight font-suse">
                            Page not found
                        </h1>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            The page you're looking for doesn't exist or has been moved.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                        <Link href="/">
                            <Button variant="default" icon={<Home className="size-3.5" />} iconPosition="start">
                                Back to home
                            </Button>
                        </Link>
                        <Link href="/dashboard">
                            <Button variant="outline" icon={<Sparkles className="size-3.5" />} iconPosition="start">
                                Go to dashboard
                            </Button>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    )
}
