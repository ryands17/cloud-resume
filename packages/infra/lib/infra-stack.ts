import * as cdk from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
import * as s3Deploy from '@aws-cdk/aws-s3-deployment'
import * as cdn from '@aws-cdk/aws-cloudfront'
import * as iam from '@aws-cdk/aws-iam'
import * as lambda from '@aws-cdk/aws-lambda'
import * as logs from '@aws-cdk/aws-logs'
import * as cr from '@aws-cdk/custom-resources'

export class InfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const ssmParameterPath = this.node.tryGetContext('acmArnPath')
    const certRegion = 'us-east-1'

    // Create static website bucket and point to assets
    const portfolio = new s3.Bucket(this, 'portfolio', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: '404.html',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    new s3Deploy.BucketDeployment(this, 'deployPortfolio', {
      sources: [s3Deploy.Source.asset('../resume/out')],
      destinationBucket: portfolio,
    })

    const cloudFrontOAI = new cdn.OriginAccessIdentity(this, 'portfolioOAI', {
      comment: `OAI for the portfolio website`,
    })

    const applyCacheHeaders = new cdn.experimental.EdgeFunction(
      this,
      'applyCacheHeaders',
      {
        code: lambda.Code.fromAsset('edge-functions'),
        handler: 'applyCacheHeaders.handler',
        runtime: lambda.Runtime.NODEJS_14_X,
        logRetention: logs.RetentionDays.ONE_WEEK,
      }
    )

    const fetchCertArn = new cr.AwsCustomResource(this, 'fetchCertArn', {
      resourceType: 'Custom::FetchCertArn',
      onUpdate: {
        service: 'SSM',
        action: 'getParameter',
        region: certRegion,
        parameters: {
          Name: ssmParameterPath,
        },
        physicalResourceId: cr.PhysicalResourceId.of(`cert${ssmParameterPath}`),
      },
      policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
        resources: [`arn:aws:ssm:${certRegion}:*:parameter${ssmParameterPath}`],
      }),
      logRetention: logs.RetentionDays.ONE_DAY,
    })

    const dist = new cdn.CloudFrontWebDistribution(this, 'portfolioCDN', {
      priceClass: cdn.PriceClass.PRICE_CLASS_100,
      viewerCertificate: {
        aliases: [this.node.tryGetContext('domain')],
        props: {
          acmCertificateArn: fetchCertArn.getResponseField('Parameter.Value'),
          sslSupportMethod: 'sni-only',
        },
      },
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: portfolio,
            originAccessIdentity: cloudFrontOAI,
          },
          behaviors: [
            {
              isDefaultBehavior: true,
              lambdaFunctionAssociations: [
                {
                  eventType: cdn.LambdaEdgeEventType.ORIGIN_RESPONSE,
                  lambdaFunction: applyCacheHeaders.currentVersion,
                },
              ],
            },
          ],
        },
      ],
    })

    const cloudfrontS3Access = new iam.PolicyStatement({
      actions: ['s3:GetBucket*', 's3:GetObject*', 's3:List*'],
      resources: [portfolio.bucketArn, `${portfolio.bucketArn}/*`],
    })
    cloudfrontS3Access.addCanonicalUserPrincipal(
      cloudFrontOAI.cloudFrontOriginAccessIdentityS3CanonicalUserId
    )
    portfolio.addToResourcePolicy(cloudfrontS3Access)

    new cdk.CfnOutput(this, 'distUrl', {
      value: dist.distributionDomainName,
    })
  }
}
