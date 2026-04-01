'use client'

/**
 * ProfilePage
 *
 * Displays the current user's account information pulled from the
 * Supabase auth session via the Zustand auth store.
 *
 * Data shown:
 * - Avatar (Google profile picture if available, else initials fallback)
 * - Display name
 * - Email
 * - Member since (account creation date)
 * - Auth provider (e.g. "google", "email")
 */

import { useState, useEffect } from 'react'
import { motion, type Variants } from 'framer-motion'
import { Mail, Calendar, Shield } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth.store'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createBrowserSupabaseClient } from '@/server/supabase/supabase-browser'
import { canDeleteAccount, executeAccountDeletion, type CanDeleteResult } from '@/lib/billing/account-deletion'
import { Button } from '@/components/ui/button'

/* ── Animation variants ── */
const stagger: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
}
const fadeUp: Variants = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

/* ── Helpers ── */

function formatDate(iso?: string): string {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
    })
}

function formatProvider(provider?: string): string {
    if (!provider) return '—'
    if (provider === 'email') return 'Email / Password'
    return provider.charAt(0).toUpperCase() + provider.slice(1)
}

function getInitials(name?: string, email?: string): string {
    const source = name || email || ''
    const parts = source.split(/[\s@._-]/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return '?'
}

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */

export default function ProfilePage() {
    const { user, loading } = useAuthStore()

    /* Derived values from the Supabase user object */
    const meta = user?.user_metadata ?? {}
    const displayName: string = meta.full_name || meta.name || meta.user_name || '—'
    const email: string = user?.email ?? '—'
    const avatarUrl: string | undefined = meta.avatar_url || meta.picture
    const memberSince: string = formatDate(user?.created_at)
    const provider: string = formatProvider(user?.app_metadata?.provider)
    const initials: string = getInitials(displayName !== '—' ? displayName : undefined, email)

    /* Info rows */
    const infoRows = [
        { icon: Mail, label: 'Email', value: email },
        { icon: Calendar, label: 'Member since', value: memberSince },
        { icon: Shield, label: 'Auth provider', value: provider },
    ]

    /* ── Local State & Hooks ── */
    const router = useRouter()
    const supabase = createBrowserSupabaseClient()
    const [isDeleting, setIsDeleting] = useState(false)
    const [deleteCheckResult, setDeleteCheckResult] = useState<CanDeleteResult | null>(null)
    const [deleteCheckLoading, setDeleteCheckLoading] = useState(true)
    const [confirmChecked, setConfirmChecked] = useState(false)

    /* ── On mount: check if account can be deleted ── */
    useEffect(() => {
        if (!user?.id) return
        setDeleteCheckLoading(true)
        canDeleteAccount(user.id)
            .then((result) => setDeleteCheckResult(result))
            .catch(() => setDeleteCheckResult({ canDelete: true }))
            .finally(() => setDeleteCheckLoading(false))
    }, [user?.id])

    /* ── Delete handler ── */
    async function handleDeleteClick() {
        if (!user || !confirmChecked) return
        setIsDeleting(true)
        try {
            await executeAccountDeletion(user.id)
            toast.success("Profile deleted successfully")
            await supabase.auth.signOut()
            router.push('/')
            router.refresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to delete account')
            setIsDeleting(false)
        }
    }

    /* ── Danger Zone content based on deletion check ── */
    function renderDangerZoneAction() {
        if (deleteCheckLoading) {
            return (
                <Button
                    disabled
                    state="loading"
                    loadingText="Checking..."
                    variant="destructive-outline"
                >
                    Delete Profile
                </Button>
            )
        }

        if (deleteCheckResult?.canDelete === false && deleteCheckResult.reason === 'active_subscription') {
            return (
                <div className="flex flex-col sm:items-end gap-3">
                    <p className="text-[13px] text-muted-foreground/80">
                        Cancel your subscription before deleting your account.
                    </p>
                    <Button asChild variant="destructive-outline">
                        <Link href="/dashboard/payments">Go to Billing</Link>
                    </Button>
                </div>
            )
        }

        if (deleteCheckResult?.canDelete === false && deleteCheckResult.reason === 'open_dispute') {
            return (
                <p className="text-[13px] text-muted-foreground/80 max-w-sm sm:text-right">
                    Account deletion is blocked while a dispute is open. Please contact support to resolve the dispute first.
                </p>
            )
        }

        /* canDelete: true */
        return (
            <div className="flex flex-col sm:items-end gap-3">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={confirmChecked}
                        onChange={(e) => setConfirmChecked(e.target.checked)}
                        className="size-4 accent-destructive cursor-pointer"
                    />
                    <span className="text-[13px] text-muted-foreground/80">
                        I understand that account deletion is permanent and cannot be undone
                    </span>
                </label>
                <Button
                    onClick={handleDeleteClick}
                    disabled={!confirmChecked || isDeleting || loading}
                    state={isDeleting ? "loading" : "idle"}
                    loadingText="Deleting..."
                    variant="destructive-outline"
                >
                    Delete Profile
                </Button>
            </div>
        )
    }

    return (
        <motion.div
            variants={stagger}
            initial="hidden"
            animate="show"
            className="px-4 sm:px-8 py-8 sm:py-10 space-y-8"
        >
            {/* ── Page header ── */}
            <motion.div variants={fadeUp} className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/50">
                    Account
                </p>
                <h1 className="text-2xl font-bold tracking-tight font-suse">
                    Profile
                </h1>
            </motion.div>

            {/* ── Profile card ── */}
            <motion.div variants={fadeUp}>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="h-px bg-linear-to-r from-transparent via-foreground/10 to-transparent" />

                    <div className="p-5 sm:p-8 space-y-6">

                        {/* Avatar + name row */}
                        <div className="flex items-center gap-4">
                            <div className="relative size-12 shrink-0">
                                {avatarUrl ? (
                                    <Image
                                        src={avatarUrl}
                                        alt={displayName}
                                        fill
                                        className="rounded-full object-cover border border-border"
                                        sizes="48px"
                                    />
                                ) : (
                                    <div className="flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold border border-border select-none">
                                        {loading ? '…' : initials}
                                    </div>
                                )}
                            </div>

                            <div className="space-y-0.5 min-w-0">
                                <p className="text-sm font-semibold font-suse truncate">
                                    {loading ? '—' : displayName}
                                </p>
                                <p className="text-[11px] text-muted-foreground/60 truncate">
                                    {loading ? '—' : `Signed in with ${provider}`}
                                </p>
                            </div>
                        </div>

                        <div className="h-px bg-border" />

                        {/* Info rows */}
                        <div className="space-y-4">
                            {infoRows.map((row) => (
                                <div key={row.label} className="flex items-center gap-3">
                                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-foreground/4">
                                        <row.icon className="size-3.5 text-muted-foreground/50" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/40">
                                            {row.label}
                                        </p>
                                        <p className="text-[13px] font-medium text-foreground/80 truncate">
                                            {loading ? '—' : row.value}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>
                </div>
            </motion.div>

            {/* ── Danger Zone ── */}
            <motion.div variants={fadeUp} className="pt-4">
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 overflow-hidden">
                    <div className="p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="space-y-1">
                            <h2 className="text-base font-semibold text-destructive font-suse">
                                Danger Zone
                            </h2>
                            <p className="text-[13px] text-muted-foreground/80 max-w-xl">
                                Permanently delete your account and all associated data. This action cannot be undone.
                            </p>
                        </div>
                        {renderDangerZoneAction()}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
