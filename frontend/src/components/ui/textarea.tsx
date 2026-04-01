"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { useFyskConfig, type FyskIconPosition } from "@/components/fysk-provider"
import { useFyskAnimation } from "@/hooks/useFyskAnimation"

const textareaVariants = cva(
    "flex w-full rounded-md shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive min-h-[80px]",
    {
        variants: {
            variant: {
                default: "border border-input bg-transparent dark:bg-input/30 shadow-xs",
                secondary: "border border-transparent bg-muted focus-within:bg-background focus-within:border-input",
                outline: "border-2 border-border bg-transparent focus-within:border-ring/50",
                ghost: "border border-transparent bg-transparent hover:bg-muted focus-within:bg-background",
                glass: "bg-foreground/5 backdrop-blur-md border border-border/50 text-foreground placeholder:text-muted-foreground/50 shadow-xs",
            },
            size: {
                xs: "text-xs min-h-[60px]",
                sm: "text-sm min-h-[70px]",
                md: "text-base md:text-sm min-h-[80px]",
                lg: "text-base md:text-sm min-h-[100px]",
                xl: "text-lg min-h-[120px]",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "md",
        },
    }
)

export interface TextareaProps
    extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
    /** Optional className for the header. */
    headerClassName?: string;
    /** Optional className for the footer. */
    footerClassName?: string;
    /** Optional className for the left panel. */
    leftClassName?: string;
    /** Optional className for the right panel. */
    rightClassName?: string;
    /** Automatically adjust the height of the textarea based on content. */
    autoSize?: boolean
    /** Maximum height when autoSize is enabled. */
    maxHeight?: number
    /** Optional header content (e.g., info pills, toolbar). */
    header?: React.ReactNode
    /** Optional footer content (e.g., send button, character count). */
    footer?: React.ReactNode
    /** Optional left panel content (e.g., labels, icons, actions). */
    left?: React.ReactNode
    /** Optional right panel content (e.g., actions, counters). */
    right?: React.ReactNode
    /** Show character count in the footer. Requires maxLength. */
    showCount?: boolean
    state?: "idle" | "loading" | "success" | "error"
    /** The icon to display. */
    icon?: React.ReactNode
    /** Custom loading icon to override the global default. */
    iconLoading?: React.ReactNode
    /** Custom success icon to override the global default. */
    iconSuccess?: React.ReactNode
    /** Custom error icon to override the global default. */
    iconError?: React.ReactNode
    /** Override the global icon position. */
    iconPosition?: FyskIconPosition
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    (
        {
            className,
            headerClassName,
            footerClassName,
            leftClassName,
            rightClassName,
            variant,
            size,
            autoSize = false,
            maxHeight,
            header,
            footer,
            left,
            right,
            showCount = false,
            state = "idle",
            icon,
            iconLoading: propIconLoading,
            iconSuccess: propIconSuccess,
            iconError: propIconError,
            ...props
        },
        ref
    ) => {
        const config = useFyskConfig()
        const { isEnabled, motion, AnimatePresence, variants } = useFyskAnimation()
        const internalRef = React.useRef<HTMLTextAreaElement>(null)
        const [charCount, setCharCount] = React.useState(0)

        const isLoading = state === "loading"
        const isSuccess = state === "success"
        const isError = state === "error"

        const finalIconLoading = propIconLoading || config.icons?.loading
        const finalIconSuccess = propIconSuccess || config.icons?.success
        const finalIconError = propIconError || config.icons?.error

        const currentIcon = isLoading ? finalIconLoading : isSuccess ? finalIconSuccess : isError ? finalIconError : icon
        const MotionDiv = isEnabled && motion ? motion.div : "div"

        const combinedRef = React.useCallback((node: HTMLTextAreaElement) => {
            internalRef.current = node
            if (typeof ref === "function") {
                ref(node)
            } else if (ref) {
                (ref as React.RefObject<HTMLTextAreaElement | null>).current = node
            }
        }, [ref])

        const adjustHeight = React.useCallback(() => {
            if (autoSize && internalRef.current) {
                internalRef.current.style.height = 'auto'
                const nextHeight = internalRef.current.scrollHeight
                if (maxHeight && nextHeight > maxHeight) {
                    internalRef.current.style.height = `${maxHeight}px`
                    internalRef.current.style.overflowY = 'auto'
                } else {
                    internalRef.current.style.height = `${nextHeight}px`
                    internalRef.current.style.overflowY = 'hidden'
                }
            }
        }, [autoSize, maxHeight])

        React.useEffect(() => {
            adjustHeight()
        }, [adjustHeight, props.value])

        const handleInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
            adjustHeight()
            setCharCount((e.target as HTMLTextAreaElement).value.length)
            // @ts-expect-error React 19 types expect InputEvent for onInput
            props.onInput?.(e)
        }

        const renderStatusIndicator = () => {
            if (!currentIcon && state === "idle") return null

            return (
                <AnimatePresence {...(isEnabled && motion ? { mode: "wait" } : {})}>
                    {currentIcon && (
                        <MotionDiv
                            key={state + (currentIcon ? "has-icon" : "no-icon")}
                            className={cn(
                                "absolute flex items-center justify-center text-muted-foreground z-10",
                                size === "xs" ? "[&_svg]:size-3.5" : "[&_svg]:size-4",
                                "right-3 bottom-3",
                                isSuccess && "text-green-600 dark:text-green-400",
                                isError && "text-destructive",
                                isLoading && "text-primary [&_svg]:animate-spin"
                            )}
                            {...(isEnabled && motion && variants ? variants.iconPop : {})}
                        >
                            {currentIcon}
                        </MotionDiv>
                    )}
                </AnimatePresence>
            )
        }

        const textareaElement = (
            <textarea
                className={cn(
                    "flex w-full bg-transparent text-base placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm px-0 py-0",
                    "[&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border/30 [&::-webkit-scrollbar-thumb]:rounded-[10px] hover:[&::-webkit-scrollbar-thumb]:bg-border/60",
                    (autoSize || header || footer || showCount || left || right) && "resize-none overflow-hidden",
                    currentIcon && "pr-8",
                    className
                )}
                ref={combinedRef}
                onInput={handleInput}
                {...props}
            />
        )

        const containerClasses = cn(
            textareaVariants({ variant, size }),
            isSuccess && "border-green-500/50 focus-within:ring-green-500/20",
            isError && "border-destructive/50 focus-within:ring-destructive/20"
        )

        return (
            <div className={cn(
                "relative flex flex-col w-full transition-all overflow-hidden",
                containerClasses,
                (header || footer || left || right) && "p-0"
            )}>
                {header && (
                    <div className={cn("px-3 py-2 bg-transparent", headerClassName)}>
                        {header}
                    </div>
                )}
                {/* Middle row: left panel + textarea + right panel */}
                <div className="flex flex-row flex-1 min-h-0">
                    {left && (
                        <div className={cn(
                            "flex items-stretch py-2 pl-3 pr-2 bg-transparent border-r border-border/10",
                            leftClassName
                        )}>
                            {left}
                        </div>
                    )}
                    <div className={cn(
                        "flex flex-col flex-1 relative px-3 py-2",
                        header && "pt-0",
                        (footer || showCount) && "pb-0"
                    )}>
                        <div className="relative flex flex-1 w-full h-full">
                            {textareaElement}
                            {renderStatusIndicator()}
                        </div>
                    </div>
                    {right && (
                        <div className={cn(
                            "flex items-stretch py-2 pr-3 pl-2 bg-transparent border-l border-border/10",
                            rightClassName
                        )}>
                            {right}
                        </div>
                    )}
                </div>
                {(footer || showCount) && (
                    <div className={cn(
                        "px-3 py-2 mt-auto bg-transparent border-t border-border/10 flex items-center justify-between gap-4",
                        footerClassName
                    )}>
                        <div className="flex-1">{footer}</div>
                        {showCount && (
                            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground tabular-nums ml-auto">
                                {charCount}{props.maxLength ? ` / ${props.maxLength}` : ""}
                            </div>
                        )}
                    </div>
                )}
            </div>
        )
    }
)
Textarea.displayName = "Textarea"

export { Textarea, textareaVariants }
