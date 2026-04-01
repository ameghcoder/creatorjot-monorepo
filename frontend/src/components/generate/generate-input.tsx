'use client'

import { useState, useEffect, type FormEvent } from 'react'
import {
    Link2,
    ArrowRight,
    Loader2,
    Globe,
    MessageSquareText,
    FileText,
    Youtube,
    Mail,
    BookOpen,
    Newspaper,
    Zap,
    Briefcase,
    Swords,
    BookOpenText,
    ChevronDown,
    ListFilter,
    Wand2,
    Star,
    TvMinimal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { TONE_PRESET_CONFIGS, GENERATION_CREDIT_COSTS } from '@creatorjot/shared'
import type { TonePreset } from '@creatorjot/shared'

/* ── Icon map for platforms ── */
const PLATFORM_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    x: MessageSquareText,
    linkedin: Globe,
    blog: BookOpen,
    yt_community_post: Youtube,
    facebook: Newspaper,
    tumblr: FileText,
    email: Mail,
}

/* ── Icon map for tone presets ── */
const TONE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    viral: Zap,
    professional: Briefcase,
    contrarian: Swords,
    story: BookOpenText,
    minimal: TvMinimal,
}

/* ── YouTube URL regex ── */
const YT_REGEX = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/

/* ── Props ── */
export interface GenerateInputProps {
    /** Called when the form is submitted with valid data */
    onSubmit: (data: {
        url: string
        platforms: string[]
        tonePreset: TonePreset | null
        selectedHookIndex?: number
    }) => void | Promise<void>
    /** Whether the form is in a loading/submitting state */
    loading?: boolean
    /** Disable the form */
    disabled?: boolean
    /** If provided, renders a compact view targeting this URL */
    hiddenUrl?: string
    /** Passed along to backend if hook is preselected */
    selectedHookIndex?: number
    /** To show user which hook is selected */
    selectedHookText?: string
}

