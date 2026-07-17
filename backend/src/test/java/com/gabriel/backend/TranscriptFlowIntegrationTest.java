package com.gabriel.backend;

import com.gabriel.backend.dto.AnalysisResponse;
import com.gabriel.backend.dto.AnalyzeTranscriptRequest;
import com.gabriel.backend.dto.AuthResponse;
import com.gabriel.backend.dto.MessageRequest;
import com.gabriel.backend.dto.RegisterRequest;
import com.gabriel.backend.dto.TranscriptCreatedResponse;
import com.gabriel.backend.dto.TranscriptDetailResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.ObjectMapper;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real HTTP layer end-to-end (register -> upload -> analyze -> fetch),
 * plus the validation error paths - the golden path a curl session against
 * a running server would otherwise cover.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class TranscriptFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String token;

    @BeforeEach
    void registerUser() throws Exception {
        String email = "user-" + UUID.randomUUID() + "@example.com";
        MvcResult result = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(email, "password123"))))
                .andExpect(status().isCreated())
                .andReturn();
        token = objectMapper.readValue(result.getResponse().getContentAsString(), AuthResponse.class).token();
    }

    private String auth() {
        return "Bearer " + token;
    }

    @Test
    void uploadAnalyzeAndFetch_roundTripsThroughRealHttp() throws Exception {
        List<MessageRequest> messages = List.of(
                new MessageRequest("A", "hey, how was school", Instant.parse("2026-07-16T14:02:00Z")),
                new MessageRequest("B", "boring lol", Instant.parse("2026-07-16T14:02:40Z"))
        );

        MvcResult uploadResult = mockMvc.perform(post("/transcripts")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isCreated())
                .andReturn();

        TranscriptCreatedResponse created = objectMapper.readValue(
                uploadResult.getResponse().getContentAsString(), TranscriptCreatedResponse.class);
        assertEquals(2, created.messageCount());
        UUID transcriptId = created.id();

        MvcResult analyzeResult = mockMvc.perform(post("/transcripts/{id}/analyze", transcriptId)
                        .header("Authorization", auth()))
                .andExpect(status().isOk())
                .andReturn();

        AnalysisResponse analysis = objectMapper.readValue(
                analyzeResult.getResponse().getContentAsString(), AnalysisResponse.class);
        assertEquals(2, analysis.segments().size());
        assertEquals(0.18, analysis.progressionScore());
        assertEquals(List.of("trust_building"), analysis.stagesReached());
        assertNotNull(analysis.conclusion());
        assertEquals(2, analysis.conclusion().participants().size());
        assertNull(analysis.conclusion().personOfInterestSummary());

        MvcResult getResult = mockMvc.perform(get("/transcripts/{id}", transcriptId)
                        .header("Authorization", auth()))
                .andExpect(status().isOk())
                .andReturn();

        TranscriptDetailResponse detail = objectMapper.readValue(
                getResult.getResponse().getContentAsString(), TranscriptDetailResponse.class);
        assertEquals(2, detail.messages().size());
        assertNotNull(detail.latestAnalysis());
        assertEquals(0.18, detail.latestAnalysis().progressionScore());
    }

    @Test
    void listTranscripts_returnsOnlyCurrentUsersTranscripts() throws Exception {
        List<MessageRequest> messages = List.of(
                new MessageRequest("A", "hey", Instant.parse("2026-07-16T14:02:00Z"))
        );
        mockMvc.perform(post("/transcripts")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isCreated());

        MvcResult listResult = mockMvc.perform(get("/transcripts")
                        .header("Authorization", auth()))
                .andExpect(status().isOk())
                .andReturn();

        TranscriptDetailResponse[] history = objectMapper.readValue(
                listResult.getResponse().getContentAsString(), TranscriptDetailResponse[].class);
        assertEquals(1, history.length);
    }

    @Test
    void analyzeWithFourDistinctSpeakers_returnsOneParticipantEach() throws Exception {
        List<MessageRequest> messages = List.of(
                new MessageRequest("D", "anyone finish the new update yet", Instant.parse("2026-07-17T18:00:00Z")),
                new MessageRequest("B", "not yet, still stuck on the third boss", Instant.parse("2026-07-17T18:00:20Z")),
                new MessageRequest("C", "same, that boss is brutal", Instant.parse("2026-07-17T18:00:40Z")),
                new MessageRequest("A", "haha you guys are all struggling, i beat it yesterday", Instant.parse("2026-07-17T18:01:00Z")),
                new MessageRequest("D", "show off lol", Instant.parse("2026-07-17T18:01:20Z"))
        );

        MvcResult uploadResult = mockMvc.perform(post("/transcripts")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isCreated())
                .andReturn();
        UUID transcriptId = objectMapper.readValue(
                uploadResult.getResponse().getContentAsString(), TranscriptCreatedResponse.class).id();

        // person_of_interest = "C", a middle speaker - not the first or last one added,
        // to prove matching isn't accidentally order-dependent.
        MvcResult analyzeResult = mockMvc.perform(post("/transcripts/{id}/analyze", transcriptId)
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AnalyzeTranscriptRequest("C"))))
                .andExpect(status().isOk())
                .andReturn();

        AnalysisResponse analysis = objectMapper.readValue(
                analyzeResult.getResponse().getContentAsString(), AnalysisResponse.class);
        assertEquals(4, analysis.conclusion().participants().size());
        assertNotNull(analysis.conclusion().personOfInterestSummary());
        assertEquals("C", analysis.conclusion().personOfInterestSummary().speaker());

        MvcResult getResult = mockMvc.perform(get("/transcripts/{id}", transcriptId)
                        .header("Authorization", auth()))
                .andExpect(status().isOk())
                .andReturn();
        TranscriptDetailResponse detail = objectMapper.readValue(
                getResult.getResponse().getContentAsString(), TranscriptDetailResponse.class);
        assertEquals(4, detail.latestAnalysis().conclusion().participants().size());
    }

    @Test
    void analyzeWithEightDistinctSpeakers_returnsOneParticipantEach() throws Exception {
        List<MessageRequest> messages = List.of(
                new MessageRequest("p1", "who's in for the raid tonight", Instant.parse("2026-07-17T19:00:00Z")),
                new MessageRequest("p2", "me!", Instant.parse("2026-07-17T19:00:10Z")),
                new MessageRequest("p3", "same here", Instant.parse("2026-07-17T19:00:20Z")),
                new MessageRequest("p4", "count me in too", Instant.parse("2026-07-17T19:00:30Z")),
                new MessageRequest("p5", "can't tonight, homework", Instant.parse("2026-07-17T19:00:40Z")),
                new MessageRequest("p6", "i'm free after 8", Instant.parse("2026-07-17T19:00:50Z")),
                new MessageRequest("p7", "let's do it", Instant.parse("2026-07-17T19:01:00Z")),
                new MessageRequest("p8", "sounds good, see everyone then", Instant.parse("2026-07-17T19:01:10Z"))
        );

        MvcResult uploadResult = mockMvc.perform(post("/transcripts")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isCreated())
                .andReturn();
        UUID transcriptId = objectMapper.readValue(
                uploadResult.getResponse().getContentAsString(), TranscriptCreatedResponse.class).id();

        MvcResult analyzeResult = mockMvc.perform(post("/transcripts/{id}/analyze", transcriptId)
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AnalyzeTranscriptRequest("p6"))))
                .andExpect(status().isOk())
                .andReturn();

        AnalysisResponse analysis = objectMapper.readValue(
                analyzeResult.getResponse().getContentAsString(), AnalysisResponse.class);
        assertEquals(8, analysis.conclusion().participants().size());
        assertNotNull(analysis.conclusion().personOfInterestSummary());
        assertEquals("p6", analysis.conclusion().personOfInterestSummary().speaker());
    }

    @Test
    void analyzeWithPersonOfInterest_returnsMatchingSummary() throws Exception {
        List<MessageRequest> messages = List.of(
                new MessageRequest("A", "hey, how was school", Instant.parse("2026-07-16T14:02:00Z")),
                new MessageRequest("B", "boring lol", Instant.parse("2026-07-16T14:02:40Z"))
        );

        MvcResult uploadResult = mockMvc.perform(post("/transcripts")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isCreated())
                .andReturn();
        UUID transcriptId = objectMapper.readValue(
                uploadResult.getResponse().getContentAsString(), TranscriptCreatedResponse.class).id();

        MvcResult analyzeResult = mockMvc.perform(post("/transcripts/{id}/analyze", transcriptId)
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AnalyzeTranscriptRequest("B"))))
                .andExpect(status().isOk())
                .andReturn();

        AnalysisResponse analysis = objectMapper.readValue(
                analyzeResult.getResponse().getContentAsString(), AnalysisResponse.class);
        assertNotNull(analysis.conclusion().personOfInterestSummary());
        assertEquals("B", analysis.conclusion().personOfInterestSummary().speaker());
    }

    @Test
    void analyzeWithPersonOfInterest_notASpeaker_rejectedWith400() throws Exception {
        List<MessageRequest> messages = List.of(
                new MessageRequest("A", "hey, how was school", Instant.parse("2026-07-16T14:02:00Z")),
                new MessageRequest("B", "boring lol", Instant.parse("2026-07-16T14:02:40Z"))
        );

        MvcResult uploadResult = mockMvc.perform(post("/transcripts")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isCreated())
                .andReturn();
        UUID transcriptId = objectMapper.readValue(
                uploadResult.getResponse().getContentAsString(), TranscriptCreatedResponse.class).id();

        mockMvc.perform(post("/transcripts/{id}/analyze", transcriptId)
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new AnalyzeTranscriptRequest("nobody-in-this-transcript"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadEmptyTranscript_rejectedWith400() throws Exception {
        mockMvc.perform(post("/transcripts")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadMalformedMessage_missingSpeaker_rejectedWith400() throws Exception {
        mockMvc.perform(post("/transcripts")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[{\"message\": \"hi\", \"timestamp\": \"2026-07-16T14:02:00Z\"}]"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getUnknownTranscript_returns404() throws Exception {
        mockMvc.perform(get("/transcripts/{id}", "00000000-0000-0000-0000-000000000000")
                        .header("Authorization", auth()))
                .andExpect(status().isNotFound());
    }

    @Test
    void requestWithoutToken_returns401() throws Exception {
        mockMvc.perform(get("/transcripts"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void anotherUsersTranscript_returns404NotOwnersData() throws Exception {
        List<MessageRequest> messages = List.of(
                new MessageRequest("A", "hey, how was school", Instant.parse("2026-07-16T14:02:00Z"))
        );
        MvcResult uploadResult = mockMvc.perform(post("/transcripts")
                        .header("Authorization", auth())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isCreated())
                .andReturn();
        UUID transcriptId = objectMapper.readValue(
                uploadResult.getResponse().getContentAsString(), TranscriptCreatedResponse.class).id();

        String otherEmail = "user-" + UUID.randomUUID() + "@example.com";
        MvcResult registerResult = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(otherEmail, "password123"))))
                .andExpect(status().isCreated())
                .andReturn();
        String otherToken = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(), AuthResponse.class).token();

        mockMvc.perform(get("/transcripts/{id}", transcriptId)
                        .header("Authorization", "Bearer " + otherToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void health_returnsUp() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk());
    }
}
