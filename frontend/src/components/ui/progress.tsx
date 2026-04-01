"use client"

import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cva, type VariantProps } from "class-variance-authority";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFyskConfig } from "@/components/fysk-provider";
import { useFyskAnimation } from "@/hooks/useFyskAnimation";

const progressVariants = cva(
    "relative w-full overflow-hidden bg-secondary transition-all duration-500",
    {
        variants: {
            size: {
                xs: "h-1",
                sm: "h-2",
                md: "h-4",
                lg: "h-6",
                xl: "h-8",
            },
            shape: {
                rounded: "rounded-full",
                square: "rounded-none",
                soft: "rounded-md",
            },
            variant: {
                default: "",
                gradient: "",
                striped: "",
                glow: "",
                glass: "backdrop-blur-sm bg-background/20 border border-border/50",
                neon: "shadow-lg",
            },
            state: {
                idle: "bg-secondary",
                loading: "bg-secondary",
                success: "bg-green-500/20",
                error: "bg-destructive/20",
            },
        },
        defaultVariants: {
            size: "md",
            shape: "rounded",
            variant: "default",
            state: "idle",
        },
    }
)

const indicatorVariants = cva(
    "h-full w-full flex-1 transition-all duration-1000",
    {
        variants: {
            variant: {
                default: "bg-primary",
                gradient: "bg-gradient-to-r from-primary via-primary/80 to-primary",
                striped: "bg-primary bg-striped-indicator animate-stripe-move",
                glow: "bg-primary shadow-[0_0_10px_rgba(var(--primary),0.5)]",
                glass: "bg-primary/60 backdrop-blur-sm",
                neon: "bg-gradient-to-r from-primary to-secondary shadow-[0_0_15px_rgba(var(--primary),0.8)]",
            },
            state: {
                idle: "",
                loading: "",
                success: "bg-green-500",
                error: "bg-destructive",
            },
        },
        defaultVariants: {
            variant: "default",
            state: "idle",
        },
    }
)

export interface ProgressSegment {
    value: number
    color?: string
    label?: string
    className?: string
}

export interface ProgressMilestone {
    value: number
    label?: string
    color?: string
}

export interface ProgressProps
    extends Omit<React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>, 'value'>,
    VariantProps<typeof progressVariants> {
    /**
     * Current progress value (0-100)
     */
    value?: number
    /**
     * Buffer/cached value for dual-layer progress (0-100)
     */
    bufferValue?: number
    /**
     * Multiple segments for stacked progress
     */
    segments?: ProgressSegment[]
    /**
     * Show percentage/value text
     */
    showValue?: boolean
    /**
     * Custom label text
     */
    label?: string
    /**
     * Position of the label
     * - "top": Label displayed above the progress bar
     * - "bottom": Label displayed below the progress bar
     * - "inside": Label displayed inside the progress indicator (only visible when value > 15%)
     */
    labelPosition?: "top" | "bottom" | "inside"
    /**
     * Custom value formatter
     */
    formatValue?: (value: number) => string
    /**
     * Striped indicator size : stripe size in pixels
     * Remember to also set variant to "striped" for this to take effect
     * Default: 20
     * Note: Stripe animation distance is automatically derived from stripedIndicatorSize. Don't forgot to check the @keyframes strip-move in your global.css file.
     */
    stripedIndicatorSize?: number
    /**
     * Show indeterminate loading animation (unknown progress)
     * When true, displays an animated bar that moves back and forth
     */
    indeterminate?: boolean
    /**
     * Icon to display next to the value
     * - "auto": Automatically shows appropriate icon based on state (success, error, loading)
     * - ReactNode: Custom icon to display
     */
    icon?: React.ReactNode | "auto"
    /**
     * Milestones to mark on the progress bar
     */
    milestones?: ProgressMilestone[]
    /**
     * Show milestone markers
     */
    showMilestones?: boolean
    /**
     * Enable interactive mode (hover effects, clickable)
     */
    interactive?: boolean
    /**
     * Show tooltip on hover
     */
    showTooltip?: boolean
    /**
     * Custom className for the indicator
     */
    indicatorClassName?: string
    /**
     * Callback when progress bar is clicked
     */
    onProgressClick?: (percentage: number) => void
    /**
     * Custom colors for the gradient variant
     */
    colors?: string[]
    /**
     * Direction of the gradient
     * Default: "to right"
     */
    gradientDirection?:
    | "to top"
    | "to right"
    | "to bottom"
    | "to left"
    | "to top right"
    | "to bottom right"
    | "to bottom left"
    | "to top left"
    | (string & {})
}

