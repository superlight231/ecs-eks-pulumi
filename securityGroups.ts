import * as aws from "@pulumi/aws";
import { vpc } from "./vpc";

export const albSecurityGroup = new aws.ec2.SecurityGroup("alb-sg", {
    vpcId: vpc.id,
    description: "Allow inbound HTTP/HTTPS from the internet",
    ingress: [
        { protocol: "tcp", fromPort: 80, toPort: 80, cidrBlocks: ["0.0.0.0/0"] },
        { protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
    tags: { Name: "ecs-case-study-alb-sg" },
});

export const ecsTaskSecurityGroup = new aws.ec2.SecurityGroup("ecs-task-sg", {
    vpcId: vpc.id,
    description: "Allow traffic from the ALB only",
    ingress: [
        {
            protocol: "tcp",
            fromPort: 8080,
            toPort: 8080,
            securityGroups: [albSecurityGroup.id],
        },
    ],
    egress: [
        { protocol: "-1", fromPort: 0, toPort: 0, cidrBlocks: ["0.0.0.0/0"] },
    ],
    tags: { Name: "ecs-case-study-task-sg" },
});
