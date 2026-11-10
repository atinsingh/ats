package main

import (
	"flag"
	"fmt"
	"os"
)

func main() {
	tenant := flag.String("tenant", "", "Tenant UUID to reindex")
	index := flag.String("index", "jobocate-jobs", "Target OpenSearch index alias")
	flag.Parse()
	if *tenant == "" {
		fmt.Fprintln(os.Stderr, "usage: reindex-tool -tenant <uuid> [-index jobocate-jobs]")
		os.Exit(2)
	}
	fmt.Printf("reindex-tool: enqueue backfill for tenant=%s index=%s\n", *tenant, *index)
	fmt.Println("Wire this CLI to your search-orchestrator / bulk Kafka topics in production.")
}
