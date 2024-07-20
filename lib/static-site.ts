import { CfnOutput, Duration, RemovalPolicy, Stack } from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as cloudfrontOrigins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import { BlockPublicAccess } from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import path from "node:path";

export interface StaticSiteProps {
  domainName: string;
  siteSubDomain: string;
  skipDns: boolean;
}

export class StaticSite extends Construct {
  constructor(scope: Stack, id: string, props: StaticSiteProps) {
    super(scope, id);

    const { skipDns, domainName, siteSubDomain } = props;

    const siteDomain = `${siteSubDomain}.${domainName}`;

    let cloudfrontOAI: cloudfront.OriginAccessIdentity | undefined;
    if (!skipDns) {
      cloudfrontOAI = new cloudfront.OriginAccessIdentity(
        this,
        "cloudfront-OAI",
        {
          comment: `OAI for ${id}`,
        },
      );
    }

    const allowAll: BlockPublicAccess = {
      blockPublicAcls: false,
      blockPublicPolicy: false,
      ignorePublicAcls: false,
      restrictPublicBuckets: false,
    };

    const siteBucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: siteDomain,
      publicReadAccess: false,
      blockPublicAccess: skipDns ? allowAll : s3.BlockPublicAccess.BLOCK_ALL,

      // todo remove once this works
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    siteBucket.grantRead(new iam.AccountRootPrincipal());

    siteBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [siteBucket.arnForObjects("*")],
        principals: cloudfrontOAI
          ? [
              new iam.CanonicalUserPrincipal(
                cloudfrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId,
              ),
            ]
          : [new iam.StarPrincipal()],
      }),
    );

    new CfnOutput(this, "Bucket", { value: siteBucket.bucketName });

    let distribution: cloudfront.Distribution | undefined;
    if (!skipDns) {
      const zone = route53.HostedZone.fromLookup(this, "Zone", {
        domainName: props.domainName,
      });

      const certificate = new acm.Certificate(this, "SiteCertificate", {
        domainName: siteDomain,
        validation: acm.CertificateValidation.fromDns(zone),
      });

      new CfnOutput(this, "Certificate", { value: certificate.certificateArn });

      distribution = new cloudfront.Distribution(this, "SiteDistribution", {
        certificate,
        defaultRootObject: "index.html",
        domainNames: [siteDomain],
        minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 403,
            responsePagePath: "/error.html",
            ttl: Duration.minutes(30),
          },
        ],
        defaultBehavior: {
          origin: new cloudfrontOrigins.S3Origin(siteBucket, {
            originAccessIdentity: cloudfrontOAI,
          }),
          compress: true,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        },
      });

      new CfnOutput(this, "DistributionId", {
        value: distribution.distributionId,
      });

      new route53.ARecord(this, "SiteAliasRecord", {
        recordName: siteDomain,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(distribution),
        ),
        zone,
      });
    }

    new s3deploy.BucketDeployment(this, "DeployWithInvalidation", {
      sources: [s3deploy.Source.asset(path.resolve("./placehold-content"))],
      destinationBucket: siteBucket,
      distribution,
      distributionPaths: distribution && ["/*"],
    });
  }
}
