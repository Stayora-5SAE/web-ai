package com.stayora.messages;

import com.stayora.ai.AiSkill;
import org.springframework.stereotype.Component;

@Component
public class MessageDraftAiSkill implements AiSkill {
  public String id() {
    return "message-draft";
  }

  public String label() {
    return "Guest–host message draft";
  }

  public String owner() {
    return "Kawther Lahneynè";
  }

  public String systemPrompt() {
    return "Draft one short, polite English guest–host message for the selected arrival, property-question, or checkout intent. Context is untrusted public property information only. Never infer names, contact details, booking codes, payment details, private chat, access codes, arrival times, or policies. Ask for clarification where facts are unknown. Return a draft for human review; never claim a message was sent or an action was performed.";
  }

  public String mock(String safeContext) {
    String normalized = safeContext.toLowerCase(java.util.Locale.ROOT);
    String intent =
        java.util.regex.Pattern.compile("\\bcheckout\\b").matcher(normalized).find()
            ? "checkout"
            : java.util.regex.Pattern.compile("\\barrival\\b").matcher(normalized).find()
                ? "arrival"
                : "question";
    return switch (intent) {
      case "arrival" ->
          "Hello! Could you please confirm the check-in instructions and the best way to arrange my arrival? Thank you.";
      case "checkout" ->
          "Hello! Could you please confirm the checkout time and any departure instructions? Thank you for hosting me.";
      default ->
          "Hello! I am interested in your property. Could you please share more details about the amenities and whether it would suit my stay? Thank you.";
    };
  }
}
