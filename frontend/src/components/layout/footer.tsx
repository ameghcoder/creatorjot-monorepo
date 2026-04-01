import Link from 'next/link';
import { LogoIcon, LogoText } from './logo';

export default function Footer() {
    return (
        <footer className="border-t border-border px-6 py-12 mt-auto bg-background relative z-10 w-full">
            <div className="max-w-7xl mx-auto flex flex-col items-center gap-8">
                <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground font-medium">
                    <Link href="/how-it-works" className="hover:text-foreground transition-colors">How it Works</Link>
                    <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
                    <Link href="/faq" className="hover:text-foreground transition-colors">FAQ</Link>
                    <Link href="/about" className="hover:text-foreground transition-colors">About Us</Link>
                    <Link href="/contact-us" className="hover:text-foreground transition-colors">Contact</Link>
                    <Link href="/refund-policy" className="hover:text-foreground transition-colors">Refund Policy</Link>
                    <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                    <Link href="/support" className="hover:text-foreground transition-colors">Help & Support</Link>
                    <Link href="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link>
                </div>

                <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Link href="/" className="flex flex-col items-center gap-2.5 group">
                            <LogoIcon className='size-14 md:size-16' />
                            <LogoText />
                        </Link>
                    </div>
                    <p className="text-center text-xs text-muted-foreground/60">
                        © {new Date().getFullYear()} CreatorJot. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
}
