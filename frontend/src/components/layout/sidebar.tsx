'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { LayoutDashboard, Sparkles, Wallet2, UserCircle, MessageSquareText, LifeBuoy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { SidebarBody, useSidebar } from '@/components/ui/sidebar'
import { useAuthStore } from '@/store/auth.store'
import { createBrowserSupabaseClient } from '@/server/supabase/supabase-browser'
import { isToday, isYesterday, differenceInDays } from 'date-fns'

/* ── Nav config ── */

const footerItems = [
    {
        label: 'Support',
        href: '/support',
        icon: LifeBuoy,
        description: 'Help & support'
    },
    {
        label: 'Profile',
        href: '/dashboard/profile',
        icon: UserCircle,
        description: 'Your account'
    },
]

const navItems = [
    {
        label: 'Overview',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: 'Overview'
    },
    {
        label: 'Generate',
        href: '/dashboard/generate',
        icon: Sparkles,
        description: 'Create content',
    },
    {
        label: 'Subscription & Billing',
        href: '/dashboard/payments',
        icon: Wallet2,
        description: 'Check Action Subscription'
    }
]

/* ── Session type ── */

interface SessionItem {
    id: string
    created_at: string
    status: string
    pin: boolean
    name: string | null
    yt_id: string | null
}

interface SessionGroup {
    label: string
    sessions: SessionItem[]
}

function groupSessionsByDate(sessions: SessionItem[]): SessionGroup[] {
    const groups: Record<string, SessionItem[]> = {}

    for (const session of sessions) {
        const date = new Date(session.created_at)
        let label: string

        if (isToday(date)) label = 'Today'
        else if (isYesterday(date)) label = 'Yesterday'
        else if (differenceInDays(new Date(), date) <= 7) label = 'Last 7 Days'
        else label = 'Older'

        if (!groups[label]) groups[label] = []
        groups[label].push(session)
    }

    const order = ['Today', 'Yesterday', 'Last 7 Days', 'Older']
    return order.filter((l) => groups[l]).map((l) => ({ label: l, sessions: groups[l] }))
}

/* ── Main component ── */

