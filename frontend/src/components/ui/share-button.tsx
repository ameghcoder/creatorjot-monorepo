'use client'

import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ShareButtonProps {
    platform: string
    text: string
    variant?: 'ghost' | 'outline'
    className?: string
}

export function ShareButton({ platform, text, variant = 'ghost', className }: ShareButtonProps) {
    async function handleShare() {
        const encoded = encodeURIComponent(text)

        // Web Share API (Mobile & some desktop browsers)
        if (navigator.share) {
            try {
                await navigator.share({ text })
                return
            } catch (err) {
                // Ignore AbortError when user cancels share dialog
                if ((err as Error).name !== 'AbortError') {
                    console.error('Error sharing:', err)
                }
                return
            }
        }

        // Fallback for desktop browsers without Web Share API
        let url = ''
        if (platform === 'x') {
            url = `https://twitter.com/intent/tweet?text=${encoded}`
        } else if (platform === 'tumblr') {
            url = `https://www.tumblr.com/widgets/share/tool?posttype=text&content=${encoded}`
        } else if (platform === 'email') {
            url = `mailto:?body=${encoded}`
        } else if (platform === 'linkedin' || platform === 'facebook') {
            navigator.clipboard.writeText(text)
            toast.success(`Text copied! Opening ${platform}...`)
            url = platform === 'linkedin' ? 'https://www.linkedin.com/feed/' : 'https://www.facebook.com/'
            setTimeout(() => window.open(url, '_blank', 'noopener,noreferrer'), 1500)
            return
        }

        if (url) {
            window.open(url, '_blank', 'noopener,noreferrer')
        } else {
            // Ultimate fallback
            await navigator.clipboard.writeText(text)
            toast.success('Copied to clipboard to share manually')
        }
    }

    if (variant === 'outline') {
        return (
            <button
                onClick={handleShare}
                className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg border border-border bg-foreground/3 px-3 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-foreground/6 hover:text-foreground transition-all cursor-pointer',
                    className
                )}
            >
                <Share2 className="size-3.5" />
                Share
            </button>
        )
    }

    return (
        <button
            onClick={handleShare}
            className={cn(
                'flex items-center gap-1.5 text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer',
                className
            )}
        >
            <Share2 className="size-3.5" />
            Share
        </button>
    )
}
