"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useFyskConfig, type FyskIconPosition } from "@/components/fysk-provider"
import { useFyskAnimation } from "@/hooks/useFyskAnimation"

const badgeVariants = cva(
    "inline-flex items-center rounded-full border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-semibold whitespace-nowrap gap-1.5",
    {
        variants: {
            variant: {
                default: "border-transparent bg-primary text-primary-foreground hover:opacity-80 shadow-xs",
                secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
                outline: "text-foreground border-border",
                ghost: "text-foreground border-transparent bg-transparent hover:bg-muted/50",
                destructive: "border-transparent bg-destructive text-destructive-foreground hover:opacity-80 shadow-xs",

                glass: "bg-foreground/10 backdrop-blur-md border-border/50 text-foreground shadow-xs",
                success: "border-transparent bg-green-600 text-white hover:bg-green-600/80 shadow-xs",
                warning: "border-transparent bg-yellow-600 text-white hover:bg-yellow-600/80 shadow-xs",
                info: "border-transparent bg-blue-600 text-white hover:bg-blue-600/80 shadow-xs",
            },
            size: {
                xs: "px-1.5 py-0 text-[9px] gap-1",
                sm: "px-2 py-0 text-[10px]",
                md: "px-2.5 py-0.5 text-xs",
                lg: "px-3 py-1 text-sm",
                xl: "px-4 py-1.5 text-base gap-2",
            },
            badgeStyle: {
                native: "",
                modern: "",
            }
        },
        compoundVariants: [
            {
                variant: "success",
                badgeStyle: "modern",
                className: "bg-green-500/15 border-green-500/30 text-green-700 dark:text-green-400 hover:bg-green-500/25 opacity-100",
            },
            {
                variant: "destructive",
                badgeStyle: "modern",
                className: "bg-destructive/15 border-destructive/30 text-destructive hover:bg-destructive/25 opacity-100",
            },
            {
                variant: "warning",
                badgeStyle: "modern",
                className: "bg-yellow-500/15 border-yellow-500/30 text-yellow-700 dark:text-yellow-400 hover:bg-yellow-500/25 opacity-100",
            },
            {
                variant: "info",
                badgeStyle: "modern",
                className: "bg-blue-500/15 border-blue-500/30 text-blue-700 dark:text-blue-400 hover:bg-blue-500/25 opacity-100",
            },
            {
                variant: "default",
                badgeStyle: "modern",
                className: "bg-primary/10 border-primary/20 text-primary hover:bg-primary/20 opacity-100",
            },
        ],
        defaultVariants: {
            variant: "default",
            size: "md",
            badgeStyle: "native",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
    dot?: boolean
    dotBlink?: boolean
    state?: "idle" | "loading" | "success" | "error"
    icon?: React.ReactNode
    iconLoading?: React.ReactNode
    iconSuccess?: React.ReactNode
    iconError?: React.ReactNode
    iconPosition?: FyskIconPosition
}

function Badge({
    className,
    variant,
    size,
    badgeStyle,
    dot = false,
    dotBlink = true,
    state = "idle",
    icon,
    iconLoading: propIconLoading,
    iconSuccess: propIconSuccess,
    iconError: propIconError,
    iconPosition: propIconPosition,
    children,
    ...props
}: BadgeProps) {
    const config = useFyskConfig()
    const { isEnabled, motion, AnimatePresence, transitions, variants } = useFyskAnimation()

    const isLoading = state === "loading"
    const isSuccess = state === "success"
    const isError = state === "error"

    const activeIconPosition = propIconPosition || config.iconPosition || "start"
    const finalIconLoading = propIconLoading || config.icons?.loading
    const finalIconSuccess = propIconSuccess || config.icons?.success
    const finalIconError = propIconError || config.icons?.error

    const currentIcon = isLoading ? finalIconLoading : isSuccess ? finalIconSuccess : isError ? finalIconError : icon

    const MotionDiv = isEnabled && motion ? motion.div : "div"

    return (
        <MotionDiv
            className={cn(
                badgeVariants({ variant, size, badgeStyle }),
                activeIconPosition === "end" && "flex-row-reverse",
                className
            )}
            {...(isEnabled && motion ? {
                layout: true,
                transition: transitions?.layout
            } : {})}
            {...props}
        >
            <AnimatePresence {...(isEnabled && motion ? { mode: "wait", initial: false } : {})}>
                <MotionDiv
                    key={state + (currentIcon ? "icon" : "dot")}
                    className="flex items-center gap-1.5"
                    {...(isEnabled && motion && variants ? {
                        ...variants.scaleIn,
                    } : {})}
                >
                    {currentIcon ? (
                        <span className={cn(
                            "inline-flex shrink-0",
                            size === "xs" && "[&_svg]:size-2.5",
                            size === "sm" && "[&_svg]:size-3",
                            size === "md" && "[&_svg]:size-3.5",
                            size === "lg" && "[&_svg]:size-4",
                            size === "xl" && "[&_svg]:size-5",
                        )}>
                            {currentIcon}
                        </span>
                    ) : dot ? (
                        <span
                            className={cn(
                                "h-1.5 w-1.5 rounded-full bg-current shrink-0",
                                size === "xs" && "h-1 w-1",
                                dotBlink && (isEnabled ? "animate-pulse" : "animate-blink")
                            )}
                        />
                    ) : null}
                </MotionDiv>
            </AnimatePresence>
            {children}
        </MotionDiv>
    )
}

export { Badge, badgeVariants }