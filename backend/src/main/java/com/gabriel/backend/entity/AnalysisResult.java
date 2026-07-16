package com.gabriel.backend.entity;

import jakarta.persistence.CascadeType;
import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "analysis_result")
public class AnalysisResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "transcript_id", nullable = false)
    private Transcript transcript;

    @Column(name = "progression_score", nullable = false)
    private double progressionScore;

    /**
     * Subset of the four grooming-stage values, in the order first reached.
     * Never relabeled or rescaled - passed through from the AI service as-is.
     */
    @ElementCollection
    @CollectionTable(name = "analysis_result_stages_reached", joinColumns = @JoinColumn(name = "analysis_result_id"))
    @OrderColumn(name = "position")
    @Column(name = "stage", nullable = false)
    private List<String> stagesReached = new ArrayList<>();

    @Column(nullable = false, columnDefinition = "TEXT")
    private String summary;

    /**
     * Speaker label from the request that the caller wanted a focused conclusion on
     * (typically the child/minor). Null if not requested. Used to pick out the matching
     * entry from participants when rebuilding conclusion.person_of_interest_summary.
     */
    @Column(name = "person_of_interest")
    private String personOfInterest;

    @OneToMany(mappedBy = "analysisResult", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Participant> participants = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @OneToMany(mappedBy = "analysisResult", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("messageIndex ASC")
    private List<Segment> segments = new ArrayList<>();

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public void addSegment(Segment segment) {
        segment.setAnalysisResult(this);
        segments.add(segment);
    }

    public void addParticipant(Participant participant) {
        participant.setAnalysisResult(this);
        participants.add(participant);
    }

    public UUID getId() {
        return id;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public Transcript getTranscript() {
        return transcript;
    }

    public void setTranscript(Transcript transcript) {
        this.transcript = transcript;
    }

    public double getProgressionScore() {
        return progressionScore;
    }

    public void setProgressionScore(double progressionScore) {
        this.progressionScore = progressionScore;
    }

    public List<String> getStagesReached() {
        return stagesReached;
    }

    public void setStagesReached(List<String> stagesReached) {
        this.stagesReached = stagesReached;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public String getPersonOfInterest() {
        return personOfInterest;
    }

    public void setPersonOfInterest(String personOfInterest) {
        this.personOfInterest = personOfInterest;
    }

    public List<Participant> getParticipants() {
        return participants;
    }

    public void setParticipants(List<Participant> participants) {
        this.participants = participants;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }

    public List<Segment> getSegments() {
        return segments;
    }

    public void setSegments(List<Segment> segments) {
        this.segments = segments;
    }
}
