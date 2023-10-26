import { AstroSite, StaticSite } from 'sst/constructs';
import { Stack } from 'sst/constructs';

export function AstroStack({ stack }: { stack: Stack }) {
  const site = new StaticSite(stack, 'site', { path: 'dist' });

  stack.addOutputs({
    url: site.url,
  });
}
