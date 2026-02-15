# Day 42 — Instability Scoring & Failure Patterns

> **Focus:** Stability Metrics & Pattern Recognition
> **Core Principle:** "Quantifying chaos into actionable data."

---

## 🎯 Goal

To move beyond simple binary status (Running/Stopped) and provide a nuanced **Stability Score**. The goal was to analyze historical behavior to calculate **Mean Time Between Failures (MTBF)**, detect **Restart Loops**, and identify **Instability Patterns** with high precision, giving operators early warnings before a total system failure.

---

## 🛠️ Key Technical Changes

### 1. Backend: Stateless Instability Analyzer (`src/intelligence/instabilityAnalyzer.js`)

- **Metric Extraction:** Decoupled raw metric calculation (uptime, restart count) from scoring logic for better testability.
- **MTBF Calculation:** Implemented `calculateMTBF` to track the average time between crashes, providing a key reliability metric.
- **Restart Density:** Introduced a "density score" that spikes if multiple restarts occur within a short window (e.g., < 5 mins).
- **Weighted Scoring System:**
    - **Crash Loop (40%):** Immediate red flag for rapid failure cycles.
    - **Restart Density (30%):** Detects "flapping" services.
    - **MTBF (20%):** Long-term reliability indicator.
    - **Severity (10%):** Critical errors like OOM or Port Conflicts.

### 2. Frontend: Visual Stability Assessment (`src/components/FailureAnalysis.tsx`)

- **Stability Badge:** Dynamic status indicator showing **Stable** (Green), **At Risk** (Orange), or **Unstable** (Red).
- **Score Visualization:** Visual progress bar indicating the calculated Instability Score (0-100%).
- **MTBF Display:** Human-readable format (e.g., "4m 12s", "2h 30m") to show reliability trends at a glance.
- **Zero-Failure State:** A clean, positive UI state for containers with perfect reliability records.

### 3. API: Enhanced Intelligence Data (`src/api/index.ts`)

- **Expanded Interface:** Updated `FailureIntelligence` to transport specific stability metrics:
    - `instabilityScore`
    - `mtbfSeconds`
    - `isUnstable`
    - `confidenceScore`

---

## 🧪 Verification

| Scenario             | Result                                                                       |
| :------------------- | :--------------------------------------------------------------------------- |
| **Stable Container** | ✅ Shows "Stable" (0% instability) with "Zero failures recorded" message.     |
| **Rapid Restarts**   | ✅ Detects high density, shows "Unstable" status with High instability score. |
| **Occasional Crash** | ✅ Shows "At Risk", calculates valid MTBF (e.g., "4h 15m").                   |
| **New Container**    | ✅ Handles null MTBF gracefully, defaults to "Stable".                        |

---

# 📅 Day 43 — Abuse & Resource Anomaly Detection
Backend:
* Detect exec spam
* Restart spam
* Container creation bursts
* Abnormal resource patterns

Admin UI:
* Suspicious activity panel
* Anomaly alerts

Outcome:
