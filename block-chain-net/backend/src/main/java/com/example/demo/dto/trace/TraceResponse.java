package com.example.demo.dto.trace;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TraceResponse {
    private String productId;
    private String refId;
    private String farmerName;
    private String status;
    private String currentQrCode;
    private List<TraceEvent> events;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class TraceEvent {
        private String action;
        private String actorId;
        private String actorName;
        private String location;
        private String timestamp;
        private String bcTxId;
        private String signature;
    }
}
