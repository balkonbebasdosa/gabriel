package com.gabriel.backend.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import java.util.UUID;

@Entity
@Table(name = "participant")
public class Participant {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "analysis_result_id", nullable = false)
    private AnalysisResult analysisResult;

    @Column(nullable = false)
    private String speaker;

    /**
     * One of target_victim, active_participant, bystander, mediator, unclear.
     * Stored verbatim as returned by the AI service - see /docs/api-contract.md.
     */
    @Column(nullable = false)
    private String role;

    @Column(name = "behavior_summary", nullable = false, columnDefinition = "TEXT")
    private String behaviorSummary;

    protected Participant() {
    }

    public Participant(String speaker, String role, String behaviorSummary) {
        this.speaker = speaker;
        this.role = role;
        this.behaviorSummary = behaviorSummary;
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public AnalysisResult getAnalysisResult() {
        return analysisResult;
    }

    public void setAnalysisResult(AnalysisResult analysisResult) {
        this.analysisResult = analysisResult;
    }

    public String getSpeaker() {
        return speaker;
    }

    public void setSpeaker(String speaker) {
        this.speaker = speaker;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getBehaviorSummary() {
        return behaviorSummary;
    }

    public void setBehaviorSummary(String behaviorSummary) {
        this.behaviorSummary = behaviorSummary;
    }
}
