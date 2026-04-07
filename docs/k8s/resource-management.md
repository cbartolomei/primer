<!-- Source: https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/ -->
# Resource Management for Pods and Containers

When you specify a Pod, you can optionally specify how much of each resource a container needs. The most common resources to specify are CPU and memory (RAM); there are others.

When you specify the resource *request* for containers in a Pod, the kube-scheduler uses this information to decide which node to place the Pod on. When you specify a resource *limit* for a container, the kubelet enforces those limits so that the running container is not allowed to use more of that resource than the limit you set. The kubelet also reserves at least the *request* amount of that system resource specifically for that container to use.

## Requests and limits

If the node where a Pod is running has enough of a resource available, it's possible (and allowed) for a container to use more resource than its `request` for that resource specifies.

For example, if you set a `memory` request of 256 MiB for a container, and that container is in a Pod scheduled to a Node with 8GiB of memory and no other Pods, then the container can try to use more RAM.

Limits are a different story. Both `cpu` and `memory` limits are applied by the kubelet and container runtime, and are ultimately enforced by the kernel. On Linux nodes, the Linux kernel enforces limits with cgroups. The behavior of `cpu` and `memory` limit enforcement is slightly different.

- **`cpu` limits** are enforced by CPU throttling. When a container approaches its `cpu` limit, the kernel will restrict access to the CPU corresponding to the container's limit. Thus, a `cpu` limit is a hard limit the kernel enforces. Containers may not use more CPU than is specified in their `cpu` limit.

- **`memory` limits** are enforced by the kernel with out of memory (OOM) kills. When a container uses more than its `memory` limit, the kernel may terminate it. However, terminations only happen when the kernel detects memory pressure. Thus, a container that over allocates memory may not be immediately killed. This means `memory` limits are enforced reactively. A container may use more memory than its `memory` limit, but if it does, it may get killed.

> **Note:** There is an alpha feature `MemoryQoS` which attempts to add more preemptive limit enforcement for memory (as opposed to reactive enforcement by the OOM killer). However, this effort is stalled due to a potential livelock situation a memory hungry process can cause.

> **Note:** If you specify a limit for a resource, but do not specify any request, and no admission-time mechanism has applied a default request for that resource, then Kubernetes copies the limit you specified and uses it as the requested value for the resource.

## Resource types

*CPU* and *memory* are each a *resource type*. A resource type has a base unit. CPU represents compute processing and is specified in units of Kubernetes CPUs. Memory is specified in units of bytes. For Linux workloads, you can specify *huge page* resources. Huge pages are a Linux-specific feature where the node kernel allocates blocks of memory that are much larger than the default page size.

For example, on a system where the default page size is 4KiB, you could specify a limit, `hugepages-2Mi: 80Mi`. If the container tries allocating over 40 2MiB huge pages (a total of 80 MiB), that allocation fails.

> **Note:** You cannot overcommit `hugepages-*` resources. This is different from the `memory` and `cpu` resources.

CPU and memory are collectively referred to as *compute resources*, or *resources*. Compute resources are measurable quantities that can be requested, allocated, and consumed. They are distinct from API resources. API resources, such as Pods and Services are objects that can be read and modified through the Kubernetes API server.

## Resource requests and limits of Pod and container

For each container, you can specify resource limits and requests, including the following:

- `spec.containers[].resources.limits.cpu`
- `spec.containers[].resources.limits.memory`
- `spec.containers[].resources.limits.hugepages-<size>`
- `spec.containers[].resources.requests.cpu`
- `spec.containers[].resources.requests.memory`
- `spec.containers[].resources.requests.hugepages-<size>`

Although you can only specify requests and limits for individual containers, it is also useful to think about the overall resource requests and limits for a Pod. For a particular resource, a *Pod resource request/limit* is the sum of the resource requests/limits of that type for each container in the Pod.

## Pod-level resource specification

**FEATURE STATE: Kubernetes v1.34 [beta]** (enabled by default)

Provided your cluster has the `PodLevelResources` feature gate enabled, you can specify resource requests and limits at the Pod level. At the Pod level, Kubernetes 1.35 only supports resource requests or limits for specific resource types: `cpu` and / or `memory` and / or `hugepages`. With this feature, Kubernetes allows you to declare an overall resource budget for the Pod, which is especially helpful when dealing with a large number of containers where it can be difficult to accurately gauge individual resource needs.

For a Pod, you can specify resource limits and requests for CPU and memory by including the following:

- `spec.resources.limits.cpu`
- `spec.resources.limits.memory`
- `spec.resources.limits.hugepages-<size>`
- `spec.resources.requests.cpu`
- `spec.resources.requests.memory`
- `spec.resources.requests.hugepages-<size>`

