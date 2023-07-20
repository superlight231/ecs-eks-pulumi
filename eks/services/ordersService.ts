import * as pulumi from "@pulumi/pulumi";
import { createMicroservice } from "../microservice";
import { microserviceRepos } from "../ecrRepos";

const config = new pulumi.Config();
const imageTag = config.get("imageTag") || "latest";

export const ordersService = createMicroservice({
    name: "orders-service",
    image: pulumi.interpolate`${microserviceRepos["orders-service"].repositoryUrl}:${imageTag}`,
    containerPort: 8081,
    replicas: 3,
    cpuRequest: "150m",
    memoryRequest: "256Mi",
    env: {
        SERVICE_NAME: "orders-service",
        LOG_LEVEL: "info",
    },
});
