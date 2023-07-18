import * as k8s from "@pulumi/kubernetes";
import { clusterProvider } from "./cluster";

export const appNamespace = new k8s.core.v1.Namespace(
    "microservices-ns",
    { metadata: { name: "microservices" } },
    { provider: clusterProvider }
);

export const namespaceName = appNamespace.metadata.name;
