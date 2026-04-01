'use client'
import { AuthProvider } from '@/components/providers/auth-provider'
import { LogoIcon, LogoText } from '@/components/layout/logo'

export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <AuthProvider>
            <div className="flex min-h-dvh flex-col bg-background">
                {/* Minimal header */}
                <header className="flex items-center gap-2 px-6 py-4 border-b border-border">
                    <LogoIcon className="size-8" />
                    <LogoText className="font-normal" />
                </header>

                {/* Centered content */}
                <main className="flex-1 flex items-center justify-center px-4 py-10">
                    {children}
                </main>
            </div>
        </AuthProvider>
    )
}
