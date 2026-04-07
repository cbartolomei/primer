<!-- Source: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/ -->
# Deployments

A Deployment manages a set of Pods to run an application workload, usually one that doesn't maintain state.

A *Deployment* provides declarative updates for Pods and ReplicaSets.

You describe a *desired state* in a Deployment, and the Deployment Controller changes the actual state to the desired state at a controlled rate. You can define Deployments to create new ReplicaSets, or to remove existing Deployments and adopt all their resources with new Deployments.

> **Note:** Do not manage ReplicaSets owned by a Deployment. Consider opening an issue in the main Kubernetes repository if your use case is not covered below.

## Use Case

The following are typical use cases for Deployments:

* **Create a Deployment to rollout a ReplicaSet.** The ReplicaSet creates Pods in the background. Check the status of the rollout to see if it succeeds or not.
* **Declare the new state of the Pods** by updating the PodTemplateSpec of the Deployment. A new ReplicaSet is created, and the Deployment gradually scales it up while scaling down the old ReplicaSet, ensuring Pods are replaced at a controlled rate. Each new ReplicaSet updates the revision of the Deployment.
* **Rollback to an earlier Deployment revision** if the current state of the Deployment is not stable. Each rollback updates the revision of the Deployment.
* **Scale up the Deployment to facilitate more load.**
* **Pause the rollout of a Deployment** to apply multiple fixes to its PodTemplateSpec and then resume it to start a new rollout.
* **Use the status of the Deployment** as an indicator that a rollout has stuck.
* **Clean up older ReplicaSets** that you don't need anymore.

## Creating a Deployment

The following is an example of a Deployment. It creates a ReplicaSet to bring up three `nginx` Pods:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
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
        image: nginx:1.14.2
        ports:
        - containerPort: 80
