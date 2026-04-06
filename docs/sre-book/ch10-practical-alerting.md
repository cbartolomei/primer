# Chapter 10 — Practical Alerting from Time-Series Data
*Google SRE Book — Written by Jamie Wilkinson*

> May the queries flow, and the pager stay silent.
> — Traditional SRE blessing

## The Rise of Borgmon (and Prometheus)

Rather than executing custom scripts to identify system failures, Borgmon (Google's internal monitoring system) relies on standardized data exposition formats. This enables large-scale collection with minimal overhead and avoids subprocess execution and network connection establishment costs — "white-box monitoring."

The collected data serves dual purposes: rendering charts and creating alerts through simple arithmetic. Since collection occurs in persistent processes rather than short-lived ones, historical data can inform alert computations.

**Note on external equivalents**: In recent years, tools including Riemann, Heka, Bosun, and Prometheus have emerged as open-source alternatives sharing Borgmon's time-series-based alerting approach. Prometheus particularly mirrors Borgmon's design, especially when comparing rule languages.

## Instrumentation of Applications

The `/varz` HTTP handler presents exported variables as plain text, space-separated key-value pairs, one per line:

```
http_requests 37
errors_total 12
```

Map-valued variables permit multiple labels and export value tables or histograms:

```
http_responses map:code 200:25 404:0 500:12
```

This schemaless textual interface significantly reduces instrumentation barriers. The Go `expvar` library provides an equivalent API.

## Storage in the Time-Series Arena

Borgmon stores data in an in-memory database, regularly checkpointed to disk. Data points follow the form (timestamp, value) and are stored in chronological lists called **time-series**, named by unique label sets in `name=value` format.

Time-series are named like:

```
{var=http_requests,job=webserver,instance=host0:80,service=web,zone=us-west}
```

Queries need not specify all labels — labelset searches return all matching time-series as vectors. The structure comprises fixed-size memory blocks called the **time-series arena** with a garbage collector expiring oldest entries when full.

Single data points require roughly 24 bytes of memory, enabling 1 million unique time-series over 12 hours at 1-minute intervals in under 17 GB of RAM. Periodically, in-memory state archives to an external Time-Series Database (TSDB) for long-term storage.

## Rule Evaluation

Borgmon rules are simple algebraic expressions that compute time-series from other time-series. They can query single time-series history (time axis), query different label subsets from many time-series simultaneously (space axis), and apply mathematical operations.

**Aggregation** forms the cornerstone. Computing total queries-per-second rates means summing all query counter change rates across all tasks.

**Counters vs. gauges**: A counter is any monotonically non-decreasing variable (like total requests served). A gauge can take any value (like current memory usage). Borgmon-style collection favors counters since they retain meaning when events occur between sampling intervals.

Example — computing request rates:

```
# Compute per-task request rate from request count
{var=task:http_requests:rate10m,job=webserver} =
  rate({var=http_requests,job=webserver}[10m]);

# Sum rates for cluster aggregate
{var=dc:http_requests:rate10m,job=webserver} =
  sum without instance({var=task:http_requests:rate10m,job=webserver})
```

The `rate()` function returns total delta divided by total time between earliest and latest values.

## Alerting

Alerting rules evaluate to either true (triggering alerts) or false. To prevent "flapping" (rapid toggle states), rules specify minimum durations:

```
{var=dc:http_errors:ratio_rate10m,job=webserver} > 0.01
  and by job, error
{var=dc:http_errors:rate10m,job=webserver} > 1
  for 2m
  => ErrorRatioTooHigh
    details "webserver error ratio at %trigger_value%"
    labels { severity=page };
```

This fires only when both the error ratio exceeds 1% AND the absolute error rate exceeds 1/second, sustained for at least 2 minutes.

Alertmanager receives Alert RPCs and directs notifications appropriately. Its configurations enable:
- Inhibiting certain alerts when others activate
- Deduplicating alerts from multiple monitoring instances with identical labelsets
- Fanning alerts in or out based on labelsets

## Sharding the Monitoring Topology

Borgmon imports time-series from other Borgmon instances, creating hierarchical aggregation:
- One per-datacenter Borgmon monitors all location jobs
- Two or more global Borgmon perform top-level aggregation
- Upper-tier Borgmon filter desired lower-tier data, preventing arena flooding

## Black-Box Monitoring

White-box monitoring provides visibility into internal states but means you're only aware of expected failures. Only arrived queries appear visible; DNS-error-lost queries disappear.

Google addresses this with **Prober** — running protocol checks against targets and reporting success or failure. Prober validates protocol response payloads (like HTTP response HTML contents) and exports response time histograms by operation type for slicing and dicing user-visible performance.

Monitoring both load-balanced domains and individual datacenter servers behind load balancers enables detecting localized failures and suppressing alerts appropriately.

## Maintaining the Configuration

Borgmon configuration separates rule definitions from monitored targets — identical rule sets apply to many targets without rewriting nearly identical configurations. Language templates enable reusable rule libraries.

Two major template classes have emerged:
1. Templates codifying variable export schemas from specific code libraries, enabling library users to reuse template varz
2. Templates managing aggregation from single-server tasks through global service footprints

**Key insight from ten years with Borgmon**: Treating time-series data as alert generation sources, rather than running check-and-alert scripts per target, decouples system scaling from alerting rule scaling. Rules cost less to maintain through a common time-series format abstraction. This ensures that monitoring maintenance costs scale sublinearly with service sizes — a critical property for sustainability.

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
