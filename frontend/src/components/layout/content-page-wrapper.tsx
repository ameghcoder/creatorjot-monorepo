import React from "react"
import { Typography } from "../ui/typography";

const ContentPageWrapper = ({ children, title, pageType, lastUpdated }: { children: Readonly<React.ReactNode>; title: string; pageType?: 'legal' | 'info' | 'support'; lastUpdated?: string; }) => {
    return (
        <div className="mx-auto w-full border-l border-r border-border bg-background min-h-screen relative flex flex-col pt-16">
            <main className="flex-1 relative z-10 w-full flex flex-col">
                <section className="relative px-6 py-24 md:py-32 overflow-hidden flex-1 max-w-4xl mx-auto w-full">
                    <div className="mb-14 text-center space-y-3">
                        <Typography variant={"small"} className="uppercase empty:hidden">{pageType}</Typography>
                        <Typography variant={"h1"}>
                            {title}
                        </Typography>
                        {
                            lastUpdated &&
                            <Typography variant={"muted"}>
                                Last updated: {lastUpdated}
                            </Typography>
                        }
                    </div>
                    <div className="space-y-8 text-sm leading-relaxed text-muted-foreground animate-in fade-in slide-in-from-bottom-8 duration-700 delay-300">
                        {children}
                    </div>
                </section>
            </main>
        </div>
    )
}

export default ContentPageWrapper