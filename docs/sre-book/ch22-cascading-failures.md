# Chapter 22 — Addressing Cascading Failures
*Google SRE Book*

A cascading failure is "a failure that grows over time as a result of positive feedback" — when one component's failure increases the likelihood that other portions will fail, creating a domino effect.

## Causes of Cascading Failures

### Server Overload

The most prevalent trigger: when one cluster fails, remaining infrastructure absorbs increased traffic beyond its capacity.

Prevention approaches:
- Load testing to identify breaking points
- Serving degraded results instead of complete ones
- Implementing request rejection at saturation
- Strategic rate limiting at reverse proxies, load balancers, or individual tasks
- Proper capacity planning with N+2 redundancy models

### Resource Exhaustion

**CPU exhaustion** leads to slower processing, increased concurrent requests, queue saturation, thread starvation, and RPC deadline violations.

**Memory pressure** causes task eviction, garbage collection cycles (particularly the GC death spiral in Java), and reduced cache efficiency.

**Thread and file descriptor depletion** prevents network connection establishment and health check responses.

These constraints interact dynamically — exhausting one resource often cascades through others, complicating diagnosis during outages.

### Queue Management

Most thread-pool servers queue incoming requests. While queuing absorbs traffic bursts, excessive queue lengths increase latency and memory consumption. **Smaller queues relative to thread pools encourage early rejection, which is often preferable to prolonged waits.** Systems handling bursty traffic may justify larger queues based on request processing time and burst frequency.

### Load Shedding and Graceful Degradation

Load shedding drops requests as the system approaches overload. Effective triggers include CPU usage, memory consumption, or queue length thresholds. Can be implemented per-task through HTTP 503 responses or via queue algorithm changes (LIFO instead of FIFO, or controlled delay approaches).

Graceful degradation reduces computational work — searching partial caches instead of complete databases, using faster but less accurate algorithms, or skipping non-essential enrichments like images or suggestions.

**Implementation considerations**:
- Graceful degradation rarely activates during normal operation — test it regularly
- Monitor activation frequency and alert on anomalies
- Avoid excessive complexity that might trigger unintended transitions
- Maintain configuration flexibility for quick adjustments

### Retry Hazards

Naive retry implementations amplify failures. When backends reject overloaded requests, retries add to existing load, causing exponential request growth that can melt down systems entirely.

**Retry best practices**:
- Always employ randomized exponential backoff with jitter
- Limit retries per individual request
- Implement service-wide retry budgets
- **Avoid retry amplification across multiple layers**: three layers with four attempts each create 64 total attempts (4³)
- Distinguish between retriable and permanent error codes
- Return specific overload indicators that discourage retries

### Deadline Management

RPC deadlines limit resource consumption by defining acceptable response wait times. Without deadlines, or with excessively high ones, servers waste resources on requests clients have already abandoned.

**Deadline propagation**: Pass remaining time down the call stack. If Server A allocates 30 seconds but consumes 7 seconds before calling Server B, it forwards a 23-second deadline. Each layer checks available time before continuing work.

**Bimodal latency problems**: When a small percentage of requests hang indefinitely (due to unavailable backends), with 100-second deadlines, just 5% of hanging requests can consume thread capacity meant for hundreds of normal requests, causing the system to reject 80% of all traffic despite only 5% being genuinely unavailable.

**Mitigation strategies**:
- Monitor latency distributions, not just averages
- Implement fail-fast mechanisms for unavailable backends
- Avoid deadlines orders of magnitude longer than mean latency

**Cancellation propagation**: Reduce wasted work by notifying servers that requests are no longer needed. Systems using hedged requests (sending to primary and backup servers) should cancel secondary requests once the primary responds.

## Slow Startup and Cold Caches

New processes operate inefficiently due to:
- Required initialization (connection establishment, class loading)
- JIT compilation and hotspot optimization (Java)
- Empty application caches

Cold cache scenarios arise from cluster additions, post-maintenance restarts, or cache expiration.

**Strategies for cache-dependent services**:
- Overprovision capacity for empty cache scenarios
- Distinguish **latency caches** (performance optimization) from **capacity caches** (hard dependencies)
- Gradually increase load to warm caches before ramping to full capacity
- Consider separate caching layers (memcache) to share state across servers

## Triggering Conditions

Cascading failures typically initiate through:
- **Process death** from crashes, assertion failures, or "queries of death"
- **Binary or configuration updates** affecting large task populations simultaneously
- **Organic growth** exceeding capacity planning assumptions
- **Planned maintenance** reducing available capacity
- **Request profile changes** altering per-request resource costs
- **Resource limit exhaustion** from cluster overcommitment

## Testing Strategies

### Load Testing Until Failure

Understanding system behavior under overload is essential:
- Gradually and abruptly increase load to identify breaking points
- Observe degradation modes (error rates versus request volume)
- Test recovery from heavy load back to nominal levels
- Verify cache warming behavior

Test individual components separately — different subsystems reach their limits at different thresholds.

### Production Testing

Controlled failure injection on real traffic:
- Reduce task counts beyond expected patterns
- Simulate rapid cluster capacity loss
- Blackhole specific backends

Execute with available overflow capacity and manual failover options ready.

## Recovery Actions

Once a cascading failure is underway:

**Add resources**: Increase task counts if idle capacity exists, though this fails if the service has entered a death spiral.

**Disable health checks temporarily**: If the health-checking system itself creates failure through restart cycles (but distinguish process health from service health).

**Restart servers**: If they're wedged due to GC death spirals, deadlocks, or in-flight requests without deadlines.

**Drop traffic aggressively**: Reduce load to perhaps 1% of normal to allow servers to stabilize, warm caches, and establish connections before gradually ramping back up. Requires first addressing the triggering condition.

**Enter degraded modes**: Drop non-critical traffic or reduce result quality.

**Eliminate batch load**: Stop indexing, data copying, or statistics gathering.

**Block bad traffic**: Problematic queries or data patterns causing crashes.

## Closing Perspective

When systems exceed their capacity, quality must degrade rather than attempting to serve all requests perfectly. Understanding system breaking points, failure modes, and recovery mechanisms proves critical for preventing catastrophic outages.

Changes intended to improve steady-state performance — retries, load shifting, health-check killing, caching — can paradoxically increase outage risk if not carefully evaluated for failure scenario impacts.

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
