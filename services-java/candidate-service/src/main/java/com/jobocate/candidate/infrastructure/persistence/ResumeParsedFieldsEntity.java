package com.jobocate.candidate.infrastructure.persistence;

import jakarta.persistence.Access;
import jakarta.persistence.AccessType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Mirrors {@code resume_parsed_fields}. The PK equals the resume id (1:1). */
@Entity
@Access(AccessType.FIELD)
@Table(name = "resume_parsed_fields")
public class ResumeParsedFieldsEntity {

    public enum ReviewStatus {
        PROPOSED,
        APPLIED,
        REJECTED
    }

    @Id
    @Column(name = "resume_id")
    private UUID resumeId;

    @Column(name = "candidate_profile_id", nullable = false)
    private UUID candidateProfileId;

    @Column(name = "full_name")
    private String fullName;

    @Column private String email;
    @Column private String phone;

    @Column(name = "location_city")
    private String locationCity;

    @Column(name = "location_region")
    private String locationRegion;

    @Column(name = "location_country")
    private String locationCountry;

    @Column(name = "skills", columnDefinition = "text[]")
    @JdbcTypeCode(SqlTypes.ARRAY)
    private List<String> skills = List.of();

    @Column(name = "total_experience_years")
    private BigDecimal totalExperienceYears;

    @Column(name = "parsed_text")
    private String parsedText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "structured")
    private Map<String, Object> structured = new HashMap<>();

    @Column(name = "parser_version", length = 32)
    private String parserVersion;

    @Column(name = "parsed_at", nullable = false)
    private Instant parsedAt = Instant.now();

    @Enumerated(EnumType.STRING)
    @Column(name = "review_status", nullable = false, length = 16)
    private ReviewStatus reviewStatus = ReviewStatus.PROPOSED;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    public ResumeParsedFieldsEntity() {}

    public UUID getResumeId() {
        return resumeId;
    }

    public void setResumeId(UUID resumeId) {
        this.resumeId = resumeId;
    }

    public UUID getCandidateProfileId() {
        return candidateProfileId;
    }

    public void setCandidateProfileId(UUID candidateProfileId) {
        this.candidateProfileId = candidateProfileId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getLocationCity() {
        return locationCity;
    }

    public void setLocationCity(String locationCity) {
        this.locationCity = locationCity;
    }

    public String getLocationRegion() {
        return locationRegion;
    }

    public void setLocationRegion(String locationRegion) {
        this.locationRegion = locationRegion;
    }

    public String getLocationCountry() {
        return locationCountry;
    }

    public void setLocationCountry(String locationCountry) {
        this.locationCountry = locationCountry;
    }

    public List<String> getSkills() {
        return skills;
    }

    public void setSkills(List<String> skills) {
        this.skills = skills == null ? List.of() : List.copyOf(skills);
    }

    public BigDecimal getTotalExperienceYears() {
        return totalExperienceYears;
    }

    public void setTotalExperienceYears(BigDecimal totalExperienceYears) {
        this.totalExperienceYears = totalExperienceYears;
    }

    public String getParsedText() {
        return parsedText;
    }

    public void setParsedText(String parsedText) {
        this.parsedText = parsedText;
    }

    public Map<String, Object> getStructured() {
        return structured;
    }

    public void setStructured(Map<String, Object> structured) {
        this.structured = structured == null ? new HashMap<>() : structured;
    }

    public String getParserVersion() {
        return parserVersion;
    }

    public void setParserVersion(String parserVersion) {
        this.parserVersion = parserVersion;
    }

    public Instant getParsedAt() {
        return parsedAt;
    }

    public void setParsedAt(Instant parsedAt) {
        this.parsedAt = parsedAt;
    }

    public ReviewStatus getReviewStatus() {
        return reviewStatus;
    }

    public void markApplied(Instant when) {
        this.reviewStatus = ReviewStatus.APPLIED;
        this.reviewedAt = when;
    }

    public void markRejected(Instant when) {
        this.reviewStatus = ReviewStatus.REJECTED;
        this.reviewedAt = when;
    }

    public Instant getReviewedAt() {
        return reviewedAt;
    }
}
