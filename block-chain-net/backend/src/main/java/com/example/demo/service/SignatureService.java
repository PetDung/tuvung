package com.example.demo.service;

import com.example.demo.entity.SignatureAction;
import com.example.demo.entity.UsedSignature;
import com.example.demo.exception.SignatureVerificationException;
import com.example.demo.repository.UsedSignatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Base64;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SignatureService {

    private final UsedSignatureRepository signatureRepository;

    @Value("${app.signature.secret}")
    private String secretKey;

    @Value("${app.signature.expiry-days:30}")
    private int expiryDays;

    private static final String VERSION = "v2";
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String LEGACY_PREFIX = "AgriTrace";

    /**
     * Tạo signature phiên bản v2 với HMAC-SHA256, nonce và expiry.
     * Chỉ server mới tạo được signature hợp lệ nhờ secret key.
     */
    public String createSignature(UUID productId, SignatureAction action, UUID actorId, String location, String prevHash) {
        log.debug("Creating v2 signature for product: {}, action: {}", productId, action);

        String timestamp = String.valueOf(System.currentTimeMillis());
        String nonce = UUID.randomUUID().toString();
        String expiry = String.valueOf(System.currentTimeMillis() + (long) expiryDays * 24 * 60 * 60 * 1000);

        // Format: v2|productId|action|actorId|location|timestamp|nonce|expiry|HMAC
        String dataToSign = String.format("%s|%s|%s|%s|%s|%s|%s|%s",
                VERSION, productId, action.name(), actorId, location, timestamp, nonce, expiry);

        String hmac = computeHmac(dataToSign);
        String signatureData = dataToSign + "|" + hmac;

        String encoded = Base64.getEncoder().encodeToString(signatureData.getBytes(StandardCharsets.UTF_8));
        log.debug("Signature created successfully for product: {}", productId);
        return encoded;
    }

    /**
     * Xác thực signature:
     * - v2: HMAC-SHA256 + check nonce + check expiry
     * - v1 (legacy): SHA-256 với prefix (backward compatible)
     */
    public boolean verifySignature(String signature) {
        if (signature == null || signature.isEmpty()) {
            log.warn("Signature is null or empty");
            return false;
        }

        // One-time-use check: không cho phép dùng lại signature
        if (signatureRepository.existsBySignature(signature)) {
            log.warn("Signature has already been used");
            return false;
        }

        try {
            byte[] decodedBytes = Base64.getDecoder().decode(signature);
            String decoded = new String(decodedBytes, StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|");

            if (parts.length < 2) {
                log.warn("Invalid signature format: too few parts");
                return false;
            }

            String version = parts[0];

            if (VERSION.equals(version)) {
                return verifyV2Signature(parts);
            } else if (LEGACY_PREFIX.equals(version)) {
                // Legacy v1 — giữ để tương thích dữ liệu cũ
                log.warn("Legacy v1 signature detected - consider regenerating QR");
                return verifyV1Signature(parts);
            }

            log.warn("Unknown signature version: {}", version);
            return false;
        } catch (IllegalArgumentException e) {
            log.error("Failed to decode signature: {}", e.getMessage());
            return false;
        }
    }

    /**
     * Xác thực signature v2: HMAC-SHA256 + expiry + nonce
     * Format: v2|productId|action|actorId|location|timestamp|nonce|expiry|hmac
     */
    private boolean verifyV2Signature(String[] parts) {
        if (parts.length != 9) {
            log.warn("Invalid v2 signature format: expected 9 parts, got {}", parts.length);
            return false;
        }

        // Check expiry
        long expiryMillis = Long.parseLong(parts[7]);
        if (System.currentTimeMillis() > expiryMillis) {
            log.warn("Signature has expired");
            return false;
        }

        // Check nonce chưa từng dùng (lớp bảo vệ thứ 2, ngoài signature-level check)
        String nonce = parts[6];
        if (signatureRepository.existsByNonce(nonce)) {
            log.warn("Signature nonce has already been used");
            return false;
        }

        // Verify HMAC
        String dataToVerify = String.join("|",
                java.util.Arrays.copyOfRange(parts, 0, parts.length - 1));
        String providedHmac = parts[parts.length - 1];
        String calculatedHmac = computeHmac(dataToVerify);

        if (!providedHmac.equals(calculatedHmac)) {
            log.warn("HMAC mismatch - signature may be forged");
            return false;
        }

        return true;
    }

    /**
     * Xác thực signature v1 (legacy): SHA256 hash
     * Format: AgriTrace|productId|action|actorId|location|timestamp|hash
     */
    private boolean verifyV1Signature(String[] parts) {
        if (parts.length < 7) {
            log.warn("Invalid v1 signature format");
            return false;
        }

        String dataToVerify = String.join("|",
                java.util.Arrays.copyOfRange(parts, 0, parts.length - 1));
        String providedHash = parts[parts.length - 1];
        String calculatedHash = hashSHA256(dataToVerify);

        return providedHash.equals(calculatedHash);
    }

    /**
     * Trích xuất action từ signature v2.
     */
    public SignatureAction extractActionFromSignature(String signature) {
        try {
            byte[] decodedBytes = Base64.getDecoder().decode(signature);
            String decoded = new String(decodedBytes, StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|");
            if (parts.length >= 3 && VERSION.equals(parts[0])) {
                return SignatureAction.valueOf(parts[2]);
            }
        } catch (Exception e) {
            log.warn("Failed to extract action from signature: {}", e.getMessage());
        }
        return null;
    }

    /**
     * Đánh dấu signature là đã dùng (chỉ gọi khi scan thành công).
     */
    public UsedSignature markSignatureUsed(String signature, UUID productId, SignatureAction action,
                                           UUID actorId, String location, String prevHash) {
        log.info("Marking signature as used for product: {}", productId);

        // Check once — nếu đã used, throw luôn (kiểm tra nhanh, tránh insert)
        if (signatureRepository.existsBySignature(signature)) {
            throw new SignatureVerificationException("Signature has already been used");
        }

        // Trích xuất nonce và expiry từ signature v2
        String nonce = null;
        LocalDateTime expiresAt = null;
        try {
            byte[] decodedBytes = Base64.getDecoder().decode(signature);
            String decoded = new String(decodedBytes, StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|");
            if (parts.length >= 9 && VERSION.equals(parts[0])) {
                nonce = parts[6];
                long expiryMillis = Long.parseLong(parts[7]);
                expiresAt = LocalDateTime.ofInstant(
                        Instant.ofEpochMilli(expiryMillis), ZoneId.systemDefault());
            }
        } catch (Exception e) {
            log.warn("Could not parse nonce/expiry from signature: {}", e.getMessage());
        }

        UsedSignature usedSignature = UsedSignature.builder()
                .productId(productId)
                .signature(signature)
                .nonce(nonce)
                .action(action)
                .actorId(actorId)
                .location(location)
                .prevHash(prevHash)
                .expiresAt(expiresAt)
                .usedAt(LocalDateTime.now())
                .build();

        try {
            usedSignature = signatureRepository.save(usedSignature);
            // Force flush để phát hiện constraint violation ngay lập tức
            signatureRepository.flush();
            log.info("Signature marked as used successfully");
            return usedSignature;
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            // Race condition: 2 request cùng lúc, 1 thằng insert trước, thằng sau fail
            log.warn("Signature already used (concurrent scan detected)");
            throw new SignatureVerificationException("QR code has already been used");
        }
    }

    public String getLastSignatureHash(UUID productId) {
        return signatureRepository.findFirstByProductIdOrderByUsedAtDesc(productId)
                .map(UsedSignature::getSignature)
                .orElse("GENESIS");
    }

    /**
     * Tính HMAC-SHA256 với secret key.
     */
    private String computeHmac(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec keySpec = new SecretKeySpec(
                    secretKey.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM);
            mac.init(keySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hmacBytes);
        } catch (Exception e) {
            throw new RuntimeException("HMAC-SHA256 computation failed", e);
        }
    }

    private String hashSHA256(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes(StandardCharsets.UTF_8));
            return bytesToHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder hexString = new StringBuilder();
        for (byte b : bytes) {
            String hex = Integer.toHexString(0xff & b);
            if (hex.length() == 1) hexString.append('0');
            hexString.append(hex);
        }
        return hexString.toString();
    }
}
