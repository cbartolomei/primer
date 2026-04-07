<!-- Source: https://kubernetes.io/docs/concepts/services-networking/service/ -->
# Service

Expose an application running in your cluster behind a single outward-facing endpoint, even when the workload is split across multiple backends.

In Kubernetes, a Service is a method for exposing a network application that is running as one or more Pods in your cluster.

A key aim of Services in Kubernetes is that you don't need to modify your existing application to use an unfamiliar service discovery mechanism. You can run code in Pods, whether this is code designed for a cloud-native world, or an older app you've containerized. You use a Service to make that set of Pods available on the network so that clients can interact with it.

If you use a Deployment to run your app, that Deployment can create and destroy Pods dynamically. From one moment to the next, you don't know how many of those Pods are working and healthy; you might not even know what those healthy Pods are named. Kubernetes Pods are created and destroyed to match the desired state of your cluster. Pods are ephemeral resources (you should not expect that an individual Pod is reliable and durable).

Each Pod gets its own IP address (Kubernetes expects network plugins to ensure this). For a given Deployment in your cluster, the set of Pods running in one moment in time could be different from the set of Pods running that application a moment later.

This leads to a problem: if some set of Pods (call them "backends") provides functionality to other Pods (call them "frontends") inside your cluster, how do the frontends find out and keep track of which IP address to connect to, so that the frontend can use the backend part of the workload?

Enter *Services*.

## Services in Kubernetes

The Service API, part of Kubernetes, is an abstraction to help you expose groups of Pods over a network. Each Service object defines a logical set of endpoints (usually these endpoints are Pods) along with a policy about how to make those pods accessible.

For example, consider a stateless image-processing backend which is running with 3 replicas. Those replicas are fungible — frontends do not care which backend they use. While the actual Pods that compose the backend set may change, the frontend clients should not need to be aware of that, nor should they need to keep track of the set of backends themselves.

The Service abstraction enables this decoupling.

The set of Pods targeted by a Service is usually determined by a selector that you define. To learn about other ways to define Service endpoints, see Services *without* selectors.

If your workload speaks HTTP, you might choose to use an Ingress to control how web traffic reaches that workload. Ingress is not a Service type, but it acts as the entry point for your cluster. An Ingress lets you consolidate your routing rules into a single resource, so that you can expose multiple components of your workload, running separately in your cluster, behind a single listener.

The Gateway API for Kubernetes provides extra capabilities beyond Ingress and Service. You can add Gateway to your cluster — it is a family of extension APIs, implemented using CustomResourceDefinitions — and then use these to configure access to network services that are running in your cluster.

### Cloud-native service discovery

If you're able to use Kubernetes APIs for service discovery in your application, you can query the API server for matching EndpointSlices. Kubernetes updates the EndpointSlices for a Service whenever the set of Pods in a Service changes.

For non-native applications, Kubernetes offers ways to place a network port or load balancer in between your application and the backend Pods.

## Defining a Service

A Service is an object (the same way that a Pod or a ConfigMap is an object). You can create, view or modify Service definitions using the Kubernetes API. Usually you use a tool such as `kubectl` to make those API calls for you.

