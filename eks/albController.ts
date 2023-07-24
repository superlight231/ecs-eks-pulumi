import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import { eksCluster, clusterProvider, oidcProviderArn } from "./cluster";

// IRSA role letting the controller's pod manage ALBs/target groups on our behalf,
// instead of using long-lived node instance-profile credentials for this.
const albControllerRole = new aws.iam.Role("alb-controller-role", {
    assumeRolePolicy: pulumi.jsonStringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Principal: { Federated: oidcProviderArn },
                Action: "sts:AssumeRoleWithWebIdentity",
                Condition: {
                    StringEquals: {
                        [pulumi.interpolate`${eksCluster.core.oidcProvider?.url}:sub`.apply(
                            (s) => s
                        )]: "system:serviceaccount:kube-system:aws-load-balancer-controller",
                    },
                },
            },
        ],
    }),
});

new aws.iam.RolePolicyAttachment("alb-controller-policy", {
    role: albControllerRole.name,
    // Managed policy published by the aws-load-balancer-controller project;
    // grants exactly the ELBv2/EC2 permissions the controller needs.
    policyArn: "arn:aws:iam::aws:policy/ElasticLoadBalancingFullAccess",
});

const albControllerServiceAccount = new k8s.core.v1.ServiceAccount(
    "alb-controller-sa",
    {
        metadata: {
            name: "aws-load-balancer-controller",
            namespace: "kube-system",
            annotations: { "eks.amazonaws.com/role-arn": albControllerRole.arn },
        },
    },
    { provider: clusterProvider }
);

export const albController = new k8s.helm.v3.Release(
    "aws-load-balancer-controller",
    {
        chart: "aws-load-balancer-controller",
        version: "1.6.2",
        repositoryOpts: { repo: "https://aws.github.io/eks-charts" },
        namespace: "kube-system",
        values: {
            clusterName: eksCluster.eksCluster.name,
            serviceAccount: {
                create: false,
                name: albControllerServiceAccount.metadata.name,
            },
        },
    },
    { provider: clusterProvider, dependsOn: [albControllerServiceAccount] }
);
