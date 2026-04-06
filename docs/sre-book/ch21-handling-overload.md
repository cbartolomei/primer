# Chapter 21 — Handling Overload
*Google SRE Book — Written by Alejandro Forero Cuervo*

Avoiding overload is a goal of load balancing policies. But no matter how efficient your load balancing policy, eventually some part of your system will become overloaded. Gracefully handling overload conditions is fundamental to running a reliable serving system.

Under extreme overload, the service might not even be able to compute and serve degraded responses — at this point it may have no immediate option but to serve errors. It's best to build clients and backends to handle resource restrictions gracefully: redirect when possible, serve degraded results when necessary, and handle resource errors transparently when all else fails.

## The Pitfalls of "Queries per Second"

Modeling capacity as "queries per second" makes for a poor metric because different queries can have vastly different resource requirements. Even if QPS metrics perform adequately at one point in time, the ratios can change — sometimes drastically (e.g., a new version suddenly makes some features require significantly fewer resources).

A better solution is to measure capacity directly in available resources. Use CPU cores and memory as the unit. We often speak about the *cost* of a request to refer to a normalized measure of how much CPU time it has consumed.

In a majority of cases, simply using CPU consumption as the signal for provisioning works well:
- In platforms with garbage collection, memory pressure naturally translates into increased CPU consumption.
- In other platforms, it's possible to provision remaining resources such that they're very unlikely to run out before CPU runs out.

## Per-Customer Limits

When global overload occurs, it's vital that the service only delivers error responses to misbehaving customers, while other customers remain unaffected. Service owners provision capacity based on negotiated usage with their customers and define per-customer quotas.

Example limits for a backend service with 10,000 CPUs allocated worldwide:
- Gmail: up to 4,000 CPU seconds per second
- Calendar: up to 4,000 CPU seconds per second
- Android: up to 3,000 CPU seconds per second
- Google+: up to 2,000 CPU seconds per second
- Every other user: up to 500 CPU seconds per second

Note: these numbers may add up to more than 10,000 CPUs. The service owner is relying on the fact that it's unlikely for all customers to hit their resource limits simultaneously.

## Client-Side Throttling and Adaptive Throttling

When a customer is out of quota, a backend should reject requests quickly. But if the amount of rejected requests is significant, those rejections still consume resources. If enough requests are rejected, the backend can become overloaded even though most CPU is spent just rejecting requests.

**Adaptive throttling** solves this: when a client detects that a significant portion of its recent requests have been rejected, it starts self-regulating and caps the amount of outgoing traffic — requests above the cap fail locally without even reaching the network.

Each client task keeps the following for the last two minutes of history:
- **requests**: The number of requests attempted by the application layer
- **accepts**: The number of requests accepted by the backend

Under normal conditions, these two values are equal. As the backend starts rejecting traffic, `accepts` becomes smaller than `requests`. Clients continue to issue requests until `requests` is K times as large as `accepts` (typically K=2), at which point the client begins self-regulating.

Reducing the K multiplier (e.g., to 1.1) makes adaptive throttling more aggressive. We generally prefer the 2x multiplier — allowing more requests than expected to reach the backend wastes resources but speeds up propagation of state changes from the backend.

## Criticality

Requests are associated with one of four criticality values:

**CRITICAL_PLUS**: Reserved for the most critical requests — those that will result in serious user-visible impact if they fail.

**CRITICAL**: Default for production jobs. Results in user-visible impact, but less severe than CRITICAL_PLUS. Services should provision enough capacity for all expected CRITICAL and CRITICAL_PLUS traffic.

**SHEDDABLE_PLUS**: Traffic for which partial unavailability is expected. Default for batch jobs, which can retry minutes or hours later.

**SHEDDABLE**: Traffic for which frequent partial unavailability and occasional full unavailability is expected.

When a customer runs out of quota, a backend task will only reject requests of a given criticality if it's already rejecting all requests of all lower criticalities. When a task is itself overloaded, it rejects lower criticality requests sooner. The criticality of a request automatically propagates to all downstream RPCs.

## Utilization Signals

Task-level overload protection is based on **utilization** — typically CPU rate, but can also factor in memory usage. As utilization approaches configured thresholds, requests are rejected based on criticality.

The **executor load average** is the most generally useful signal: count the number of active threads in the process (currently running or ready to run and waiting for a free processor), smoothed with exponential decay. The task starts rejecting requests as active threads grow beyond available processors.

## Handling Overload Errors

When receiving a "task overloaded" error:

1. **Large subset of backends overloaded**: Don't retry. Let errors bubble up to the caller (return an error to the end user).
2. **Small subset of backends overloaded** (more typical): Retry the request immediately on a different task.

**Retry budgets**:
- Per-request: up to 3 attempts. If a request fails 3 times, the whole datacenter is likely overloaded.
- Per-client: track the ratio of requests that are retries. Only retry while this ratio stays below 10%.

**Critical rule**: Retries should only happen at the layer immediately above the failing layer. If multiple layers retry independently, the result is a combinatorial explosion. A 3-layer stack with 4 retries per layer = 64 total attempts (4³).

When a backend decides to reject a retry, it should return an "overloaded; don't retry" response code specifically. This prevents retry amplification up the stack.

## Conclusions

A backend task provisioned to serve a certain traffic rate should continue to serve at that rate without significant latency impact, regardless of how much excess traffic is thrown at it — up to 2x or even 10x what the task is provisioned to process.

It's a common mistake to assume an overloaded backend should stop accepting all traffic. We actually want the backend to continue accepting as much traffic as possible, but to only accept that load as capacity frees up. A well-behaved backend should accept only the requests it can process and reject the rest gracefully.

Load balancing often requires deep understanding of a system and the semantics of its requests. There is no magic bullet — the techniques in this chapter have evolved along with the needs of many systems and will likely continue to evolve.

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
