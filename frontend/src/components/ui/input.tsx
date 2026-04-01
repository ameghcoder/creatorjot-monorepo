"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useFyskConfig, type FyskIconPosition } from "@/components/fysk-provider"
import { useFyskAnimation } from "@/hooks/useFyskAnimation"

const inputVariants = cva(
    "flex w-full min-w-0 rounded-md shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
    {
        variants: {
            variant: {
                default: "border border-input bg-transparent dark:bg-input/30 shadow-xs",
                outline: "border-2 border-border bg-transparent focus:border-ring/50",
                secondary: "border border-transparent bg-muted focus:bg-background focus:border-input",
                ghost: "border border-transparent bg-transparent hover:bg-muted focus:bg-background shadow-none",
                glass: "bg-foreground/5  border border-border/50 text-foreground placeholder:text-muted-foreground/50 focus:bg-foreground/10 shadow-xs",
            },
            size: {
                xs: "h-7 px-2 py-1 text-xs",
                sm: "h-8 px-2.5 py-1 text-sm",
                md: "h-9 px-3 py-1 text-base md:text-sm",
                lg: "h-10 px-4 py-2 text-base md:text-sm",
                xl: "h-12 px-5 py-3 text-lg",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
        },
    }
)

export interface InputProps
    extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
    state?: "idle" | "loading" | "success" | "error"
    icon?: React.ReactNode
    iconClassName?: string
    iconLoading?: React.ReactNode
    iconSuccess?: React.ReactNode
    iconError?: React.ReactNode
    iconPosition?: FyskIconPosition
    onIconClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    (
        {
            className,
            variant,
            size,
            type,
            state = "idle",
            icon,
            iconClassName,
            iconLoading: propIconLoading,
            iconSuccess: propIconSuccess,
            iconError: propIconError,
            iconPosition: propIconPosition,
            onIconClick,
            ...props
        },
        ref
    ) => {
        const config = useFyskConfig()
        const { isEnabled, motion, AnimatePresence, variants } = useFyskAnimation()

        const isLoading = state === "loading"
        const isSuccess = state === "success"
        const isError = state === "error"

        const activeIconPosition = propIconPosition || config.iconPosition || "start"
        const finalIconLoading = propIconLoading || config.icons?.loading
        const finalIconSuccess = propIconSuccess || config.icons?.success
        const finalIconError = propIconError || config.icons?.error

        const currentIcon = isLoading ? finalIconLoading : isSuccess ? finalIconSuccess : isError ? finalIconError : icon

        const MotionDiv = isEnabled && motion ? motion.div : "div"

        const renderIcon = () => {
            if (!currentIcon && state === "idle") return null

            const commonClasses = cn(
                "absolute flex items-center justify-center text-muted-foreground",
                iconClassName,
                size === "xs" ? "[&_svg]:size-3.5" : "[&_svg]:size-4",
                activeIconPosition === "start"
                    ? (size === "xs" ? "left-2" : "left-3")
                    : (size === "xs" ? "right-2" : "right-3")
            )

            return (
                <AnimatePresence {...(isEnabled && motion ? { mode: "wait" } : {})}>
                    {currentIcon && (
                        <MotionDiv
                            key={state + (currentIcon ? "has-icon" : "no-icon")}
                            className={commonClasses}
                            {...(isEnabled && motion && variants ? variants.iconPop : {})}
                        >
                            {onIconClick ? (
                                <button
                                    type="button"
                                    onClick={onIconClick}
                                    className="pointer-events-auto cursor-pointer hover:text-foreground transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm active:scale-90"
                                >
                                    {currentIcon}
                                </button>
                            ) : (
                                <div className="pointer-events-none">
                                    {currentIcon}
                                </div>
                            )}
                        </MotionDiv>
                    )}
                </AnimatePresence>
            )
        }

        return (
            <div className="relative flex items-center w-full">
                {activeIconPosition === "start" && renderIcon()}
                <input
                    type={type}
                    className={cn(
                        inputVariants({ variant, size, className }),
                        currentIcon && activeIconPosition === "start" && (size === "xs" ? "pl-8" : "pl-10"),
                        currentIcon && activeIconPosition === "end" && (size === "xs" ? "pr-8" : "pr-10"),
                        isSuccess && "border-green-500/50 focus-visible:ring-green-500/20",
                        isError && "border-destructive/50 focus-visible:ring-destructive/20"
                    )}
                    ref={ref}
                    data-state={state}
                    {...props}
                />
                {activeIconPosition === "end" && renderIcon()}
            </div>
        )
    }
)
Input.displayName = "Input"

export { Input, inputVariants }


