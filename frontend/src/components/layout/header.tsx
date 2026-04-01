'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import ThemeToggle from '@/components/layout/theme-toggle';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import Scales from '../ui/scale';
import { LogoIcon, LogoText } from './logo';


export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const toggleMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
    const closeMenu = () => setIsMobileMenuOpen(false);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 flex flex-col md:flex-row items-center justify-between px-4 py-2 md:px-8 max-w-7xl mx-auto w-full backdrop-blur-lg">
            <div
                className="absolute pointer-events-none"
                style={{
                    left: 0,
                    bottom: -5,
                    height: 10,
                    width: '100%',
                }}
            >
                <Scales size={5} className="rounded-lg" />
            </div>

            <div className="flex items-center justify-between w-full md:w-auto">
                <Link href="/" className="flex items-center gap-2 pr-4 pl-2 py-1 " onClick={closeMenu}>
                    <LogoIcon className='size-9 md:size-12' />
                    <LogoText />
                </Link>

                <div className="flex items-center gap-2 md:hidden">
                    <ThemeToggle />
                    <Button variant="ghost" size="icon" onClick={toggleMenu} aria-label="Toggle menu">
                        {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
                    </Button>
                </div>
            </div>

            {/* Desktop Navigation Capsule */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-medium text-muted-foreground px-8 py-3 bg-transparent">
                <Link href="/how-it-works" className="hover:text-foreground transition-colors">How it Works</Link>
                <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
                <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
                <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
                <Link href="/contact-us" className="hover:text-foreground transition-colors">Contact</Link>
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
                <ThemeToggle />
                <Button variant="ghost" size="sm" className="text-xs cursor-pointer" asChild>
                    <Link href="/auth/login">
                        Log in
                    </Link>
                </Button>
                <Link href="/auth/signup">
                    <Button variant="default" size="sm" className="text-xs cursor-pointer" compForDark={true}>
                        Start Free
                    </Button>
                </Link>
            </div>

            {/* Mobile Menu Dropdown */}
            {isMobileMenuOpen && (
                <div className="absolute top-[72px] left-0 right-0 w-full bg-background/95 backdrop-blur-xl border-b border-border shadow-lg p-4 flex flex-col gap-4 md:hidden">
                    <nav className="flex flex-col gap-4 text-sm font-medium">
                        <Link href="/how-it-works" className="hover:text-foreground transition-colors" onClick={closeMenu}>How it Works</Link>
                        <Link href="/pricing" className="hover:text-foreground transition-colors" onClick={closeMenu}>Pricing</Link>
                        <Link href="/faq" className="hover:text-foreground transition-colors" onClick={closeMenu}>FAQ</Link>
                        <Link href="/about" className="hover:text-foreground transition-colors" onClick={closeMenu}>About</Link>
                        <Link href="/contact-us" className="hover:text-foreground transition-colors" onClick={closeMenu}>Contact</Link>
                    </nav>
                    <div className="flex flex-col gap-3 pt-4 border-t border-border mt-2">
                        <Link href="/auth/login" className="w-full" onClick={closeMenu}>
                            <Button variant="ghost" className="w-full justify-center">
                                Log in
                            </Button>
                        </Link>
                        <Link href="/auth/signup" className="w-full" onClick={closeMenu}>
                            <Button variant="default" className="w-full justify-center">
                                Start Free
                            </Button>
                        </Link>
                    </div>
                </div>
            )}
        </header>
    );
}