## Resource units in Kubernetes

### CPU resource units

Limits and requests for CPU resources are measured in *cpu* units. In Kubernetes, 1 CPU unit is equivalent to **1 physical CPU core**, or **1 virtual core**, depending on whether the node is a physical host or a virtual machine running inside a physical machine.

Fractional requests are allowed. When you define a container with `spec.containers[].resources.requests.cpu` set to `0.5`, you are requesting half as much CPU time compared to if you asked for `1.0` CPU. For CPU resource units, the quantity expression `0.1` is equivalent to the expression `100m`, which can be read as "one hundred millicpu". Some people say "one hundred millicores", and this is understood to mean the same thing.

A request with a decimal point, like `0.1`, is converted to `100m` by the API, and precision finer than `1m` is not allowed.

CPU is always requested as an absolute quantity, never as a relative amount; `0.1` is the same amount of CPU on a single-core, dual-core, or 48-core machine.

### Memory resource units

Limits and requests for memory are measured in bytes. You can express memory as a plain integer or as a fixed-point integer using one of these suffixes: E, P, T, G, M, k. You can also use the binary-equivalent: Ei, Pi, Ti, Gi, Mi, Ki. For example, the following represent roughly the same value:

```
128974848, 129e6, 129M, 128974848000m, 123Mi
```

Pay attention to the case of the suffixes. If you request `400m` of memory, this is requesting 400 **m**illibytes, not 400 **M**egabytes. If someone writes a YAML manifest with `400M`, they are actually requesting 400 Megabytes.

Memory is always requested as an absolute quantity, never as a relative amount.

## Container resources example

The following Pod has two containers. Each container has a request of 0.25 cpu and 64MiB (2^26 bytes) of memory, and each container has a limit of 0.5 cpu and 128MiB of memory. You could say the Pod has a request of 0.5 cpu and 128 MiB of memory, and a limit of 1 cpu and 256MiB of memory.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend
spec:
  containers:
  - name: app
    image: images/app:v1
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
  - name: log-aggregator
    image: images/log-aggregator:v1
    resources:
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
```

## Pod resources example

The following Pod has resource requests and limits specified at the Pod level. The Pod has containers that share the requested CPU and memory resources. The Pod has a request of 1 cpu and 512MiB of memory, and a limit of 1.5 cpu and 1Gi of memory.

> **Note:** Pod-level resources can be used together with container-level resources. If both are specified, the kubelet will enforce both.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: frontend
spec:
  resources:
    requests:
      memory: "512Mi"
      cpu: "1"
    limits:
      memory: "1Gi"
      cpu: "1.5"
  containers:
  - name: app
    image: images/app:v1
  - name: log-aggregator
    image: images/log-aggregator:v1
```

## How Pods with resource requests are scheduled

When you create a Pod, the Kubernetes scheduler selects a node for the Pod to run on. Each node has a maximum capacity for each of a resource type: the amount of CPU and memory it can provide for Pods. The scheduler ensures that, for each resource type, the sum of the resource requests of the scheduled containers is less than the capacity of the node. Note that although actual memory or CPU usage on nodes is very low, the scheduler still refuses to place a Pod on a node if the capacity check fails. This protects against a resource shortage on a node when resource usage is high later, even if resource usage is currently low.

## How Kubernetes applies resource requests and limits

### Resizing container resources

**FEATURE STATE: Kubernetes v1.27 [stable]**

You can specify resource requests and limits when you create a Pod. Additionally, if the feature gate `InPlaceUpdateResources` is enabled, you can change the resource requests and limits of a container in a running Pod.

When you change the resource requests or limits for a container, your cluster applies the change according to the container's `restartPolicy`:

- **If the container's `restartPolicy` is `Always` (the default):** The kubelet kills the container and restarts it. The container might be placed on a different node after restart.

- **If the container's `restartPolicy` is `OnFailure` or `Never`:** The kubelet only applies the change to memory requests/limits without restarting the container. For CPU requests/limits in this case, the kubelet applies the change without restarting the container (on Linux only).

### Monitoring compute & memory resource usage

The resource usage of a Pod is reported as part of the Pod status.

If optional metrics are available in your cluster, Pod resource usage can be retrieved either directly from the Metrics API or your monitoring application.

When using `kubectl top pod`, you can see the metrics directly from the kubectl command-line tool.

### Considerations for memory backed `emptyDir` volumes

If a Pod is scheduled with a memory-backed `emptyDir` volume (also called a `tmpfs` mount in Linux), the kubelet counts the memory-backed `emptyDir` storage towards the memory limit of the container.

