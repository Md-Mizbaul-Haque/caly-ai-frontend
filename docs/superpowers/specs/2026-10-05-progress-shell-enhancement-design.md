# Progress Screen Data Enhancement via Tab Shell Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the existing tab shell to provide instant progress screen data through caching, prefetching, and subscription mechanisms, eliminating loading states and enabling seamless real-time updates with animations.

**Architecture:** 
- Extend the tab shell (`src/features/tabs/shell.js` and `src/app/(tabs)/_layout.js`) to:
  * Maintain a cached version of progress-relevant data (weights, weightGoal, meals)
  * Add subscription mechanism for components to listen to data changes
  * Implement prefetching functions for tab data
  * Keep existing fetch functions but make them update cache and notify subscribers
- Modify ProgressScreen to:
  * Subscribe to shell data updates
  * Read data directly from shell cache for instant display
  * Use react-native-reanimated's useSharedValue and useAnimatedStyle to animate value changes
- Update history.js and potentially other tabs to call prefetch functions before navigation

**Tech Stack:** 
- React Native hooks (useState, useEffect, useCallback)
- react-native-reanimated for animations
- EventEmitter pattern for subscriptions
- Existing API services (mealsApi, weightsApi)

**Spec:** docs/superpowers/specs/2026-10-05-progress-shell-enhancement-design.md

## Global Constraints
- Must maintain compatibility with existing tab shell and navigation structure
- Should not break existing pull-to-refresh functionality
- Cache invalidation must work correctly when user adds/deletes meals or weights
- Animations should be smooth and not cause jank on mid-tier mobile devices
- All existing tests must continue to pass
- Must not duplicate existing data fetching logic

## Review Focus
- Subscription mechanism reliability: ensuring no memory leaks or missed updates
- Prefetch timing: ensuring data is ready when tab is viewed
- Cache consistency: ensuring shell state and cache stay in sync
- Animation performance: ensuring reanimated worklets run on UI thread
- Backward compatibility: existing tabs and functionality continue to work