For example, suppose you have a set of Pods that each listen on TCP port 9376 and are labelled as `app.kubernetes.io/name=MyApp`. You can define a Service to publish that TCP listener:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app.kubernetes.io/name: MyApp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 9376
```

Applying this manifest creates a new Service named "my-service" with the default ClusterIP service type. The Service targets TCP port 9376 on any Pod with the `app.kubernetes.io/name: MyApp` label.

Kubernetes assigns this Service an IP address (the *cluster IP*), that is used by the virtual IP address mechanism.

The controller for that Service continuously scans for Pods that match its selector, and then makes any necessary updates to the set of EndpointSlices for the Service.

The name of a Service object must be a valid RFC 1035 label name.

> **Note:** A Service can map *any* incoming `port` to a `targetPort`. By default and for convenience, the `targetPort` is set to the same value as the `port` field.

### Relaxed naming requirements for Service objects

**FEATURE STATE:** `Kubernetes v1.34 [alpha]` (disabled by default)

The `RelaxedServiceNameValidation` feature gate allows Service object names to start with a digit. When this feature gate is enabled, Service object names must be valid RFC 1123 label names.

### Port definitions

Port definitions in Pods have names, and you can reference these names in the `targetPort` attribute of a Service. For example, we can bind the `targetPort` of the Service to the Pod port in the following way:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: nginx-service
spec:
  selector:
    app.kubernetes.io/name: proxy
  ports:
  - name: name-of-service-port
    protocol: TCP
    port: 80
    targetPort: http-web-svc
---
apiVersion: v1
kind: Pod
metadata:
  name: nginx
  labels:
    app.kubernetes.io/name: proxy
spec:
  containers:
  - name: nginx
    image: nginx:stable
    ports:
      - containerPort: 80
        name: http-web-svc
```

This works even if there is a mixture of Pods in the Service using a single configured name, with the same network protocol available via different port numbers. This offers a lot of flexibility for deploying and evolving your Services. For example, you can change the port numbers that Pods expose in the next version of your backend software, without breaking clients.

The default protocol for Services is TCP; you can also use other supported protocols.

### Services without selectors

Services most commonly abstract access to Kubernetes Pods thanks to the selector; however, when used with a corresponding set of EndpointSlices or Endpoints objects, a Service can abstract other kinds of backends too.

For instance:

- You want to have an external database cluster in production, but in your test environment you use your own databases.
- You want to point your Service to a Service in a different Namespace or even in another cluster.
- You are migrating a workload to Kubernetes. While evaluating the approach, you run only some of your backends in Kubernetes.

In any of these scenarios you can define a Service *without* a Pod selector. For example:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - protocol: TCP
      port: 80
      targetPort: 9376
```

Because this Service has no selector, the corresponding EndpointSlices (and legacy Endpoints) object is not created automatically. You can manually map the Service to the network address and port where it's running, by adding an EndpointSlices object manually. For example:

```yaml
apiVersion: discovery.k8s.io/v1
kind: EndpointSlice
metadata:
  name: my-service-1
  labels:
    kubernetes.io/service-name: my-service
spec:
  addressType: IPv4
  ports:
    - port: 9376
  endpoints:
    - addresses:
        - "10.50.6.146"
```

#### Custom EndpointSlices

When you create an EndpointSlice object for a Service, you can use any name for the EndpointSlice. Each EndpointSlice in a namespace works with any other EndpointSlice for the Service by virtue of the label `kubernetes.io/service-name`.

#### EndpointSlices

**FEATURE STATE: `Kubernetes v1.21 [stable]`**

EndpointSlices are objects that represent a subset of the endpoints for a Service. Your Service can have multiple EndpointSlices, and the total set of endpoints for the Service is the union of all of its EndpointSlices.

With large numbers of endpoints, EndpointSlices can help reduce the impact of updates to that data. For a large Service, updates to endpoints could be very high volume, which can be slow and expensive to manage at scale.

By default, Kubernetes manages EndpointSlices to have no more than 100 endpoints each (you can configure this with the `--max-endpoints-per-slice` kube-controller-manager flag, up to a maximum of 1000).

#### Endpoints (deprecated)

In Kubernetes, an Endpoints object is a legacy way to represent the set of network endpoints for a service. The use of Endpoints is now deprecated in favor of EndpointSlices.

In cases where you are manually managing the network endpoints for a service, you would create an Endpoints object that matches the name of your Service:

```yaml
apiVersion: v1
kind: Endpoints
metadata:
  name: my-service
subsets:
  - addresses:
      - ip: 192.0.2.42
    ports:
      - port: 9376
