import "./vpc";
import "./ecr";
import "./securityGroups";
import "./cluster";
import "./alb";
import "./taskDefinition";
import "./service";
import "./autoscaling";
import "./eks/index";

export { vpc, publicSubnets, privateSubnets } from "./vpc";
export { repo as ecrRepository } from "./ecr";
export { cluster as ecsCluster } from "./cluster";
export { alb, targetGroup } from "./alb";
export { service } from "./service";
export { eksCluster, kubeconfig, microserviceRepos } from "./eks/index";

import { alb } from "./alb";
export const albDnsName = alb.dnsName;
export const appUrl = alb.dnsName.apply((dns) => `http://${dns}`);
