import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import { clusterProvider } from "./cluster";
import { namespaceName } from "./namespace";

export interface MicroserviceArgs {
    name: string;
    image: pulumi.Input<string>;
    containerPort: number;
    replicas?: number;
    cpuRequest?: string;
    memoryRequest?: string;
    env?: Record<string, pulumi.Input<string>>;
    exposeInternally?: boolean;
}

/**
 * Deploys a stateless microservice as a Deployment + ClusterIP Service.
 * Shared by every service in eks/services/*.ts so each one only has to
 * describe its own image, port, and env vars.
 */
export function createMicroservice(args: MicroserviceArgs) {
    const labels = { app: args.name };

    const deployment = new k8s.apps.v1.Deployment(
        `${args.name}-deployment`,
        {
            metadata: { namespace: namespaceName, labels },
            spec: {
                replicas: args.replicas ?? 2,
                selector: { matchLabels: labels },
                template: {
                    metadata: { labels },
                    spec: {
                        containers: [
                            {
                                name: args.name,
                                image: args.image,
                                ports: [{ containerPort: args.containerPort }],
                                resources: {
                                    requests: {
                                        cpu: args.cpuRequest ?? "100m",
                                        memory: args.memoryRequest ?? "128Mi",
                                    },
                                },
                                env: Object.entries(args.env ?? {}).map(([name, value]) => ({
                                    name,
                                    value,
                                })),
                                readinessProbe: {
                                    httpGet: { path: "/healthz", port: args.containerPort },
                                    initialDelaySeconds: 5,
                                    periodSeconds: 10,
                                },
                            },
                        ],
                    },
                },
            },
        },
        { provider: clusterProvider }
    );

    const service = new k8s.core.v1.Service(
        `${args.name}-service`,
        {
            metadata: { namespace: namespaceName, labels },
            spec: {
                type: args.exposeInternally === false ? "ClusterIP" : "ClusterIP",
                selector: labels,
                ports: [{ port: args.containerPort, targetPort: args.containerPort }],
            },
        },
        { provider: clusterProvider }
    );

    return { deployment, service };
}