```

> **Note:** Endpoint IPs must not be loopback (127.0.0.0/8 for IPv4, ::1/128 for IPv6), link-local (169.254.0.0/16 and 224.0.0.0/4 for IPv4, fe80::/10 for IPv6), or link-local multicast (224.0.0.0/24 for IPv4, ff00::/8 for IPv6).

> **Warning:** Updating endpoint records manually is discouraged because it can conflict with updates made by the Service controller.

### Application protocol

**FEATURE STATE: `Kubernetes v1.20 [stable]`**

The `appProtocol` field provides a way to specify an application protocol for each Service port. The value of this field is mirrored in the corresponding Endpoints and EndpointSlices objects.

This field follows standard Kubernetes label syntax. Valid values include:

- IP protocols assigned by IANA (for example `tcp`, `udp`, `sctp`)
- Kubernetes-defined protocols (for example `tls`, `dns`)
- Protocols with domain prefix (for example `mycompany.com/my-protocol`)
- Protocols prefixed with `kubernetes.io/` are reserved for Kubernetes and cannot be used

For example:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  ports:
    - port: 443
      targetPort: 8443
      protocol: TCP
      appProtocol: https
```

### Multi-port Services

Sometimes you need to expose more than one port per Service. Kubernetes lets you configure multiple port definitions on a Service object. When using multiple ports for a Service, you must give all of your ports names so that the endpoints are unambiguous. For example:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app.kubernetes.io/name: MyApp
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 9376
    - name: https
      protocol: TCP
      port: 443
      targetPort: 9377
```

## Service type

For some parts of your application (for example, frontends) you may want to expose a Service onto an external IP address that's outside of your cluster.

Kubernetes `ServiceTypes` allow you to specify what kind of Service you want. The default is `ClusterIP`.

`ServiceType` values and their behaviors are:

- `ClusterIP`: Exposes the Service on a cluster-internal IP. Choosing this value makes the Service only reachable from within the cluster. This is the default `ServiceType`.
- `NodePort`: Exposes the Service on each Node's IP at a static port (the `NodePort`). To make the node port Service reachable, Kubernetes sets up cluster IP addresses as if you had requested a `ClusterIP` Service. A `NodePort` Service is accessed from outside the cluster by requesting `<NodeIP>:<NodePort>`.
- `LoadBalancer`: Exposes the Service externally using an external load balancer. Kubernetes does not directly offer a load balancing component; you must provide one, or you can integrate your Kubernetes cluster with a cloud provider.
- `ExternalName`: Maps the Service to the contents of the `externalName` field (for example, to a hostname `foo.bar.example.com`), by returning a CNAME record with its value.

### type: ClusterIP

This is the default `ServiceType`. Kubernetes assigns a virtual IP address from the pool of IP addresses reserved for Services. This virtual IP address is stable for the lifetime of the Service object (even if Pods behind the Service change).

Any client within your Kubernetes cluster can contact the Service by connecting to the cluster IP address on the appropriate port. Clients outside the cluster cannot access a ClusterIP Service, except through port forwarding.

### type: NodePort

If you set the `type` field to `NodePort`, the Kubernetes control plane allocates a port from a range specified by `--service-node-port-range` flag (default: 30000-32767). Each node proxies that port (the same port number on every node) into your Service. Your Service reports the allocated node port in its `.status.nodePort` field.

Using a NodePort gives you the freedom to set up your own load balancing solution, to configure environments that are not fully supported by Kubernetes, or even to just expose one or more nodes' IP addresses directly.

A NodePort Service is accessed from outside the cluster by requesting `<NodeIP>:<NodePort>`.

Here is an example NodePort Service:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  type: NodePort
  selector:
    app.kubernetes.io/name: MyApp
  ports:
      # By default and for convenience, the `targetPort` is set to the same value as the `port` field.
    - port: 80
      targetPort: 80
      # Optional field
      nodePort: 30007
```

### type: LoadBalancer

If you set the `type` field to `LoadBalancer`, the Kubernetes control plane allocates an address in the `LoadBalancer` ingress field of the Service status.

