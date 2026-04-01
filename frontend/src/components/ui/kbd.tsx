"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const kbdVariants = cva(
    "inline-flex items-center justify-center gap-1 font-mono font-medium select-none transition-all duration-150",
    {
        variants: {
            variant: {
                default: "bg-muted border border-border text-muted-foreground shadow-sm",
                outline: "bg-transparent border-2 border-border text-foreground hover:border-primary/50",
                solid: "bg-foreground text-background border border-foreground shadow-md",
                ghost: "bg-transparent text-muted-foreground",
                glass: "bg-background/20 backdrop-blur-sm border border-border/50 text-foreground shadow-lg",
                mac: "bg-gradient-to-b from-muted to-muted/80 border border-border text-foreground shadow-md hover:shadow-lg",
                modern: "bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20 text-primary shadow backdrop-blur-sm",
            },
            size: {
                xs: "h-4 px-1 text-[9px] rounded-[2px] gap-0.5",
                sm: "h-5 px-1.5 text-[10px] rounded-sm gap-0.5",
                md: "h-6 px-2 text-xs rounded-md gap-1",
                lg: "h-8 px-3 text-sm rounded-lg gap-1.5",
                xl: "h-10 px-4 text-base rounded-xl gap-2",
            },
            state: {
                idle: "",
                active: "ring-2 ring-primary ring-offset-2 ring-offset-background scale-105",
                disabled: "opacity-50 cursor-not-allowed",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
            state: "idle",
        },
    }
)

// Platform detection helper
const getPlatform = (): "mac" | "windows" | "linux" => {
    if (typeof window === "undefined") return "windows"
    const userAgent = window.navigator.userAgent.toLowerCase()
    if (userAgent.includes("mac")) return "mac"
    if (userAgent.includes("linux")) return "linux"
    return "windows"
}

// Special key symbols mapping
const keySymbols: Record<string, { mac: string; windows: string; icon?: string }> = {
    mod: { mac: "⌘", windows: "Ctrl" },
    cmd: { mac: "⌘", windows: "Ctrl" },
    command: { mac: "⌘", windows: "Ctrl" },
    ctrl: { mac: "⌃", windows: "Ctrl" },
    control: { mac: "⌃", windows: "Ctrl" },
    shift: { mac: "⇧", windows: "Shift" },
    alt: { mac: "⌥", windows: "Alt" },
    option: { mac: "⌥", windows: "Alt" },
    enter: { mac: "↵", windows: "Enter" },
    return: { mac: "↵", windows: "Enter" },
    delete: { mac: "⌫", windows: "Del" },
    backspace: { mac: "⌫", windows: "Backspace" },
    escape: { mac: "⎋", windows: "Esc" },
    esc: { mac: "⎋", windows: "Esc" },
    tab: { mac: "⇥", windows: "Tab" },
    capslock: { mac: "⇪", windows: "Caps" },
    up: { mac: "↑", windows: "↑" },
    down: { mac: "↓", windows: "↓" },
    left: { mac: "←", windows: "←" },
    right: { mac: "→", windows: "→" },
    space: { mac: "␣", windows: "Space" },
}

export interface KbdProps extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof kbdVariants> {
    /**
     * Array of keys to display (e.g., ['Cmd', 'Shift', 'P'])
     */
    keys?: string[]
    /**
     * Separator between keys (default: '+')
     */
    separator?: string
    /**
     * Platform to use for key display ('mac' | 'windows' | 'linux' | 'auto')
     * 'auto' will detect the user's platform
     */
    platform?: "mac" | "windows" | "linux" | "auto"
    /**
     * Icon to display alongside the key
     */
    icon?: React.ReactNode
    /**
     * Position of the icon
     */
    iconPosition?: "start" | "end"
    /**
     * Whether the key is currently active/pressed
     */
    active?: boolean
    /**
     * Whether the key is disabled
     */
    disabled?: boolean
    /**
     * Enable click to copy functionality
     */
    copyable?: boolean
    /**
     * Callback when the kbd text is copied to clipboard
     */
    onCopyText?: (text: string) => void
}

