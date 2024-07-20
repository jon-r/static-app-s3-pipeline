import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

import { StaticSite } from "./static-site.ts";

export class StaticAppS3PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new StaticSite(this, "StaticSite", {
      siteSubDomain: "static",
      domainName: import.meta.env.VITE_DOMAIN_NAME,

      skipDns: true, // skip to use an external DNS (or use s3 url directly)
    });
  }
}
