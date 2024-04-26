import packageJson from './package.json';
import { Tags, Aspects, type IAspect } from 'aws-cdk-lib/core';
import { type IConstruct } from 'constructs';
import { AstroStack, GlobalStack } from './sst/AstroStack';
import { type SSTConfig } from 'sst';
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
    return { name: 'cloud-resume' };
  },
  stacks(app) {
    app.setDefaultFunctionProps({ runtime: 'nodejs18.x' });
    if (app.region === 'us-east-1') {
      app.stack(GlobalStack);
    }

    if (app.region === 'eu-west-1') {
      app.stack(AstroStack);
      app.setDefaultRemovalPolicy('destroy');
      Aspects.of(app).add(new AutoPublishCloudFrontFunctions());
    }

    Tags.of(app).add('version', packageJson.version);
    Tags.of(app).add('environment', process.env.STACK_ENV || 'dev');
  },
} satisfies SSTConfig;
