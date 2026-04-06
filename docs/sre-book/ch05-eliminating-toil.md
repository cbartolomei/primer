# Chapter 5 — Eliminating Toil
*Google SRE Book — Written by Vivek Rau*

> "If a human operator needs to touch your system during normal operations, you have a bug. The definition of normal changes as your systems grow."
> — Carla Geisser, Google SRE

## Toil Defined

Toil should not be confused with work someone simply dislikes or administrative obligations. "Overhead" (meetings, hiring, performance reviews, documentation) is not toil — it's legitimate overhead. Even challenging or unglamorous work can be legitimate engineering if it generates lasting improvements: reorganizing alerting systems or removing configuration clutter qualifies as project work, not toil.

True toil consists of work directly connected to production service operations that is:

**Manual**: Executing scripts that perform automated functions. Even if running a script is faster than doing it by hand, the active human time invested is toil.

**Repetitive**: Performing identical tasks consistently. Novel problem-solving doesn't constitute toil — it's the second, third, hundredth time you do the same thing.

**Automatable**: Tasks that machines could execute with equal effectiveness, or that could be eliminated through better design.

**Tactical**: Responding to interruptions rather than strategic work. Handling pager notifications is toil.

**No enduring value**: When the service remains unchanged following task completion, that work was probably toil.

**O(n) with service growth**: When task effort scales proportionally with service size, traffic volume, or user base, that task is probably toil. Well-managed services should accommodate at least tenfold growth without corresponding increases in effort.

## Why Less Toil Is Better

Google's SRE organization maintains an explicit target of keeping operational work below 50% of individual SRE hours. The remaining time concentrates on engineering projects that either reduce future toil or enhance service capabilities.

The 50% threshold exists because unrestricted toil expands and rapidly consumes entire schedules. When recruiting SREs, organizations promise that SRE differs fundamentally from typical operations roles — this commitment requires maintaining organizational discipline.

**Calculating toil**: On-call participation establishes a baseline toil floor. A representative SRE in a 6-person rotation is on-call ~2 weeks per 6-week span — approximately 33% baseline. Survey data confirms that interrupts (non-urgent service communications) represent the primary toil source, followed by on-call response, then release processes.

## What Qualifies as Engineering?

Engineering work demonstrates novelty, demands human judgment, and generates permanent service improvements. It enables teams to manage larger or multiple services without proportional staffing increases.

Typical SRE activity categories:
- **Software engineering**: Code creation/modification, automation scripts, tools/frameworks, reliability feature implementation.
- **Systems engineering**: Production system configuration producing lasting improvements — monitoring setup, load balancer configuration, OS parameter optimization.
- **Toil**: Repetitive, manual work directly connected to service operations.
- **Overhead**: Administrative work disconnected from service operations.

## Is Toil Always Bad?

Toil in modest quantities can be fine. Predictable, repetitive activities can prove soothing. They generate accomplishment sensations and deliver immediate wins. Toil becomes detrimental when accumulated in significant quantities:

**Career stagnation**: Professional advancement decelerates when insufficient time goes toward projects.

**Low morale**: Everyone possesses limits. Excessive toil precipitates burnout, tedium, and dissatisfaction.

**Creates confusion**: SRE organizations work extensively to establish that they function as engineering groups. Team members engaging in excessive toil undermine this identity.

**Slows progress**: Product feature advancement decelerates when SRE teams concentrate on manual operations rather than engineering.

**Sets precedent**: Excessive toil acceptance motivates development counterparts to assign additional operations tasks to SRE.

**Promotes attrition**: Talented engineers will pursue more fulfilling opportunities elsewhere.

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
