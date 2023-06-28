import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { repo } from "./ecr";

const config = new pulumi.Config();
const imageTag = config.get("imageTag") || "latest";
const containerPort = 8080;

export const taskExecutionRole = new aws.iam.Role("task-exec-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: { Service: "ecs-tasks.amazonaws.com" },
            },
        ],
    }),
});

new aws.iam.RolePolicyAttachment("task-exec-role-policy", {
    role: taskExecutionRole.name,
    policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
});

export const taskRole = new aws.iam.Role("task-role", {
    assumeRolePolicy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Action: "sts:AssumeRole",
                Effect: "Allow",
                Principal: { Service: "ecs-tasks.amazonaws.com" },
            },
        ],
    }),
});

export const taskDefinition = new aws.ecs.TaskDefinition("app-task", {
    family: "ecs-case-study-app",
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: taskExecutionRole.arn,
    taskRoleArn: taskRole.arn,
    containerDefinitions: repo.repositoryUrl.apply((repoUrl) =>
        JSON.stringify([
            {
                name: "app",
                image: `${repoUrl}:${imageTag}`,
                portMappings: [{ containerPort, protocol: "tcp" }],
                essential: true,
            },
        ])
    ),
});