```

In this example:

* A Deployment named `nginx-deployment` is created, indicated by the `.metadata.name` field. This name will become the basis for the ReplicaSets and Pods which are created later.
* The Deployment creates a ReplicaSet that creates three replicated Pods, indicated by the `.spec.replicas` field.
* The `.spec.selector` field defines how the created ReplicaSet finds which Pods to manage. In this case, you select a label that is defined in the Pod template (`app: nginx`).

  > **Note:** The `.spec.selector.matchLabels` field is a map of {key,value} pairs. A single {key,value} in the `matchLabels` map is equivalent to an element of `matchExpressions`, whose `key` field is "key", the `operator` is "In", and the `values` array contains only "value". All of the requirements, from both `matchLabels` and `matchExpressions`, must be satisfied in order to match.

* The `.spec.template` field contains the following sub-fields:
  * The Pods are labeled `app: nginx` using the `.metadata.labels` field.
  * The Pod template's specification, or `.spec` field, indicates that the Pods run one container, `nginx`, which runs the `nginx` Docker Hub image at version 1.14.2.
  * Create one container and name it `nginx` using the `.spec.containers[0].name` field.

Before you begin, make sure your Kubernetes cluster is up and running. Follow the steps given below to create the above Deployment:

1. Create the Deployment by running the following command:

   ```
   kubectl apply -f https://k8s.io/examples/controllers/nginx-deployment.yaml
   ```

2. Run `kubectl get deployments` to check if the Deployment was created.

   If the Deployment is still being created, the output is similar to the following:

   ```
   NAME               READY   UP-TO-DATE   AVAILABLE   AGE
   nginx-deployment   0/3     0            0           1s
   ```

   When you inspect the Deployments in your cluster, the following fields are displayed:

   * `NAME` lists the names of the Deployments in the namespace.
   * `READY` displays how many replicas of the application are available to your users. It follows the pattern ready/desired.
   * `UP-TO-DATE` displays the number of replicas that have been updated to achieve the desired state.
   * `AVAILABLE` displays how many replicas of the application are available to your users.
   * `AGE` displays the amount of time that the application has been running.

3. To see the Deployment rollout status, run `kubectl rollout status deployment/nginx-deployment`.

   The output is similar to:

   ```
   Waiting for rollout to finish: 2 out of 3 new replicas have been updated...
   deployment "nginx-deployment" successfully rolled out
   ```

4. Run the `kubectl get deployments` again a few seconds later. The output is similar to this:

   ```
   NAME               READY   UP-TO-DATE   AVAILABLE   AGE
   nginx-deployment   3/3     3            3           18s
   ```

5. To see the ReplicaSet (`rs`) created by the Deployment, run `kubectl get rs`. The output is similar to this:

   ```
   NAME                          DESIRED   CURRENT   READY   AGE
   nginx-deployment-75675f5897   3         3         3       18s
   ```

   ReplicaSet output shows the following fields:

   * `NAME` lists the names of the ReplicaSets in the namespace.
   * `DESIRED` displays the desired number of *replicas* of the application, which you define when you create the Deployment. This is the *desired state*.
   * `CURRENT` displays how many replicas are currently running.
   * `READY` displays how many replicas of the application are available to your users.
   * `AGE` displays the amount of time that the application has been running.

   Notice that the name of the ReplicaSet is always formatted as `[DEPLOYMENT-NAME]-[HASH]`. This name will become the basis for the Pods which are created.

6. To see the labels automatically generated for each Pod, run `kubectl get pods --show-labels`. The output is similar to:

   ```
   NAME                                READY   STATUS    RESTARTS   AGE       LABELS
   nginx-deployment-75675f5897-7ci7o   1/1     Running   0          18s       app=nginx,pod-template-hash=75675f5897
   nginx-deployment-75675f5897-kzszj   1/1     Running   0          18s       app=nginx,pod-template-hash=75675f5897
   nginx-deployment-75675f5897-qqcavl  1/1     Running   0          18s       app=nginx,pod-template-hash=75675f5897
   ```

### Pod-template-hash label

> **Note:** Do not change this label.

The `pod-template-hash` label is added by the Deployment controller to every ReplicaSet that a Deployment creates or adopts.

This label ensures that child ReplicaSets of a Deployment do not overlap. It is generated by hashing the `PodTemplate` of the ReplicaSet and using the resulting hash as the label value that is added to the ReplicaSet selector, Pod template labels, and in any existing Pods that the ReplicaSet might have.

## Updating a Deployment

A Deployment's rollout is triggered if and only if the Deployment's Pod template (that is, `.spec.template`) is changed. Other updates, such as scaling the Deployment, do not trigger a rollout.

Follow the steps given below to update your Deployment:

1. Let's update the nginx Pods to use the `nginx:1.16.0` image instead of the `nginx:1.14.2` image.

   ```
   kubectl set image deployment/nginx-deployment nginx=nginx:1.16.0 --record
   ```

   Alternatively, you can `edit` the Deployment and change `.spec.template.spec.containers[0].image` from `nginx:1.14.2` to `nginx:1.16.0`:

   ```
   kubectl edit deployment/nginx-deployment
   ```

2. To see the rollout status, run:

   ```
   kubectl rollout status deployment/nginx-deployment
   ```

   The output is similar to:

   ```
   Waiting for rollout to finish: 2 out of 3 new replicas have been updated...
   deployment "nginx-deployment" successfully rolled out
   ```

Get more details on your updated Deployment:

* After the rollout succeeds, you can view the Deployment by running `kubectl get deployment nginx-deployment`.
* Run `kubectl get rs` to see that the Deployment updated the Pods by creating a new ReplicaSet and scaling it up to 3 replicas, as well as scaling down the old ReplicaSet to 0 replicas.

  ```
  NAME                          DESIRED   CURRENT   READY   AGE
  nginx-deployment-1564180365   3         3         3       6s
  nginx-deployment-2035384211   0         0         0       36s
  ```

### Rollover (aka multiple updates in-flight)

Each time a new Deployment rollout is initiated, a new ReplicaSet is created for the Deployment and scaled up. If you update a Deployment while an existing rollout is in progress, the Deployment creates a new ReplicaSet as per the update and starts scaling that up, and rolls over the ReplicaSet that it was scaling up previously — it will add the newly created ReplicaSet to its list of old ReplicaSets and will start scaling it down.

### Label selector updates

It is generally not recommended to make label selector updates and it is suggested to plan your selectors up front. In any case, if you need to perform a label selector update, exercise extreme caution and make sure you have grasped all of the implications.

> **Note:** In API version `apps/v1`, a Deployment's label selector is immutable after it is created.

* Selector additions require the Pod template labels in the Deployment spec to be updated with the new label as well, otherwise a validation error is returned.
* Selector updates — changing the existing label selector keys' values — results in the same behavior as additions.
* Selector deletions — removing existing keys from the Deployment selector — do not require any changes in the Pod template labels.

## Rolling Back a Deployment

Sometimes, you may want to rollback a Deployment; for example, when the Deployment is not stable, such as crash looping. By default, all of the Deployment's rollout history is kept in the system so that you can rollback anytime you want (you can change this by modifying the revision history limit).

> **Note:** A Deployment's revision is created when a Deployment's rollout is triggered. This means that a new revision is created if and only if the Deployment's Pod template (`.spec.template`) is changed. Other updates such as scaling the Deployment do not create a Deployment revision.

### Checking Rollout History of a Deployment

1. First, check the revisions of this Deployment:

   ```
   kubectl rollout history deployment/nginx-deployment
   ```

   The output is similar to:

   ```
   deployments "nginx-deployment"
   REVISION  CHANGE-CAUSE
   1         <none>
   2         <none>
   ```

   `CHANGE-CAUSE` is copied from the Deployment annotation `kubernetes.io/change-cause` to the revision. It can be set by annotating the Deployment with `kubectl annotate deployment/nginx-deployment kubernetes.io/change-cause="image updated to 1.16.0"`.

2. To see the details of each revision, run:

   ```
   kubectl rollout history deployment/nginx-deployment --revision=2
   ```

### Rolling Back to a Previous Revision

1. Undo the current rollout and rollback to the previous Deployment:

   ```
   kubectl rollout undo deployment/nginx-deployment
   ```

   Alternatively, you can rollback to a specific revision by specifying that in `--to-revision`:

   ```
   kubectl rollout undo deployment/nginx-deployment --to-revision=2
   ```

Verify that the rollback was successful:

```
kubectl get deployment nginx-deployment
```

```
NAME               READY   UP-TO-DATE   AVAILABLE   AGE
nginx-deployment   3/3     3            3           36s
```

## Scaling a Deployment

You can scale a Deployment by using the following command:

```
kubectl scale deployment/nginx-deployment --replicas=10
```

Assuming horizontal Pod autoscaling is enabled in your cluster, you can setup an autoscaler for your Deployment and choose the minimum and maximum number of Pods you want to run based on the CPU utilization of your existing Pods.

```
kubectl autoscale deployment/nginx-deployment --min=10 --max=15 --cpu-percent=80
```

### Proportional scaling

RollingUpdate Deployments support running multiple versions of an application at the same time. When you or an autoscaler scales down a RollingUpdate Deployment that is in the middle of a rollout (either in progress or paused), the Deployment controller balances the additional replicas across all active ReplicaSets (ReplicaSets with replicas) to mitigate risk. This is called *proportional scaling*.

For example, you are running a Deployment with 10 replicas, `maxSurge=3`, and `maxUnavailable=2`, with the old ReplicaSet having 8 replicas and the new ReplicaSet having 2 replicas.

```
kubectl scale deployment/nginx-deployment --replicas=9
```

The Deployment controller balances the 9 replicas between the old and new ReplicaSets:

```
NAME                          DESIRED   CURRENT   READY   AGE
nginx-deployment-1564180365   7         7         7       11m
nginx-deployment-2035384211   2         2         2       1h
```

## Pausing and Resuming a rollout of a Deployment

When you update a Deployment, or plan to, you can pause the rollout of a Deployment before you trigger one or more updates. When you are ready to apply those changes, you resume the rollout. This approach allows you to apply multiple fixes in between pausing and resuming without triggering unnecessary rollouts.

```
kubectl rollout pause deployment/nginx-deployment
```

Then update the image of the Deployment:

```
kubectl set image deployment/nginx-deployment nginx=nginx:1.16.0
```

Notice that no new rollout started:

```
kubectl rollout history deployment/nginx-deployment
```

You can make as many updates as you wish, for example, update the resources that will be used:

```
kubectl set resources deployment/nginx-deployment -c=nginx --limits=cpu=200m,memory=512Mi
```

Eventually, resume the rollout of the Deployment:

```
kubectl rollout resume deployment/nginx-deployment
```

## Deployment status

A Deployment enters various states during its lifecycle. It can be *progressing* while rolling out a new ReplicaSet, it can be *complete*, or it can *fail to progress*.

### Progressing Deployment

Kubernetes marks a Deployment as *progressing* when one of the following tasks is performed:

* The Deployment creates a new ReplicaSet.
* The Deployment is scaling up its newest ReplicaSet.
* The Deployment is scaling down its older ReplicaSet(s).
* New Pods become ready or available (ready for at least MinReadySeconds).

### Complete Deployment

Kubernetes marks a Deployment as *complete* when it has the following characteristics:

* All of the replicas associated with the Deployment have been updated to the latest version you've specified.
* All of the replicas associated with the Deployment are available.
* No old replicas for the Deployment are running.

You can check if a Deployment has completed by running:

```
kubectl get deployment nginx-deployment -o jsonpath='{.status.conditions[?(@.type=="Progressing")]}'
```

### Failed Deployment

Your Deployment may get stuck trying to deploy its newest ReplicaSet without ever completing. This can occur due to some of the following factors:

* Insufficient quota
* Readiness probe failures
* Image pull errors
* Insufficient permissions
* Limit ranges
* Application runtime misconfiguration

One way to detect this condition is to specify a deadline parameter in your Deployment spec: `.spec.progressDeadlineSeconds`. `.spec.progressDeadlineSeconds` denotes the number of seconds the Deployment controller will wait before indicating (in the Deployment status) that the Deployment progress has stalled.

The following `kubectl` command sets the spec with `progressDeadlineSeconds` to make the controller report lack of progress of a rollout for a Deployment after 10 minutes:

```
kubectl patch deployment/nginx-deployment -p '{"spec":{"progressDeadlineSeconds":600}}'
```

Once the deadline has been exceeded, the Deployment controller adds a DeploymentCondition with the following attributes to the Deployment's `.status.conditions`:

* Type: `Progressing`
* Status: `False`
* Reason: `ProgressDeadlineExceeded`

> **Note:** Kubernetes takes no action on a stalled Deployment other than to report a status condition with `Reason: ProgressDeadlineExceeded`. Higher level orchestrators can take advantage of it and act on it, for example, rolling back the Deployment to its previous version.

### Operating on a failed deployment

All actions that apply to a complete Deployment also apply to a failed Deployment. You can scale it up/down, rollback to a previous revision, or even pause it if you need to apply multiple tweaks in the Deployment spec.

## Clean up Policy

You can set the `.spec.revisionHistoryLimit` field in a Deployment to specify how many old ReplicaSets of this Deployment you want to retain. The rest will be garbage collected in the background. By default, it is 10.

> **Note:** Explicitly setting this field to 0 will result in all of the history of your Deployment being cleaned up, thus the Deployment will not be able to roll back.

Example:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nginx-deployment
  labels:
    app: nginx
spec:
  replicas: 3
  revisionHistoryLimit: 10
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
        image: nginx:1.14.2
        ports:
        - containerPort: 80
```

