# Progress Screen Data Caching and Updating System Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement a caching and automatic updating system for progress screen data to enable instant display on navigation and seamless real-time updates.

**Architecture:** 
- Create a custom hook `useProgressData` that encapsulates data fetching, caching, and background update logic
- The hook implements stale-data-while-revalidating pattern with configurable cache times
- Background polling and app foreground detection for timely updates
- ProgressScreen consumes this hook instead of direct props and data fetching
- Use react-native-reanimated for advanced animated value changes when data updates

**Tech Stack:** 
- React Native hooks (useState, useEffect, useCallback)
- react-native-reanimated for animations
- AppState from react-native for foreground detection
- Existing API services (mealsApi, weightsApi)

**Spec:** docs/superpowers/specs/2026-10-05-progress-screen-cache-design.md

## Global Constraints
- Must maintain compatibility with existing tab shell and navigation structure
- Should not break existing pull-to-refresh functionality
- Cache invalidation must work correctly when user adds/deletes meals or weights
- Animations should be smooth and not cause jank on mid-tier mobile devices
- All existing tests must continue to pass

## Review Focus
- Cache stale time configuration: ensuring data isn't too stale when screen is viewed
- Polling interval balance: updating frequently enough without excessive battery/network usage
- Animation performance: ensuring reanimated worklets run on UI thread
- Error handling: maintaining existing error states and retry functionality
- Memory leaks: proper cleanup of subscriptions, timers, and listeners

---