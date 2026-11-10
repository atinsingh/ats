terraform {
  required_version = ">= 1.6.0"
}

module "network" {
  source      = "../../modules/network"
  name_prefix = "jobocate-dev"
  cidr_block  = "10.42.0.0/16"
}

output "network_vpc_id" {
  value = module.network.vpc_id
}
