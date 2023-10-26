import { StaticSite, Function } from 'sst/constructs';
import { FunctionEventType } from 'aws-cdk-lib/aws-cloudfront';
import { Stack } from 'sst/constructs';

export function AstroStack({ stack }: { stack: Stack }) {
  const fixSubPages = new Function(stack, 'fixSubPages', {
    handler: 'sst/fixSubPages.handler',
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
