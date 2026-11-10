terraform {
  required_version = ">= 1.6.0"
}

variable "name_prefix" {
  type = string
}

output "opensearch_endpoint_hint" {
  value       = "stub://opensearch.${var.name_prefix}.internal:443"
  description = "Replace with managed OpenSearch domain endpoint."
}
