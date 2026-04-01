"use client"
import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useFyskConfig, type FyskIconPosition } from "@/components/fysk-provider"
import { useFyskAnimation } from "@/hooks/useFyskAnimation"

const buttonVariants = cva(
    "focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 rounded-lg border border-transparent bg-clip-padding text-sm font-medium focus-visible:ring-[3px] aria-invalid:ring-[3px] [&_svg:not([class*='size-'])]:size-4 inline-flex items-center justify-center whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none shrink-0 [&_svg]:shrink-0 outline-none group/button select-none overflow-hidden active:scale-95",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs",
                outline: "border-border bg-background hover:bg-muted hover:text-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50 aria-expanded:bg-muted aria-expanded:text-foreground",
                secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
                ghost: "hover:bg-muted hover:text-foreground dark:hover:bg-muted/50 aria-expanded:bg-muted aria-expanded:text-foreground",
                destructive: "bg-destructive text-destructive-foreground shadow-xs hover:bg-destructive/90",
                link: "text-primary underline-offset-4 hover:underline",

                glass: "bg-foreground/10 backdrop-blur-md border-border/50 text-foreground hover:bg-foreground/15 shadow-xs",
                success: "bg-green-600 text-white hover:bg-green-600/90 shadow-xs",
                warning: "bg-yellow-600 text-white hover:bg-yellow-600/90 shadow-xs",
                info: "bg-blue-600 text-white hover:bg-blue-600/90 shadow-xs",

                "success-outline": "bg-green-500/10 border border-green-500/50 text-green-700 dark:text-green-400 hover:bg-green-500/20 shadow-xs",
                "warning-outline": "bg-yellow-500/10 border border-yellow-500/50 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/20 shadow-xs",
                "info-outline": "bg-blue-500/10 border border-blue-500/50 text-blue-700 dark:text-blue-400 hover:bg-blue-500/20 shadow-xs",
                "destructive-outline": "bg-destructive/10 border border-destructive/50 text-destructive hover:bg-destructive/20 shadow-xs",
            },
            size: {
                default: "h-8 gap-1.5 px-2.5 data-[icon-position=end]:pr-2 data-[icon-position=start]:pl-2",
                xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg data-[icon-position=end]:pr-1.5 data-[icon-position=start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
                sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg data-[icon-position=end]:pr-1.5 data-[icon-position=start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
                md: "h-8 gap-1.5 px-3 data-[icon-position=end]:pr-2.5 data-[icon-position=start]:pl-2.5",
                lg: "h-9 gap-1.5 px-3 data-[icon-position=end]:pr-3 data-[icon-position=start]:pl-3",
                xl: "h-10 gap-2 px-5 text-base data-[icon-position=end]:pr-4 data-[icon-position=start]:pl-4",
                icon: "size-8",
                "icon-xs": "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
                "icon-sm": "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3.5",
                "icon-lg": "size-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    autoStateVariant?: boolean
    asChild?: boolean
    state?: "idle" | "loading" | "success" | "error"
    compForDark?: boolean
    loadingText?: string
    successText?: string
    errorText?: string
    icon?: React.ReactNode
    iconLoading?: React.ReactNode
    iconSuccess?: React.ReactNode
    iconError?: React.ReactNode
    iconPosition?: FyskIconPosition
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            compForDark,
            autoStateVariant = false,
            variant = "default",
            size = "md",
            asChild = false,
            state = "idle",
            loadingText,
            successText,
            errorText,
            icon,
            iconLoading: propIconLoading,
            iconSuccess: propIconSuccess,
            iconError: propIconError,
            iconPosition: propIconPosition,
            children,
            ...props
        },
        ref
    ) => {
        const config = useFyskConfig()
        const { isEnabled, motion, AnimatePresence, transitions, variants } = useFyskAnimation()

        const isLoading = state === "loading"
        const isSuccess = state === "success"
        const isError = state === "error"

        const activeIconPosition = propIconPosition || config.iconPosition || "start"

        const finalIconLoading = propIconLoading || config.icons?.loading
        const finalIconSuccess = propIconSuccess || config.icons?.success
        const finalIconError = propIconError || config.icons?.error

        // Icon Size Detection
        const isIconSize = size?.toString().startsWith("icon")

        // Content Logic
        // For icon sizes, we treat children as the icon if no icon prop is provided.
        // We also don't render text in icon-sizes to maintain the square aspect ratio.
        const idleIcon = isIconSize ? (icon || children) : icon
        const idleText = isIconSize ? null : children

        const activeIcon = isLoading ? finalIconLoading : isSuccess ? finalIconSuccess : isError ? finalIconError : idleIcon
        const activeText = isLoading ? (loadingText || children) : isSuccess ? (successText || children) : isError ? (errorText || children) : idleText

        const MotionButton = isEnabled && motion ? motion.button : "button"
        const Comp = asChild ? Slot : (MotionButton as any)
        const MotionSpan = isEnabled && motion ? motion.span : "span"

        // Final variant based on the state
        variant = autoStateVariant ? isSuccess ? "success-outline" : isError ? "destructive-outline" : variant : variant;

        return (
            <Comp
                data-slot="button"
                data-variant={variant}
                data-size={size}
                data-icon-position={activeIcon ? activeIconPosition : "none"}
                className={cn(buttonVariants({ variant, size, className }), compForDark ? "border-2 border-primary-foreground/15" : "")}
                ref={ref}
                disabled={isLoading || props.disabled}
                data-state={state}
                {...(isEnabled && motion && !asChild ? {
                    layout: true,
                    transition: transitions?.layoutEnter
                } : {})}
                {...props}
            >
                {asChild ? children : (
                    <AnimatePresence {...(isEnabled && motion ? { mode: "wait", initial: false } : {})}>
                        <MotionSpan
                            key={state}
                            className={cn(
                                "inline-flex items-center justify-center gap-[inherit]",
                                activeIconPosition === "end" && "flex-row-reverse"
                            )}
                            {...(isEnabled && motion && variants ? {
                                layout: true,
                                ...variants.fadeSlide,
                                transition: transitions?.content
                            } : {})}
                        >
                            {activeIcon && (
                                <MotionSpan
                                    className={cn(
                                        "inline-flex shrink-0 items-center justify-center",
                                        // Auto-scale SVGs for standard sizes
                                        !isIconSize && (
                                            size === "xs" ? "[&_svg]:size-3" :
                                                size === "sm" ? "[&_svg]:size-3.5" :
                                                    size === "xl" ? "[&_svg]:size-5" :
                                                        "[&_svg]:size-4"
                                        )
                                    )}
                                    {...(isEnabled && motion && variants ? {
                                        layout: true,
                                        ...variants.iconPop
                                    } : {})}
                                >
                                    {activeIcon}
                                </MotionSpan>
                            )}
                            {!isIconSize && activeText}
                        </MotionSpan>
                    </AnimatePresence>
                )}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
