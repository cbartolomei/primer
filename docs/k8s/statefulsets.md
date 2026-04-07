<!-- Source: https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/ -->
# StatefulSets

A StatefulSet runs a group of Pods, and maintains a sticky identity for each of those Pods. This is useful for managing applications that need persistent storage or a stable, unique network identity.

StatefulSet is the workload API object used to manage stateful applications.

Manages the deployment and scaling of a set of Pods, and provides guarantees about the ordering and uniqueness of these Pods.

Like a Deployment, a StatefulSet manages Pods that are based on an identical container spec. Unlike a Deployment, a StatefulSet maintains a sticky identity for each of its Pods. These pods are created from the same spec, but are not interchangeable: each has a persistent identifier that it maintains across any rescheduling.

If you want to use storage volumes to provide persistence for your workload, you can use a StatefulSet as part of the solution. Although individual Pods in a StatefulSet are susceptible to failure, the persistent Pod identifiers make it easier to match existing volumes to the new Pods that replace any that have failed.

## Using StatefulSets

StatefulSets are valuable for applications that require one or more of the following:

- Stable, unique network identifiers.
- Stable, persistent storage.
- Ordered, graceful deployment and scaling.
- Ordered, automated rolling updates.

In the above, stable is synonymous with persistence across Pod (re)scheduling. If an application doesn't require any stable identifiers or ordered deployment, deletion, or scaling, you should deploy your application using a workload object that provides a set of stateless replicas. Deployment or ReplicaSet may be better suited to your stateless needs.

## Limitations

- The storage for a given Pod must either be provisioned by a PersistentVolume Provisioner based on the requested storage class, or pre-provisioned by an admin.
- Deleting and/or scaling a StatefulSet down will *not* delete the volumes associated with the StatefulSet. This is done to ensure data safety, which is generally more valuable than an automatic purge of all related StatefulSet resources.
- StatefulSets currently require a Headless Service to be responsible for the network identity of the Pods. You are responsible for creating this Service.
- StatefulSets do not provide any guarantees on the termination of pods when a StatefulSet is deleted. To achieve ordered and graceful termination of the pods in the StatefulSet, it is possible to scale the StatefulSet down to 0 prior to deletion.
- When using Rolling Updates with the default Pod Management Policy (`OrderedReady`), it's possible to get into a broken state that requires manual intervention to repair.

## Components

The example below demonstrates the components of a StatefulSet.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx
  labels:
    app: nginx
spec:
  ports:
  - port: 80
    name: web
  clusterIP: None
  selector:
    app: nginx
---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  selector:
    matchLabels:
      app: nginx # has to match .spec.template.metadata.labels
  serviceName: "nginx"
  replicas: 3 # by default is 1
  minReadySeconds: 10 # by default is 0
  template:
    metadata:
      labels:
        app: nginx # has to match .spec.selector.matchLabels
    spec:
      terminationGracePeriodSeconds: 10
      containers:
      - name: nginx
        image: registry.k8s.io/nginx-slim:0.24
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: "my-storage-class"
      resources:
        requests:
          storage: 1Gi
