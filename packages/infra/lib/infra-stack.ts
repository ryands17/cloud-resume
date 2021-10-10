import * as cdk from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
import * as s3Deploy from '@aws-cdk/aws-s3-deployment'
import * as cdn from '@aws-cdk/aws-cloudfront'
import * as iam from '@aws-cdk/aws-iam'

export class InfraStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

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

    new cdn.CloudFrontWebDistribution(this, 'portfolioCDN', {
      // todo: change to price_class_200
      priceClass: cdn.PriceClass.PRICE_CLASS_100,
      originConfigs: [
        {
          s3OriginSource: {
            s3BucketSource: portfolio,
            originAccessIdentity: cloudFrontOAI,
          },
          behaviors: [{ isDefaultBehavior: true }],
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
  }
}
