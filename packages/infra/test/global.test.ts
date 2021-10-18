import { Template } from '@aws-cdk/assertions'
import * as cdk from '@aws-cdk/core'
import * as context from '../cdk.context.json'
import { GlobalStack } from '../lib/global-stack'

const synthStack = () => {
  const app = new cdk.App({ context: { ...context } })
  return new GlobalStack(app, 'GlobalStack', { env: { region: 'us-east-1' } })
}

test('ACM and Alarm for cert renewal are created', () => {
  const assert = Template.fromStack(synthStack())

  assert.hasResourceProperties('AWS::CertificateManager::Certificate', {
    DomainName: context.domain.apex,
    SubjectAlternativeNames: [`*.${context.domain.apex}`],
    ValidationMethod: 'DNS',
  })

  assert.hasResourceProperties('AWS::CloudWatch::Alarm', {
    ComparisonOperator: 'GreaterThanOrEqualToThreshold',
    EvaluationPeriods: 1,
    MetricName: 'DaysToExpiry',
    Namespace: 'AWS/CertificateManager',
    Period: 86400,
    Statistic: 'Minimum',
    Threshold: 45,
  })
})

test('SSM parameter store for referencing the cert ARN is created', () => {
  const assert = Template.fromStack(synthStack())

  assert.hasResourceProperties('AWS::SSM::Parameter', {
    Type: 'String',
    Name: context.acmArnPath,
  })
})
