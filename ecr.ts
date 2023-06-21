import * as aws from "@pulumi/aws";

export const repo = new aws.ecr.Repository("app-repo", {
    name: "ecs-case-study-app",
    imageScanningConfiguration: { scanOnPush: true },
    imageTagMutability: "IMMUTABLE",
});

new aws.ecr.LifecyclePolicy("app-repo-lifecycle", {
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
            {
                rulePriority: 2,
                description: "Keep only the last 10 tagged images",
                selection: {
                    tagStatus: "tagged",
                    tagPrefixList: ["v"],
                    countType: "imageCountMoreThan",
                    countNumber: 10,
                },
                action: { type: "expire" },
            },
        ],
    }),
});
