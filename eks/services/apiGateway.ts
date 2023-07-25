import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { createMicroservice } from "../microservice";
import { microserviceRepos } from "../ecrRepos";
import { clusterProvider } from "../cluster";
import { namespaceName } from "../namespace";
import { ordersService } from "./ordersService";
import { notificationsService } from "./notificationsService";

const config = new pulumi.Config();
const imageTag = config.get("imageTag") || "latest";

export const apiGateway = createMicroservice({
    name: "api-gateway",
    image: pulumi.interpolate`${microserviceRepos["api-gateway"].repositoryUrl}:${imageTag}`,
    containerPort: 8080,
    replicas: 2,
    cpuRequest: "150m",
    memoryRequest: "192Mi",
    env: {
        SERVICE_NAME: "api-gateway",
        ORDERS_SERVICE_URL: "http://orders-service.microservices.svc.cluster.local:8081",
        NOTIFICATIONS_SERVICE_URL:
            "http://notifications-service.microservices.svc.cluster.local:8082",
    },
});

// Requires the AWS Load Balancer Controller to already be installed on the
// cluster (see eks/albController.ts) — this Ingress just declares the route.
export const apiGatewayIngress = new k8s.networking.v1.Ingress(
    "api-gateway-ingress",
    {
        metadata: {
            namespace: namespaceName,
            annotations: {
                "kubernetes.io/ingress.class": "alb",
                "alb.ingress.kubernetes.io/scheme": "internet-facing",
                "alb.ingress.kubernetes.io/target-type": "ip",
                "alb.ingress.kubernetes.io/healthcheck-path": "/healthz",
            },
        },
        spec: {
            rules: [
                {
                    http: {
                        paths: [
                            {
                                path: "/",
                                pathType: "Prefix",
                                backend: {
                                    service: {
                                        name: "api-gateway-service",
                                        port: { number: 8080 },
                                    },
                                },
                            },
                        ],
                    },
                },
            ],
        },
    },
    { provider: clusterProvider, dependsOn: [apiGateway.service, ordersService.service, notificationsService.service] }
);
