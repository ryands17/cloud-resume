import { AstroSite } from 'sst/constructs';
import { Stack } from 'sst/constructs';

export function AstroStack({ stack }: { stack: Stack }) {
  const site = new AstroSite(stack, 'site');
  stack.addOutputs({
    url: site.url,
  });
}
