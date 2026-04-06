# Chapter 12 — Effective Troubleshooting
*Google SRE Book — Written by Chris Jones*

> "Be warned that being an expert is more than understanding how a system is supposed to work. Expertise is gained by investigating why a system doesn't work."
> — Brian Redman

## Theory: The Hypothetico-Deductive Method

The troubleshooting process applies the hypothetico-deductive method: given observations about a system and theoretical understanding of its behavior, practitioners iteratively hypothesize potential causes and test those hypotheses.

The idealized troubleshooting process:
1. **Problem Report**: Receive notification that something is wrong
2. **Telemetry Analysis**: Examine system metrics and logs to understand current state
3. **Hypothesis Generation**: Combine observations with system knowledge to identify possible causes
4. **Hypothesis Testing**: Compare observed state against theories, or actively modify the system to test predictions
5. **Root Cause Identification**: Determine the underlying cause
6. **Corrective Action**: Fix the problem and write a postmortem

## Common Pitfalls

**Symptom Misinterpretation**: Looking at irrelevant symptoms or misunderstanding metric meanings.

**Improper Testing Methodology**: Failing to change systems, inputs, or environments safely and effectively.

**Improbable Theories**: The medical adage applies: "when you hear hoofbeats, think of horses not zebras." Simpler explanations should be preferred when other factors are equal.

**Spurious Correlations**: In large complex systems with extensive monitoring, some events will inevitably correlate purely by chance. Correlation does not establish causation.

## Problem Report

Every troubleshooting effort begins with a problem report. Effective reports communicate:
- Expected behavior: What should happen
- Actual behavior: What is actually occurring
- Reproduction steps: How to trigger the behavior if possible

Best practice: Google teams discourage direct person-to-person problem reporting, instead requiring bug filing. This creates a persistent investigation record, ensures higher quality reports visible to entire teams, distributes problem-solving load fairly, and properly routes issues to on-call personnel.

## Triage

Once receiving a problem report, determine the appropriate response. Issues vary dramatically — from single-user problems with workarounds to complete global service outages.

**Critical principle**: During major outages, resist the instinct to immediately root-cause and begin deep investigation. First priority must be making the system function as well as possible under current circumstances.

This may require emergency measures:
- Diverting traffic from broken clusters to operational ones
- Dropping traffic wholesale to prevent cascading failures
- Disabling subsystems to reduce load

"Stopping the bleeding" takes priority. This approach does not preclude preserving evidence like logs for subsequent investigation.

**Aviation analogy**: Student pilots learn their first responsibility in emergencies is flying the aircraft — troubleshooting comes second.

## Examine

**Monitoring and metrics**: Time-series metrics provide excellent starting points. Graphing time-series data and performing operations on metrics effectively reveals specific component behavior and identifies correlations.

**Logging best practices**:
- Implement multiple verbosity levels adjustable without restarting processes
- For high-traffic services, use statistical sampling (e.g., one in 1,000 operations)
- Include selection languages allowing queries like "show Set RPCs below 1,024 bytes" or "operations exceeding 10ms"
- Design infrastructure enabling rapid, selective logging activation

**Current state exposure**: Expose real-time system state through endpoints showing:
- Recently sent/received RPC samples
- RPC error rates and latency histograms by type
- Current configurations

## Diagnose

### Simplify and Reduce

**Black-box testing**: Inject known test data at each step and verify expected output. Having solid, reproducible test cases dramatically accelerates debugging.

**Divide and conquer**: In multi-layer systems, examine each layer systematically from one end to the other. For data processing pipelines, this approach works well.

**Bisection method**: In exceptionally large systems, divide the system in half and examine communication between sides.

### Ask "What," "Where," and "Why"

Malfunctioning systems typically attempt something — just not what you want. Determine what it's actually doing, why it's doing that, and where resources are being used.

**Example — Spanner cluster latency**:
- Symptom: High latency and timeout RPCs
- Why? Server tasks use all CPU time, preventing progress on client requests
- Where in the server? Profiling shows CPU time goes to sorting checkpointed log entries
- Where in the log code? Regular expression evaluation against log file paths
- Solution: Rewrite the regex avoiding backtracking; consider RE2 which guarantees linear runtime

### What Touched It Last

Systems possess inertia — working systems remain in motion until external forces act (configuration changes, load type shifts). Recent changes often prove productive investigation starting points.

Well-designed systems maintain production logging tracking:
- Version deployments at all stack levels
- Configuration changes
- Package installations on cluster nodes

Correlate performance and behavior changes with system events. Annotate error rate graphs with deployment start/end times.

## Test and Treat

Test hypotheses to rule factors in or out:

**Mutual exclusivity**: Ideal tests have mutually exclusive alternatives, ruling one hypothesis group in while ruling others out.

**Likelihood ordering**: Test obvious possibilities first in decreasing likelihood order, considering system risks.

**Confounding factors**: Experiments may produce misleading results. Firewall rules permitting access only from specific IPs might make workstation pings fail even if application server pings succeed.

**Side effects**: Active tests may have side effects. Verbose logging might worsen latency problems, confusing results.

**Documentation**: Record tested ideas, conducted tests, and observed results. In complex, extended cases, this proves crucial. Clear, timestamped notes — in shared documents or real-time chat — help others stay current and provide context for postmortems.

## Case Study: App Engine Latency Investigation

An internal customer reported dramatic latency, CPU usage, and running process increases for their content-management app. No recent code changes correlated with the increases.

**Initial finding**: Latency increased nearly an order of magnitude. CPU usage and serving processes nearly quadrupled simultaneously.

**False lead**: One developer noticed correlation between latency increase and increased `merge_join` datastore API calls, suggesting suboptimal indexing. But requests for static content — served outside the datastore — were also unexpectedly slow. This proved the merge_join correlation was spurious.

**New direction**: Tracing requests revealed approximately 250ms between request receipt and first RPCs where the app was doing something untraced. No RPCs occurred during this period.

**Pragmatic response**: Facing an escalating mystery with a customer launch the following week, the team recommended increasing resources to the most CPU-rich instance type. This reduced latency to acceptable levels for the launch while investigation continued.

**Root cause discovery**: An automated security scanner ran before launch and tested the app for vulnerabilities, creating thousands of whitelist objects as a side effect. These superfluous objects required checking on every request (in memory, no RPCs), causing pathologically slow responses with no visible RPC signal. Fixing the bug and removing those objects returned performance to expected levels.

**Lesson**: The actual cause (an in-process whitelist cache explosion) generated no RPC calls and was invisible to distributed tracing tools. This required code-level instrumentation to find.

## Making Troubleshooting Easier

**Building observability**: Incorporate white-box metrics and structured logs into each component from development start. Use unique request identifiers across all RPCs generated by various components — this reduces figuring out which upstream log entry matches downstream ones.

**Well-understood interfaces**: Design systems with observable, comprehensible interfaces between components.

**State representation**: Simplify, control, and log state changes. Problems correctly representing reality in code or environment changes often necessitate troubleshooting.

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
