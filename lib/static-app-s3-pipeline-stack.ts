import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class StaticAppS3PipelineStack extends cdk.Stack {
  /* eslint @typescript-eslint/no-useless-constructor: "off" */
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'StaticAppS3PipelineQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
  }
}
