# Chapter 4 — Service Level Objectives
*Google SRE Book — Written by Chris Jones, John Wilkes, Niall Murphy, and Cody Smith*

## Key Terminology

**Service Level Indicators (SLIs)** are quantitative measurements of service aspects. Common examples include request latency, error rates, system throughput, and availability. Availability, or the fraction of the time that a service is usable, represents a critical SLI, often expressed as "nines" — 99.99% availability equals "four nines."

**Service Level Objectives (SLOs)** set target values for SLIs. An SLO follows the structure "SLI ≤ target" or establishes a range. For example, an organization might define that 99% of search requests complete within 100 milliseconds.

**Service Level Agreements (SLAs)** constitute contracts with users, specifying consequences for unmet SLOs. The distinction is straightforward: if missing targets triggers financial penalties or other consequences, you have an SLA. SREs are usually not involved in negotiating SLAs — that's a business/product function.

## Indicators in Practice

Not all metrics make good SLIs. The best SLIs directly reflect the user experience. Different system types prioritize different SLIs:

- **User-facing serving systems**: availability, latency, throughput
- **Storage systems**: latency, availability, durability
- **Data pipelines**: throughput and end-to-end latency
- **Big data systems**: throughput and end-to-end latency

**Avoid averages**: "Averaging request latencies may seem attractive, but obscures an important detail" about tail performance. Using percentiles — particularly 95th and 99th percentiles — better captures user experience than simple averages. If you run a web service with an average latency of 100ms at 1,000 RPS, 1% of requests might easily take 5 seconds. If your users depend on several such services to render their page, the 99th percentile of one backend can easily become the median response of your frontend.

## Objectives in Practice

Choosing targets:
- Don't pick targets based on current performance. If you can only do 75th percentile today, that doesn't mean 75th is the right target for users.
- Keep SLO definitions simple. Complex SLOs are hard to reason about and hard to measure accurately.
- Avoid absolutist targets (100% availability is impossible and expensive).
- Start with few SLOs and add more as you learn what matters.
- Publish internal SLOs stricter than external commitments — this provides a safety margin for handling chronic issues.

**Managing expectations**: SLOs set user expectations. If you consistently outperform your SLO, users will expect that level of performance and become upset when you only meet (not beat) the SLO. Consider intentionally degrading performance to the SLO to set correct expectations — or tighten the SLO.

## Agreements in Practice

SLAs involve the business, product, legal, and sales teams — not just engineering. SREs help define the technical SLOs that underpin SLAs but are rarely signatories to the agreements themselves.

The key questions when creating an SLA:
- What remedies are appropriate if SLOs are missed? (credits, refunds, automatic service extensions)
- What SLOs are achievable and what safety margin is needed?
- Which failure modes are excluded? (force majeure, customer-caused outages)

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
