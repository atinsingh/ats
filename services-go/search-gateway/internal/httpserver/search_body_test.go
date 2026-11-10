package httpserver

import (
	"encoding/json"
	"net/url"
	"strings"
	"testing"
)

func TestBuildJobsSearchBody_MatchAllAddsTenantAndStatusFilter(t *testing.T) {
	body := buildJobsSearchBody("t1", "", nil, 10, nil)
	q := body["query"].(map[string]any)["bool"].(map[string]any)
	filters := q["filter"].([]any)
	if len(filters) != 2 {
		t.Fatalf("expected tenant + status filter, got %d", len(filters))
	}
	if body["size"] != 10 {
		t.Fatalf("size: %v", body["size"])
	}
	if body["from"] != 0 {
		t.Fatalf("from: %v", body["from"])
	}
}

func TestBuildJobsSearchBody_FiltersAndKeyword(t *testing.T) {
	f := map[string]any{
		"employment_type":       "FULL_TIME",
		"remote_policy":         "HYBRID",
		"location":              "NYC",
		"salary_at_least_cents": 1000000.0,
	}
	body := buildJobsSearchBody("tenant-uuid", "engineer", f, 25, nil)
	raw, _ := json.MarshalIndent(body, "", "  ")
	t.Log(string(raw))

	boolQ := body["query"].(map[string]any)["bool"].(map[string]any)
	filterClauses := boolQ["filter"].([]any)
	// tenant + status + employment + remote + location + salary
	if len(filterClauses) < 6 {
		t.Fatalf("expected at least 6 filters, got %d", len(filterClauses))
	}
	if boolQ["minimum_should_match"] != 1 {
		t.Fatalf("expected keyword bool msm 1")
	}
}

func TestBuildJobsSearchBodyFromParams_AppliesAllFilters(t *testing.T) {
	min := int64(5_000_00)
	max := int64(20_000_00)
	expMin := 3
	expMax := 7
	p := JobsSearchParams{
		Query:              "platform engineer",
		Country:            "US",
		Region:             "California",
		City:               "San Francisco",
		EmploymentType:     "FULL_TIME",
		RemotePolicy:       "REMOTE_FIRST",
		Skills:             []string{"java", "go"},
		SalaryMinCents:     &min,
		SalaryMaxCents:     &max,
		ExperienceMinYears: &expMin,
		ExperienceMaxYears: &expMax,
		Page:               2,
		Size:               20,
		Sort:               "recency",
	}
	body := buildJobsSearchBodyFromParams("tenant-1", p, nil)
	if body["from"] != 20 {
		t.Fatalf("expected from=20, got %v", body["from"])
	}
	if body["size"] != 20 {
		t.Fatalf("expected size=20, got %v", body["size"])
	}
	sort := body["sort"].([]any)
	if len(sort) == 0 {
		t.Fatalf("expected sort clauses for recency")
	}
}

func TestBuildJobsSearchBodyFromParams_IncludesAllAggregations(t *testing.T) {
	body := buildJobsSearchBodyFromParams("t1", JobsSearchParams{Size: 10, Page: 1}, nil)
	aggs := body["aggs"].(map[string]any)
	for _, name := range []string{"employment_type", "remote_policy", "country", "city", "skills", "currency"} {
		if _, ok := aggs[name]; !ok {
			t.Fatalf("missing facet aggregation: %s", name)
		}
	}
}

func TestBuildJobsSearchBodyFromParams_IncludeUnpublishedSkipsStatusFilter(t *testing.T) {
	p := JobsSearchParams{Size: 10, Page: 1, IncludeUnpublished: true}
	body := buildJobsSearchBodyFromParams("t1", p, nil)
	q := body["query"].(map[string]any)["bool"].(map[string]any)
	filters := q["filter"].([]any)
	for _, f := range filters {
		if hasTermOnField(f, "status") {
			t.Fatal("expected no status filter when IncludeUnpublished=true")
		}
	}
}

func hasTermOnField(clause any, field string) bool {
	m, ok := clause.(map[string]any)
	if !ok {
		return false
	}
	term, ok := m["term"].(map[string]any)
	if !ok {
		return false
	}
	_, ok = term[field]
	return ok
}

func TestParseJobsSearchParams_AcceptsAllSupportedFilters(t *testing.T) {
	v := url.Values{}
	v.Set("q", "engineer")
	v.Set("country", "us")
	v.Set("region", "California")
	v.Set("city", "San Francisco")
	v.Set("employment_type", "full_time")
	v.Set("remote_policy", "remote_first")
	v.Set("salary_min_cents", "5000000")
	v.Set("salary_max_cents", "20000000")
	v.Set("experience_min_years", "3")
	v.Set("experience_max_years", "7")
	v.Set("page", "2")
	v.Set("size", "30")
	v.Set("sort", "recency")
	v["skills"] = []string{"java,go", "spring"}
	p, err := ParseJobsSearchParams(v)
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if p.Country != "US" || p.EmploymentType != "FULL_TIME" || p.RemotePolicy != "REMOTE_FIRST" {
		t.Fatalf("normalization failed: %+v", p)
	}
	if strings.Join(p.Skills, ",") != "java,go,spring" {
		t.Fatalf("skills: %v", p.Skills)
	}
}