```

> **Note:** This example uses the `ReadWriteOnce` access mode, for simplicity. For production use, the Kubernetes project recommends using the `ReadWriteOncePod` access mode instead.

In the above example:

- A Headless Service, named `nginx`, is used to control the network domain.
- The StatefulSet, named `web`, has a Spec that indicates that 3 replicas of the nginx container will be launched in unique Pods.
- The `volumeClaimTemplates` will provide stable storage using PersistentVolumes provisioned by a PersistentVolume Provisioner.

The name of a StatefulSet object must be a valid DNS label.

### Pod Selector

You must set the `.spec.selector` field of a StatefulSet to match the labels of its `.spec.template.metadata.labels`. Failing to specify a matching Pod Selector will result in a validation error during StatefulSet creation.

### Volume Claim Templates

You can set the `.spec.volumeClaimTemplates` field to create a PersistentVolumeClaim. This will provide stable storage to the StatefulSet if either:

- The StorageClass specified for the volume claim is set up to use dynamic provisioning.
- The cluster already contains a PersistentVolume with the correct StorageClass and sufficient available storage space.

### Minimum ready seconds

**FEATURE STATE: `Kubernetes v1.25 [stable]`**

`.spec.minReadySeconds` is an optional field that specifies the minimum number of seconds for which a newly created Pod should be running and ready without any of its containers crashing, for it to be considered available. This is used to check progression of a rollout when using a Rolling Update strategy. This field defaults to 0 (the Pod will be considered available as soon as it is ready).

## Pod Identity

StatefulSet Pods have a unique identity that consists of an ordinal, a stable network identity, and stable storage. The identity sticks to the Pod, regardless of which node it's (re)scheduled on.

### Ordinal Index

For a StatefulSet with N replicas, each Pod in the StatefulSet will be assigned an integer ordinal, that is unique over the Set. By default, pods will be assigned ordinals from 0 up through N-1. The StatefulSet controller will also add a pod label with this index: `apps.kubernetes.io/pod-index`.

### Start ordinal

**FEATURE STATE: `Kubernetes v1.31 [stable]`(enabled by default)**

`.spec.ordinals` is an optional field that allows you to configure the integer ordinals assigned to each Pod. It defaults to nil. Within the field, you can configure the following options:

- `.spec.ordinals.start`: If the `.spec.ordinals.start` field is set, Pods will be assigned ordinals from `.spec.ordinals.start` up through `.spec.ordinals.start + .spec.replicas - 1`.

### Stable Network ID

Each Pod in a StatefulSet derives its hostname from the name of the StatefulSet and the ordinal of the Pod. The pattern for the constructed hostname is `$(statefulset name)-$(ordinal)`. The example above will create three Pods named `web-0,web-1,web-2`. A StatefulSet can use a Headless Service to control the domain of its Pods. The domain managed by this Service takes the form: `$(service name).$(namespace).svc.cluster.local`, where "cluster.local" is the cluster domain.

As each Pod is created, it gets a matching DNS subdomain, taking the form: `$(pod name).$(governing service domain)`, where the governing service is defined by the `serviceName` field on the StatefulSet.

Depending on how DNS is configured in your cluster, you may not be able to look up the FQDN for a Pod immediately when the Pod is created. This behavior can occur when other clients in the cluster have not yet tried to look up the Pod's name. The name lookup will eventually succeed, typically within a few seconds.

### Stable Storage

Kubernetes creates one PersistentVolumeClaim for each VolumeClaimTemplate. In the nginx example above, each Pod receives a single PersistentVolumeClaim for a volume named `www`. When the Pod is (re)scheduled on a node, its `volumeMounts` mount the PersistentVolume associated with its PersistentVolumeClaim. Note that, the PersistentVolumes associated with the Pods' PersistentVolumeClaims are not deleted when the Pods, or StatefulSet are deleted. This must be done manually.

### Pod Name Label

When a StatefulSet controller creates a Pod, it adds a label, `statefulset.kubernetes.io/pod-name`, that is set to the name of the Pod. This label allows you to attach a Service to a specific Pod in the StatefulSet.

### Pod index label

**FEATURE STATE: `Kubernetes v1.31 [stable]`(enabled by default)**

When a StatefulSet controller creates a Pod, it adds a label `apps.kubernetes.io/pod-index` set to the ordinal index of the Pod. This label allows you to configure your Service or another Kubernetes object to target a specific Pod in the StatefulSet based on its index.

## Deployment and Scaling Guarantees

- For a StatefulSet with N replicas, when Pods are being deployed, they are created sequentially, in order from {0..N-1}.
- When Pods are being deleted, they are terminated in reverse order, from {N-1..0}.
- Before a scale operation on a Pod is completed, all of its predecessors must be Running and Ready.
- Before a Pod is terminated, all of its successors must be completely shutdown.

The StatefulSet should not specify a pod.Spec.TerminationGracePeriodSeconds of 0. This practice is unsafe and strongly discouraged.

When the nginx example above is created, three Pods will be deployed in the order web-0, web-1, web-2. web-1 will not be deployed before web-0 is Running and Ready, and web-2 will not be deployed until web-1 is Running and Ready.

If a user were to scale the deployed example by patching the StatefulSet such that `replicas=1`, pod web-2 would be terminated first. web-1 would not be terminated until web-2 is fully shutdown and deleted.

### Pod Management Policies

StatefulSet allows you to relax its ordering guarantees while preserving its uniqueness guarantees via its `.spec.podManagementPolicy` field.

#### `OrderedReady` Pod Management

`OrderedReady` pod management is the default for StatefulSets. It implements the behavior described above.

#### `Parallel` Pod Management

`Parallel` pod management tells the StatefulSet controller to launch or terminate all Pods in parallel, and to not wait for Pods to become Running and Ready or completely terminated prior to launching or terminating another Pod. This option only affects the behavior for scaling operations. Updates are not affected.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "nginx"
  podManagementPolicy: "Parallel"
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: registry.k8s.io/nginx-slim:0.24
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
```

## Update strategies

A StatefulSet's `.spec.updateStrategy` field allows you to configure and disable automated rolling updates for containers, labels, resource request/limits, and annotations for the Pods in a StatefulSet. There are two possible values:

`OnDelete`
:   With the `OnDelete` update strategy, the StatefulSet controller will not automatically update the Pods in a StatefulSet. Users must manually delete Pods to cause the controller to create new Pods that reflect modifications made to a StatefulSet's `.spec.template`.

`RollingUpdate`
:   The `RollingUpdate` update strategy will update all Pods in a StatefulSet, in reverse ordinal order, one at a time. It waits for the updated Pod to be Running and Ready prior to updating its predecessor.

The default update strategy for a StatefulSet is `RollingUpdate`.

## Rolling Updates

When a StatefulSet's `.spec.updateStrategy.type` is set to `RollingUpdate`, the StatefulSet controller will delete and recreate each Pod in the StatefulSet. It will proceed in the same order as Pod termination (from the largest ordinal to the smallest), updating each Pod one at a time.

