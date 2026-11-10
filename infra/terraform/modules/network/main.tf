terraform {
  required_version = ">= 1.6.0"
}

variable "name_prefix" {
  type        = string
  description = "Prefix for resource names"
}

variable "cidr_block" {
  type        = string
  default     = "10.42.0.0/16"
  description = "VPC CIDR"
}

# Example stub: replace with your cloud provider module (AWS azurerm google).
output "vpc_id" {
  value       = "stub-vpc-${var.name_prefix}"
  description = "Wire real module output in your environment."
}

output "private_subnet_ids" {
  value       = []
  description = "Private subnets for data plane services."
}