The actual creation of the load balancer happens asynchronously, and information about the provisioned load balancer is published in the Service's `.status.loadBalancer` field. For example:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app.kubernetes.io/name: MyApp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 9376
  clusterIP: 10.0.171.239
  type: LoadBalancer
status:
  loadBalancer:
    ingress:
      - ip: 192.0.2.127
```

Traffic from the external load balancer is directed at the backend Pods. The cloud provider decides how it is routed.

#### Load balancer support for externalTrafficPolicy

If you set `externalTrafficPolicy: Local`, the kube-proxy will only proxy requests to local endpoints, and will not forward traffic to other nodes. This allows the source IP to be preserved but still results in an unequal distribution of traffic.

If the `externalTrafficPolicy` is set to `Local`, the load balancer only sends traffic to nodes that have ready endpoints.

#### Load balancer support for `loadBalancerSourceRanges`

You can set `.spec.loadBalancerSourceRanges` to limit the client IP addresses that can access a LoadBalancer Service. This field is a list of IP CIDR ranges, similar to the ingress rules in a cloud security group.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app.kubernetes.io/name: MyApp
  ports:
    - protocol: TCP
      port: 80
      targetPort: 9376
  type: LoadBalancer
  loadBalancerSourceRanges:
    - "143.231.0.0/16"
    - "205.191.0.0/16"
```

### type: ExternalName

Services of type `ExternalName` map a Service to a DNS name, not to a typical selector such as `my-service`. You specify these Services with the `spec.externalName` parameter.

For example, this Service definition maps the `my-service` Service in the `prod` namespace to `my.database.example.com`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
  namespace: prod
spec:
  type: ExternalName
  externalName: my.database.example.com