// A tiny helper to generate striped background styles
const createStripedBg = (colorVar: string, size = 20, opacity?: number) => ({
    opacity,
    backgroundImage: `linear-gradient(
    45deg,
    var(${colorVar}) 25%,
    transparent 25%,
    transparent 50%,
    var(${colorVar}) 50%,
    var(${colorVar}) 75%,
    transparent 75%,
    transparent
  )`,
    backgroundSize: `${size}px ${size}px`,
    backgroundRepeat: "repeat",
})


const Progress = React.forwardRef<
    React.ComponentRef<typeof ProgressPrimitive.Root>,
    ProgressProps
>(
    (
        {
            value = 0,
            variant,
            size,
            shape,
            state,
            bufferValue,
            label,
            labelPosition = "bottom",
            formatValue,
            showValue,
            icon,
            indeterminate,
            segments,
            milestones,
            showMilestones,
            colors,
            gradientDirection = "to right",
            stripedIndicatorSize = 20,
            interactive,
            showTooltip,
            onProgressClick,
            indicatorClassName,
            className,
            ...props
        },
        ref
    ) => {
        const [hoverValue, setHoverValue] = React.useState<number | null>(null)
        const containerRef = React.useRef<HTMLDivElement>(null)
        const fyskConfig = useFyskConfig();
        const { isEnabled, motion, AnimatePresence } = useFyskAnimation()

        // Generate unique ID for tooltip accessibility
        const tooltipId = React.useId()

        // Auto-determine icon based on state
        const getStateIcon = () => {
            if (icon === "auto") {
                if (state === "success") return fyskConfig.icons?.success || <CheckCircle2 className="h-4 w-4" />
                if (state === "error") return fyskConfig.icons?.error || <XCircle className="h-4 w-4" />
                if (state === "loading" || indeterminate) return fyskConfig.icons?.loading || <Loader2 className="h-4 w-4 animate-spin" />
                return null
            }
            return icon
        }

        const displayIcon = getStateIcon()

        // Format the displayed value
        const formattedValue = formatValue
            ? formatValue(hoverValue ?? value)
            : `${Math.round(hoverValue ?? value)}%`

        // generate striped background styles if needed
        const stripedBg = React.useMemo(() => variant === "striped" ? {
            ...createStripedBg("--color-foreground", stripedIndicatorSize, 0.5),
            ["--stripe-size" as string]: `${stripedIndicatorSize}px`,
        } : undefined, [stripedIndicatorSize, variant])

        // Handle click for interactive mode
        const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
            if (!interactive || !onProgressClick || !containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percentage = Math.round((x / rect.width) * 100)
            onProgressClick(Math.min(100, Math.max(0, percentage)))
        }

        // Handle hover for tooltip
        const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
            if (!showTooltip || !containerRef.current) return

            const rect = containerRef.current.getBoundingClientRect()
            const x = e.clientX - rect.left
            const percentage = Math.round((x / rect.width) * 100)
            setHoverValue(Math.min(100, Math.max(0, percentage)))
        }

        const handleMouseLeave = () => {
            setHoverValue(null)
        }


        return (
            <div className="w-full space-y-2">
                {/* Top Label */}
                {(label || showValue) && labelPosition === "top" && (
                    <div className="flex items-center justify-between text-sm">
                        {label && <span className="text-foreground font-medium">{label}</span>}
                        {showValue && (
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-mono">
                                    {formattedValue}
                                </span>
                                {displayIcon && <span className="text-muted-foreground">{displayIcon}</span>}
                            </div>
                        )}
                    </div>
                )}

                {/* Progress Bar Container */}
                <div
                    ref={containerRef}
                    className={cn(
                        "relative",
                        interactive && "cursor-pointer"
                    )}
                    onClick={handleClick}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                >
                    <ProgressPrimitive.Root
                        ref={ref}
                        value={indeterminate ? null : value}
                        aria-describedby={showTooltip && hoverValue !== null ? tooltipId : undefined}
                        className={cn(
                            progressVariants({ size, shape, variant, state }),
                            interactive && "hover:opacity-90 transition-opacity",
                            className
                        )}
                        {...props}
                    >
                        <div className="relative h-full w-full">
                            {/* Buffer Layer */}
                            {bufferValue !== undefined && (
                                <motion.div
                                    {...(isEnabled ? {
                                        initial: { width: 0 },
                                        animate: { width: `${Math.min(100, Math.max(0, bufferValue))}%` },
                                        transition: { duration: 0.8, ease: "easeOut" }
                                    } : {
                                        style: { width: `${Math.min(100, Math.max(0, bufferValue))}%` }
                                    })}
                                    className="absolute inset-y-0 left-0 bg-primary/30 transition-all duration-1000"
                                />
                            )}

                            {/* Segments or Single Indicator */}
                            {segments && segments.length > 0 ? (
                                <div className="flex h-full">
                                    {segments.map((segment, index) => (
                                        <motion.div
                                            key={index}
                                            {...(isEnabled ? {
                                                initial: { width: 0 },
                                                animate: { width: `${segment.value}%` },
                                                transition: { duration: 0.8, ease: "easeOut", delay: index * 0.1 }
                                            } : {
                                                style: { width: `${segment.value}%` }
                                            })}
                                            className={cn(
                                                "h-full transition-all duration-1000",
                                                segment.className
                                            )}
                                            style={{
                                                backgroundColor: segment.color,
                                            }}
                                            title={segment.label}
                                        />
                                    ))}
                                </div>
                            ) : indeterminate ? (
                                <div
                                    className={cn(
                                        "absolute h-full w-1/3",
                                        "animate-indeterminate",
                                        indicatorVariants({ variant, state: "idle" }) // Force idle state to avoid animation conflicts
                                    )}
                                    style={stripedBg}
                                />
                            ) : (
                                <ProgressPrimitive.Indicator asChild={isEnabled}>
                                    <motion.div
                                        {...(isEnabled ? {
                                            initial: { width: 0 },
                                            animate: { width: `${Math.min(100, Math.max(0, value))}%` },
                                            transition: { type: "easeOut", stiffness: 100, damping: 20 }
                                        } : {
                                            style: { transform: `translateX(-${100 - Math.min(100, Math.max(0, value))}%)` }
                                        })}
                                        className={cn(
                                            indicatorVariants({ variant, state }),
                                            indicatorClassName
                                        )}
                                        style={{
                                            ...(variant === "gradient" && colors && colors.length > 0
                                                ? { background: `linear-gradient(${gradientDirection}, ${colors.join(", ")})` }
                                                : {}),
                                            ...(stripedBg)
                                        }}
                                    >
                                        {/* Inside Label */}
                                        {showValue && labelPosition === "inside" && value > 15 && (
                                            <div className="flex h-full items-center justify-end pr-2">
                                                <span className="text-xs font-bold text-primary-foreground drop-shadow">
                                                    {formattedValue}
                                                </span>
                                            </div>
                                        )}
                                    </motion.div>
                                </ProgressPrimitive.Indicator>
                            )}

                            {/* Milestones */}
                            {showMilestones && milestones && milestones.length > 0 && (
                                <>
                                    {milestones.map((milestone, index) => (
                                        <div
                                            key={index}
                                            className="absolute top-0 h-full w-0.5 bg-border pointer-events-none"
                                            style={{ left: `${milestone.value}%` }}
                                            title={milestone.label || `${milestone.value}%`}
                                        >
                                            {milestone.label && (
                                                <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs text-muted-foreground whitespace-nowrap">
                                                    {milestone.label}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </>
                            )}
                        </div>
                    </ProgressPrimitive.Root>

                    {/* Tooltip with accessibility */}
                    <AnimatePresence>
                        {showTooltip && hoverValue !== null && (
                            <motion.div
                                id={tooltipId}
                                role="tooltip"
                                aria-live="polite"
                                {...(isEnabled ? {
                                    initial: { opacity: 0, y: -5, scale: 0.9 },
                                    animate: { opacity: 1, y: 0, scale: 1 },
                                    exit: { opacity: 0, y: -5, scale: 0.9 }
                                } : {})}
                                className="absolute -top-10 bg-popover text-popover-foreground px-2 py-1 rounded-md text-xs shadow-lg border border-border pointer-events-none z-50"
                                style={{ left: `${hoverValue}%`, x: "-50%" }}
                            >
                                {formatValue ? formatValue(hoverValue) : `${hoverValue}%`}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Bottom Label */}
                {(label || showValue) && labelPosition === "bottom" && (
                    <div className="flex items-center justify-between text-sm">
                        {label && <span className="text-muted-foreground">{label}</span>}
                        {showValue && (
                            <div className="flex items-center gap-2">
                                <span className="text-muted-foreground font-mono text-xs">
                                    {formattedValue}
                                </span>
                                {displayIcon && <span className="text-muted-foreground">{displayIcon}</span>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }
)
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
