# Chapter 8 — Release Engineering
*Google SRE Book — Written by Dinah McNutt*

Release engineering is "a relatively new and fast-growing discipline of software engineering that can be concisely described as building and delivering software." At Google, release engineers collaborate with product development teams and SREs to establish comprehensive release procedures spanning source code management through deployment.

## Four Guiding Principles

**Self-Service Model**: Teams manage their own release processes through standardized tools and practices. Individual product teams determine release frequency and timing, with many achieving fully automated releases requiring intervention only when problems arise.

**High Velocity**: User-facing software undergoes frequent rebuilds to deploy features rapidly. This approach reduces the changes between versions, simplifying testing and troubleshooting. Some teams perform hourly builds, selecting production-ready versions based on test results. Others adopt "Push on Green" models, deploying every build passing all tests.

**Hermetic Builds**: Build processes must produce identical results across machines and times. Builds remain self-contained and insensitive to build machine installations, instead depending on known tool versions. This enables reliable cherry-picking when fixing production bugs — rebuilding at the original revision with specific subsequent changes applied.

**Enforcement of Policies and Procedures**: Gated operations control who can perform specific release actions — code approvals, release creation, integration proposals, deployment, configuration modifications. Code reviews integrate into standard developer workflows.

## Continuous Build and Deployment

**Building**: Google uses Blaze (open-sourced as Bazel) as its primary build tool, supporting C++, Java, Python, Go, and JavaScript. Engineers define build targets and dependencies; Blaze automatically constructs required dependency targets. Project-specific flags and unique build identifiers enable binary traceability to build records.

**Branching**: Code commits to the mainline exclusively. Major projects branch at specific revisions without merging changes back, preventing inadvertent inclusion of unrelated mainline modifications. Bug fixes submit to mainline, then cherry-pick into release branches — ensuring precise release contents.

**Testing**: Continuous test systems run unit tests against mainline code after each submission, enabling rapid failure detection. Release engineering recommends matching continuous build test targets to release-gating tests. Releases occur at the last successful continuous test revision to reduce subsequent failure chances.

**Packaging**: Google uses the Midas Package Manager (MPM) to distribute software to production machines. Packages receive unique hash versioning and signing for authenticity. MPM supports labeling for tracking release stages (dev, canary, production), with labels automatically transferring between package versions.

**Rapid (automated release system)**: Orchestrates builds and deployments through blueprint configuration files defining build targets, deployment rules, and administrative information. Workflows execute tasks serially or in parallel.

Typical release processes:
1. Create release branches at requested integration revisions
2. Compile binaries and execute unit tests in parallel
3. Make build artifacts available for system testing and canary deployments
4. Log results and generate comprehensive change reports

**Deployment strategies** match service risk profiles:
- Development environments may build hourly with automatic releases
- Large user-facing services expand from single clusters exponentially
- Sensitive infrastructure may span days across geographic regions

## Configuration Management

Configuration management requires close collaboration between release engineers and SREs. Google uses multiple models:

**Mainline Configuration**: Developers and SREs modify configuration at the main branch head. Changes undergo review before application. Decouples binary and configuration releases but risks skew between checked-in and running versions.

**Packaged with Binaries**: Configuration files and binaries share packages, simplifying deployment. Limits flexibility through tight binding.

**Configuration Packages**: Hermetic principles applied to configuration. Separate packages snapshot configurations alongside binaries, enabling independent updates.

**External Configuration Stores**: Frequently or dynamically changing configurations reside in Chubby, Bigtable, or other stores, allowing runtime modifications.

## Key Takeaways

**Release Engineering Integration**: Teams must budget release engineering resources during initial product development. Early implementation proves cheaper than later retrofitting.

**Collaborative Development**: Developers, SREs, and release engineers must work cooperatively from project inception. Developers should not simply "throw results over the fence" to release engineering teams.

**Lifecycle Consideration**: Given release engineering's relative youth as a discipline, managers frequently overlook it during early planning stages. Intentionally incorporate release engineering practices across entire product lifecycles.

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