## Local ephemeral storage

**FEATURE STATE: Kubernetes v1.10 [stable]**

Pods can also consume local ephemeral storage. Ephemeral storage is temporary: when a Pod is removed from a node, the kubelet deletes the ephemeral data associated with that Pod.

Pods use local ephemeral storage for scratch space, caching, and logs. The kubelet can provide this scratch space by using local storage resources on the node.

You can specify resource limits and requests for ephemeral storage. When you do, the kubelet enforces the limits you set, and the scheduler considers the requests as part of the scheduling decision.

> **Note:** You cannot overcommit `ephemeral-storage`. This is different from the `memory` and `cpu` resources.

For each container in a Pod, you can specify:

- `spec.containers[].resources.limits.ephemeral-storage`
- `spec.containers[].resources.requests.ephemeral-storage`

The following Pod example has requests for 2 GiB of ephemeral storage:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: ephemeral-storage-pod
spec:
  containers:
  - name: app
    image: images/app:v1
    resources:
      requests:
        ephemeral-storage: "2Gi"
      limits:
        ephemeral-storage: "4Gi"
```

Ephemeral storage requests and limits use the same size-quantity syntax as memory and CPU.

### Resource monitoring for local ephemeral storage

When ephemeral storage is requested, the kubelet periodically scans the Pod's local storage usage and compares it against the specified limit.

If the total resource usage exceeds the specified limit, the kubelet signals eviction. The Pod may be evicted from the node.

## Extended resources

Extended resources are resources that are outside the standard Kubernetes resources. They enable cluster administrators to advertise node-level resources that were previously unknown to Kubernetes.

Extended resources use domain-qualified names in the following format: `domain-name/resource-name`. Examples include `example.com/foo` or `vendor.example.com/bar`.

### Managing extended resources

Cluster administrators can advertise extended resources on nodes.

### Consuming extended resources

Like CPU and memory, you can specify extended resources in Pod specs.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-pod
spec:
  containers:
  - name: my-container
    image: myimage
    resources:
      requests:
        example.com/foo: 3
      limits:
        example.com/foo: 3
```

> **Note:** Extended resources can only be used in resource limits, not requests.

## PID limiting

Process IDs (PIDs) are a finite resource on Linux nodes that can be exhausted. Kubernetes allows you to limit the number of PIDs that a Pod can consume.

## Troubleshooting

### My Pods are pending with event message `FailedScheduling`

If the scheduler cannot find any node that satisfies the Pod's resource requests, the Pod remains unscheduled until resources become available. An event is produced each time the scheduler fails to find a node for the Pod:

```
kubectl describe pod frontend
```

The output is similar to:

```
Name:             frontend
Namespace:        default
Priority:         0
Node:             <none>
...
Events:
  Type     Reason            Age   From              Message
  ----     ------            ---   ----              -------
  Warning  FailedScheduling  23s   default-scheduler  0/1 nodes are available: ...
```

To fix the issue, you can reduce the Pod's resource requests or add more resources to the cluster.

### My container is terminated

Your container might be terminated because it exceeded a resource limit. To check if a container was terminated because it hit a resource limit:

```
kubectl get pod frontend --output=yaml
```

The output is similar to:

```yaml
spec:
  containers:
  - name: app
    image: images/app:v1
    resources:
      limits:
        cpu: 500m
        memory: 128Mi
      requests:
        cpu: 250m
        memory: 64Mi
status:
  containerStatuses:
  - containerID: containerd://abcd1234567890
    image: images/app:v1
    lastState:
      terminated:
        exitCode: 137
        reason: OOMKilled
        startedAt: null
        finishedAt: 2024-10-10T10:36:30Z
    name: app
    ready: false
    restartCount: 2
    started: false
    state:
      waiting:
        message: back-off 5m0s restarting failed container=app pod=frontend_default(123456789)
        reason: CrashLoopBackOff
```

Notice the `reason: OOMKilled` indicating the container was terminated due to an out-of-memory error. In this case, increase the memory limit or request for the container.

Exit code 137 indicates a SIGKILL signal, which is typically sent when a container hits memory limits. Other common exit codes include:

- Exit code 1: Indicates a general error
- Exit code 137: Indicates the container was killed (likely due to OOM)
- Exit code 143: Indicates a SIGTERM signal

## What's next

- Configure Memory Resources for Containers and Pods
- Configure CPU Resources for Containers and Pods
- Configure Quotas for API Objects
- Monitor Compute & Memory Resource Usage
- Quality of Service for Pods
