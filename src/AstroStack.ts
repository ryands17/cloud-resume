import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cr from 'aws-cdk-lib/custom-resources';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { StaticSite } from 'sst/constructs';
import { Stack } from 'sst/constructs';

const acmArnPath = '/portfolio/acmCertArn';
const domain = 'ryan17.dev';

const code = `function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Check whether the URI is missing a file name.
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  }
  // Check whether the URI is missing a file extension.
  else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }

  return request;
}`;

export function AstroStack({ stack }: { stack: Stack }) {
  const fixSubPages = new cloudfront.Function(stack, 'fixSubPages', {
    code: cloudfront.FunctionCode.fromInline(code),
    comment: 'To redirect to the correct page in Astro',
    functionName: 'fixSubPages',
  });

  const fetchCertArn = new cr.AwsCustomResource(stack, 'fetchCertArn', {
    resourceType: 'Custom::FetchCertArn',
    onUpdate: {
      service: 'SSM',
      action: 'getParameter',
      region: 'us-east-1',
      parameters: { Name: acmArnPath },
      physicalResourceId: cr.PhysicalResourceId.of(`cert${acmArnPath}`),
    },
    policy: cr.AwsCustomResourcePolicy.fromSdkCalls({
      resources: [`arn:aws:ssm:us-east-1:*:parameter${acmArnPath}`],
    }),
    logRetention: RetentionDays.ONE_DAY,
  });

  const site = new StaticSite(stack, 'site', {
    path: 'dist',
    customDomain: {
      domainName: domain,
      alternateNames: [`www.${domain}`],
      cdk: {
        certificate: acm.Certificate.fromCertificateArn(
          stack,
          'cert',
          fetchCertArn.getResponseField('Parameter.Value'),
        ),
      },
    },
    cdk: {
      distribution: {
        defaultBehavior: {
          functionAssociations: [
            {
              function: fixSubPages,
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
            },
          ],
        },
      },
    },
  });

  stack.addOutputs({
    url: site.url,
  });
}

export function GlobalStack({ stack }: { stack: Stack }) {
  // ACM certificate for the domain
  const cert = new acm.Certificate(stack, 'personalDomain', {
    domainName: domain,
    subjectAlternativeNames: [`*.${domain}`],
    validation: acm.CertificateValidation.fromDns(),
  });

  cert.metricDaysToExpiry().createAlarm(stack, 'certExpiry', {
    evaluationPeriods: 1,
    threshold: 45,
  });

  const certArn = new StringParameter(stack, 'certArn', {
    parameterName: acmArnPath,
    stringValue: cert.certificateArn,
  });

  stack.addOutputs({
    certArn: certArn.stringValue,
  });
}
