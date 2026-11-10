package httpserver

func jobIndexProperties() map[string]any {
	return map[string]any{
		"tenant_id":       map[string]any{"type": "keyword"},
		"job_id":          map[string]any{"type": "keyword"},
		"organization_id": map[string]any{"type": "keyword"},
		"slug":            map[string]any{"type": "keyword"},
		"title": map[string]any{
			"type": "text",
			"fields": map[string]any{
				"keyword": map[string]any{"type": "keyword", "ignore_above": 512},
				"completion": map[string]any{
					"type": "search_as_you_type",
				},
			},
		},
		"description":      map[string]any{"type": "text"},
		"description_text": map[string]any{"type": "text"},
		"company_name": map[string]any{
			"type": "text",
			"fields": map[string]any{
				"keyword": map[string]any{"type": "keyword", "ignore_above": 256},
			},
		},
		"status":     map[string]any{"type": "keyword"},
		"indexed_at": map[string]any{"type": "date"},
		"published_at": map[string]any{"type": "date"},
		"location": map[string]any{
			"type": "text",
			"fields": map[string]any{
				"keyword": map[string]any{"type": "keyword", "ignore_above": 512},
			},
		},
		"country":          map[string]any{"type": "keyword"},
		"region":           map[string]any{"type": "keyword"},
		"city":             map[string]any{"type": "keyword"},
		"employment_type":  map[string]any{"type": "keyword"},
		"remote_policy":    map[string]any{"type": "keyword"},
		"department":       map[string]any{"type": "keyword"},
		"industry":         map[string]any{"type": "keyword"},
		"currency":         map[string]any{"type": "keyword"},
		"currency_code":    map[string]any{"type": "keyword"},
		"skills":           map[string]any{"type": "keyword"},
		"salary_min_cents": map[string]any{"type": "long"},
		"salary_max_cents": map[string]any{"type": "long"},
		"experience_min_years": map[string]any{"type": "integer"},
		"experience_max_years": map[string]any{"type": "integer"},
		"boost_score":          map[string]any{"type": "integer"},
		"title_vector": map[string]any{
			"type":      "knn_vector",
			"dimension": 128,
			"method": map[string]any{
				"name":       "hnsw",
				"space_type": "l2",
			},
		},
		"embedding_model": map[string]any{"type": "keyword"},
		"embedding_dim":   map[string]any{"type": "integer"},
	}
}

// jobIndexCreateBody is settings + mappings for index creation.
func jobIndexCreateBody() map[string]any {
	return map[string]any{
		"settings": map[string]any{
			"index": map[string]any{
				"knn": true,
			},
		},
		"mappings": map[string]any{
			"properties": jobIndexProperties(),
		},
	}
}
