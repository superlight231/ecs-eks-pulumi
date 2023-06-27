import * as aws from "@pulumi/aws";
import { vpc, publicSubnets } from "./vpc";
import { albSecurityGroup } from "./securityGroups";

export const alb = new aws.lb.LoadBalancer("app-alb", {
    loadBalancerType: "application",
    subnets: publicSubnets.map((s) => s.id),
    securityGroups: [albSecurityGroup.id],
    internal: false,
    tags: { Name: "ecs-case-study-alb" },
});

export const targetGroup = new aws.lb.TargetGroup("app-tg", {
    port: 8080,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: vpc.id,
    healthCheck: {
        path: "/healthz",
        interval: 30,
        timeout: 5,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
    },
});

export const httpListener = new aws.lb.Listener("app-http-listener", {
    loadBalancerArn: alb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{ type: "forward", targetGroupArn: targetGroup.arn }],
});
