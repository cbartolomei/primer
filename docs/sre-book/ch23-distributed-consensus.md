# Chapter 23 — Managing Critical State: Distributed Consensus for Reliability
*Google SRE Book — Written by Laura Nolan*

## Core Problem Statement

Systems require agreement on critical questions:
- Which process leads a group?
- What processes comprise the group?
- Has a queue message been successfully committed?
- Does a process hold a lease?
- What datastore value exists for a given key?

"The distributed consensus problem deals with reaching agreement among a group of processes connected by an unreliable communications network."

## CAP Theorem

Distributed systems cannot simultaneously provide:
- **Consistent** data views at each node
- **Available** responses at each node
- **Partition tolerance** (network partition tolerance)

Because network partitions are inevitable (cables get cut, packets get lost due to congestion, hardware breaks, networking components become misconfigured), engineers must choose between consistency and availability when partitions occur.

## Common Failure Cases

### The Split-Brain Problem

A content repository using two replicated file servers in different racks implemented STONITH (Shoot The Other Node in the Head) for failover. When networks became slow or dropped packets, both servers would issue STONITH commands and assume leadership simultaneously, causing data corruption.

"The system is trying to solve a leader election problem using simple timeouts. Leader election is a reformulation of the distributed asynchronous consensus problem, which **cannot be solved correctly by using heartbeats**."

### Why Gossip Protocols Aren't Enough

A system using gossip protocols for cluster discovery experienced split-brain when network partitions caused both sides to elect masters independently, leading to data corruption.

Ad hoc solutions using heartbeats or gossip protocols inevitably fail under real-world conditions.

## Distributed Consensus Fundamentals

**FLP Impossibility Result**: "Technically, solving the asynchronous distributed consensus problem in bounded time is impossible." No asynchronous distributed consensus algorithm can guarantee progress in the presence of an unreliable network. Practical systems overcome this through sufficient healthy replicas, adequate connectivity, and randomized backoffs.

**Crash-recover algorithms** are more useful than crash-fail algorithms since real systems experience transient failures.

## Paxos Protocol

Paxos operates through a sequence of proposals with increasing sequence numbers:

**Phase 1**: Proposer sends a sequence number to acceptors. Acceptors agree only if they haven't seen a higher sequence number.

**Phase 2**: If the proposer receives majority agreement, it commits the proposal with a value.

"The strict sequencing of proposals solves any problems relating to ordering of messages in the system. The requirement for a majority to commit means that two different values cannot be committed for the same proposal, because any two majorities will overlap in at least one node."

Acceptors must journal commitments to persistent storage to honor guarantees after restarts.

**Multi-Paxos** uses a stable leader, reducing consensus to one round trip under normal conditions. Initial `Prepare`/`Promise` phase establishes a numbered view; subsequent operations send only `Accept` messages.

**Dueling proposers problem**: When multiple processes attempt leadership simultaneously, proposals repeatedly interrupt each other, causing livelock. Practical systems address this by electing a single proposer or using a rotating proposer.

## System Architecture Patterns

### Replicated State Machines (RSM)

RSMs execute identical operations in identical order across multiple processes. Consensus algorithms order operations globally; RSMs execute those ordered operations. "Any deterministic program can be implemented as a highly available replicated service by being implemented as an RSM."

### Leader Election

Consensus-based leader election ensures mutual exclusion — only one leader executes work at any time. This enables "a highly available service by writing it as though it was a simple program, replicating that process and using leader election."

### Distributed Locks and Leases

Locks implemented as RSMs avoid indefinite blocking from crashed processes. Use **renewable leases with timeouts** instead of indefinite locks — if the lock holder crashes, the lease will eventually expire rather than blocking the system forever.

### Reliable Distributed Queuing

Queues implemented as RSMs minimize risk of total system failure. **Atomic broadcast** ensures messages are "received reliably and in the same order by all participants," equivalent to consensus.

## Performance Considerations

### Network Latency Effects

- Within datacenter: ~1 millisecond RTT
- Typical US RTT: ~45 milliseconds
- New York to London: ~70 milliseconds

For high-client-count systems spanning regions, "a pool of regional proxies which hold persistent TCP/IP connections to the consensus group" reduces connection overhead.

### Disk Access

Persistent logging is mandatory so restarted nodes honor previous commitments. If latency for a small random write to disk is ~10ms, the rate of consensus operations will be limited to approximately 100 per second.

Optimizations:
- Combine consensus logs with RSM transaction logs into single logs, reducing disk seeks
- Batch multiple client operations into one proposer operation to amortize logging and network latency

### Batching and Pipelining

Batching multiple operations into single transactions amortizes fixed costs. Pipelining allows multiple proposals in-flight simultaneously, similar to TCP sliding-window, keeping "the pipe full."

## Deployment Considerations

### Number of Replicas

Consensus systems using majority quorums tolerate f failures with 2f + 1 replicas:
- **Three replicas**: tolerate one failure; allows maintenance with one replica down
- **Five replicas** (recommended): tolerate two failures; handle unplanned failures during maintenance windows

If fewer than a quorum of replicas remain and no quorum exists, "it's possible that a decision that was seen only by the missing replicas was made." Forced reconfiguration is possible but risks data loss.

### Location of Replicas

Replica placement balances failure domain tolerance against latency requirements. Failure domains include physical machines, racks, networking equipment, individual datacenters, and geographic regions.

"As the distance between replicas increases, so does the round-trip time between replicas, as well as the size of the failure the system will be able to tolerate."

**Hierarchical quorums**: Use groups of three replicas requiring majority group participation. Nine replicas in three groups of three allow quorum formation when one replica per group is lost, reducing latency impact.

## Monitoring Consensus Systems

Essential metrics:
- Member count and health status
- Process running but unable to make progress
- Persistent replica lagging
- Leader existence (in leader-based algorithms)
- Leader change frequency (rapid changes indicate flapping)
- Consensus transaction numbers indicating progress
- Proposal counts and acceptance rates

Performance metrics:
- Throughput and latency distributions
- Proposal acceptance latency
- Network latency distributions between locations
- Acceptor durable logging time

## Conclusion

"Whenever you see leader election, critical shared state, or distributed locking, think about distributed consensus: any lesser approach is a ticking bomb waiting to explode in your systems."

Ad hoc solutions using heartbeats or gossip protocols inevitably fail under real-world conditions. Proven distributed consensus algorithms, while complex, provide the reliability guarantees that critical systems require.

---
*Copyright © 2017 Google, Inc. Licensed under CC BY-NC-ND 4.0*
