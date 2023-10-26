import { StaticSite } from 'sst/constructs';
import {
  FunctionEventType,
  Function,
  FunctionCode,
} from 'aws-cdk-lib/aws-cloudfront';
import { Stack } from 'sst/constructs';

const code = `function handler(event) {
  let request = event.request;
  let uri = request.uri;

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
  const fixSubPages = new Function(stack, 'fixSubPages', {
    code: FunctionCode.fromInline(code),
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
              eventType: FunctionEventType.VIEWER_REQUEST,
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
