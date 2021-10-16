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

    this.createDomain(fetchCertArn.getResponseField('Parameter.Value'))
    this.createWwwDomain(fetchCertArn.getResponseField('Parameter.Value'))
  }

  createDomain(certArn: string) {
    const domain = this.node.tryGetContext('domain')

    // Create static website bucket and point to assets
    const portfolio = new s3.Bucket(this, 'portfolio', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: '404.html',
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    portfolio.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`${portfolio.bucketArn}/*`],
        conditions: {
          StringLike: { 'aws:Referer': process.env.S3_REFERER },
        },
        principals: [new iam.StarPrincipal()],
      })
    )

    portfolio.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ['s3:GetObject'],
        resources: [`${portfolio.bucketArn}/*`],
        conditions: {
          StringNotLike: { 'aws:Referer': process.env.S3_REFERER },
        },
        principals: [new iam.StarPrincipal()],
      })
    )

    new s3Deploy.BucketDeployment(this, 'deployPortfolio', {
      sources: [s3Deploy.Source.asset('../resume/out')],
      destinationBucket: portfolio,
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

    const dist = new cdn.CloudFrontWebDistribution(this, 'portfolioCDN', {
      priceClass: cdn.PriceClass.PRICE_CLASS_100,
      defaultRootObject: '',
      viewerCertificate: {
        aliases: [domain.apex],
        props: {
          acmCertificateArn: certArn,
          sslSupportMethod: cdn.SSLMethod.SNI,
          minimumProtocolVersion: cdn.SecurityPolicyProtocol.TLS_V1_2_2021,
        },
      },
      originConfigs: [
        {
          customOriginSource: {
            domainName: portfolio.bucketWebsiteDomainName,
            originProtocolPolicy: cdn.OriginProtocolPolicy.HTTP_ONLY,
            originHeaders: {
              Referer: process.env.S3_REFERER,
            },
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

    new cdk.CfnOutput(this, 'distUrl', {
      value: dist.distributionDomainName,
    })
  }

  createWwwDomain(certArn: string) {
    const domain = this.node.tryGetContext('domain')

    const portfolio = new s3.Bucket(this, 'portfolioWww', {
      bucketName: domain.www,
      websiteRedirect: {
        hostName: domain.apex,
        protocol: s3.RedirectProtocol.HTTPS,
      },
    })

    portfolio.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [`${portfolio.bucketArn}/*`],
        conditions: {
          StringLike: { 'aws:Referer': process.env.S3_REFERER },
        },
        principals: [new iam.StarPrincipal()],
      })
    )

    portfolio.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        actions: ['s3:GetObject'],
        resources: [`${portfolio.bucketArn}/*`],
        conditions: {
          StringNotLike: { 'aws:Referer': process.env.S3_REFERER },
        },
        principals: [new iam.StarPrincipal()],
      })
    )

    const dist = new cdn.CloudFrontWebDistribution(this, 'portfolioWwwCDN', {
      priceClass: cdn.PriceClass.PRICE_CLASS_100,
      viewerCertificate: {
        aliases: [domain.www],
        props: {
          acmCertificateArn: certArn,
          sslSupportMethod: cdn.SSLMethod.SNI,
          minimumProtocolVersion: cdn.SecurityPolicyProtocol.TLS_V1_2_2021,
        },
      },
      originConfigs: [
        {
          customOriginSource: {
            domainName: portfolio.bucketWebsiteDomainName,
            originProtocolPolicy: cdn.OriginProtocolPolicy.HTTP_ONLY,
            originHeaders: {
              Referer: process.env.S3_REFERER,
            },
          },
          behaviors: [{ isDefaultBehavior: true }],
        },
      ],
    })

    new cdk.CfnOutput(this, 'distWwwUrl', {
      value: dist.distributionDomainName,
    })
  }
}
