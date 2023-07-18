import * as aws from "@pulumi/aws";

const serviceNames = ["api-gateway", "orders-service", "notifications-service"] as const;

export const microserviceRepos = Object.fromEntries(
    serviceNames.map((name) => [
        name,
        new aws.ecr.Repository(`${name}-repo`, {
            name: `microservices/${name}`,
            imageScanningConfiguration: { scanOnPush: true },
            imageTagMutability: "IMMUTABLE",
        }),
    ])
) as Record<(typeof serviceNames)[number], aws.ecr.Repository>;

for (const [name, repo] of Object.entries(microserviceRepos)) {
    new aws.ecr.LifecyclePolicy(`${name}-repo-lifecycle`, {
        repository: repo.name,
        policy: JSON.stringify({
            rules: [
                {
                    rulePriority: 1,
                    description: "Expire untagged images after 14 days",
                    selection: {
                        tagStatus: "untagged",
                        countType: "sinceImagePushed",
                        countUnit: "days",
                        countNumber: 14,
                    },
                    action: { type: "expire" },
                },
            ],
        }),
    });
}
