package com.example.demo.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

@Entity
@Table(name = "used_signatures")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UsedSignature {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "product_id")
    private UUID productId;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String signature;

    @Column(length = 36, unique = true)
    private String nonce;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SignatureAction action;

    @Column(name = "actor_id")
    private UUID actorId;

    @Column(length = 255)
    private String location;

    @Column(name = "prev_hash", length = 64)
    private String prevHash;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private Map<String, Object> metadata;

    @Column(name = "used_at", nullable = false)
    private LocalDateTime usedAt;
}
