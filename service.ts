import * as aws from "@pulumi/aws";
import { cluster } from "./cluster";
import { taskDefinition } from "./taskDefinition";
import { privateSubnets } from "./vpc";
import { ecsTaskSecurityGroup } from "./securityGroups";
import { targetGroup, httpListener } from "./alb";

export const service = new aws.ecs.Service(
    "app-service",
    {
        cluster: cluster.arn,
        taskDefinition: taskDefinition.arn,
        desiredCount: 2,
        launchType: "FARGATE",
        networkConfiguration: {
            subnets: privateSubnets.map((s) => s.id),
            securityGroups: [ecsTaskSecurityGroup.id],
            assignPublicIp: false,
        },
        loadBalancers: [
            {
                targetGroupArn: targetGroup.arn,
                containerName: "app",
                containerPort: 8080,
            },
        ],
        deploymentMinimumHealthyPercent: 100,
        deploymentMaximumPercent: 200,
    },
    { dependsOn: [httpListener] }
);
