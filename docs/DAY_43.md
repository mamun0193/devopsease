# Day 43 — Abuse & Anomaly Detection Layer

> **Focus:** Security & Intrusion Detection
> **Core Principle:** "Zero-tolerance for abusive behavior."

---

## 🎯 Goal

To implement a real-time, in-memory **Abuse Observation System** that detects and flags suspicious user behavior without relying on heavy database queries. The system monitors **high-frequency actions** (Exec Spam, Restart Loops, Creation Bursts) to identify potential bad actors or compromised accounts instantly.

---

## 🛠️ Key Technical Changes

### 1. Backend: In-Memory Activity Monitor (`src/security/activityMonitor.js`)

- **Rolling Window Engine:** Tracks user events within a strict 60-second sliding window.
- **event-Driven Architecture:** Hooks directly into critical endpoints (`ws/exec`, `POST /containers`) to capture intent in real-time.
- **Zero-Persistence:** Purely in-memory implementation to maximize performance and avoid IO bottlenecks.

### 2. Detection Logic: Weighted Anomaly Scoring

- **Exec Spam (Weight 0.4):** Detects rapid shell session creation (e.g., >10/min).
- **Restart Flood (Weight 0.3):** Identifies aggressive container restarting (e.g., >5/min).
- **Creation Burst (Weight 0.3):** Monitoring for resource exhaustion attempts (e.g., >5/min).
- **Linear Scaling:** Scores increase proportionally with abuse intensity (e.g., 15 restarts = Extreme Risk).
- **Threshold:** Users with `score ≥ 0.7` are flagged as **Suspicious**.

### 3. Frontend: Admin Security Panel (`src/pages/AdminObservabilityPage.tsx`)

- **Live Anomaly Feed:** Auto-refreshing list of users exhibiting suspicious behavior.
- **Risk Visualization:**
    - 🔴 **Significant Risk (Score ≥ 0.7):** Immediate attention required.
    - 🟠 **Elevated Risk (Score ≥ 0.4):** Warning level activity.
- **Actionable Insights:** Displays exact counts for execs, restarts, and creations alongside the risk score.

---

## 🧪 Verification

| Scenario         | Result                                                               |
| :--------------- | :------------------------------------------------------------------- |
| **Normal Usage** | ✅ Score remains 0. User not flagged.                                 |
| **Exec Spam**    | ✅ Score rises rapidly. Flagged as **Suspicious** after ~10 sessions. |
| **Restart Loop** | ✅ Detects "flapping". Score scales linearly with restart count.      |
| **Mixed Abuse**  | ✅ Combined actions sum up. Score capped at 1.0 (Maximum Threat).     |
| **Time Expiry**  | ✅ After 60s of inactivity, score resets to 0 automatically.          |

---

# 📅 Day 44 — Production Hardening
Backend:
* Graceful shutdown
* WebSocket drain
* Docker event listener resilience
* Defensive Docker error handling

DevOps:
* Production Dockerfile
* ENV validation
* Secure cookie enforcement
* Health checks

Outcome:
> System survives deployment.