## Canary Deployment

If you want to roll out releases to a subset of users or servers using a Deployment, you can create multiple Deployments, one for each release, following the canary pattern.

## Writing a Deployment Spec

As with all other Kubernetes configs, a Deployment needs `apiVersion`, `kind`, and `metadata` fields.

A Deployment also needs a `.spec` section.

### Pod Template

The `.spec.template` is a required field in the `.spec`.

The `.spec.template` is a Pod template. It has exactly the same schema as a Pod, except it is nested and does not have an `apiVersion` or `kind`.

Only a `.spec.template.spec.restartPolicy` equal to `Always` is allowed, which is the default if not specified.

### Replicas

`.spec.replicas` is an optional field that specifies the number of desired Pods. Defaults to 1.

### Selector

`.spec.selector` is a required field that specifies a label selector for the Pods targeted by this Deployment.

`.spec.selector` must match `.spec.template.metadata.labels`, or it will be rejected by the API.

In API version `apps/v1`, `.spec.selector` and `.metadata.labels` do not default to `.spec.template.metadata.labels` if not set, so they must be set explicitly. Also, in API version `apps/v1`, a Deployment cannot change its selector after it is created, so `.spec.selector` is immutable after creation.

> **Caution:** Do not update label selectors that currently exist in live ReplicaSets or Deployments, as this removes the existing relationship and results in orphaning Pods from their former controller, which may cause errors.

