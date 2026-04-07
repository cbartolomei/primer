<!-- Source: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/ -->
# Horizontal Pod Autoscaling

In Kubernetes, a *HorizontalPodAutoscaler* automatically updates a workload resource (such as a Deployment or StatefulSet), with the aim of automatically scaling capacity to match demand.

Horizontal scaling means that the response to increased load is to deploy more Pods. This is different from *vertical* scaling, which for Kubernetes would mean assigning more resources (for example: memory or CPU) to the Pods that are already running for the workload.

If the load decreases, and the number of Pods is above the configured minimum, the HorizontalPodAutoscaler instructs the workload resource (the Deployment, StatefulSet, or other similar resource) to scale back down.

Horizontal pod autoscaling does not apply to objects that can't be scaled (for example: a DaemonSet).

The HorizontalPodAutoscaler is implemented as a Kubernetes API resource and a controller. The resource determines the behavior of the controller. The horizontal pod autoscaling controller, running within the Kubernetes control plane, periodically adjusts the desired scale of its target (for example, a Deployment) to match observed metrics such as average CPU utilization, average memory utilization, or any other custom metric you specify.

## How does a HorizontalPodAutoscaler work?

Kubernetes implements horizontal pod autoscaling as a control loop that runs intermittently (it is not a continuous process). The interval is set by the `--horizontal-pod-autoscaler-sync-period` parameter to the `kube-controller-manager` (and the default interval is 15 seconds).

Once during each period, the controller manager queries the resource utilization against the metrics specified in each HorizontalPodAutoscaler definition. The controller manager finds the target resource defined by the `scaleTargetRef`, then selects the pods based on the target resource's `.spec.selector` labels, and obtains the metrics from either the resource metrics API (for per-pod resource metrics), or the custom metrics API (for all other metrics).

- For per-pod resource metrics (like CPU), the controller fetches the metrics from the resource metrics API for each Pod targeted by the HorizontalPodAutoscaler. Then, if a target utilization value is set, the controller calculates the utilization value as a percentage of the equivalent resource request on the containers in each Pod. If a target raw value is set, the raw metric values are used directly. The controller then takes the mean of the utilization or the raw value (depending on the type of target specified) across all targeted Pods, and produces a ratio used to scale the number of desired replicas.

  Please note that if some of the Pod's containers do not have the relevant resource request set, CPU utilization for the Pod will not be defined and the autoscaler will not take any action for that metric.

- For per-pod custom metrics, the controller functions similarly to per-pod resource metrics, except that it works with raw values, not utilization values.

- For object metrics and external metrics, a single metric is fetched, which describes the object in question. This metric is compared to the target value, to produce a ratio as above. In the `autoscaling/v2` API version, this value can optionally be divided by the number of Pods before the comparison is made.

The common use for HorizontalPodAutoscaler is to configure it to fetch metrics from aggregated APIs (`metrics.k8s.io`, `custom.metrics.k8s.io`, or `external.metrics.k8s.io`). The `metrics.k8s.io` API is usually provided by an add-on named Metrics Server, which needs to be launched separately.

The HorizontalPodAutoscaler controller accesses corresponding workload resources that support scaling (such as Deployments and StatefulSet). These resources each have a subresource named `scale`, an interface that allows you to dynamically set the number of replicas and examine each of their current states.

## Algorithm details

From the most basic perspective, the HorizontalPodAutoscaler controller operates on the ratio between desired metric value and current metric value:

```
desiredReplicas = ceil[currentReplicas * (currentMetricValue / desiredMetricValue)]
```

For example, if the current metric value is `200m`, and the desired value is `100m`, the number of replicas will be doubled, since `200.0 / 100.0 = 2.0`. If the current value is instead `50m`, you'll halve the number of replicas, since `50.0 / 100.0 = 0.5`. The control plane skips any scaling action if the ratio is sufficiently close to 1.0 (within a configurable tolerance, 0.1 by default).

When a `targetAverageValue` or `targetAverageUtilization` is specified, the `currentMetricValue` is computed by taking the average of the given metric across all Pods in the HorizontalPodAutoscaler's scale target.

## Stabilization Window

The stabilization window is used by the autoscaling algorithm to consider the flapping of replica count. The autoscaler looks at historical desired states and uses the highest one to prevent rapid fluctuations in the number of replicas.

For example, in the current state, your desired state may rapidly fluctuate between 5 and 10 replicas. The autoscaling algorithm will try to dampen these fluctuations using the stabilization window.

## Configurable Scaling Behavior

Using the `behavior` field in the HorizontalPodAutoscaler API, you can configure the scaling behavior for scale-up and scale-down operations independently.

### Scaling Policies

The `behavior` section allows you to configure scaling policies for both `scaleDown` and `scaleUp`. Each policy can have multiple rules that are selected based on which produces the highest desired replica count.

