'use client'

import { useState, useRef, useEffect } from 'react'
import { User, CreditCard, LogOut } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { createBrowserSupabaseClient } from '@/server/supabase/supabase-browser'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

const menuItems = [
    {
        label: 'Profile',
        href: '/dashboard/profile',
        icon: User,
    },
    {
        label: 'Payments',
        href: '/dashboard/payments',
        icon: CreditCard,
    },
]

export default function ProfileDropdown() {
    const [open, setOpen] = useState(false)
    const ref = useRef<HTMLDivElement>(null)
    const router = useRouter()

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    // Close on Escape
    useEffect(() => {
        function handleKey(e: KeyboardEvent) {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('keydown', handleKey)
        return () => document.removeEventListener('keydown', handleKey)
    }, [])

    async function handleLogout() {
        try {
            const supabase = createBrowserSupabaseClient()
            await supabase.auth.signOut()
            router.push('/auth/login')
            router.refresh()
        } catch {
            toast.error('Failed to sign out. Please try again.')
        }
    }

    return (
        <div ref={ref} className="relative">
            {/* Trigger */}
            <button
                onClick={() => setOpen((v) => !v)}
                className={cn(
                    'flex size-9 items-center justify-center gap-2 rounded-full transition-all duration-200 cursor-pointer',
                    'hover:border-foreground/15 hover:bg-secondary/50',
                    open && 'border-foreground/15 bg-secondary/50'
                )}
                aria-label="Profile menu"
                aria-expanded={open}
            >
                <div className="flex size-6 items-center justify-center rounded-full bg-foreground/6">
                    <User className="size-3 text-muted-foreground" />
                </div>
            </button>

            {/* Dropdown */}
            {open && (
                <div className="absolute right-0 top-full mt-2.5 w-52 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-black/8 dark:shadow-black/30 z-50">
                    {/* User info header */}
                    <div className="px-3 py-2.5 mb-1">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/40">
                            Account
                        </p>
                    </div>

                    {menuItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setOpen(false)}
                            className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-foreground/4 hover:text-foreground"
                        >
                            <item.icon className="size-3.5 opacity-60" />
                            {item.label}
                        </Link>
                    ))}

                    {/* Divider */}
                    <div className="my-1.5 mx-3 h-px bg-border" />

                    {/* Logout */}
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-muted-foreground transition-colors duration-150 hover:bg-destructive/8 hover:text-destructive cursor-pointer"
                    >
                        <LogOut className="size-3.5 opacity-60" />
                        Log out
                    </button>
                </div>
            )}
        </div>
    )
}