const Kbd = React.forwardRef<HTMLElement, KbdProps>(
    (
        {
            className,
            variant,
            size,
            state,
            keys,
            separator = "+",
            platform = "auto",
            icon,
            iconPosition = "start",
            active,
            disabled,
            copyable,
            onCopyText,
            children,
            onClick,
            ...props
        },
        ref
    ) => {
        const detectedPlatform = platform === "auto" ? getPlatform() : platform
        const [copied, setCopied] = React.useState(false)
        const [isPressed, setIsPressed] = React.useState(false)

        // Determine the actual state
        const actualState = disabled ? "disabled" : active || isPressed ? "active" : state || "idle"

        // Format keys with platform-specific symbols
        const formatKey = (key: string): string => {
            const lowerKey = key.toLowerCase()
            const symbol = keySymbols[lowerKey]
            if (symbol) {
                return detectedPlatform === "mac" ? symbol.mac : symbol.windows
            }
            return key
        }

        // Build the display content
        let displayContent: React.ReactNode = children
        if (keys && keys.length > 0) {
            displayContent = keys.map((key, index) => (
                <React.Fragment key={index}>
                    {index > 0 && (
                        <span className="opacity-50 text-[0.7em] px-0.5">{separator}</span>
                    )}
                    <span>{formatKey(key)}</span>
                </React.Fragment>
            ))
        }

        // Get text for copying
        const getCopyText = (): string => {
            if (keys && keys.length > 0) {
                return keys.map(formatKey).join(separator)
            }
            if (typeof children === "string") {
                return children
            }
            return ""
        }

        // Handle copy functionality
        const handleClick = async (e: React.MouseEvent<HTMLElement>) => {
            if (copyable && !disabled) {
                const text = getCopyText()
                try {
                    await navigator.clipboard.writeText(text)
                    setCopied(true)
                    setIsPressed(true)
                    onCopyText?.(text)
                    setTimeout(() => {
                        setCopied(false)
                        setIsPressed(false)
                    }, 1000)
                } catch (err) {
                    console.error("Failed to copy:", err)
                }
            }
            onClick?.(e)
        }

        return (
            <kbd
                ref={ref}
                className={cn(
                    kbdVariants({ variant, size, state: actualState }),
                    copyable && !disabled && "cursor-pointer hover:scale-105 active:scale-95",
                    copied && "ring-2 ring-green-500 ring-offset-2",
                    className
                )}
                onClick={handleClick}
                aria-label={props["aria-label"] || getCopyText()}
                {...props}
            >
                {icon && iconPosition === "start" && (
                    <span className="inline-flex items-center">{icon}</span>
                )}
                {displayContent}
                {icon && iconPosition === "end" && (
                    <span className="inline-flex items-center">{icon}</span>
                )}
            </kbd>
        )
    }
)
Kbd.displayName = "Kbd"

// KbdGroup component for displaying multiple related shortcuts
export interface KbdGroupProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Separator between Kbd elements
     */
    separator?: React.ReactNode
}

const KbdGroup = React.forwardRef<HTMLDivElement, KbdGroupProps>(
    ({ className, separator, children, ...props }, ref) => {
        const childArray = React.Children.toArray(children)

        return (
            <div
                ref={ref}
                className={cn("inline-flex items-center gap-1", className)}
                {...props}
            >
                {childArray.map((child, index) => (
                    <React.Fragment key={index}>
                        {index > 0 && (
                            <span className="text-muted-foreground text-xs opacity-70">
                                {separator || "+"}
                            </span>
                        )}
                        {child}
                    </React.Fragment>
                ))}
            </div>
        )
    }
)
KbdGroup.displayName = "KbdGroup"

export { Kbd, KbdGroup, kbdVariants }

