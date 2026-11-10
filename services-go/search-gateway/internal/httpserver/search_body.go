package httpserver

import (
	"fmt"
	"strings"
)

// buildJobsSearchBody constructs an OpenSearch query for the legacy POST endpoint
// that accepts a free-form filter map. New code should prefer
// buildJobsSearchBodyFromParams which is type-safe.
func buildJobsSearchBody(tenantID, query string, filters map[string]any, limit int, vector []float64) map[string]any {
	params := JobsSearchParams{
		Query: strings.TrimSpace(query),
		Size:  clamp(limit, 1, 100),
		Page:  1,
	}
	if v, ok := stringFilter(filters, "employment_type"); ok {
		params.EmploymentType = strings.ToUpper(v)
	}
	if v, ok := stringFilter(filters, "remote_policy"); ok {
		params.RemotePolicy = strings.ToUpper(v)
	}
	if v, ok := stringFilter(filters, "location"); ok {
		params.Location = v
	}
	if v, ok := stringFilter(filters, "country"); ok {
		params.Country = strings.ToUpper(v)
	}
	if v, ok := stringFilter(filters, "region"); ok {
		params.Region = v
	}
	if v, ok := stringFilter(filters, "city"); ok {
		params.City = v
	}
	if n, ok := int64Filter(filters, "salary_at_least_cents"); ok {
		params.SalaryMinCents = &n
	}
	if n, ok := int64Filter(filters, "salary_min_cents"); ok {
		params.SalaryMinCents = &n
	}
	if n, ok := int64Filter(filters, "salary_max_cents"); ok {
		params.SalaryMaxCents = &n
	}
	return buildJobsSearchBodyFromParams(tenantID, params, vector)
}

// buildJobsSearchBodyFromParams produces the OpenSearch request body for the
// jobs index. Tenant filtering is unconditional. Status defaults to
// PUBLISHED unless `IncludeUnpublished` is set (used by recruiter-side admin
// search after authorization checks).
func buildJobsSearchBodyFromParams(tenantID string, p JobsSearchParams, vector []float64) map[string]any {
	filterClauses := []any{
		map[string]any{"term": map[string]any{"tenant_id": tenantID}},
	}
	if !p.IncludeUnpublished {
		filterClauses = append(filterClauses, map[string]any{
			"term": map[string]any{"status": "PUBLISHED"},
		})
	}
	if p.EmploymentType != "" {
		filterClauses = append(filterClauses, map[string]any{
			"term": map[string]any{"employment_type": p.EmploymentType},
		})
	}
	if p.RemotePolicy != "" {
		filterClauses = append(filterClauses, map[string]any{
			"term": map[string]any{"remote_policy": p.RemotePolicy},
		})
	}
	if p.Country != "" {
		filterClauses = append(filterClauses, map[string]any{
			"term": map[string]any{"country": p.Country},
		})
	}
	if p.Region != "" {
		filterClauses = append(filterClauses, map[string]any{
			"term": map[string]any{"region": p.Region},
		})
	}
	if p.City != "" {
		filterClauses = append(filterClauses, map[string]any{
			"term": map[string]any{"city": p.City},
		})
	}
	if p.Location != "" {
		filterClauses = append(filterClauses, map[string]any{
			"term": map[string]any{"location.keyword": p.Location},
		})
	}
	if len(p.Skills) > 0 {
		// All requested skills must be present (AND semantics) — this matches
		// recruiter expectations from the PRD "must-have skills" filter.
		for _, skill := range p.Skills {
			filterClauses = append(filterClauses, map[string]any{
				"term": map[string]any{"skills": skill},
			})
		}
	}
	if p.SalaryMinCents != nil {
		filterClauses = append(filterClauses, map[string]any{
			"bool": map[string]any{
				"should": []any{
					map[string]any{"range": map[string]any{"salary_max_cents": map[string]any{"gte": *p.SalaryMinCents}}},
					map[string]any{"range": map[string]any{"salary_min_cents": map[string]any{"gte": *p.SalaryMinCents}}},
				},
				"minimum_should_match": 1,
			},
		})
	}
	if p.SalaryMaxCents != nil {
		filterClauses = append(filterClauses, map[string]any{
			"bool": map[string]any{
				"should": []any{
					map[string]any{"range": map[string]any{"salary_min_cents": map[string]any{"lte": *p.SalaryMaxCents}}},
					map[string]any{"range": map[string]any{"salary_max_cents": map[string]any{"lte": *p.SalaryMaxCents}}},
				},
				"minimum_should_match": 1,
			},
		})
	}
	if p.ExperienceMinYears != nil {
		filterClauses = append(filterClauses, map[string]any{
			"bool": map[string]any{
				"should": []any{
					map[string]any{"range": map[string]any{"experience_max_years": map[string]any{"gte": *p.ExperienceMinYears}}},
					map[string]any{"range": map[string]any{"experience_min_years": map[string]any{"gte": *p.ExperienceMinYears}}},
				},
				"minimum_should_match": 1,
			},
		})
	}
	if p.ExperienceMaxYears != nil {
		filterClauses = append(filterClauses, map[string]any{
			"bool": map[string]any{
				"should": []any{
					map[string]any{"range": map[string]any{"experience_min_years": map[string]any{"lte": *p.ExperienceMaxYears}}},
					map[string]any{"range": map[string]any{"experience_max_years": map[string]any{"lte": *p.ExperienceMaxYears}}},
				},
				"minimum_should_match": 1,
			},
		})
	}

	var boolQuery map[string]any
	if p.Query == "" {
		boolQuery = map[string]any{
			"bool": map[string]any{
				"filter": filterClauses,
			},
		}
	} else {
		boolQuery = map[string]any{
			"bool": map[string]any{
				"filter": filterClauses,
				"should": []any{
					map[string]any{
						"multi_match": map[string]any{
							"query":     p.Query,
							"type":      "best_fields",
							"fields":    []string{"title^3", "description_text", "description", "skills^2"},
							"operator":  "and",
							"fuzziness": "AUTO",
						},
					},
				},
				"minimum_should_match": 1,
			},
		}
	}

	body := map[string]any{
		"size":   p.Size,
		"from":   p.From(),
		"query":  boolQuery,
		"_source": jobSearchSourceFields(),
		"highlight": map[string]any{
			"fields": map[string]any{
				"title":            map[string]any{},
				"description_text": map[string]any{},
				"description":      map[string]any{},
			},
		},
		"aggs": map[string]any{
			"employment_type": termsAgg("employment_type", 50),
			"remote_policy":   termsAgg("remote_policy", 50),
			"country":         termsAgg("country", 50),
			"city":            termsAgg("city", 50),
			"skills":          termsAgg("skills", 50),
			"currency":        termsAgg("currency", 25),
		},
	}

	body["sort"] = sortClauses(p)

	if len(vector) == 128 {
		body["knn"] = map[string]any{
			"title_vector": map[string]any{
				"vector": vector,
				"k":      p.Size,
				"filter": map[string]any{
					"term": map[string]any{"tenant_id": tenantID},
				},
			},
		}
	}

	return body
}