The Kubernetes control plane waits for an updated Pod to be Running and Ready prior to updating its predecessor. If you have set `.spec.minReadySeconds`, the control plane additionally waits for that amount of time after a Pod becomes ready.

### Partitioned rolling updates

The `RollingUpdate` update strategy can be partitioned, by specifying `.spec.updateStrategy.rollingUpdate.partition`. If a partition is specified, Pods with an ordinal that is greater than or equal to the partition ordinal will be updated when the StatefulSet's `.spec.template` is updated. Pods with an ordinal that is less than the partition ordinal will not be updated, and, even if they are deleted, they will be recreated at the previous version. If `.spec.updateStrategy.rollingUpdate.partition` is greater than `.spec.replicas`, updates to the `.spec.template` will not be propagated to any Pods. In most cases you will not need to use a partition, but they are useful if you want to stage an update, roll out a canary, or perform a phased roll out.

### Maximum unavailable Pods

**FEATURE STATE: `Kubernetes v1.24 [stable]`**

You can control the maximum number of Pods that can be unavailable during the rolling update by specifying the `.spec.updateStrategy.rollingUpdate.maxUnavailable` field. The value can be an absolute number (for example, `5`) or a percentage of desired Pods (for example, `10%`). Absolute numbers are calculated from the percentage by rounding down. This field cannot be set if the `.spec.updateStrategy.rollingUpdate.partition` field is specified. The default is `1`.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "nginx"
  replicas: 3
  updateStrategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 1
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      containers:
      - name: nginx
        image: registry.k8s.io/nginx-slim:0.24
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
```

### Forced rollback

When using Rolling Updates with the default Pod Management Policy (`OrderedReady`), it is possible to get into a broken state that requires manual intervention to repair.

If you update the Pod template to a configuration that never becomes Running and Ready (for example, due to a bad binary or application-level configuration error), StatefulSet will stop the rollout and wait.

In this state, it is not enough to revert the Pod template to a good configuration. Due to a known issue, StatefulSet will continue waiting for the broken Pod to become ready before it will attempt to revert it back to the working configuration.

After reverting the template, you must also delete any Pods that StatefulSet had already attempted to run with the bad configuration. StatefulSet will then begin to recreate the Pods using the reverted template.

## Revision history

### How StatefulSets track changes using ControllerRevisions

StatefulSets track revision history by creating ControllerRevision objects for each configuration change. In order for the StatefulSet to track those ControllerRevisions properly:

1. The StatefulSet's `.spec.selector` must be set.
2. The StatefulSet's `.metadata.labels` must match the `.spec.selector`.
3. The StatefulSet's `.spec.template.metadata.labels` must match the `.spec.selector`.

### Managing Revision History

The number of ControllerRevisions created by a StatefulSet is limited by the value of `.spec.revisionHistoryLimit`. The default value is `10`. If this value is `nil`, all ControllerRevisions will be kept. Truncating the revision history will not cause a rollback, so revisions that are deleted cannot be recreated.

## PersistentVolumeClaim retention

**FEATURE STATE: `Kubernetes v1.23 [stable]`**

`.spec.persistentVolumeClaimRetentionPolicy` is an optional field that controls if and how PersistentVolumeClaims (PVCs) are deleted during the lifecycle of a StatefulSet. You can specify a retention policy for PVCs created from the volumeClaimTemplate in StatefulSet.

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: web
spec:
  serviceName: "nginx"
  replicas: 3
  selector:
    matchLabels:
      app: nginx
  template:
    metadata:
      labels:
        app: nginx
    spec:
      terminationGracePeriodSeconds: 10
      containers:
      - name: nginx
        image: registry.k8s.io/nginx-slim:0.24
        ports:
        - containerPort: 80
          name: web
        volumeMounts:
        - name: www
          mountPath: /usr/share/nginx/html
  volumeClaimTemplates:
  - metadata:
      name: www
    spec:
      accessModes: [ "ReadWriteOnce" ]
      resources:
        requests:
          storage: 1Gi
  persistentVolumeClaimRetentionPolicy:
    whenDeleted: Delete
    whenScaled: Delete
```

The `.spec.persistentVolumeClaimRetentionPolicy` field has two fields:

`whenDeleted`
:   Controls if PVCs created from the volumeClaimTemplate are deleted after the StatefulSet is deleted. The possible values are `Delete` and `Retain`. If not set, the default value is `Retain`.

`whenScaled`
:   Controls if PVCs created from the volumeClaimTemplate are deleted after the number of replicas is scaled down. The possible values are `Delete` and `Retain`. If not set, the default value is `Retain`.

> **Note:** You should configure the retention policy based on your storage class and usage patterns. For example:
> - Use `Delete` for stateless applications with ephemeral data.
> - Use `Retain` for stateful applications where data persistence is critical.

### Replicas

`.spec.replicas` is an optional field that specifies the number of desired Pods for the StatefulSet. It defaults to 1.
