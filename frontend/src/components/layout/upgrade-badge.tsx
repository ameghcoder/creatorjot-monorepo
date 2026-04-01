'use client'

import { useEffect, useState } from 'react'
import { createBrowserSupabaseClient } from '@/server/supabase/supabase-browser'
import { useAuthStore } from '@/store/auth.store'
import { Crown } from 'lucide-react'
import Link from 'next/link'

export function UpgradeBadge() {
    const { user } = useAuthStore()
    const [planType, setPlanType] = useState<string | null>(null)
    const supabase = createBrowserSupabaseClient()

    useEffect(() => {
        if (!user) return

        supabase
            .from('user_active_plan')
            .select('plan_type')
            .eq('user_id', user.id)
            .single()
            .then(({ data }) => {
                if (data) setPlanType(data.plan_type)
            })
    }, [user, supabase])

    if (!planType || planType === 'pro') return null

    return (
        <Link href="/dashboard/payments">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors border border-primary/20 cursor-pointer">
                <Crown className="size-3.5 text-primary" />
                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                    Upgrade to Pro
                </span>
            </div>
        </Link>
    )
}
