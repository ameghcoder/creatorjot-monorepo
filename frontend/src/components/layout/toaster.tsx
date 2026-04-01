"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, ToasterProps } from "sonner"

export default function Toaster({ ...props }: ToasterProps) {
    const { theme = "system" } = useTheme()

    return (
        <Sonner
            theme={theme as ToasterProps["theme"]}
            className="toaster group"
            richColors={true}
            position="top-center"
            style={
                {
                    "--normal-bg": "var(--color-popover)",
                    "--normal-text": "var(--color-popover-foreground)",
                    "--normal-border": "var(--color-border)",
                } as React.CSSProperties
            }
            {...props}
        />
    )
}
