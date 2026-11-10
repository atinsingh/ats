package httpserver

import (
	"encoding/json"
	"fmt"
)

// normalizeJobSearchResponse maps an OpenSearch search response into the gateway contract shape.
func normalizeJobSearchResponse(openSearchBody []byte) ([]byte, error) {
	var root map[string]any
	if err := json.Unmarshal(openSearchBody, &root); err != nil {
		return nil, fmt.Errorf("parse opensearch response: %w", err)
	}

	hitsRoot, ok := root["hits"].(map[string]any)
	if !ok {
		return nil, fmt.Errorf("missing hits")
	}

	total := map[string]any{"value": 0, "relation": "eq"}
	switch tv := hitsRoot["total"].(type) {
	case float64:
		total["value"] = int64(tv)
	case map[string]any:
		switch v := tv["value"].(type) {
		case float64:
			total["value"] = int64(v)
		case int64:
			total["value"] = v
		}
		if r, ok := tv["relation"].(string); ok {
			total["relation"] = r
		}
	}

	var hits []any
	if rawHits, ok := hitsRoot["hits"].([]any); ok {
		for _, h := range rawHits {
			hm, ok := h.(map[string]any)
			if !ok {
				continue
			}
			src, _ := hm["_source"].(map[string]any)
			id, _ := hm["_id"].(string)
			if id == "" && src != nil {
				if jid, ok := src["job_id"].(string); ok {
					id = jid
				}
			}
			score := 0.0
			if s, ok := hm["_score"].(float64); ok {
				score = s
			}
			hl, _ := hm["highlight"].(map[string]any)
			out := map[string]any{
				"id":        id,
				"score":     score,
				"document": src,
			}
			if len(hl) > 0 {
				out["highlight"] = hl
			}
			hits = append(hits, out)
		}
	}

	facets := map[string]any{}
	if aggs, ok := root["aggregations"].(map[string]any); ok {
		for _, name := range []string{
			"employment_type",
			"remote_policy",
			"country",
			"city",
			"skills",
			"currency",
		} {
			if _, present := aggs[name]; present {
				facets[name] = termsBucketsToFacet(aggs[name])
			}
		}
	}

	out := map[string]any{
		"total":  total,
		"hits":   hits,
		"facets": facets,
	}
	return json.Marshal(out)
}

func termsBucketsToFacet(raw any) []map[string]any {
	agg, ok := raw.(map[string]any)
	if !ok {
		return []map[string]any{}
	}
	buckets, ok := agg["buckets"].([]any)
	if !ok {
		return []map[string]any{}
	}
	var out []map[string]any
	for _, b := range buckets {
		bm, ok := b.(map[string]any)
		if !ok {
			continue
		}
		key := ""
		if k, ok := bm["key"].(string); ok {
			key = k
		} else if k, ok := bm["key_as_string"].(string); ok {
			key = k
		}
		count := int64(0)
		if c, ok := bm["doc_count"].(float64); ok {
			count = int64(c)
		}
		out = append(out, map[string]any{"value": key, "count": count})
	}
	return out
}