```

> **Note:** ExternalName accepts an IPv6 address, but only if the address is enclosed in brackets, similar to RFC 6874. For example: `[2001:db8::1]`

When you look up the hostname `my-service.prod.svc.cluster.local`, the cluster DNS returns a `CNAME` record with the value `my.database.example.com`.

Connecting to `my-service` works the same way as other Services, but with the crucial difference that redirection happens at the DNS level rather than via proxying or forwarding.

> **Warning:** You may have issues using ExternalName for some common protocols, specifically HTTPS. If you use ExternalName and the backend is HTTPS, the connection from your cluster to the backend will use HTTP, which may cause issues.

#### SCTP support

**FEATURE STATE: `Kubernetes v1.20 [stable]`**

As a stable feature, SCTP is supported for the service types `ClusterIP`, `NodePort`, `LoadBalancer`, and `ExternalName`.

## Headless Services

Sometimes you don't need load-balancing and a single Service IP. In this case, you can create what are termed "headless" Services, by explicitly setting the cluster IP (`.spec.clusterIP`) to `"None"`.

You can use a headless Service to interface with other service discovery mechanisms, without being locked into Kubernetes' implementation.

A headless Service allows client code to connect directly to whichever Pods are backing the Service. For services without selectors, the EndpointSlices (or Endpoints) objects are still created, but the headless Service does not allocate a cluster IP address.

### With selectors

For headless Services that define selectors, the Kubernetes control plane creates EndpointSlice objects in the Kubernetes API, and modifies the DNS configuration to return A records (IPv4) or AAAA records (IPv6) that point directly to the Pods backing the Service.

### Without selectors

For headless Services that do not define selectors, the Kubernetes control plane does not create EndpointSlice objects. However, the DNS system looks for and configures either:

- CNAME records for `ExternalName`-type services
- A records for any EndpointSlices for the Service, and addresses from any publicly announced IPs for Endpoints objects in the same Service definition

## Discovering services

Kubernetes supports 2 primary modes of finding a Service: environment variables and DNS.

### Environment variables

When a Pod is run on a Node, the kubelet adds a set of environment variables for each active Service. It adds `{SVCNAME}_SERVICE_HOST` and `{SVCNAME}_SERVICE_PORT` variables, where the Service name is upper-cased and dashes are converted to underscores.

For example, the Service `redis-master` exposes these environment variables:

```
REDIS_MASTER_SERVICE_HOST=10.0.0.11
REDIS_MASTER_SERVICE_PORT=6379
REDIS_MASTER_SERVICE_PORT_HTTPS=6380
```

> **Note:** When you have a Service with multiple ports, both the port number and protocol are encoded in the environment variable name: `{SVCNAME}_SERVICE_PORT_{PORTNAME}`.

### DNS

You can (and almost always should) set up a DNS service for your Kubernetes cluster.

A cluster DNS server watches the Kubernetes API for new Services and creates a set of DNS records for each one. If DNS has been enabled throughout your cluster, Pods should be able to automatically resolve Service names.

For example, if you have a Service called `my-service` in Kubernetes `namespace` called `my-ns`, the control plane and the DNS Service acting together create a DNS record for `my-service.my-ns`. Pods in the `my-ns` namespace should be able to find the service by simply doing a name lookup for `my-service`. Pods in other namespaces must qualify the name as `my-service.my-ns`.

Kubernetes also supports DNS SRV (Service) records for named ports. If the Service `my-service` in namespace `my-ns` has a port named `http` with protocol `tcp`, you could do a DNS SRV query for `_http._tcp.my-service.my-ns` to discover the port number for `http`, as well as the IP address.

The Kubernetes DNS server is the only way to access `ExternalName` Services.

## Virtual IP addressing mechanism

Read Virtual IPs and Service Proxies for detailed information.

### Traffic policies

You can set the `.spec.sessionAffinity` field to control whether client connections are routed to the same Pod each time. The default value is `"ClientIP"`.

### Traffic distribution control

#### `externalTrafficPolicy`

The `.spec.externalTrafficPolicy` field controls whether external traffic can be routed to node-local or cluster-wide endpoints. If set to `Local`, the request is proxied only to local node endpoints, preserving the original source IP in most cases. If set to `Cluster`, the request may be proxied to any endpoint in the cluster.

The default value (`Cluster`) means traffic may be distributed unevenly and the source IP seen by pods might not be the client IP.

#### `internalTrafficPolicy`

The `.spec.internalTrafficPolicy` field controls how traffic intended for the cluster IP is routed. Valid values are `Cluster` and `Local`.

If set to `Cluster` (default), traffic is routed to all ready endpoints. If set to `Local`, traffic is only routed to local node endpoints. If the traffic policy is `Local` and there are no local endpoints, the traffic is dropped by kube-proxy.

### Session stickiness

If you want to ensure that requests from a particular client are passed to the same Pod every time, you can set `.spec.sessionAffinity` to `"ClientIP"` (the default is `"None"`). You can also set `.spec.sessionAffinityConfig.clientIP.timeoutSeconds` to set the maximum session sticky time. This works for both ClusterIP and NodePort services.

> **Note:** Session affinity is not supported for Services with multiple ports.

## External IPs

If there are external IPs that route to one or more cluster nodes, Kubernetes Services can be exposed on those external IPs. Traffic that ingresses into the cluster on the external IP (as destination IP), on the Service port, will be routed to one of the Service endpoints. This is not managed by the cloud provider and is the responsibility of the cluster administrator to configure.

```yaml
apiVersion: v1
kind: Service
metadata:
  name: my-service
spec:
  selector:
    app.kubernetes.io/name: MyApp
  ports:
    - name: http
      protocol: TCP
      port: 80
      targetPort: 9376
  externalIPs:
    - 198.51.100.32
```

> **Note:** Kubernetes does not manage the assignment of external IPs. That is the responsibility of the cluster administrator.

## API Object

Service is a top-level resource in the Kubernetes REST API.

## What's next

Learn more about Services:
- Virtual IPs and Service Proxies
- Services, Load Balancing, and Networking
- Ingress
- Endpoint Slices
- Network Policies
- DNS for Services and Pods
- Service API reference