export default function Sidebar() {
    const pathname = usePathname()
    const { user } = useAuthStore()
    const [sessions, setSessions] = useState<SessionItem[]>([])

    useEffect(() => {
        if (!user) return
        const supabase = createBrowserSupabaseClient()

        async function fetchSessions() {
            // Fetch sessions with their first payload's yt_id
            const { data } = await supabase
                .from('sessions')
                .select(`
                    id,
                    created_at,
                    status,
                    pin,
                    name,
                    payloads ( yt_id )
                `)
                .eq('user_id', user!.id)
                .eq('status', 'active')
                .order('pin', { ascending: false })
                .order('created_at', { ascending: false })
                .limit(50)

            if (data) {
                const mapped: SessionItem[] = data.map((s: Record<string, unknown>) => {
                    const payloads = s.payloads as Array<{ yt_id: string | null }> | null
                    return {
                        id: s.id as string,
                        created_at: s.created_at as string,
                        status: s.status as string,
                        pin: s.pin as boolean,
                        name: (s.name as string) ?? null,
                        yt_id: payloads?.[0]?.yt_id ?? null,
                    }
                })
                setSessions(mapped)
            }
        }

        fetchSessions()
    }, [user])

    const sessionGroups = groupSessionsByDate(sessions)

    return (
        <SidebarBody className="justify-between bg-card text-foreground gap-4">
            <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pt-2">
                {/* Logo */}
                <Logo />

                {/* Section label + items */}
                <div className=" mt-6 space-y-1.5">
                    <SectionLabel label="Workspace" />

                    <nav className="space-y-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href
                            return (
                                <SidebarItem
                                    key={item.href}
                                    item={item}
                                    isActive={isActive}
                                />
                            )
                        })}
                    </nav>
                </div>

                {/* Sessions list */}
                {sessions.length > 0 && (
                    <div className="mt-6 space-y-3">
                        {sessionGroups.map((group) => (
                            <div key={group.label} className="space-y-1">
                                <SectionLabel label={group.label} />
                                {group.sessions.map((session) => {
                                    const href = `/dashboard/generate/${session.id}`
                                    const isActive = pathname === href
                                    return (
                                        <SessionNavItem
                                            key={session.id}
                                            session={session}
                                            isActive={isActive}
                                        />
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                )}

            </div>
            {footerItems.map((item) => {
                const isActive = pathname === item.href
                return (
                    <SidebarItem
                        key={item.href}
                        item={item}
                        isActive={isActive}
                    />
                )
            })}
        </SidebarBody>
    )
}

const Logo = () => {
    const { open, animate } = useSidebar()

    return (
        <Link href="/dashboard" className="flex items-center gap-3 px-2 py-2 group overflow-hidden">
            <div className="flex size-6 shrink-0 items-center justify-center">
                <LayoutDashboard className='group-hover:scale-105 size-9 md:size-12 stroke-1' />
            </div>
            <motion.span
                animate={{
                    display: animate ? (open ? "inline-block" : "none") : "inline-block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="text-lg font-bold tracking-tight font-suse whitespace-pre"
            >
                Dashboard
            </motion.span>
        </Link>
    )
}

const SectionLabel = ({ label }: { label: string }) => {
    const { open, animate } = useSidebar()

    return (
        <div className="h-4 flex items-center px-3 mb-2">
            <AnimatePresence>
                {(!animate || open) && (
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/40 whitespace-nowrap"
                    >
                        {label}
                    </motion.p>
                )}
            </AnimatePresence>
        </div>
    )
}

const SidebarItem = ({ item, isActive }: { item: typeof navItems[0], isActive: boolean }) => {
    const { open, animate, setOpen } = useSidebar()

    return (
        <Link
            href={item.href}
            /* Close mobile drawer only — leave desktop sidebar alone */
            onClick={() => { if (window.innerWidth < 768) setOpen(false) }}
            className={cn(
                'group/nav flex items-center gap-3 rounded-lg p-1.5 text-[13px] font-medium transition-all duration-200 relative overflow-hidden',
                isActive
                    ? 'bg-primary text-primary-foreground border-2 border-primary-foreground/15'
                    : 'text-muted-foreground hover:bg-primary/60 border-2 border-transparent hover:text-primary-foreground',
            )}
        >
            <div className="flex size-6 shrink-0 items-center justify-center">
                <item.icon className={cn(
                    'size-4 shrink-0 transition-colors duration-200',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground/60 group-hover/nav:text-primary-foreground'
                )} />
            </div>

            <motion.span
                animate={{
                    display: animate ? (open ? "inline-block" : "none") : "inline-block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="whitespace-pre p-0! m-0!"
            >
                {item.label}
            </motion.span>
        </Link>
    )
}

/* ── Session nav item ── */

const SessionNavItem = ({ session, isActive }: { session: SessionItem; isActive: boolean }) => {
    const { open, animate, setOpen } = useSidebar()
    const href = `/dashboard/generate/${session.id}`

    // Prefer session name (YouTube title), fall back to yt_id, then generic label
    const label = session.name
        ? session.name
        : session.yt_id
            ? `Video: ${session.yt_id}`
            : 'Untitled Session'

    return (
        <Link
            href={href}
            onClick={() => { if (window.innerWidth < 768) setOpen(false) }}
            className={cn(
                'group/session flex items-center gap-3 rounded-lg p-1.5 text-[12px] font-medium transition-all duration-200 relative overflow-hidden',
                isActive
                    ? 'bg-foreground/8 text-foreground'
                    : 'text-muted-foreground/60 hover:bg-foreground/4 hover:text-foreground',
            )}
        >
            <div className="flex size-6 shrink-0 items-center justify-center">
                <MessageSquareText className={cn(
                    'size-3.5 shrink-0 transition-colors duration-200',
                    isActive ? 'text-foreground/70' : 'text-muted-foreground/40 group-hover/session:text-foreground/60'
                )} />
            </div>

            <motion.span
                animate={{
                    display: animate ? (open ? "inline-block" : "none") : "inline-block",
                    opacity: animate ? (open ? 1 : 0) : 1,
                }}
                className="whitespace-nowrap truncate p-0! m-0!"
            >
                {label}
            </motion.span>
        </Link>
    )
}