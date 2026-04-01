'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export function FloatingCta() {
    const heroRef = useRef<HTMLDivElement>(null)
    const [show, setShow] = useState(false)

    useEffect(() => {
        // Observe the hero sentinel div rendered by the server
        const el = document.getElementById('hero-sentinel')
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => setShow(!entry.isIntersecting),
            { threshold: 0 }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return (
        <div
            className={cn(
                'fixed bottom-0 inset-x-0 z-50 p-3 md:hidden transition-all duration-300',
                show
                    ? 'translate-y-0 opacity-100'
                    : 'translate-y-full opacity-0 pointer-events-none'
            )}
        >
            <Link
                href="/auth/signup"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-lg active:scale-[0.98] transition-all duration-200"
            >
                Start Free
                <ArrowRight className="size-4" />
            </Link>
        </div>
    )
}
