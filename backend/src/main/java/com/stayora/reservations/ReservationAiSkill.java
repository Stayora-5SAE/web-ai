package com.stayora.reservations;

import com.stayora.ai.AiSkill;
import org.springframework.stereotype.Component;

@Component
public class ReservationAiSkill implements AiSkill {
  @Override
  public String id() {
    return "reservation-itinerary";
  }

  @Override
  public String label() {
    return "Stay itinerary";
  }

  @Override
  public String owner() {
    return "Hadir Ghallabi";
  }

  @Override
  public String systemPrompt() {
    return "Suggest a short English travel itinerary from only the supplied destination, stay dates "
        + "and party size. Do not invent reservations, prices, access codes or personal details. "
        + "Describe suggestions as advice requiring local verification. Never perform booking or payment actions.";
  }

  @Override
  public String mock(String safeContext) {
    return "Suggested stay plan (deterministic demonstration):\n"
        + "Arrival: allow time for check-in, settle in, and explore the surrounding neighborhood.\n"
        + "Middle days: alternate local sightseeing with relaxed time at the property. Check opening hours and transport locally.\n"
        + "Departure: pack early and respect the property's check-out time.\n"
        + "Planning facts: "
        + safeContext
        + "\n"
        + "Advice only. No activity, reservation or payment has been arranged.";
  }
}
