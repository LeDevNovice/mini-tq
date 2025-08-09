# ADR-000 : Project context and goals
- **Date :** 2025-08-09
- **Owners :** @LeDevNovice

## Context

This repository builds a **pedagogical re-implementation** of key TanStack Query v5 internals. The aim is not to clone every feature, but to :
- Understand **why** each abstraction exists (Query, QueryCache, QueryObserver, Retryer, managers).
- Learn **how** data fetching state machines interact with UI subscribers (React adapter).

I intentionally separate `@mini-tq/core` (framework agnostic) from `@mini-tq/react` (React adapter), mirroring TanStack Query’s layering.  
The project uses **ESM**, **Node ≥ 22**, **Vitest**.

## Problem Statement

UI apps need robust data fetching : deduplication, retries, cancellation, caching, invalidation, and smart re-render control.  
Reading TanStack Query’s source can feel daunting without a guided narrative and minimal repros that isolate each concept.

## Goals

1. **Pedagogical clarity**
2. **Minimal core semantics**
3. **Honest mapping to TQ v5 internals**

## Decision

I will **rebuild** a reduced set of TanStack Query internals with :
- A **core package**
- A **React adapter**

This mirrors the **conceptual shape** of TanStack Query while keeping surface area small enough for code readers.

## Consequences

Readers learn the “why” behind Tanstack Query’s abstractions. Some advanced features will be omitted. Readers must consult Tanstack Query source.
