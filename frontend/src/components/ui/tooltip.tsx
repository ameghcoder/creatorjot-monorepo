"use client"

import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Kbd } from "./kbd"

// --- Context ---
interface TooltipContextValue {
    variant?: "default" | "outline" | "glass"
    size?: "sm" | "md" | "lg"
}

const TooltipContext = React.createContext<TooltipContextValue>({})

/**
 * Global provider for Tooltips. Usually placed in the root layout.
 */
const TooltipProvider = TooltipPrimitive.Provider

/**
 * The Root component for a Tooltip.
 * If you haven't wrapped your app in TooltipProvider, this component
 * still behaves as a single-instance provider for convenience.
 */
const Tooltip = ({
    children,
    variant = "default",
    size = "md",
    delayDuration = 200,
    skipDelayDuration,
    disableHoverableContent,
    ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root> &
    TooltipContextValue & {
        delayDuration?: number
        skipDelayDuration?: number
        disableHoverableContent?: boolean
    }) => {
    return (
        <TooltipPrimitive.Provider
            delayDuration={delayDuration}
            skipDelayDuration={skipDelayDuration}
            disableHoverableContent={disableHoverableContent}
        >
            <TooltipPrimitive.Root {...props}>
                <TooltipContext.Provider value={{ variant, size }}>
                    {children}
                </TooltipContext.Provider>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    )
}

const TooltipTrigger = TooltipPrimitive.Trigger
const TooltipPortal = TooltipPrimitive.Portal

const tooltipVariants = cva(
    "z-50 overflow-hidden rounded-lg border shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 selection:bg-primary selection:text-primary-foreground",
    {
        variants: {
            variant: {
                default: "bg-primary text-primary-foreground border-primary",
                outline: "bg-background border-border text-foreground",
                glass: "bg-foreground/10 backdrop-blur-md border-border/50 text-foreground shadow-xl supports-[backdrop-filter]:bg-background/60",
            },
            size: {
                sm: "px-2 py-1 text-[10px]",
                md: "px-3 py-1.5 text-xs",
                lg: "px-4 py-2 text-sm",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
        },
    }
)

export interface TooltipContentProps
    extends React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>,
    VariantProps<typeof tooltipVariants> {
    showArrow?: boolean
}

const TooltipContent = React.forwardRef<
    React.ComponentRef<typeof TooltipPrimitive.Content>,
    TooltipContentProps
>(({ className, variant: propsVariant, size: propsSize, sideOffset = 4, showArrow, children, ...props }, ref) => {
    const context = React.useContext(TooltipContext)

    const variant = propsVariant || context.variant || "default"
    const size = propsSize || context.size || "md"

    return (
        <TooltipPrimitive.Content
            ref={ref}
            sideOffset={sideOffset}
            className={cn(tooltipVariants({ variant, size }), className)}
            {...props}
        >
            <div className="flex flex-col gap-1 max-w-[280px]">
                {children}
            </div>

            {showArrow && (
                <TooltipPrimitive.Arrow
                    className={cn(
                        "fill-current",
                        variant === "default" && "text-primary",
                        variant === "outline" && "text-background stroke-border",
                        variant === "glass" && "text-background/70"
                    )}
                />
            )}
        </TooltipPrimitive.Content>
    )
})
TooltipContent.displayName = TooltipPrimitive.Content.displayName

const TooltipHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("font-bold tracking-tight leading-none mb-0.5", className)} {...props} />
)

const TooltipDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => {
    const { variant } = React.useContext(TooltipContext)
    return (
        <p
            className={cn(
                "font-normal leading-snug",
                variant === "default" ? "opacity-85" : "text-muted-foreground",
                className
            )}
            {...props}
        />
    )
}

const TooltipShortcut = ({ className, keys, ...props }: React.ComponentPropsWithoutRef<typeof Kbd>) => {
    const { variant } = React.useContext(TooltipContext)

    const getKbdClassName = () => {
        if (variant === "default") return "bg-primary-foreground/20 border-primary-foreground/30 text-primary-foreground"
        return ""
    }

    return (
        <Kbd
            keys={keys}
            variant="ghost"
            size="sm"
            className={cn(
                "ml-auto h-5 min-h-0 py-0 text-[10px] font-medium border-none",
                getKbdClassName(),
                className
            )}
            {...props}
        />
    )
}

export {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
    TooltipPortal,
    TooltipProvider,
    TooltipHeader,
    TooltipDescription,
    TooltipShortcut
}
