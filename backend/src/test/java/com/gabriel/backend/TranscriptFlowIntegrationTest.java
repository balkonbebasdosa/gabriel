package com.gabriel.backend;

import com.gabriel.backend.dto.AnalysisResponse;
import com.gabriel.backend.dto.MessageRequest;
import com.gabriel.backend.dto.TranscriptCreatedResponse;
import com.gabriel.backend.dto.TranscriptDetailResponse;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Exercises the real HTTP layer end-to-end (upload -> analyze -> fetch),
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

    @Test
    void uploadAnalyzeAndFetch_roundTripsThroughRealHttp() throws Exception {
        List<MessageRequest> messages = List.of(
                new MessageRequest("A", "hey, how was school", Instant.parse("2026-07-16T14:02:00Z")),
                new MessageRequest("B", "boring lol", Instant.parse("2026-07-16T14:02:40Z"))
        );

        MvcResult uploadResult = mockMvc.perform(post("/transcripts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(messages)))
                .andExpect(status().isCreated())
                .andReturn();

        TranscriptCreatedResponse created = objectMapper.readValue(
                uploadResult.getResponse().getContentAsString(), TranscriptCreatedResponse.class);
        assertEquals(2, created.messageCount());
        UUID transcriptId = created.id();

        MvcResult analyzeResult = mockMvc.perform(post("/transcripts/{id}/analyze", transcriptId))
                .andExpect(status().isOk())
                .andReturn();

        AnalysisResponse analysis = objectMapper.readValue(
                analyzeResult.getResponse().getContentAsString(), AnalysisResponse.class);
        assertEquals(2, analysis.segments().size());
        assertEquals(0.18, analysis.progressionScore());
        assertEquals(List.of("trust_building"), analysis.stagesReached());

        MvcResult getResult = mockMvc.perform(get("/transcripts/{id}", transcriptId))
                .andExpect(status().isOk())
                .andReturn();

        TranscriptDetailResponse detail = objectMapper.readValue(
                getResult.getResponse().getContentAsString(), TranscriptDetailResponse.class);
        assertEquals(2, detail.messages().size());
        assertNotNull(detail.latestAnalysis());
        assertEquals(0.18, detail.latestAnalysis().progressionScore());
    }

    @Test
    void uploadEmptyTranscript_rejectedWith400() throws Exception {
        mockMvc.perform(post("/transcripts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[]"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void uploadMalformedMessage_missingSpeaker_rejectedWith400() throws Exception {
        mockMvc.perform(post("/transcripts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("[{\"message\": \"hi\", \"timestamp\": \"2026-07-16T14:02:00Z\"}]"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void getUnknownTranscript_returns404() throws Exception {
        mockMvc.perform(get("/transcripts/{id}", "00000000-0000-0000-0000-000000000000"))
                .andExpect(status().isNotFound());
    }

    @Test
    void health_returnsUp() throws Exception {
        mockMvc.perform(get("/health"))
                .andExpect(status().isOk());
    }
}
