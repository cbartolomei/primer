# Chapter 6 — Monitoring Distributed Systems
*Google SRE Book — Written by Rob Ewaschuk*

## Definitions

**Monitoring**: Collecting, processing, aggregating, and displaying real-time quantitative data about a system — query counts, error counts, processing times, server lifetimes.

**White-box monitoring**: Monitoring based on metrics exposed by the internals of the system, including logs, JVM profiling interfaces, or HTTP handlers that emit internal statistics.

**Black-box monitoring**: Testing externally visible behavior as a user would see it.

**Alert**: A notification intended to be read by a human. Alerts are classified as *tickets* (low priority), *email alerts* (medium), and *pages* (high/urgent).

**Root cause**: A defect in a software or human system that, if repaired, instills confidence that this event won't happen again in the same way. A given incident might have multiple root causes.

## Why Monitor?

- **Analyzing long-term trends**: How big is my database growing? How fast is my DAU count growing?
- **Comparing over time or experiment groups**: Are queries faster with the new DB? How much better is my cache hit rate with an extra node?
- **Alerting**: Something is broken and somebody needs to fix it right now; or something might break soon.
- **Building dashboards**: Answer basic questions about your service.
- **Conducting ad hoc retrospective analysis (debugging)**: Our latency just shot up; what else happened around the same time?

Paging a human is expensive. If an employee is at work, a page interrupts their workflow. At home, it interrupts personal time, perhaps even sleep. When pages occur too frequently, employees second-guess, skim, or even ignore alerts — sometimes missing a real page masked by noise. Effective alerting systems have good signal and very low noise.

## The Four Golden Signals

If you can only measure four metrics of your user-facing system, focus on these:

**Latency**: The time it takes to service a request. Crucially, distinguish between the latency of successful requests and failed requests. A slow error is even worse than a fast error — track error latency too, not just successful request latency.

**Traffic**: A measure of how much demand is being placed on your system. For a web service: HTTP requests per second. For streaming: network I/O rate or concurrent sessions. For key-value storage: transactions per second.

**Errors**: The rate of requests that fail, either explicitly (HTTP 500s), implicitly (HTTP 200 with wrong content), or by policy (a request over one second is considered an error for your SLO).

**Saturation**: How "full" your service is. Emphasize the resources that are most constrained — in a memory-constrained system, show memory; in an I/O-constrained system, show I/O. Note that many systems degrade in performance before they achieve 100% utilization. Latency increases are often a leading indicator of saturation.

If you measure all four golden signals and page a human when one signal is problematic, your service will be at least decently covered by monitoring.

## Symptoms Versus Causes

Your monitoring system should address two questions: what's broken, and why?

The "what's broken" indicates the **symptom**; the "why" indicates a (possibly intermediate) **cause**.

| Symptom | Cause |
|---------|-------|
| I'm serving HTTP 500s or 404s | Database servers are refusing connections |
| My responses are slow | CPUs are overloaded, or an Ethernet cable is crimped under a rack causing partial packet loss |
| Private content is world-readable | A new software push caused ACLs to be forgotten |

"What" versus "why" is one of the most important distinctions in writing good monitoring with maximum signal and minimum noise.

## Black-Box Versus White-Box

**Black-box monitoring** is symptom-oriented and represents active (not predicted) problems: "The system isn't working correctly, right now." Good for paging — forces discipline to only nag a human when a problem is already ongoing and contributing to real symptoms.

**White-box monitoring** depends on the ability to inspect system internals, such as logs or HTTP endpoints. Allows detection of imminent problems, failures masked by retries, and so on. Essential for debugging. Sometimes cause-oriented, sometimes symptom-oriented.

One person's symptom is another person's cause. Slow database reads are a symptom for the database SRE; for the frontend SRE observing a slow website, the same slow database reads are a cause.

## Worrying About Your Tail

When building a monitoring system, it's tempting to design based on the mean. The danger: CPUs and databases can easily be utilized in a very imbalanced way. At 1,000 RPS with an average latency of 100ms, 1% of requests might easily take 5 seconds. If your users depend on several such web services to render their page, the 99th percentile of one backend can easily become the median response of your frontend.

The simplest way to differentiate between a slow average and a very slow "tail" is to collect request counts bucketed by latencies (suitable for rendering a histogram), rather than actual latencies: how many requests took between 0–10ms, 10–30ms, 30–100ms, 100–300ms, etc.? Distributing the histogram boundaries approximately exponentially (by factors of roughly 3) is often an easy way to visualize the distribution.

## Choosing Resolution for Measurements

Different aspects of a system should be measured with different levels of granularity:

- Observing CPU load over a minute won't reveal quite long-lived spikes that drive high tail latencies.
- For a service targeting 99.9% uptime, probing for success more than once or twice a minute is probably unnecessary.
- Checking hard drive fullness more than once every 1–2 minutes is probably unnecessary.

Collecting per-second measurements of CPU might yield interesting data, but may be very expensive to collect, store, and analyze. Reduce costs by sampling internally, then aggregating externally.

## As Simple as Possible, No Simpler

Piling all these requirements together can add up to a very complex monitoring system — alerts on different latency thresholds at different percentiles, extra code to detect causes, associated dashboards for each cause. Monitoring can become so complex that it's fragile, complicated to change, and a maintenance burden.

Guidelines for simplicity:
- The rules that catch real incidents most often should be as simple, predictable, and reliable as possible.
- Data collection, aggregation, and alerting configuration that is rarely exercised (less than once a quarter) should be up for removal.
- Signals that are collected but not exposed in any dashboard nor used by any alert are candidates for removal.

## Tying These Principles Together

When creating rules for monitoring and alerting, ask:

- Does this rule detect an otherwise undetected condition that is urgent, actionable, and actively or imminently user-visible?
- Will I ever be able to ignore this alert, knowing it's benign?
- Does this alert definitely indicate that users are being negatively affected?
- Can I take action in response to this alert? Is that action urgent, or could it wait until morning? Could the action be safely automated?

The fundamental philosophy on pages:
- Every time the pager goes off, I should be able to react with a sense of urgency. I can only react with urgency a few times a day before I become fatigued.
- Every page should be actionable.
- Every page response should require intelligence. If a page merely merits a robotic response, it shouldn't be a page.
- Pages should be about a novel problem or an event that hasn't been seen before.

## Monitoring for the Long Term

It's important that decisions about monitoring be made with long-term goals in mind. Every page that happens today distracts a human from improving the system for tomorrow.

**Case: Bigtable over-alerting**: The Bigtable service's SLO was based on mean performance driven by a large tail — worst 5% of requests were significantly slower. Both email and paging alerts were firing voluminously. The team spent significant time triaging alerts to find the few that were actionable. Resolution: temporarily dialed back the SLO target, disabled email alerts, and used the breathing room to fix the underlying problems in Bigtable and the storage stack.

**Key insight**: A common theme — a tension between short-term and long-term availability. Taking a controlled, short-term decrease in availability is often a painful but strategic trade for long-run stability. It's important not to think of every page as an event in isolation, but to consider whether the overall level of paging leads toward a healthy system with a healthy, viable team.

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