```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
    - type: Percent
      value: 100
      periodSeconds: 15
    - type: Pods
      value: 4
      periodSeconds: 15
    selectPolicy: Min
  scaleUp:
    stabilizationWindowSeconds: 0
    policies:
    - type: Percent
      value: 100
      periodSeconds: 15
    - type: Pods
      value: 4
      periodSeconds: 15
    selectPolicy: Max
```

**Policy Types:**
- `Percent`: Scale by a percentage of current replicas
- `Pods`: Scale by an absolute number of pods

**Policy Selection:**
- `Max`: Select the policy that scales by the largest amount
- `Min`: Select the policy that scales by the smallest amount
- `Disabled`: Disable scaling in this direction

### Stabilization Window

The stabilization window determines how long the autoscaler looks back at historical desired states to prevent flapping.

- For `scaleDown`: Default is 300 seconds (5 minutes)
- For `scaleUp`: Default is 0 seconds (immediate scaling)

```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300
  scaleUp:
    stabilizationWindowSeconds: 60
```

### Tolerance

The tolerance threshold determines when the autoscaler considers the metric value close enough to the target to skip scaling. The default tolerance is 0.1 (10%).

For example, if you have a target CPU utilization of 80%, the autoscaler will only scale if the current utilization is below 72% or above 88%.

### Default Behavior

By default:
- **Scale Up**: Immediate (0 second stabilization window), allows doubling the replicas every 15 seconds
- **Scale Down**: Conservative approach (5 minute stabilization window), scales down by 50% every 15 seconds

### Example: Change Downscale Stabilization Window

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 1
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 50
        periodSeconds: 15
```

### Example: Limit Scale Down Rate

```yaml
behavior:
  scaleDown:
    stabilizationWindowSeconds: 300
    policies:
    - type: Pods
      value: 2
      periodSeconds: 60
    selectPolicy: Min
```

This limits scale down to removing a maximum of 2 pods every 60 seconds.

### Example: Disable Scale Down

```yaml
behavior:
  scaleDown:
    selectPolicy: Disabled
```

## Support for Metrics APIs

The HorizontalPodAutoscaler can retrieve metrics from the following APIs:

### Resource Metrics API (`metrics.k8s.io`)
- Provides CPU and memory metrics for pods and containers
- Requires Metrics Server to be installed
- Generally available and stable

### Custom Metrics API (`custom.metrics.k8s.io`)
- Allows scaling based on application-specific metrics
- Requires a custom metrics provider (e.g., Prometheus adapter)
- Beta quality

### External Metrics API (`external.metrics.k8s.io`)
- Allows scaling based on metrics from external systems
- Requires an external metrics provider
- Beta quality

Example using custom metrics:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: custom-metric-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Pods
    pods:
      metric:
        name: http_requests_per_second
      target:
        type: AverageValue
        averageValue: "1000"
```

## kubectl support

You can create and manage HorizontalPodAutoscalers using kubectl:

```bash
# Create an HPA with auto-scaling based on CPU
kubectl autoscale deployment my-app --min=2 --max=10 --cpu-percent=80

# View HPAs
kubectl get hpa

# Describe an HPA
kubectl describe hpa my-app

# Delete an HPA
kubectl delete hpa my-app

# Edit an HPA
kubectl edit hpa my-app
```

## Implicit Maintenance-Mode Deactivation

If you set `minReplicas` equal to `maxReplicas`, the HorizontalPodAutoscaler becomes effectively disabled. The number of replicas will remain constant.

```yaml
spec:
  minReplicas: 5
  maxReplicas: 5  # HPA is disabled
```

## Migrating Deployments and StatefulSets to Horizontal Autoscaling

When migrating from manual scaling to horizontal autoscaling:

1. **Create the HPA** with appropriate min/max replicas and target metrics
2. **Remove any manual replica specifications** from your Deployment/StatefulSet
3. **Monitor the HPA** to ensure it's scaling correctly

The HPA will automatically take control of the replica count once created. The previous manual replica count becomes irrelevant.

Example migration:

```yaml
# Before: Manual scaling
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 5  # Manually set
  selector:
    matchLabels:
      app: my-app
  template:
    # ...

# After: Automatic scaling - remove the replicas field, HPA will manage it
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  # replicas field omitted - HPA manages this
  selector:
    matchLabels:
      app: my-app
  template:
    # ...
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: my-app-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: my-app
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 80
```

## What's next

- Read about Vertical Pod Autoscaling for scaling individual pod resource requests
- Explore the HorizontalPodAutoscaler Walkthrough for a practical example
- Learn about Pod Disruption Budgets to ensure availability during scaling operations
- Review the API reference for HorizontalPodAutoscaler for complete configuration options
