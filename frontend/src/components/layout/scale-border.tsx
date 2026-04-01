import { cn } from "@/lib/utils";
import { ReactNode } from "react";
import Scales from "../ui/scale";

export interface ScaleBorderProps {
    children: ReactNode;
    /** Size of each scale unit in px. Default: 8 */
    scaleSize?: number;
    /** Width of the scale border strip in px. Default: 32 (w-8) */
    borderWidth?: number;
    /** How far the scale strips extend beyond the content (%). Default: 30 */
    overflow?: number;
    /** Extra classes on the outer wrapper */
    className?: string;
    /** Extra classes on the inner content container */
    contentClassName?: string;
}

export function ScaleBorder({
    children,
    scaleSize = 5,
    borderWidth = 32,
    overflow = 30,
    className,
    contentClassName,
}: ScaleBorderProps) {
    const halfBorder = borderWidth / 2 + 8; // offset so strips sit outside

    return (
        <div className={cn("relative", className)}>
            {/* Left strip */}
            <div
                className="absolute mask-t-from-90% mask-b-from-90% pointer-events-none"
                style={{
                    top: `-${overflow}%`,
                    bottom: `-${overflow}%`,
                    left: -halfBorder,
                    width: borderWidth,
                    height: `${100 + overflow * 2}%`,
                }}
            >
                <Scales size={scaleSize} />
            </div>

            {/* Right strip */}
            <div
                className="absolute mask-t-from-90% mask-b-from-90% pointer-events-none"
                style={{
                    top: `-${overflow}%`,
                    bottom: `-${overflow}%`,
                    right: -halfBorder,
                    width: borderWidth,
                    height: `${100 + overflow * 2}%`,
                }}
            >
                <Scales size={scaleSize} />
            </div>

            {/* Top strip */}
            <div
                className="absolute mask-r-from-90% mask-l-from-90% pointer-events-none"
                style={{
                    left: `-${overflow}%`,
                    right: `-${overflow}%`,
                    top: -halfBorder,
                    height: borderWidth,
                    width: `${100 + overflow * 2}%`,
                }}
            >
                <Scales size={scaleSize} />
            </div>

            {/* Bottom strip */}
            <div
                className="absolute mask-r-from-90% mask-l-from-90% pointer-events-none"
                style={{
                    left: `-${overflow}%`,
                    right: `-${overflow}%`,
                    bottom: -halfBorder,
                    height: borderWidth,
                    width: `${100 + overflow * 2}%`,
                }}
            >
                <Scales size={scaleSize} />
            </div>

            {/* Content — sits on top of the scale strips */}
            <div
                className={cn(
                    "relative z-10 overflow-hidden bg-background shadow-sm ring-1 shadow-black/10 ring-ring/5",
                    contentClassName,
                )}
            >
                {children}
            </div>
        </div>
    );
}
