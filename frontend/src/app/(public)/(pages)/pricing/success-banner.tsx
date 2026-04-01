'use client'

// Success banner — shown when ?success=true is present after a successful checkout redirect
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, X } from 'lucide-react'

export function SuccessBanner() {
    const searchParams = useSearchParams()
    const [visible, setVisible] = useState(false)

    useEffect(() => {
        // Only show after mount to avoid flash on initial render
        if (searchParams.get('success') === 'true') {
            setVisible(true)

            // Auto-dismiss after 6 seconds
            const timer = setTimeout(() => setVisible(false), 6000)
            return () => clearTimeout(timer)
        }
    }, [searchParams])

    if (!visible) return null

    return (
        <div className="w-full px-6 pt-4">
            <div className="mx-auto max-w-2xl flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/8 px-4 py-3">
                {/* Success icon */}
                <CheckCircle2 className="size-5 text-emerald-500 shrink-0 mt-0.5" />

                {/* Message */}
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                        You&apos;re now on Pro!
                    </p>
                    <p className="text-[13px] text-emerald-600/80 dark:text-emerald-500/80 leading-relaxed">
                        Your subscription is active. Enjoy all Pro features.
                    </p>
                </div>

                {/* Manual close button */}
                <button
                    onClick={() => setVisible(false)}
                    aria-label="Dismiss"
                    className="shrink-0 text-emerald-600/60 hover:text-emerald-600 transition-colors cursor-pointer"
                >
                    <X className="size-4" />
                </button>
            </div>
        </div>
    )
}
