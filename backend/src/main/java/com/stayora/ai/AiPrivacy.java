package com.stayora.ai;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** Rebuilds outbound context from public vocabulary; never forwards free text verbatim. */
@Component
public class AiPrivacy {
  private static final List<String> PLACES =
      List.of(
          "La Marsa",
          "Sidi Bou Said",
          "Hammamet",
          "Djerba",
          "Tunis",
          "Sousse",
          "Tozeur",
          "Tabarka",
          "Monastir",
          "Bizerte",
          "Mahdia",
          "Nabeul",
          "Tunisia");
  private static final List<String> FACTS =
      List.of(
          "apartment",
          "apartments",
          "house",
          "houses",
          "guesthouse",
          "dar",
          "coastal",
          "sea view",
          "pool",
          "garden",
          "kitchen",
          "wi-fi",
          "workspace",
          "parking",
          "courtyard",
          "air conditioning",
          "balcony",
          "breakfast",
          "beach",
          "museum",
          "medina",
          "culture",
          "food",
          "family",
          "quiet",
          "budget",
          "cleanliness",
          "location",
          "comfort",
          "communication",
          "value",
          "positive",
          "negative",
          "neutral",
          "pending",
          "confirmed",
          "cancelled",
          "declined",
          "booked",
          "blocked",
          "available",
          "occupancy",
          "nights",
          "guests",
          "bedrooms",
          "bathrooms",
          "price",
          "nightly",
          "cleaning",
          "service",
          "payout",
          "tnd",
          "check-in",
          "check-out",
          "refund",
          "arrival",
          "departure",
          "amenities",
          "rating",
          "reviews",
          "count",
          "average",
          "checkout",
          "question",
          "sellable");
  private static final Pattern NUMBER =
      Pattern.compile("(?<![\\w.])\\d{1,4}(?:\\.\\d{1,3})?(?![\\w.])");
  private static final Pattern DATE = Pattern.compile("\\b20\\d{2}-\\d{2}-\\d{2}\\b");
  private static final List<String> METRICS =
      List.of(
          "publishedProperties",
          "confirmedNights",
          "sellableNights",
          "ownerBlockedNights",
          "occupancyPercent",
          "simulatedPayoutTND",
          "pendingRequests",
          "guests",
          "bedrooms",
          "bathrooms",
          "reviews count",
          "rating average");
  private static final Pattern STAY_DATE =
      Pattern.compile(
          "(?i)(checkIn|checkOut|check-in|check-out)[\\\"\\s]*[:=]?[\\\"\\s]*(20\\d{2}-\\d{2}-\\d{2})");
  private static final Pattern PRIVATE =
      Pattern.compile(
          "(?i)[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}|(?:\\+?\\d[ .()-]*){7,19}|https?://\\S+");

  public String context(String raw) {
    String cleaned = PRIVATE.matcher(DATE.matcher(raw).replaceAll(" ")).replaceAll(" ");
    String lower = cleaned.toLowerCase(Locale.ROOT);
    List<String> result = new ArrayList<>();
    Matcher role = Pattern.compile("(?i)viewerRole=(HOST|GUEST)\\b").matcher(raw);
    if (role.find()) result.add("viewerRole=" + role.group(1).toUpperCase(Locale.ROOT));
    Matcher month = Pattern.compile("month=(20\\d{2}-(?:0[1-9]|1[0-2]))\\b").matcher(raw);
    if (month.find()) result.add("month=" + month.group(1));
    for (String place : PLACES)
      if (lower.contains(place.toLowerCase(Locale.ROOT))) result.add(place);
    for (String fact : FACTS)
      if (Pattern.compile("(?<![a-z])" + Pattern.quote(fact) + "(?![a-z])").matcher(lower).find())
        result.add(fact);
    Matcher numbers = NUMBER.matcher(cleaned);
    while (numbers.find() && result.size() < 45) result.add(numbers.group());
    for (String metric : METRICS) {
      Matcher value =
          Pattern.compile(
                  "(?i)(?<![a-z])"
                      + Pattern.quote(metric)
                      + "[\\\"\\s]*[:=][\\\"\\s]*(\\d{1,8}(?:\\.\\d{1,3})?)(?![\\d.])")
              .matcher(cleaned);
      if (value.find()) result.add(metric + "=" + value.group(1));
    }
    Matcher dates = STAY_DATE.matcher(raw);
    while (dates.find() && result.size() < 65) result.add(dates.group(1) + "=" + dates.group(2));
    return result.isEmpty() ? "anonymous stay information" : String.join(", ", result);
  }

  public boolean safeOutput(String text) {
    return text != null
        && !text.isBlank()
        && text.length() <= 4000
        && !text.contains("<")
        && !text.contains(">")
        && !PRIVATE.matcher(DATE.matcher(text).replaceAll(" ")).find();
  }
}
