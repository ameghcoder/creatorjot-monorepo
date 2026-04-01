import React from 'react'
import { cn } from '@/lib/utils'

interface CrossBorderFrameProps {
    children: React.ReactNode
    className?: string
    /** Length of each corner bracket arm. Default: 12 */
    cornerLength?: number
    /** Thickness of the corner lines. Default: 1 */
    lineWidth?: number
    /** Color override. Defaults to currentColor at 30% opacity */
    color?: string
    /** Gap between the corner bracket and the content edge. Default: 0 */
    offset?: number
    /** Whether to show the thin connecting border between corners. Default: true */
    showBorder?: boolean
}

/**
 * Wraps children in a sharp-cornered frame with elegant corner bracket marks
 * at each corner — inspired by camera viewfinders and editorial design.
 *
 * Usage:
 * ```tsx
 * <CrossBorderFrame>
 *   <div className="p-4">Your content here</div>
 * </CrossBorderFrame>
 * ```
 */
export function CrossBorderFrame({
    children,
    className,
    cornerLength = 12,
    lineWidth = 1,
    color,
    offset = 0,
    showBorder = true,
}: CrossBorderFrameProps) {
    const resolvedColor = color ?? 'currentColor'
    const o = -offset

    const cornerStyle = (
        top: boolean,
        left: boolean
    ): React.CSSProperties => ({
        position: 'absolute',
        width: cornerLength,
        height: cornerLength,
        ...(top ? { top: o } : { bottom: o }),
        ...(left ? { left: o } : { right: o }),
        pointerEvents: 'none',
    })

    /* Each corner is two short lines forming an "L" bracket */
    const renderCorner = (top: boolean, left: boolean) => (
        <span aria-hidden style={cornerStyle(top, left)}>
            {/* Horizontal arm */}
            <span
                style={{
                    position: 'absolute',
                    [top ? 'top' : 'bottom']: 0,
                    [left ? 'left' : 'right']: 0,
                    width: cornerLength,
                    height: lineWidth,
                    background: resolvedColor,
                    opacity: 0.4,
                }}
            />
            {/* Vertical arm */}
            <span
                style={{
                    position: 'absolute',
                    [top ? 'top' : 'bottom']: 0,
                    [left ? 'left' : 'right']: 0,
                    width: lineWidth,
                    height: cornerLength,
                    background: resolvedColor,
                    opacity: 0.4,
                }}
            />
        </span>
    )

    return (
        <div className={cn('relative', className)}>
            {/* Optional thin border connecting the corners */}
            {showBorder && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        border: `${lineWidth}px solid`,
                        borderColor: resolvedColor,
                        opacity: 0.15,
                    }}
                />
            )}

            {/* Four corner brackets */}
            {renderCorner(true, true)}
            {renderCorner(true, false)}
            {renderCorner(false, true)}
            {renderCorner(false, false)}

            {/* Content */}
            <div className="relative">{children}</div>
        </div>
    )
}
