package com.stayora.ai;

import com.stayora.shared.ApiException;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.function.Function;
import org.springframework.stereotype.Service;

@Service
public class AiService {
  private final Map<String, Function<String, String>> skills =
      Map.of(
          "listing-description",
              context ->
                  "A peaceful Mediterranean stay in "
                      + context.strip()
                      + ". Enjoy thoughtful amenities, local character, and a welcoming space to unwind.",
          "host-summary",
              context ->
                  "Demo host insight: review pending requests, prepare upcoming arrivals, and keep your listing calendar current. Focus: "
                      + context.strip()
                      + ".");

  public AiResponse assist(AiRequest request) {
    Function<String, String> skill = skills.get(request.skill());
    if (skill == null) throw ApiException.badRequest("Unknown mock AI skill.");
    return new AiResponse("mock", request.skill(), skill.apply(request.context()));
  }

  public record AiRequest(@NotBlank String skill, @NotBlank @Size(max = 300) String context) {}

  public record AiResponse(String mode, String skill, String text) {}
}
