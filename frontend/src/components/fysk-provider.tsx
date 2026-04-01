"use client"
import * as React from "react"
import { Check, AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal, Search, Circle, Minus, PanelLeft, X, Loader2 } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

export type FyskIconPosition = "start" | "end"

export interface FyskIcons {
    loading?: React.ReactNode
    success?: React.ReactNode
    error?: React.ReactNode
    warning?: React.ReactNode
    info?: React.ReactNode,
    chevronDown?: React.ReactNode,
    chevronUp?: React.ReactNode,
    chevronLeft?: React.ReactNode,
    chevronRight?: React.ReactNode,
    chevronsLeft?: React.ReactNode,
    chevronsRight?: React.ReactNode,
    moreHorizontal?: React.ReactNode,
    search?: React.ReactNode,
    circle?: React.ReactNode,
    minus?: React.ReactNode,
    panelLeft?: React.ReactNode,
    close?: React.ReactNode,
}

// --- Animation Configuration ---

/**
 * Easing types based on "The Easing Blueprint"
 * @see https://animations.dev/learn/animation-theory/the-easing-blueprint
 * 
 * - easeOut: Best for enter animations (responsive feel)
 * - easeInOut: Best for layout/morphing (natural acceleration/deceleration)
 * - easeIn: Rarely used (feels sluggish)
 * - linear: Only for constant animations (marquees, progress)
 */
export type FyskEasing = "easeOut" | "easeInOut" | "easeIn" | "linear" | number[]

/**
 * Duration presets in seconds
 */
export interface FyskDurations {
    /** Ultra-fast micro-interactions (50-100ms) */
    instant: number
    /** Quick feedback animations (100-150ms) */
    fast: number
    /** Standard UI transitions (200-250ms) */
    normal: number
    /** Deliberate, noticeable animations (300-400ms) */
    slow: number
    /** Layout/morphing animations (400-500ms) */
    layout: number
}

/**
 * Easing presets for different animation contexts
 */
export interface FyskEasings {
    /** For elements entering the screen (dropdowns, modals, tooltips) */
    enter: FyskEasing
    /** For elements leaving the screen */
    exit: FyskEasing
    /** For elements morphing/changing size while on screen */
    layout: FyskEasing
    /** For hover/focus micro-interactions */
    hover: FyskEasing
    /** For constant animations (spinners, progress) */
    linear: FyskEasing
}

/**
 * Animation effect configurations
 */
export interface FyskEffects {
    /** Enable blur effect on enter/exit transitions */
    blur: boolean
    /** Blur amount in pixels */
    blurAmount: number
    /** Enable scale effect on enter/exit */
    scale: boolean
    /** Scale amount (0.95 = 95%) */
    scaleAmount: number
    /** Enable slide effect */
    slide: boolean
    /** Slide distance in pixels */
    slideDistance: number
}

/**
 * Complete animation configuration
 */
export interface FyskAnimationConfig {
    /** Master switch to enable/disable all animations */
    enabled: boolean
    /** The framer-motion 'motion' object. Type as any to avoid strict peerDependency if not used. */
    motion?: any
    /** The framer-motion 'AnimatePresence' component */
    AnimatePresence?: React.ComponentType<any>
    /** Duration presets (in seconds) */
    durations: FyskDurations
    /** Easing presets */
    easings: FyskEasings
    /** Visual effects */
    effects: FyskEffects
    /** Enable reduced motion for accessibility */
    respectReducedMotion: boolean
}

/**
 * Default animation configuration - professionally tuned values
 */
export const defaultAnimationConfig: FyskAnimationConfig = {
    motion: motion,
    AnimatePresence: AnimatePresence,
    enabled: true,
    durations: {
        instant: 0.1,
        fast: 0.15,
        normal: 0.2,
        slow: 0.3,
        layout: 0.4,
    },
    easings: {
        enter: "easeOut",
        exit: "easeOut",
        layout: "easeInOut",
        hover: "easeOut",
        linear: "linear",
    },
    effects: {
        blur: true,
        blurAmount: 4,
        scale: true,
        scaleAmount: 0.95,
        slide: true,
        slideDistance: 10,
    },
    respectReducedMotion: true,
}

export interface FyskConfig {
    icons?: FyskIcons;
    iconPosition?: FyskIconPosition;
    animations?: Partial<FyskAnimationConfig>;
}

const defaultIcons: Required<FyskIcons> = {
    loading: <Loader2 className="animate-spin" />,
    success: <Check />,
    error: <AlertCircle />,
    warning: <AlertTriangle />,
    info: <Info />,
    chevronDown: <ChevronDown className="size-4" />,
    chevronUp: <ChevronUp className="size-4" />,
    chevronLeft: <ChevronLeft className="size-4" />,
    chevronRight: <ChevronRight className="size-4" />,
    chevronsLeft: <ChevronsLeft className="size-4" />,
    chevronsRight: <ChevronsRight className="size-4" />,
    moreHorizontal: <MoreHorizontal className="size-4" />,
    search: <Search className="size-4" />,
    circle: <Circle className="size-4" />,
    minus: <Minus className="size-4" />,
    panelLeft: <PanelLeft className="size-4" />,
    close: <X className="size-4" />
}

const FyskContext = React.createContext<FyskConfig>({
    icons: defaultIcons,
    iconPosition: "start",
    animations: defaultAnimationConfig
})

export function useFyskConfig() {
    return React.useContext(FyskContext)
}

export interface FyskProviderProps extends FyskConfig {
    children: React.ReactNode
}

export function FyskProvider({
    children,
    icons,
    iconPosition = "start",
    animations,
}: FyskProviderProps) {
    const value = React.useMemo(
        () => ({
            icons: { ...defaultIcons, ...icons },
            iconPosition,
            animations,
        }),
        [icons, iconPosition, animations]
    )

    return <FyskContext.Provider value={value}>{children}</FyskContext.Provider>
}
