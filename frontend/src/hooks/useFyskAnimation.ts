"use client";
import {
  useFyskConfig,
  defaultAnimationConfig,
  type FyskAnimationConfig,
} from "@/components/fysk-provider";
import React from "react";

/**
 * Hook to access animation configuration and utilities.
 * Provides pre-computed transition objects for consistent animations across components.
 */
export function useFyskAnimation() {
  const { animations } = useFyskConfig();

  // Merge user config with defaults
  const config: FyskAnimationConfig = React.useMemo(
    () => ({
      ...defaultAnimationConfig,
      ...animations,
      durations: {
        ...defaultAnimationConfig.durations,
        ...animations?.durations,
      },
      easings: { ...defaultAnimationConfig.easings, ...animations?.easings },
      effects: { ...defaultAnimationConfig.effects, ...animations?.effects },
    }),
    [animations],
  );

  // Check if animations are enabled and motion is available
  const isEnabled = config.enabled && !!config.motion;

  // Pre-computed transition objects based on config
  const transitions = React.useMemo(() => {
    if (!isEnabled) return null;

    const { durations, easings } = config;

    return {
      layout: {
        duration: durations.layout,
        ease: easings.layout,
      },
      enter: {
        duration: durations.normal,
        ease: easings.enter,
      },
      exit: {
        duration: durations.fast,
        ease: easings.exit,
      },
      hover: {
        duration: durations.instant,
        ease: easings.hover,
      },
      content: {
        duration: durations.normal,
        ease: easings.enter,
        layout: {
          duration: durations.slow,
          ease: easings.layout,
        },
      },
      linear: {
        duration: durations.normal,
        ease: easings.linear,
        repeat: Infinity,
      },
      layoutEnter: {
        layout: { duration: durations.layout, ease: easings.layout },
        opacity: { duration: durations.normal, ease: easings.enter },
      },
    };
  }, [isEnabled, config]);

  // Pre-computed animation variants based on config
  const variants = React.useMemo(() => {
    if (!isEnabled) return null;

    const { effects, durations, easings } = config;

    const buildHiddenState = () => {
      const state: Record<string, any> = { opacity: 0 };
      if (effects.blur) state.filter = `blur(${effects.blurAmount}px)`;
      if (effects.scale) state.scale = effects.scaleAmount;
      if (effects.slide) state.y = effects.slideDistance;
      return state;
    };

    const buildVisibleState = () => {
      const state: Record<string, any> = { opacity: 1 };
      if (effects.blur) state.filter = "blur(0px)";
      if (effects.scale) state.scale = 1;
      if (effects.slide) state.y = 0;
      return state;
    };

    const buildExitState = () => {
      const state: Record<string, any> = { opacity: 0 };
      if (effects.blur) state.filter = `blur(${effects.blurAmount}px)`;
      if (effects.scale) state.scale = effects.scaleAmount;
      if (effects.slide) state.y = -effects.slideDistance;
      return state;
    };

    return {
      fadeSlide: {
        initial: buildHiddenState(),
        animate: buildVisibleState(),
        exit: buildExitState(),
        transition: { duration: durations.normal, ease: easings.enter },
      },
      fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: durations.fast, ease: easings.enter },
      },
      iconPop: {
        initial: { scale: 0.5, rotate: -10 },
        animate: { scale: 1, rotate: 0 },
        transition: { duration: durations.normal, ease: easings.enter },
      },
      overlay: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: durations.fast, ease: easings.enter },
      },
      slideUp: {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 10 },
        transition: { duration: durations.normal, ease: easings.enter },
      },
      scaleIn: {
        initial: { opacity: 0, scale: 0.95 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.95 },
        transition: { duration: durations.normal, ease: easings.enter },
      },
    };
  }, [isEnabled, config]);

  const AnimatePresence = config.AnimatePresence || React.Fragment;

  return {
    isEnabled,
    motion: isEnabled ? config.motion : null,
    AnimatePresence,
    config,
    transitions,
    variants,
  };
}
