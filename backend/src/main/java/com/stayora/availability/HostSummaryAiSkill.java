package com.stayora.availability;

import com.stayora.ai.AiSkill;
import org.springframework.stereotype.Component;

@Component
public class HostSummaryAiSkill implements AiSkill {
  public String id() {
    return "host-summary";
  }

  public String label() {
    return "Host operations summary";
  }

  public String owner() {
    return "Rania Regai";
  }

  public String systemPrompt() {
    return "Summarize the supplied aggregate host performance metrics in English. Explain occupancy using booked and sellable nights, mention owner blocks and pending requests, and suggest at most three practical calendar actions. Never invent revenue, bookings, guest identities, demand forecasts, or payments. Financial amounts are simulated. Recommendations require human review. Do not change availability, pricing, or reservations.";
  }

  public String mock(String safeContext) {
    return "Mock host summary — supplied aggregate metrics: "
        + safeContext
        + ". Review pending requests, keep owner blocks current, and compare booked nights with sellable nights before changing prices. Payouts are simulated; these suggestions require human review and do not change your calendar.";
  }
}
