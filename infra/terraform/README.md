# Terraform scaffolding

This directory contains **non-proprietary** scaffolding for cloud environments. Replace backend configuration and module sources with your organization’s standards.

## Layout

- `modules/network` — VPC, subnets, security groups (stubs).
- `modules/data` — RDS PostgreSQL, ElastiCache Redis, MSK or Confluent-compatible Kafka (stubs).
- `modules/search` — OpenSearch domain / serverless collection (stubs).
- `modules/storage` — S3 buckets for resumes + derived artifacts with encryption and lifecycle rules (stubs).
- `environments/dev` — wires modules with small instance sizes.

## Conventions

- **Tenant isolation** is enforced in application code and IAM where applicable (per-tenant KMS keys optional).
- **Secrets** never live in `.tf` files; use `aws_secretsmanager_secret` or SSM `SecureString` references.

## Usage

```bash
cd infra/terraform/environments/dev
terraform init
terraform plan
```

You must configure a remote backend (`backend "s3" {}` or Terraform Cloud) before team use.
