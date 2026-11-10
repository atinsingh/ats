package httpserver

import (
	"errors"
	"fmt"
	"net/url"
	"strconv"
	"strings"
)

// JobsSearchParams is the parsed/validated form of a `GET /v1/search/jobs` request.
// Tenant id is resolved separately from the security context; it is never
// trusted from the URL.
type JobsSearchParams struct {
	Query              string
	Country            string
	Region             string
	City               string
	Location           string
	EmploymentType     string
	RemotePolicy       string
	Skills             []string
	SalaryMinCents     *int64
	SalaryMaxCents     *int64
	ExperienceMinYears *int
	ExperienceMaxYears *int
	IncludeUnpublished bool
	Page               int
	Size               int
	Sort               string
}

// allowed values are duplicated from the JSON Schema deliberately — the
// gateway should fail closed on unknown filter values rather than relying on
// downstream services to sanitize them.
var (
	allowedEmploymentTypes = map[string]struct{}{
		"FULL_TIME":   {},
		"PART_TIME":   {},
		"CONTRACT":    {},
		"INTERNSHIP":  {},
		"TEMPORARY":   {},
	}
	allowedRemotePolicies = map[string]struct{}{
		"REMOTE":       {},
		"REMOTE_FIRST": {},
		"HYBRID":       {},
		"ONSITE":       {},
	}
	allowedSorts = map[string]struct{}{
		"":           {},
		"relevance":  {},
		"recency":    {},
		"salary_asc": {},
		"salary_desc": {},
	}
)

// ParseJobsSearchParams reads request query string into a validated struct.
// Returns a 400-style error message ready to surface as `error_message`.
func ParseJobsSearchParams(values url.Values) (JobsSearchParams, error) {
	out := JobsSearchParams{
		Query:          strings.TrimSpace(values.Get("q")),
		Country:        upperTrim(values.Get("country")),
		Region:         strings.TrimSpace(values.Get("region")),
		City:           strings.TrimSpace(values.Get("city")),
		Location:       strings.TrimSpace(values.Get("location")),
		EmploymentType: upperTrim(values.Get("employment_type")),
		RemotePolicy:   upperTrim(values.Get("remote_policy")),
		Sort:           strings.ToLower(strings.TrimSpace(values.Get("sort"))),
	}

	if out.EmploymentType != "" {
		if _, ok := allowedEmploymentTypes[out.EmploymentType]; !ok {
			return out, fmt.Errorf("invalid employment_type: %s", out.EmploymentType)
		}
	}
	if out.RemotePolicy != "" {
		if _, ok := allowedRemotePolicies[out.RemotePolicy]; !ok {
			return out, fmt.Errorf("invalid remote_policy: %s", out.RemotePolicy)
		}
	}
	if _, ok := allowedSorts[out.Sort]; !ok {
		return out, fmt.Errorf("invalid sort: %s", out.Sort)
	}

	if raw := values.Get("salary_min_cents"); raw != "" {
		v, err := parsePositiveInt64(raw)
		if err != nil {
			return out, fmt.Errorf("salary_min_cents: %w", err)
		}
		out.SalaryMinCents = &v
	}
	if raw := values.Get("salary_max_cents"); raw != "" {
		v, err := parsePositiveInt64(raw)
		if err != nil {
			return out, fmt.Errorf("salary_max_cents: %w", err)
		}
		out.SalaryMaxCents = &v
	}
	if out.SalaryMinCents != nil && out.SalaryMaxCents != nil && *out.SalaryMinCents > *out.SalaryMaxCents {
		return out, errors.New("salary_min_cents must be <= salary_max_cents")
	}

	if raw := values.Get("experience_min_years"); raw != "" {
		v, err := parseBoundedInt(raw, 0, 60)
		if err != nil {
			return out, fmt.Errorf("experience_min_years: %w", err)
		}
		out.ExperienceMinYears = &v
	}
	if raw := values.Get("experience_max_years"); raw != "" {
		v, err := parseBoundedInt(raw, 0, 60)
		if err != nil {
			return out, fmt.Errorf("experience_max_years: %w", err)
		}
		out.ExperienceMaxYears = &v
	}
	if out.ExperienceMinYears != nil && out.ExperienceMaxYears != nil &&
		*out.ExperienceMinYears > *out.ExperienceMaxYears {
		return out, errors.New("experience_min_years must be <= experience_max_years")
	}

	out.Skills = parseSkills(values["skills"])

	page, err := parseBoundedInt(firstNonEmpty(values.Get("page"), "1"), 1, 1000)
	if err != nil {
		return out, fmt.Errorf("page: %w", err)
	}
	out.Page = page

	size, err := parseBoundedInt(firstNonEmpty(values.Get("size"), "25"), 1, 100)
	if err != nil {
		return out, fmt.Errorf("size: %w", err)
	}
	out.Size = size

	if v := strings.ToLower(strings.TrimSpace(values.Get("include_unpublished"))); v == "true" || v == "1" {
		out.IncludeUnpublished = true
	}

	return out, nil
}

func (p JobsSearchParams) From() int {
	return (p.Page - 1) * p.Size
}

func parsePositiveInt64(raw string) (int64, error) {
	v, err := strconv.ParseInt(strings.TrimSpace(raw), 10, 64)
	if err != nil {
		return 0, fmt.Errorf("must be a non-negative integer")
	}
	if v < 0 {
		return 0, fmt.Errorf("must be a non-negative integer")
	}
	return v, nil
}

func parseBoundedInt(raw string, lo, hi int) (int, error) {
	v, err := strconv.Atoi(strings.TrimSpace(raw))
	if err != nil {
		return 0, fmt.Errorf("must be an integer")
	}
	if v < lo || v > hi {
		return 0, fmt.Errorf("must be between %d and %d", lo, hi)
	}
	return v, nil
}

// parseSkills accepts repeated `?skills=foo&skills=bar` and comma-joined
// `?skills=foo,bar`. Skills are normalized to lowercase and deduplicated.
func parseSkills(raw []string) []string {
	if len(raw) == 0 {
		return nil
	}
	seen := map[string]struct{}{}
	out := make([]string, 0, len(raw))
	for _, group := range raw {
		for _, s := range strings.Split(group, ",") {
			s = strings.ToLower(strings.TrimSpace(s))
			if s == "" {
				continue
			}
			if _, dup := seen[s]; dup {
				continue
			}
			seen[s] = struct{}{}
			out = append(out, s)
		}
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func upperTrim(s string) string { return strings.ToUpper(strings.TrimSpace(s)) }

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}
