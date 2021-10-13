#!/usr/bin/env node
import 'source-map-support/register'
import * as cdk from '@aws-cdk/core'
import { InfraStack } from '../lib/infra-stack'
import { GlobalStack } from '../lib/global-stack'

const app = new cdk.App()
new InfraStack(app, 'InfraStack', { env: { region: 'us-east-2' } })
new GlobalStack(app, 'GlobalStack', { env: { region: 'us-east-1' } })
