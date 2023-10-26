import { AstroStack } from '@/AstroStack';
import type { SSTConfig } from 'sst';

export default {
  config(_input) {
    return {
      name: 'cloud-resume',
      region: 'eu-west-1',
    };
  },
  stacks(app) {
    app.stack(AstroStack);
  },
} satisfies SSTConfig;
