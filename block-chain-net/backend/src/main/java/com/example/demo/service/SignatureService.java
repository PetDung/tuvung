package com.example.demo.service;

import com.example.demo.entity.SignatureAction;
import com.example.demo.entity.UsedSignature;
import com.example.demo.exception.SignatureVerificationException;
import com.example.demo.repository.UsedSignatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SignatureService {

    private final UsedSignatureRepository signatureRepository;

    private static final String SECRET_PREFIX = "AgriTrace";

    public String createSignature(UUID productId, SignatureAction action, UUID actorId, String location, String prevHash) {
        log.info("Creating signature for product: {}, action: {}", productId, action);

        String timestamp = String.valueOf(System.currentTimeMillis());
        String dataToSign = String.format("%s|%s|%s|%s|%s|%s",
                SECRET_PREFIX, productId, action.name(), actorId, location, timestamp);

        String hash = hashSHA256(dataToSign);
        String signatureData = Base64.getEncoder().encodeToString(
                (dataToSign + "|" + hash).getBytes(StandardCharsets.UTF_8)
        );

        log.info("Signature created successfully for product: {}", productId);
        return signatureData;
    }

    public boolean verifySignature(String signature) {
        if (signature == null || signature.isEmpty()) {
            log.warn("Signature is null or empty");
            return false;
        }

        if (signatureRepository.existsBySignature(signature)) {
            log.warn("Signature has already been used");
            return false;
        }

        try {
            byte[] decodedBytes = Base64.getDecoder().decode(signature);
            String decoded = new String(decodedBytes, StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|");

            if (parts.length < 6) {
                log.warn("Invalid signature format");
                return false;
            }

            String prefix = parts[0];
            if (!SECRET_PREFIX.equals(prefix)) {
                log.warn("Invalid signature prefix");
                return false;
            }

            String dataToVerify = String.join("|",
                    java.util.Arrays.copyOfRange(parts, 0, parts.length - 1));
            String providedHash = parts[parts.length - 1];
            String calculatedHash = hashSHA256(dataToVerify);

            return providedHash.equals(calculatedHash);
        } catch (IllegalArgumentException e) {
            log.error("Failed to decode signature: {}", e.getMessage());
            return false;
        }
    }

    @Transactional
    public UsedSignature markSignatureUsed(String signature, UUID productId, SignatureAction action,
                                           UUID actorId, String location, String prevHash) {
        log.info("Marking signature as used for product: {}", productId);

        if (signatureRepository.existsBySignature(signature)) {
            throw new SignatureVerificationException("Signature has already been used");
        }

        UsedSignature usedSignature = UsedSignature.builder()
                .productId(productId)
                .signature(signature)
                .action(action)
                .actorId(actorId)
                .location(location)
                .prevHash(prevHash)
                .usedAt(LocalDateTime.now())
                .build();

        usedSignature = signatureRepository.save(usedSignature);
        log.info("Signature marked as used successfully");

        return usedSignature;
    }

    public String getLastSignatureHash(UUID productId) {
        return signatureRepository.findFirstByProductIdOrderByUsedAtDesc(productId)
                .map(UsedSignature::getSignature)
                .orElse("GENESIS");
    }

    private String hashSHA256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }
}
