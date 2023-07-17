import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as eks from "@pulumi/eks";
import { vpc, privateSubnets, publicSubnets } from "../vpc";

const config = new pulumi.Config();
const eksNodeInstanceType = config.get("eksNodeInstanceType") || "t3.medium";
const eksDesiredCapacity = config.getNumber("eksDesiredCapacity") || 2;
const eksMinSize = config.getNumber("eksMinSize") || 2;
const eksMaxSize = config.getNumber("eksMaxSize") || 5;

export const eksCluster = new eks.Cluster("microservices-cluster", {
    vpcId: vpc.id,
    publicSubnetIds: publicSubnets.map((s) => s.id),
    privateSubnetIds: privateSubnets.map((s) => s.id),
    nodeAssociatePublicIpAddress: false,
    instanceType: eksNodeInstanceType,
    desiredCapacity: eksDesiredCapacity,
    minSize: eksMinSize,
    maxSize: eksMaxSize,
    nodeRootVolumeSize: 40,
    createOidcProvider: true,
    version: "1.27",
    tags: { Name: "ecs-eks-case-study" },
});

export const kubeconfig = eksCluster.kubeconfig;
export const clusterProvider = eksCluster.provider;
export const oidcProviderArn = eksCluster.core.oidcProvider?.arn;
