"use client"
import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const typographyVariants = cva("text-foreground transition-colors duration-300", {
    variants: {
        variant: {
            h1: "scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl ",
            h2: "scroll-m-20 pb-2 text-3xl font-semibold tracking-tight mt-6",
            h3: "scroll-m-20 text-2xl font-medium tracking-tight mt-4",
            h4: "scroll-m-20 text-xl font-normal tracking-tight mt-2",
            p: "text-base font-normal leading-7 text-foreground/75 not-first:mt-2 tracking-wide",
            blockquote: "mt-6 border-l-2 pl-6 text-base text-foreground/75",
            list: "my-6 ml-6 list-disc [&>li]:mt-2 text-foreground/75",
            inlineCode: "relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold text-foreground/75",
            lead: "text-xl text-muted-foreground",
            large: "text-lg font-semibold text-foreground",
            small: "text-sm font-medium leading-none text-foreground/75",
            muted: "text-sm text-muted-foreground",
            strong: "font-semibold text-foreground/75",
        },
    },
    defaultVariants: {
        variant: "p",
    },
})

// --- Context ---
interface TypographyContextValue {
    variant?: "h1" | "h2" | "h3" | "h4" | "p" | "blockquote" | "list" | "inlineCode" | "lead" | "large" | "small" | "muted" | "strong"
}

const TypographyContext = React.createContext<TypographyContextValue>({})

export const TypographyProvider = ({
    children,
    variant,
}: {
    children: React.ReactNode
    variant?: TypographyContextValue["variant"]
}) => (
    <TypographyContext.Provider value={{ variant }}>
        {children}
    </TypographyContext.Provider>
)

export interface TypographyProps
    extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
    as?: React.ElementType
    data?: React.ReactNode[] // For list type
}

const Typography = React.forwardRef<HTMLElement, TypographyProps>(
    ({ className, variant: propsVariant, as, data, children, ...props }, ref) => {
        const context = React.useContext(TypographyContext)
        const variant = propsVariant || context.variant || "p"

        const Comp = as || (variant?.startsWith("h") ? variant : variant === "inlineCode" ? "code" : variant === "blockquote" ? "blockquote" : variant === "list" ? "ul" : variant === "strong" ? "strong" : "p") as React.ElementType

        const baseId = React.useId()

        if (variant === "list" && data) {
            return (
                <Comp
                    className={cn(typographyVariants({ variant }), className)}
                    ref={ref as any}
                    {...props}
                >
                    {data.map((item, index) => {
                        const key = `${baseId}-${index}`
                        return <li className="text-foreground/75" key={key}>{item}</li>
                    })}
                </Comp>
            )
        }

        return (
            <Comp
                className={cn(typographyVariants({ variant }), className)}
                ref={ref as any}
                {...props}
            >
                {children}
            </Comp>
        )
    }
)
Typography.displayName = "Typography"

export { Typography, typographyVariants }

