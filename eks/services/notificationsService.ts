import * as pulumi from "@pulumi/pulumi";
import { createMicroservice } from "../microservice";
import { microserviceRepos } from "../ecrRepos";

const config = new pulumi.Config();
const imageTag = config.get("imageTag") || "latest";

export const notificationsService = createMicroservice({
    name: "notifications-service",
    image: pulumi.interpolate`${microserviceRepos["notifications-service"].repositoryUrl}:${imageTag}`,
    containerPort: 8082,
    replicas: 2,
    cpuRequest: "100m",
    memoryRequest: "128Mi",
    env: {
        SERVICE_NAME: "notifications-service",
        LOG_LEVEL: "info",
    },
});
