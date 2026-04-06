# Chapter 3 — Embracing Risk
*Google SRE Book — Written by Marc Alvidrez*

You might expect Google to try to build 100% reliable services—ones that never fail. It turns out that past a certain point, however, increasing reliability is worse for a service (and its users) rather than better. Extreme reliability comes at a cost: maximizing stability limits how fast new features can be developed and how quickly products can be delivered to users, and dramatically increases their cost, which in turn reduces the numbers of features a team can afford to offer. Further, users typically don't notice the difference between high reliability and extreme reliability in a service, because the user experience is dominated by less reliable components like the cellular network or the device they are working with. Put simply, a user on a 99% reliable smartphone cannot tell the difference between 99.99% and 99.999% service reliability. With this in mind, rather than simply maximizing uptime, SRE seeks to balance the risk of unavailability with the goals of rapid innovation and efficient service operations.

## Managing Risk

Unreliable systems can quickly erode users' confidence, so we want to reduce the chance of system failure. However, experience shows that as we build systems, cost does not increase linearly as reliability increments — an incremental improvement in reliability may cost 100x more than the previous increment. The costliness has two dimensions:

**The cost of redundant machine/compute resources**: The cost associated with redundant equipment that allows us to take systems offline for routine or unforeseen maintenance, or provides space for parity code blocks that provide a minimum data durability guarantee.

**The opportunity cost**: The cost borne by an organization when it allocates engineering resources to build systems or features that diminish risk instead of features that are directly visible to or usable by end users.

In SRE, we manage service reliability largely by managing risk. We conceptualize risk as a continuum. Our goal is to explicitly align the risk taken by a given service with the risk the business is willing to bear. We strive to make a service reliable enough, but no more reliable than it needs to be. That is, when we set an availability target of 99.99%, we want to exceed it, but not by much: that would waste opportunities to add features to the system, clean up technical debt, or reduce its operational costs. In a sense, we view the availability target as both a minimum and a maximum.

## Measuring Service Risk

To make this problem tractable and consistent across many types of systems we run, we focus on *unplanned downtime*. For most services, the most straightforward way of representing risk tolerance is in terms of the acceptable level of unplanned downtime, usually expressed in terms of the number of "nines": 99.9%, 99.99%, or 99.999% availability.

**Time-based availability**: uptime / (uptime + downtime). A system with an availability target of 99.99% can be down for up to 52.56 minutes in a year.

**Aggregate availability**: At Google, instead of using time-based metrics, we define availability in terms of the *request success rate*: successful requests / total requests. A system that serves 2.5M requests in a day with a daily availability target of 99.99% can serve up to 250 errors and still hit its target.

## Risk Tolerance of Consumer Services

Factors to consider when assessing the risk tolerance of services:

- **Target level of availability**: What level of service will users expect? Does this service tie directly to revenue? Is this a paid service?
- **Types of failures**: Is it worse to have a constant low rate of failures, or an occasional full-site outage? Consider the difference between profile pictures failing to render vs. private contacts being shown to another user — the second might warrant taking the service down entirely.
- **Cost**: If building one more nine of availability costs $900 but only generates $500 in revenue, it's not worth it.

## Motivation for Error Budgets
*Written by Mark Roth*

Product development performance is largely evaluated on product velocity (ship fast). SRE performance is evaluated on reliability (don't break things). This creates inherent tension.

**The error budget solution**: Product Management defines an SLO. The actual uptime is measured by the monitoring system. The difference is the "budget" of how much unreliability is allowed. As long as uptime is above the SLO — as long as there is error budget remaining — new releases can be pushed.

For example: a service's SLO is to successfully serve 99.999% of all queries per quarter. The error budget is a failure rate of 0.001%. If a problem causes 0.0002% of queries to fail, the problem spends 20% of the service's quarterly error budget.

**Benefits**: When the budget is large, product developers can take more risks. When the budget is nearly drained, the product developers themselves will push for more testing or slower push velocity. The product development team becomes self-policing.

**Key insights**:
- 100% is probably never the right reliability target: it's typically more reliability than users want or notice.
- An error budget aligns incentives and emphasizes joint ownership between SRE and product development.
- Error budgets make it easier to decide the rate of releases and defuse discussions about outages without rancor.

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
