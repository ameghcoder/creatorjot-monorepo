/**
 * DashboardLayout
 *
 * Wraps all /dashboard/* pages with:
 * - AuthProvider: initialises the Zustand auth store (session + listener)
 * - Mobile: stacked column — MobileSidebar bar on top, content below
 * - Desktop (md+): side-by-side row — collapsible sidebar left, content right
 *
 * The MobileSidebar (hamburger + drawer) is rendered inside SidebarBody
 * automatically by the sidebar UI component. It shows only on < md.
 * The DesktopSidebar shows only on md+.
 * We need the outer wrapper to be a column on mobile so the mobile bar
 * sits above the content rather than beside it.
 */
'use client'
import { useSidebarState } from '@/hooks/useSidebarState'
import SidebarLayout from '@/components/layout/sidebar'
import { Sidebar } from '@/components/ui/sidebar'
import ProfileDropdown from '@/components/layout/profile-dropdown'
import ThemeToggle from '@/components/layout/theme-toggle'
import { AuthProvider } from '@/components/providers/auth-provider'
import { LogoIcon, LogoText } from '@/components/layout/logo'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { UpgradeBadge } from '@/components/layout/upgrade-badge'

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [open, setOpen] = useSidebarState();
    return (
        <AuthProvider>
            <Sidebar open={open} setOpen={setOpen}>
                {/*
                  Mobile: flex-col — MobileSidebar bar stacks above content
                  Desktop (md+): flex-row — sidebar sits beside content
                */}
                <div className="flex flex-col md:flex-row h-dvh w-full bg-background overflow-hidden">

                    {/* Sidebar — MobileSidebar renders a top bar on mobile,
                        DesktopSidebar renders the left panel on md+ */}
                    <SidebarLayout />

                    {/* Main content — takes remaining space, scrolls independently */}
                    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overflow-x-hidden relative">

                        {/* Subtle radial wash (decorative, desktop only) */}
                        <div aria-hidden="true" className="pointer-events-none fixed top-0 left-56 right-0 h-screen overflow-hidden z-0 hidden md:block">
                            <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[480px] w-[640px] rounded-full bg-foreground/1.5 blur-3xl" />
                        </div>

                        <div className="relative z-10 flex-1 flex flex-col">
                            <header className="sticky flex h-14 justify-between items-center w-full top-0 px-6 py-2 z-30 border-b border-border bg-secondary/25 backdrop-blur-md" >
                                <div className='flex items-center gap-2.5'>
                                    <button
                                        onClick={() => setOpen(!open)}
                                        className=" z-50 flex size-6 items-center justify-center text-muted-foreground hover:text-foreground shadow-sm transition-all hover:scale-105 cursor-pointer"
                                    >
                                        {open ? <PanelLeftClose className="size-3.5" /> : <PanelLeftOpen className="size-3.5" />}
                                    </button>
                                    <span className='font-thin opacity-50'>|</span>
                                    <div className="flex items-center gap-2">
                                        <LogoIcon className='size-8 md:size-10' />
                                        <LogoText className='font-normal' />
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <UpgradeBadge />
                                    <ThemeToggle variant="ghost" />
                                    <ProfileDropdown />
                                </div>
                            </header>

                            {/* Page content */}
                            <main className="flex-1 mx-auto w-full max-w-6xl">
                                {children}
                            </main>
                        </div>
                    </div>
                </div>
            </Sidebar>
        </AuthProvider>
    )
}
