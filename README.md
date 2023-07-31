# ECS + EKS Case Study (Pulumi)

Two production-shaped reference architectures on AWS, sharing one VPC, managed with Pulumi (TypeScript):

1. A single containerized service on **ECS Fargate**, behind an ALB.
2. A **multi-service EKS cluster** running three microservices (`api-gateway`, `orders-service`, `notifications-service`) behind the AWS Load Balancer Controller.

## Architecture

```
                              Internet
                                 │
                 ┌───────────────┴───────────────┐
                 ▼                                ▼
         ALB (ECS ingress)               ALB (EKS ingress, via
         :80 → target group :8080         aws-load-balancer-controller)
                 │                                │
                 ▼                                ▼
     ECS Fargate Service (private        api-gateway Deployment (EKS)
     subnets, 2-8 tasks autoscaled)                │
                 │                    ┌─────────────┴─────────────┐
                 ▼                    ▼                           ▼
    CloudWatch Logs + ECR      orders-service              notifications-service
                               (3 replicas)                 (2 replicas)
                                    │                            │
                                    └──────────┬─────────────────┘
                                          ClusterIP Services
                                     (ClusterIP, in-cluster only)
```

Both halves share the same VPC (`vpc.ts`) — the ECS tasks and EKS worker nodes both live in the private subnets, and each ingress path gets its own ALB in the public subnets.

## ECS Fargate (single service)

- **VPC** — 2 AZs, public + private subnets, single NAT gateway.
- **ECR** — private repo, lifecycle policy (expires untagged images after 14 days, keeps last 10 tagged).
- **ECS Cluster** — Fargate + Fargate Spot capacity providers.
- **ALB** — forwards to a target group healthchecking `/healthz`.
- **Autoscaling** — target tracking on CPU (60%) and memory (70%), 2-8 tasks.

| File | Purpose |
|---|---|
| `vpc.ts` | VPC, subnets, IGW, NAT gateway, route tables |
| `ecr.ts` | Container image repository + lifecycle policy |
| `securityGroups.ts` | ALB and ECS task security groups |
| `cluster.ts` | ECS cluster + capacity providers |
| `alb.ts` | Load balancer, target group, listener |
| `taskDefinition.ts` | Fargate task definition, IAM roles, log group |
| `service.ts` | ECS service wiring the task definition to the ALB |
| `autoscaling.ts` | Application Auto Scaling target + policies |

## EKS (multi-service)

- **Cluster** (`eks/cluster.ts`) — managed node group (`t3.medium` × 2-5, autoscaled), OIDC provider enabled for IRSA.
- **ECR** (`eks/ecrRepos.ts`) — one repository per microservice.
- **`createMicroservice()`** (`eks/microservice.ts`) — shared Deployment + ClusterIP Service factory; each service under `eks/services/` only declares its image, port, replicas, and env vars.
- **`api-gateway`** — public entry point; routes to the other two services over their in-cluster DNS names. Exposed externally via an `Ingress` + the AWS Load Balancer Controller.
- **`orders-service`**, **`notifications-service`** — internal-only, reachable at `<name>.microservices.svc.cluster.local`.
- **ALB Controller** (`eks/albController.ts`) — installed via Helm, authenticated through IRSA (a scoped IAM role assumed by its own Kubernetes service account) rather than broad node-level permissions.

| File | Purpose |
|---|---|
| `eks/cluster.ts` | EKS cluster, managed node group, OIDC provider |
| `eks/namespace.ts` | `microservices` namespace |
| `eks/ecrRepos.ts` | One ECR repo per microservice |
| `eks/microservice.ts` | Shared Deployment + Service factory |
| `eks/albController.ts` | AWS Load Balancer Controller (Helm) + IRSA role |
| `eks/services/apiGateway.ts` | Public-facing gateway + Ingress |
| `eks/services/ordersService.ts` | Internal orders microservice |
| `eks/services/notificationsService.ts` | Internal notifications microservice |

## Usage

```bash
npm install
pulumi stack init dev
cp Pulumi.dev.yaml.example Pulumi.dev.yaml   # fill in your own values
pulumi config set aws:region us-east-1
pulumi up
```

Push images to each ECR repo (the ECS app's and the three microservices'), update `imageTag`, and run `pulumi up` again to roll out.

Fetch cluster credentials once EKS is up:

```bash
pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
export KUBECONFIG=./kubeconfig.yaml
kubectl get pods -n microservices
```

## Cost notes

The ECS side (2 Fargate Spot tasks + ALB + NAT gateway) runs roughly $30-45/mo idle in `us-east-1`. The EKS side adds the $0.10/hr cluster control-plane fee plus 2 `t3.medium` nodes — budget another ~$110-130/mo idle, dominated by the control plane and EC2 node costs rather than the microservices themselves.

## Cleanup

```bash
pulumi destroy
pulumi stack rm dev
```
