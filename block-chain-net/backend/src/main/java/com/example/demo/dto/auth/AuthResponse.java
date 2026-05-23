package com.example.demo.dto.auth;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuthResponse {
    private String token;
    private String tokenType;
    private Long expiresIn;
    private String userId;
    private String username;
    private String role;
    private String fullName;

    public static AuthResponse of(String token, Long expiresIn, String userId, String username, String role, String fullName) {
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .expiresIn(expiresIn)
                .userId(userId)
                .username(username)
                .role(role)
                .fullName(fullName)
                .build();
    }
}
