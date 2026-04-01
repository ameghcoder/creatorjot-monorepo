'use client'

import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export function useInView(threshold = 0.12) {
    const ref = useRef<HTMLDivElement>(null)
    const [inView, setInView] = useState(false)

    useEffect(() => {
        const el = ref.current
        if (!el) return
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true)
                    observer.unobserve(el)
                }
            },
            { threshold }
        )
        observer.observe(el)
        return () => observer.disconnect()
    }, [threshold])

    return { ref, inView }
}

export function Reveal({
    children,
    className,
    delay = 0,
}: {
    children: React.ReactNode
    className?: string
    delay?: number
}) {
    const { ref, inView } = useInView()
    return (
        <div
            ref={ref}
            className={cn(
                'transition-all duration-700 ease-out',
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-5',
                className
            )}
            style={{ transitionDelay: `${delay}ms` }}
        >
            {children}
        </div>
    )
}
