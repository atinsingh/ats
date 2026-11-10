package httpserver

import (
	"net/url"
	"testing"
)

func TestParseJobsSearchParams_Defaults(t *testing.T) {
	p, err := ParseJobsSearchParams(url.Values{})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if p.Page != 1 || p.Size != 25 {
		t.Fatalf("defaults wrong: page=%d size=%d", p.Page, p.Size)
	}
	if p.From() != 0 {
		t.Fatalf("from defaults to 0, got %d", p.From())
	}
}

func TestParseJobsSearchParams_RejectsUnknownEnum(t *testing.T) {
	_, err := ParseJobsSearchParams(url.Values{"employment_type": {"PERMANENT"}})
	if err == nil {
		t.Fatal("expected error on unknown employment_type")
	}
}

func TestParseJobsSearchParams_NormalizesSkills(t *testing.T) {
	p, err := ParseJobsSearchParams(url.Values{
		"skills": {"Java,Spring", " java ", "go"},
	})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	got := p.Skills
	want := []string{"java", "spring", "go"}
	if len(got) != len(want) {
		t.Fatalf("expected %v got %v", want, got)
	}
	for i := range want {
		if got[i] != want[i] {
			t.Fatalf("skill[%d]: want %s got %s", i, want[i], got[i])
		}
	}
}

func TestParseJobsSearchParams_RejectsInvertedSalary(t *testing.T) {
	_, err := ParseJobsSearchParams(url.Values{
		"salary_min_cents": {"500"},
		"salary_max_cents": {"100"},
	})
	if err == nil {
		t.Fatal("expected error when min > max")
	}
}

func TestParseJobsSearchParams_PageSizeBounds(t *testing.T) {
	if _, err := ParseJobsSearchParams(url.Values{"size": {"500"}}); err == nil {
		t.Fatal("expected size>100 to error")
	}
	if _, err := ParseJobsSearchParams(url.Values{"page": {"0"}}); err == nil {
		t.Fatal("expected page<1 to error")
	}
}

func TestParseJobsSearchParams_From(t *testing.T) {
	p, err := ParseJobsSearchParams(url.Values{"page": {"3"}, "size": {"10"}})
	if err != nil {
		t.Fatalf("unexpected err: %v", err)
	}
	if p.From() != 20 {
		t.Fatalf("expected from=20 got %d", p.From())
	}
}
