import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import Scales from "../ui/scale";

export interface ScaleCardProps {
    /** Card title shown in the header strip */
    title?: string;
    /** Icon or element shown on the right side of the header */
    headerAction?: ReactNode;
    /** Main card content */
    children: ReactNode;
    /** Footer content, rendered below the body with a top border */
    footer?: ReactNode;
    /** Extra classes on the outer wrapper */
    className?: string;
    /** Extra classes on the body section */
    bodyClassName?: string;
}

const SCALE_SIZE = 5;
const BORDER_WIDTH = 10;
const HALF_BORDER = BORDER_WIDTH / 2 + SCALE_SIZE;

export function ScaleCard({
    title,
    headerAction,
    children,
    footer,
    className,
    bodyClassName,
}: ScaleCardProps) {
    return (
        <div className={cn("relative", className)}>
            {/* ── Top strip (full width, extends horizontally) ── */}
            <div
                className="absolute pointer-events-none"
                style={{
                    left: 0,
                    right: 0,
                    top: -HALF_BORDER,
                    height: BORDER_WIDTH,
                }}
            >
                <Scales size={SCALE_SIZE} />
            </div>

            {/* ── Bottom strip (full width, extends horizontally) ── */}
            <div
                className="absolute pointer-events-none"
                style={{
                    left: 0,
                    right: 0,
                    bottom: -HALF_BORDER,
                    height: BORDER_WIDTH,
                }}
            >
                <Scales size={SCALE_SIZE} />
            </div>

            {/* ── Left strip (between top & bottom, no corner overlap) ── */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: -BORDER_WIDTH,
                    bottom: -BORDER_WIDTH,
                    left: -HALF_BORDER,
                    width: BORDER_WIDTH,
                }}
            >
                <Scales size={SCALE_SIZE} />
            </div>

            {/* ── Right strip (between top & bottom, no corner overlap) ── */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: -BORDER_WIDTH,
                    bottom: -BORDER_WIDTH,
                    right: -HALF_BORDER,
                    width: BORDER_WIDTH,
                }}
            >
                <Scales size={SCALE_SIZE} />
            </div>

            {/* ── Card content ── */}
            <div className="relative z-10 overflow-hidden shadow-sm ring-1 shadow-black/10 ring-ring/5 border border-border bg-card flex flex-col h-full w-full">
                {/* Header */}
                {(title || headerAction) && (
                    <div className="border-b border-border bg-muted/30 px-5 py-3 flex items-center justify-between shrink-0">
                        {title && (
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {title}
                            </span>
                        )}
                        {headerAction && <div>{headerAction}</div>}
                    </div>
                )}

                {/* Body */}
                <div className={cn("p-5 flex-1 flex flex-col gap-4", bodyClassName)}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="border-t border-border bg-muted/20 px-5 py-3 shrink-0">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
