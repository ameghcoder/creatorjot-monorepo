'use client'

import { useEffect, useState } from 'react'
import { useInView } from '@/components/ui/reveal'

export function Typewriter({ text, delay = 0 }: { text: string; delay?: number }) {
    const [displayed, setDisplayed] = useState('')
    const [started, setStarted] = useState(false)
    const { ref, inView } = useInView(0.3)

    useEffect(() => {
        if (inView && !started) {
            const timeout = setTimeout(() => setStarted(true), delay)
            return () => clearTimeout(timeout)
        }
    }, [inView, delay, started])

    useEffect(() => {
        if (!started) return
        let i = 0
        const interval = setInterval(() => {
            setDisplayed(text.slice(0, i + 1))
            i++
            if (i >= text.length) clearInterval(interval)
        }, 22)
        return () => clearInterval(interval)
    }, [started, text])

    return (
        <span ref={ref}>
            {displayed}
            {started && displayed.length < text.length && (
                <span className="inline-block w-px h-4 bg-foreground/60 animate-pulse ml-0.5 align-middle" />
            )}
        </span>
    )
}
