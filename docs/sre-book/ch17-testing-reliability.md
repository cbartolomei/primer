# Chapter 17 — Testing for Reliability
*Google SRE Book — Written by Alex Perry and Max Luebbe*

> If you haven't tried it, assume it's broken.

## Introduction

One key responsibility of SREs is to quantify confidence in the systems they maintain. Confidence can be measured both by past reliability and future reliability. Testing is the mechanism you use to demonstrate specific areas of equivalence when changes occur. Each test that passes both before and after a change reduces the uncertainty for which analysis needs to allow. Thorough testing helps us predict the future reliability of a given site with enough detail to be practically useful.

## Relationships Between Testing and Mean Time to Repair

Passing a series of tests doesn't necessarily prove reliability. However, **tests that are failing generally prove the absence of reliability**.

A monitoring system can uncover bugs, but only as quickly as the reporting pipeline can react. The Mean Time to Repair (MTTR) measures how long it takes the operations team to fix the bug.

It's possible for a testing system to identify a bug with **zero MTTR**. Zero MTTR occurs when a system-level test is applied to a subsystem and detects the exact same problem that monitoring would detect — enabling a push to be blocked so the bug never reaches production. The more bugs you can find with zero MTTR, the higher the Mean Time Between Failures (MTBF) experienced by users.

## Types of Software Testing

Software tests broadly fall into two categories: **traditional** (evaluate correctness offline during development) and **production** (performed on a live web service).

## Traditional Tests

### Unit Tests

The smallest and simplest form of software testing. Assess a separable unit of software — a class or function — for correctness independent of the larger system. Unit tests also serve as a form of specification to ensure a function exactly performs the behavior required.

### Integration Tests

Software components that pass individual unit tests are assembled into larger components and tested together. **Dependency injection** (with tools such as Dagger) is an extremely powerful technique for creating mocks of complex dependencies — replacing a stateful database with a lightweight mock that has precisely specified behavior.

### System Tests

The largest scale test that engineers run for an undeployed system. All modules belonging to a specific component are assembled into the system and tested end-to-end. System tests come in several flavors:

**Smoke tests**: Test very simple but critical behavior to short-circuit additional, more expensive testing. Also known as sanity testing.

**Performance tests**: Ensure that the performance of the system stays acceptable over time. A given program may evolve to need 32 GB of memory when it formerly only needed 8 GB; a 10ms response time might turn into 50ms then 100ms. Performance tests catch this before it reaches users.

**Regression tests**: Prevent bugs from sneaking back into the codebase. Analogous to a gallery of rogue bugs that historically caused failures — document them as tests so engineers refactoring the codebase can be sure they don't reintroduce them.

**Cost**: Unit tests complete in milliseconds on a laptop. Integration tests take minutes. System tests bringing up a complete server with dependencies can take hours. Mindfulness of these costs is essential to developer productivity.

## Production Tests

Production tests interact with a live production system. These are in many ways similar to black-box monitoring and are sometimes called black-box testing.

### Configuration Tests

At Google, web service configurations are stored in version control. For each configuration file, a configuration test examines production to see how a particular binary is actually configured and reports discrepancies against that file. These tests are inherently not hermetic — they operate outside the test infrastructure sandbox.

Configuration tests are especially valuable as part of distributed monitoring since the pattern of passes/fails across production can identify paths through the service stack that don't have sensible combinations of local configurations.

### Stress Tests

Engineers use stress tests to find the limits on a web service:
- How full can a database get before writes start to fail?
- How many queries per second can an application server handle before it becomes overloaded?

Many components don't gracefully degrade beyond a certain point — they catastrophically fail. Understanding where those limits are is essential for capacity planning.

### Canary Tests

A subset of servers is upgraded to a new version or configuration and left in an **incubation period** ("baking the binary"). If no unexpected variances occur, the release continues and remaining servers are upgraded progressively. If anything goes wrong, the modified servers can be quickly reverted to a known good state.

A canary test isn't really a test — it's structured user acceptance. It exposes code to less predictable live production traffic and doesn't always catch newly introduced faults.

**Bug order**: Most bugs are of order 1 — they scale linearly with user traffic. Higher-order bugs (order 2+) are rarer but much more dangerous:
- U=1: The user's request encountered code that is simply broken
- U=2: This user's request randomly damages data that a future user's request may see
- U=3: The randomly damaged data is also a valid identifier to a previous request

## Creating a Test and Build Environment

When joining a project with low or no test coverage, start by asking:
- Can you prioritize the codebase? If every task is high priority, none are.
- Are there particular functions or classes that are absolutely mission-critical? Billing code, for example, is frequently cleanly separable and high-priority.
- Which APIs are other teams integrating against? Breakage that confuses another developer team can be extremely harmful.

**One way to establish a strong testing culture**: Start documenting all reported bugs as test cases. If every bug is converted into a test, each test initially fails because the bug hasn't been fixed. As engineers fix bugs, the software passes testing — building a comprehensive regression test suite.

**Continuous build system**: Build the software and run tests every time code is submitted. The build system notifies engineers the moment a change breaks a software project. Engineers should drop all other tasks and prioritize fixing the problem because:
- It's harder to fix what's broken if there are changes to the codebase after the defect is introduced
- Broken software slows down the team because they must work around the breakage
- The ability to respond to emergency releases (e.g., security vulnerability disclosure) becomes much more complex

**Stability drives agility**: When the build is predictably solid and reliable, developers can iterate faster.

## Testing at Scale

### Testing Disaster Recovery Tools

Many disaster recovery tools can be carefully designed to operate offline:
- Compute a checkpoint state equivalent to cleanly stopping the service
- Push the checkpoint state to be loadable by existing nondisaster validation tools
- Support release barrier tools that trigger the clean start procedure

If any of these constraints (offline, checkpoint, loadable, barrier, clean start) must be broken, it's much harder to demonstrate confidence that the tool implementation will work on short notice.

### Statistical Testing

Statistical techniques — like fuzzing, Chaos Monkey, and Jepsen for distributed state — aren't necessarily repeatable tests. But they are useful:
- They can provide a log of all randomly selected actions taken in a given run (sometimes just the RNG seed)
- Variations in how faults are expressed help pinpoint suspicious code areas
- Some runs may demonstrate failure situations more severe than the original

### Testing Deadlines

Most tests are simple — they run as self-contained hermetic binaries in small compute containers for a few seconds. These tests give engineers interactive feedback about mistakes before they switch context. Test results are best given to engineers before they switch context, because otherwise the next context may involve extended waiting during compilation.

Tests that require orchestration across many binaries tend to have startup times measured in seconds — they can't offer interactive feedback and serve as batch tests for code review rather than for development.

## Key Principle: Shorter Feedback Cycles

Effective API management and modern tooling now support building and executing a new software version every few minutes. A sufficiently large team could complete testing on each new version and achieve the same quality bar for each incremental version. In addition to the annual versions, the intermediate versions of the code are also tested. Using intermediates, you can unambiguously map problems found during testing back to their underlying causes.

**The shorter the feedback cycle, the higher the quality of the resulting release** — not because different tests are applied, but because problems are caught and fixed before they compound.

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