### Strategy

`.spec.strategy` specifies the strategy used to replace old Pods by new ones. `.spec.strategy.type` can be either `Recreate` or `RollingUpdate`. `RollingUpdate` is the default value.

#### Recreate Deployment

All existing Pods are killed before new ones are created when `.spec.strategy.type==Recreate`.

#### Rolling Update Deployment

The Deployment updates Pods in a rolling update fashion when `.spec.strategy.type==RollingUpdate`. You can specify `maxUnavailable` and `maxSurge` to control the rolling update process.

##### Max Unavailable

`.spec.strategy.rollingUpdate.maxUnavailable` is an optional field that specifies the maximum number of Pods that can be unavailable during the update process. The value can be an absolute number (for example, `5`) or a percentage of desired Pods (for example, `10%`). The absolute number is calculated from percentage by rounding down. The value cannot be 0 if `.spec.strategy.rollingUpdate.maxSurge` is 0. The default value is `25%`.

Example: When this value is set to 30%, the RollingUpdate can make 30% of the existing Pods unavailable immediately when the rolling update starts.

##### Max Surge

`.spec.strategy.rollingUpdate.maxSurge` is an optional field that specifies the maximum number of Pods that can be created over the desired number of Pods. The value can be an absolute number (for example, `5`) or a percentage of desired Pods (for example, `10%`). The value cannot be 0 if `maxUnavailable` is 0. The absolute number is calculated from the percentage by rounding up. The default value is `25%`.