export default function GenerateInput({ onSubmit, loading = false, disabled = false, hiddenUrl, selectedHookIndex, selectedHookText }: GenerateInputProps) {
    const [url, setUrl] = useState(hiddenUrl || '')
    const [selectedPlatforms, setSelectedPlatforms] = useState<Set<string>>(
        new Set(['x:short'])
    )
    const [selectedTone, setSelectedTone] = useState<TonePreset | null>('viral')
    const [userTier, setUserTier] = useState<'free' | 'pro'>('pro')

    function formatPlatformKey(key: string) {
        if (key === 'linkedin') return 'LinkedIn'
        if (key.startsWith('x:')) {
            const format = key.split(':')[1]
            return `X (${format.charAt(0).toUpperCase() + format.slice(1)})`
        }
        return key
    }

    // Just checking tier on mount to disable pro platforms visually
    useEffect(() => {
        fetch('/api/check-quota')
            .then(r => r.json())
            .then(d => {
                if (d.plan?.planType === 'free') setUserTier('free')
            })
            .catch(() => { })
    }, [])

    function togglePlatform(id: string) {
        setSelectedPlatforms((prev) => {
            const next = new Set(prev)
            if (next.has(id)) {
                if (next.size === 1) return prev // keep at least 1
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    function selectTone(id: TonePreset) {
        setSelectedTone((prev) => (prev === id ? null : id))
    }

    async function handleSubmit(e: FormEvent<HTMLFormElement>) {
        e.preventDefault()
        const targetUrl = hiddenUrl || url
        if (!targetUrl.trim() || loading || disabled) return

        await onSubmit({
            url: targetUrl.trim(),
            platforms: Array.from(selectedPlatforms),
            tonePreset: selectedTone,
            selectedHookIndex
            // selectedHookIndex is injected by the parent via onSubmit wrapper
        })
    }

    const isValidUrl = YT_REGEX.test(url.trim())

    /* ── Selected tone config utility ── */
    const selectedToneConfig = selectedTone ? TONE_PRESET_CONFIGS.find(t => t.id === selectedTone) : undefined

    /* ── Compact UI if URL is hidden ── */
    if (hiddenUrl) {
        return (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3.5 bg-card/60 backdrop-blur-md border border-border rounded-xl shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
                <div className="flex flex-wrap items-center gap-2">
                    {/* Platform Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loading || disabled}
                                className="h-8 rounded-full border-border/60 bg-foreground/2 text-muted-foreground hover:text-foreground text-[11px] gap-1.5"
                            >
                                <ListFilter className="size-3.5 opacity-70" />
                                <span>Platforms</span>
                                {selectedPlatforms.size > 0 && (
                                    <span className="flex items-center justify-center bg-foreground/10 text-foreground w-4 h-4 rounded-full text-[9px] font-medium ml-0.5">
                                        {selectedPlatforms.size}
                                    </span>
                                )}
                                <ChevronDown className="size-3 opacity-50 ml-0.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[220px]">
                            <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider py-1.5 px-2">
                                Toggle Platforms
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {Object.entries(GENERATION_CREDIT_COSTS).map(([pKey, cost]) => {
                                const baseConfigId = pKey.split(':')[0]
                                const Icon = PLATFORM_ICONS[baseConfigId] ?? FileText
                                const isFreePlatform = pKey === 'x:short'
                                const isProRequiredAndLocked = userTier === 'free' && !isFreePlatform

                                return (
                                    <DropdownMenuCheckboxItem
                                        key={pKey}
                                        checked={selectedPlatforms.has(pKey)}
                                        onCheckedChange={() => {
                                            if (isProRequiredAndLocked) return // blocked
                                            togglePlatform(pKey)
                                        }}
                                        disabled={isProRequiredAndLocked}
                                        className={cn("text-[12px] gap-2 py-2.5", isProRequiredAndLocked ? 'opacity-50' : 'cursor-pointer')}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <div className="flex items-center gap-2">
                                                <Icon className="size-3.5 opacity-60 text-muted-foreground" />
                                                <span>{formatPlatformKey(pKey)}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5 ml-3">
                                                {!isFreePlatform && (
                                                    <Star className="size-3 fill-amber-400 text-amber-500" />
                                                )}
                                                <span className="text-[10px] text-muted-foreground/50 border border-muted-foreground/10 bg-foreground/5 px-1.5 rounded uppercase font-medium tracking-wide">
                                                    {cost} CR
                                                </span>
                                            </div>
                                        </div>
                                    </DropdownMenuCheckboxItem>
                                )
                            })}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Tone Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={loading || disabled}
                                className="h-8 rounded-full border-border/60 bg-foreground/2 text-muted-foreground hover:text-foreground text-[11px] gap-1.5"
                            >
                                <Wand2 className="size-3.5 opacity-70" />
                                <span>{selectedToneConfig ? selectedToneConfig.label : 'Tone'}</span>
                                <ChevronDown className="size-3 opacity-50 ml-0.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-[200px]">
                            <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider py-1.5 px-2">
                                Select Tone
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup
                                value={selectedTone ?? undefined}
                                onValueChange={(val) => selectTone(val as TonePreset)}
                            >
                                {TONE_PRESET_CONFIGS.map((t) => {
                                    const Icon = TONE_ICONS[t.id] ?? Zap
                                    return (
                                        <DropdownMenuRadioItem
                                            key={t.id}
                                            value={t.id}
                                            className="text-[12px] gap-2 py-2 cursor-pointer"
                                        >
                                            <Icon className="size-3.5 opacity-60 text-muted-foreground" />
                                            <span>{t.label}</span>
                                        </DropdownMenuRadioItem>
                                    )
                                })}
                            </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Selected Hook Snippet */}
                    {selectedHookText && (
                        <div className="ml-2 px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[11px] font-medium flex items-center gap-1.5 max-w-[200px]">
                            <span className="shrink-0">Hook:</span>
                            <span className="truncate">{selectedHookText}</span>
                        </div>
                    )}
                </div>

                <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    className="shrink-0 cursor-pointer h-9 rounded-lg font-medium shadow-md shadow-primary/20 hover:shadow-primary/30 transition-all text-xs"
                    icon={
                        loading ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <ArrowRight className="size-3.5" />
                        )
                    }
                    iconPosition="end"
                    disabled={loading || disabled || !hiddenUrl.trim()}
                >
                    {loading ? 'Processing…' : 'Generate'}
                </Button>
            </form>
        )
    }

    /* ── Footer content: clean dropdowns ── */
    const footerContent = (
        <div className="flex items-center gap-2 w-full pt-1.5">
            {/* Platform Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={loading || disabled}
                        className="h-8 rounded-full border-border/60 bg-foreground/2 text-muted-foreground hover:text-foreground text-[11px] gap-1.5"
                    >
                        <ListFilter className="size-3.5 opacity-70" />
                        <span>Platforms</span>
                        {selectedPlatforms.size > 0 && (
                            <span className="flex items-center justify-center bg-foreground/10 text-foreground w-4 h-4 rounded-full text-[9px] font-medium ml-0.5">
                                {selectedPlatforms.size}
                            </span>
                        )}
                        <ChevronDown className="size-3 opacity-50 ml-0.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[220px]">
                    <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider py-1.5 px-2">
                        Toggle Platforms
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {Object.entries(GENERATION_CREDIT_COSTS).map(([pKey, cost]) => {
                        const baseConfigId = pKey.split(':')[0]
                        const Icon = PLATFORM_ICONS[baseConfigId] ?? FileText
                        const isFreePlatform = pKey === 'x:short'
                        const isProRequiredAndLocked = userTier === 'free' && !isFreePlatform

                        return (
                            <DropdownMenuCheckboxItem
                                key={pKey}
                                checked={selectedPlatforms.has(pKey)}
                                onCheckedChange={() => {
                                    if (isProRequiredAndLocked) return // blocked
                                    togglePlatform(pKey)
                                }}
                                disabled={isProRequiredAndLocked}
                                className={cn("text-[12px] gap-2 py-2.5", isProRequiredAndLocked ? 'opacity-50' : 'cursor-pointer')}
                            >
                                <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                        <Icon className="size-3.5 opacity-60 text-muted-foreground" />
                                        <span>{formatPlatformKey(pKey)}</span>
                                    </div>
                                    <div className="flex items-center gap-1.5 ml-3">
                                        {!isFreePlatform && (
                                            <Star className="size-3 fill-amber-400 text-amber-500" />
                                        )}
                                        <span className="text-[10px] text-muted-foreground/50 border border-muted-foreground/10 bg-foreground/5 px-1.5 rounded uppercase font-medium tracking-wide">
                                            {cost} CR
                                        </span>
                                    </div>
                                </div>
                            </DropdownMenuCheckboxItem>
                        )
                    })}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Tone Dropdown */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={loading || disabled}
                        className="h-8 rounded-full border-border/60 bg-foreground/2 text-muted-foreground hover:text-foreground text-[11px] gap-1.5"
                    >
                        <Wand2 className="size-3.5 opacity-70" />
                        <span>{selectedToneConfig ? selectedToneConfig.label : 'Tone'}</span>
                        <ChevronDown className="size-3 opacity-50 ml-0.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[200px]">
                    <DropdownMenuLabel className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider py-1.5 px-2">
                        Select Tone
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuRadioGroup
                        value={selectedTone ?? undefined}
                        onValueChange={(val) => selectTone(val as TonePreset)}
                    >
                        {TONE_PRESET_CONFIGS.map((t) => {
                            const Icon = TONE_ICONS[t.id] ?? Zap
                            return (
                                <DropdownMenuRadioItem
                                    key={t.id}
                                    value={t.id}
                                    className="text-[12px] gap-2 py-2 cursor-pointer"
                                >
                                    <Icon className="size-3.5 opacity-60 text-muted-foreground" />
                                    <span>{t.label}</span>
                                </DropdownMenuRadioItem>
                            )
                        })}
                    </DropdownMenuRadioGroup>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )

    return (
        <form onSubmit={handleSubmit}>
            <div>
                <div className="h-px bg-linear-to-r from-transparent via-foreground/10 to-transparent" />

                <Textarea
                    placeholder="Paste a YouTube URL — https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    variant="secondary"
                    size="md"
                    disabled={loading || disabled}
                    className="text-[14px] pt-2"
                    left={
                        <div className='w-4 flex items-center justify-center'>
                            <Link2 className="size-3.5 text-foreground/50" />
                        </div>
                    }
                    right={
                        <Button
                            type="submit"
                            variant="default"
                            size="sm"
                            className="shrink-0 cursor-pointer rounded-lg h-8"
                            icon={
                                loading ? (
                                    <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                    <ArrowRight className="size-3.5" />
                                )
                            }
                            iconPosition="end"
                            disabled={loading || disabled || !url.trim() || !isValidUrl}
                        >
                            {loading ? 'Processing…' : 'Generate'}
                        </Button>
                    }
                    footer={footerContent}
                    footerClassName="border-t border-border/10"
                />
            </div>
        </form>
    )
}
