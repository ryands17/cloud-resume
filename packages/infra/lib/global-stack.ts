import * as cdk from '@aws-cdk/core'
import * as acm from '@aws-cdk/aws-certificatemanager'
import * as ssm from '@aws-cdk/aws-ssm'

export class GlobalStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const domain = this.node.tryGetContext('domain')

    // ACM certificate for the domain
    const cert = new acm.Certificate(this, 'personalDomain', {
      domainName: domain.apex,
      subjectAlternativeNames: [`*.${domain.apex}`],
      validation: acm.CertificateValidation.fromDns(),
    })

    cert.metricDaysToExpiry().createAlarm(this, 'certExpiry', {
      evaluationPeriods: 1,
      threshold: 45,
    })

    new ssm.StringParameter(this, 'certArn', {
      parameterName: this.node.tryGetContext('acmArnPath'),
      stringValue: cert.certificateArn,
    })
  }
}
