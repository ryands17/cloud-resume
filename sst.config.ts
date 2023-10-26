import { AstroStack } from '@/AstroStack';
import { Tags, Aspects, type IAspect } from 'aws-cdk-lib/core';
import { type IConstruct } from 'constructs';
import packageJson from './package.json';
import type { SSTConfig } from 'sst';
import { CfnFunction } from 'aws-cdk-lib/aws-cloudfront';

class AutoPublishCloudFrontFunctions implements IAspect {
  visit(node: IConstruct) {
    if (node instanceof CfnFunction) {
      node.autoPublish = true;
    }
  }
}

export default {
  config(_input) {
    return {
      name: 'cloud-resume',
      region: 'eu-west-1',
    };
  },
  stacks(app) {
    app.stack(AstroStack);
    app.setDefaultRemovalPolicy('destroy');

    Tags.of(app).add('version', packageJson.version);
    Tags.of(app).add('environment', process.env.STACK_ENV || 'dev');

    Aspects.of(app).add(new AutoPublishCloudFrontFunctions());
  },
} satisfies SSTConfig;
