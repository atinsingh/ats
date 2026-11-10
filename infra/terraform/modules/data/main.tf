terraform {
  required_version = ">= 1.6.0"
}

variable "name_prefix" {
  type = string
}

output "postgres_connection_hint" {
  value       = "stub://postgres.${var.name_prefix}.internal:5432"
  description = "Replace with RDS output wiring."
}

output "redis_connection_hint" {
  value       = "stub://redis.${var.name_prefix}.internal:6379"
  description = "Replace with ElastiCache output wiring."
}

output "kafka_bootstrap_hint" {
  value       = "stub://kafka.${var.name_prefix}.internal:9092"
  description = "Replace with MSK bootstrap brokers."
}
