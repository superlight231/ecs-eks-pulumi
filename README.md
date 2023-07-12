# ECS Fargate Case Study (Pulumi)

A minimal but production-shaped reference architecture for running a containerized
service on AWS ECS Fargate, managed entirely with Pulumi (TypeScript).

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

- **VPC** — 2 AZs, public subnets (ALB) + private subnets (ECS tasks), single NAT
  gateway for outbound access from private subnets.
- **ECR** — private repository with a lifecycle policy that expires untagged images
  after 14 days and keeps only the 10 most recent tagged releases.
- **ECS Cluster** — Fargate + Fargate Spot capacity providers (mostly Spot, one
  on-demand baseline task).
- **ALB** — public-facing, forwards to a target group healthchecking `/healthz`.
- **Autoscaling** — target tracking on both CPU (60%) and memory (70%), 2-8 tasks.

## Layout

| File | Purpose |
|---|---|
| `vpc.ts` | VPC, subnets, IGW, NAT gateway, route tables |
| `ecr.ts` | Container image repository + lifecycle policy |
| `securityGroups.ts` | ALB and ECS task security groups |
| `cluster.ts` | ECS cluster + capacity providers |
| `alb.ts` | Application Load Balancer, target group, listener |
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

Push an image to the ECR repo created by this stack, then update `imageTag` and
run `pulumi up` again to roll out a new revision.

## Cost notes

Default config runs 2 Fargate Spot tasks (0.25 vCPU / 0.5 GB each) behind an ALB
and a single NAT gateway. Roughly $30-45/mo at idle in `us-east-1`, dominated by
the ALB and NAT gateway hourly charges rather than compute.

## Cleanup

```bash
pulumi destroy
pulumi stack rm dev
```
