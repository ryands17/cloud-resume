import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import { StaticSite } from 'sst/constructs';
import { Stack } from 'sst/constructs';

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

  const site = new StaticSite(stack, 'site', {
    path: 'dist',
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
