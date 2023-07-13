# ECS Fargate Case Study (Pulumi)

A minimal, production-shaped reference architecture for running a containerized service on AWS ECS Fargate, managed with Pulumi (TypeScript).

## Architecture

```
Internet
   │
   ▼
 ALB (public subnets)
   │  HTTP :80 → target group :8080
   ▼
ECS Fargate Service (private subnets)
   │  2-8 tasks, autoscaled on CPU/Memory
   ▼
CloudWatch Logs  +  ECR (container images)
```

- **VPC** — 2 AZs, public subnets (ALB) + private subnets (ECS tasks), single NAT gateway.
- **ECR** — private repo with a lifecycle policy (expires untagged images after 14 days, keeps the last 10 tagged).
- **ECS Cluster** — Fargate + Fargate Spot capacity providers.
- **ALB** — forwards to a target group healthchecking `/healthz`.
- **Autoscaling** — target tracking on CPU (60%) and memory (70%), 2-8 tasks.

## Layout

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
| `index.ts` | Entry point, re-exports stack outputs |

## Usage

```bash
npm install
pulumi stack init dev
cp Pulumi.dev.yaml.example Pulumi.dev.yaml   # fill in your own values
pulumi config set aws:region us-east-1
pulumi up
```

Push an image to the ECR repo, update `imageTag`, run `pulumi up` again to roll out.

## Cost notes

2 Fargate Spot tasks (0.25 vCPU / 0.5 GB) behind an ALB and one NAT gateway run roughly $30-45/mo idle in `us-east-1`, mostly ALB/NAT hourly charges.

## Cleanup

```bash
pulumi destroy
pulumi stack rm dev
```