Example: When this value is set to 30%, the RollingUpdate can start scaling up the new ReplicaSet immediately when the rolling update starts, such that the total number of old and new Pods does not exceed 130% of desired Pods.

### Progress Deadline Seconds

`.spec.progressDeadlineSeconds` is an optional field that specifies the number of seconds you want to wait for your Deployment to progress before the system reports back that the Deployment has failed progressing. This defaults to 600 seconds.

If specified, this field needs to be greater than `.spec.minReadySeconds`.

### Min Ready Seconds

`.spec.minReadySeconds` is an optional field that specifies the minimum number of seconds for which a newly created Pod should be ready without any of its containers crashing, for it to be considered available. This defaults to 0 (the Pod will be considered available as soon as it is ready).

### Terminating Pods

Sometimes, you may want to perform cleanup operations before a Pod belonging to a Deployment terminates, such as draining connections. For this, you can use `terminationGracePeriodSeconds`.

### Revision History Limit

A Deployment's revision history is stored in the ReplicaSets it controls.

`.spec.revisionHistoryLimit` is an optional field that specifies the number of old ReplicaSets to retain to allow rollback. These old ReplicaSets consume resources in `etcd` and crowd the output of `kubectl get rs`. The configuration of each Deployment revision is stored in its ReplicaSets; therefore, once a ReplicaSet is deleted, you lose the ability to rollback to that Deployment revision. By default, 10 old ReplicaSets are kept.

* If this field is set to zero, no old ReplicaSets will be kept. In this case, you cannot undo a Deployment rollout.
* The revision is updated for every rollout trigger.

### Paused

`.spec.paused` is an optional boolean field for pausing and resuming a Deployment. The difference between a paused Deployment and one that is not paused is that any changes to the PodTemplateSpec of the paused Deployment will not trigger new rollouts as long as it is paused. A Deployment is not paused by default.

## What's next

* Learn about Pods
* Learn how to use Deployments
  * Run a Stateless Application Using a Deployment
  * Scale a Deployment
* Learn about ReplicaSets
* Read the Deployment API reference