func jobSearchSourceFields() []string {
	return []string{
		"tenant_id",
		"job_id",
		"organization_id",
		"title",
		"description_text",
		"description",
		"company_name",
		"location",
		"country",
		"region",
		"city",
		"remote_policy",
		"employment_type",
		"salary_min_cents",
		"salary_max_cents",
		"currency",
		"experience_min_years",
		"experience_max_years",
		"skills",
		"industry",
		"department",
		"status",
		"published_at",
		"indexed_at",
		"boost_score",
	}
}

func termsAgg(field string, size int) map[string]any {
	return map[string]any{
		"terms": map[string]any{
			"field": field,
			"size":  size,
		},
	}
}

func sortClauses(p JobsSearchParams) []any {
	switch p.Sort {
	case "recency":
		return []any{
			map[string]any{"published_at": map[string]any{"order": "desc", "missing": "_last"}},
			map[string]any{"_score": map[string]any{"order": "desc"}},
		}
	case "salary_asc":
		return []any{
			map[string]any{"salary_min_cents": map[string]any{"order": "asc", "missing": "_last"}},
		}
	case "salary_desc":
		return []any{
			map[string]any{"salary_max_cents": map[string]any{"order": "desc", "missing": "_last"}},
		}
	default:
		// Relevance: combine score with boost_score so sponsored jobs rank
		// above otherwise-equivalent results without overpowering relevance.
		return []any{
			map[string]any{"_score": map[string]any{"order": "desc"}},
			map[string]any{"boost_score": map[string]any{"order": "desc", "missing": "_last"}},
			map[string]any{"published_at": map[string]any{"order": "desc", "missing": "_last"}},
		}
	}
}

func clamp(v, lo, hi int) int {
	if v < lo {
		return lo
	}
	if v > hi {
		return hi
	}
	return v
}

func stringFilter(filters map[string]any, key string) (string, bool) {
	raw, ok := filters[key]
	if !ok || raw == nil {
		return "", false
	}
	switch v := raw.(type) {
	case string:
		s := strings.TrimSpace(v)
		if s == "" {
			return "", false
		}
		return s, true
	default:
		s := strings.TrimSpace(fmt.Sprint(v))
		return s, s != ""
	}
}

func int64Filter(filters map[string]any, key string) (int64, bool) {
	raw, ok := filters[key]
	if !ok || raw == nil {
		return 0, false
	}
	switch v := raw.(type) {
	case float64:
		return int64(v), true
	case int:
		return int64(v), true
	case int64:
		return v, true
	default:
		return 0, false
	}
}
