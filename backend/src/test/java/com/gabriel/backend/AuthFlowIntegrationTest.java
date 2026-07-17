package com.gabriel.backend;

import com.gabriel.backend.dto.AuthResponse;
import com.gabriel.backend.dto.LoginRequest;
import com.gabriel.backend.dto.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.ObjectMapper;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Register/login as their own real HTTP flow, separate from
 * TranscriptFlowIntegrationTest's use of auth as a precondition.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private String uniqueEmail() {
        return "user-" + UUID.randomUUID() + "@example.com";
    }

    @Test
    void registerThenLogin_bothReturnAWorkingToken() throws Exception {
        String email = uniqueEmail();

        MvcResult registerResult = mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(email, "password123"))))
                .andExpect(status().isCreated())
                .andReturn();
        AuthResponse registered = objectMapper.readValue(
                registerResult.getResponse().getContentAsString(), AuthResponse.class);
        assertNotNull(registered.token());
        assertEquals(email, registered.email());

        // the token from register should already work for a protected endpoint
        mockMvc.perform(get("/transcripts").header("Authorization", "Bearer " + registered.token()))
                .andExpect(status().isOk());

        MvcResult loginResult = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, "password123"))))
                .andExpect(status().isOk())
                .andReturn();
        AuthResponse loggedIn = objectMapper.readValue(
                loginResult.getResponse().getContentAsString(), AuthResponse.class);
        assertNotNull(loggedIn.token());

        mockMvc.perform(get("/transcripts").header("Authorization", "Bearer " + loggedIn.token()))
                .andExpect(status().isOk());
    }

    @Test
    void registerDuplicateEmail_rejectedWith409() throws Exception {
        String email = uniqueEmail();
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(email, "password123"))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(email, "differentPassword1"))))
                .andExpect(status().isConflict());
    }

    @Test
    void registerMalformedEmail_rejectedWith400() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest("not-an-email", "password123"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void registerShortPassword_rejectedWith400() throws Exception {
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(uniqueEmail(), "short"))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void loginWrongPassword_rejectedWith401() throws Exception {
        String email = uniqueEmail();
        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new RegisterRequest(email, "password123"))))
                .andExpect(status().isCreated());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(email, "wrongpassword"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void loginUnknownEmail_rejectedWith401() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new LoginRequest(uniqueEmail(), "password123"))))
                .andExpect(status().isUnauthorized());
    }
}
