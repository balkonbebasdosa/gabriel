package com.gabriel.backend.security;

import com.gabriel.backend.dto.ErrorResponse;
import com.gabriel.backend.entity.User;
import com.gabriel.backend.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.Optional;
import java.util.Set;

/**
 * Simulated auth: looks up the bearer token against User.token (no signing
 * secret, no JWT). Public paths pass through untouched; everything else needs
 * a valid token or gets a 401 written directly here - this runs before the
 * DispatcherServlet, so GlobalExceptionHandler can't catch anything from here.
 */
@Component
public class TokenAuthFilter extends OncePerRequestFilter {

    private static final Set<String> PUBLIC_PATHS = Set.of("/auth/register", "/auth/login", "/health");

    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public TokenAuthFilter(UserRepository userRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        // CORS preflight requests carry no Authorization header and must reach
        // Spring MVC's CorsConfig unauthenticated, or the browser sees a 401
        // with no Access-Control-Allow-Origin header and aborts the real
        // request with a generic "Failed to fetch" before it's even sent.
        if ("OPTIONS".equals(request.getMethod()) || PUBLIC_PATHS.contains(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = extractToken(request);
        Optional<User> user = token != null ? userRepository.findByToken(token) : Optional.empty();

        if (user.isEmpty()) {
            writeUnauthorized(response);
            return;
        }

        request.setAttribute("currentUserId", user.get().getId());
        filterChain.doFilter(request, response);
    }

    private String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            return header.substring(7);
        }
        return null;
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        ErrorResponse body = new ErrorResponse("Unauthorized", "Missing or invalid authentication token.");
        response.getWriter().write(objectMapper.writeValueAsString(body));
    }
}
