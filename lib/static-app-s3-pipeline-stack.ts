import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

interface AppOptions {
  domainName: string;
  siteSubDomain: string;

  githubSettings: {
    name: string;
    repos: string[];
  };
}

const options: AppOptions = {
  siteSubDomain: "static",
  domainName: import.meta.env.VITE_DOMAIN_NAME,
  githubSettings: {
    name: import.meta.env.VITE_GITHUB_NAME,
    repos: import.meta.env.VITE_REPOSITORIES.split(","),
  },
};

export class StaticAppS3PipelineStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps) {
    super(scope, id, props);

    const { domainName, siteSubDomain, githubSettings } = options;

    const siteDomain = `${siteSubDomain}.${domainName}`;

    const allowAll: s3.BlockPublicAccess = {
      blockPublicAcls: false,
      blockPublicPolicy: false,
      ignorePublicAcls: false,
      restrictPublicBuckets: false,
    };

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: siteDomain.replace(/\./g, "-"),
      publicReadAccess: false,
      blockPublicAccess: allowAll,

      // todo remove once this works
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [siteBucket.arnForObjects("*")],
        principals: [new iam.StarPrincipal()],
      }),
    );

    new cdk.CfnOutput(this, "Bucket", { value: siteBucket.bucketName });

    githubSettings.repos.forEach((repo) => {
      // this needs to be manually connected to github in codebuild
      const githubSource = codebuild.Source.gitHub({
        owner: githubSettings.name,
        repo,
        webhookFilters: [
          codebuild.FilterGroup.inEventOf(
            codebuild.EventAction.PUSH,
          ).andBranchIs("release"),
        ],
      });

      new codebuild.Project(this, `CodeBuild_${repo}`, {
        projectName: `${repo}_build`,
        buildSpec: codebuild.BuildSpec.fromSourceFilename("buildspec.yml"),
        source: githubSource,
        environment: {
          computeType: codebuild.ComputeType.LAMBDA_2GB,
          buildImage:
            codebuild.LinuxArmLambdaBuildImage.AMAZON_LINUX_2023_NODE_20,
        },
        artifacts: codebuild.Artifacts.s3({
          bucket: siteBucket,
          name: repo,
          includeBuildId: false,
          packageZip: false,
          encryption: false,
        }),
      });
    });
  }
}
