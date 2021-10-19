import { Template } from '@aws-cdk/assertions'
import * as cdk from '@aws-cdk/core'
import * as context from '../cdk.context.json'
import { InfraStack } from '../lib/infra-stack'

const synthStack = () => {
  const app = new cdk.App({ context: { ...context } })
  return new InfraStack(app, 'InfraStack', { env: { region: 'us-east-2' } })
}

test('Custom resource to fetch cert ARN and its required policy are created', () => {
  const assert = Template.fromStack(synthStack())

  assert.hasResourceProperties('Custom::FetchCertArn', {
    InstallLatestAwsSdk: true,
  })

  assert.hasResourceProperties('AWS::IAM::Policy', {
    PolicyDocument: {
      Statement: [
        {
          Action: 'ssm:GetParameter',
          Effect: 'Allow',
          Resource: `arn:aws:ssm:us-east-1:*:parameter${context.acmArnPath}`,
        },
      ],
      Version: '2012-10-17',
    },
  })
})

test('Bucket and distribution for the apex domain are created', () => {
  const assert = Template.fromStack(synthStack())

  assert.hasResourceProperties('AWS::S3::Bucket', {
    WebsiteConfiguration: {
      ErrorDocument: '404.html',
      IndexDocument: 'index.html',
    },
  })

  assert.hasResource('Custom::CDKBucketDeployment', {})

  assert.hasResource('Custom::CrossRegionStringParameterReader', {})

  assert.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Aliases: [context.domain.apex],
      DefaultCacheBehavior: {
        AllowedMethods: ['GET', 'HEAD'],
        CachedMethods: ['GET', 'HEAD'],
        Compress: true,
        ForwardedValues: {
          Cookies: {
            Forward: 'none',
          },
          QueryString: false,
        },
        TargetOriginId: 'origin1',
        ViewerProtocolPolicy: 'redirect-to-https',
      },
      DefaultRootObject: '',
      Enabled: true,
      HttpVersion: 'http2',
      IPV6Enabled: true,
      PriceClass: 'PriceClass_100',
      ViewerCertificate: {
        MinimumProtocolVersion: 'TLSv1.2_2021',
        SslSupportMethod: 'sni-only',
      },
    },
  })
})

test('Bucket and distribution for the sub-domain (www) are created', () => {
  const assert = Template.fromStack(synthStack())

  assert.hasResourceProperties('AWS::S3::Bucket', {
    BucketName: context.domain.www,
    WebsiteConfiguration: {
      RedirectAllRequestsTo: {
        HostName: context.domain.apex,
        Protocol: 'https',
      },
    },
  })

  assert.hasResourceProperties('AWS::CloudFront::Distribution', {
    DistributionConfig: {
      Aliases: [context.domain.www],
      DefaultCacheBehavior: {
        AllowedMethods: ['GET', 'HEAD'],
        CachedMethods: ['GET', 'HEAD'],
        Compress: true,
        ForwardedValues: {
          Cookies: {
            Forward: 'none',
          },
          QueryString: false,
        },
        TargetOriginId: 'origin1',
        ViewerProtocolPolicy: 'redirect-to-https',
      },
      DefaultRootObject: 'index.html',
      Enabled: true,
      HttpVersion: 'http2',
      IPV6Enabled: true,
      PriceClass: 'PriceClass_100',
      ViewerCertificate: {
        MinimumProtocolVersion: 'TLSv1.2_2021',
        SslSupportMethod: 'sni-only',
      },
    },
  })
})
