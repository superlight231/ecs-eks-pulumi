import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const vpcCidr = config.get("vpcCidr") || "10.20.0.0/16";

export const vpc = new aws.ec2.Vpc("app-vpc", {
    cidrBlock: vpcCidr,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: { Name: "ecs-case-study-vpc" },
});

const azs = aws.getAvailabilityZones({ state: "available" });

export const publicSubnets: aws.ec2.Subnet[] = [];
export const privateSubnets: aws.ec2.Subnet[] = [];

const igw = new aws.ec2.InternetGateway("app-igw", {
    vpcId: vpc.id,
    tags: { Name: "ecs-case-study-igw" },
});

const publicRouteTable = new aws.ec2.RouteTable("public-rt", {
    vpcId: vpc.id,
    routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: igw.id }],
    tags: { Name: "ecs-case-study-public-rt" },
});

for (let i = 0; i < 2; i++) {
    const az = azs.then((a) => a.names[i]);

    const publicSubnet = new aws.ec2.Subnet(`public-subnet-${i}`, {
        vpcId: vpc.id,
        cidrBlock: `10.20.${i}.0/24`,
        availabilityZone: az,
        mapPublicIpOnLaunch: true,
        tags: { Name: `ecs-case-study-public-${i}` },
    });
    publicSubnets.push(publicSubnet);

    new aws.ec2.RouteTableAssociation(`public-rta-${i}`, {
        subnetId: publicSubnet.id,
        routeTableId: publicRouteTable.id,
    });

    const privateSubnet = new aws.ec2.Subnet(`private-subnet-${i}`, {
        vpcId: vpc.id,
        cidrBlock: `10.20.${i + 10}.0/24`,
        availabilityZone: az,
        tags: { Name: `ecs-case-study-private-${i}` },
    });
    privateSubnets.push(privateSubnet);
}
