package com.stayora.ai;

import com.stayora.shared.ApiException;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AiService {
  private final Map<String, AiSkill> skills = new LinkedHashMap<>();
  private final AiProvider provider;
  private final AiPrivacy privacy;

  public AiService(List<AiSkill> contributed, AiProvider provider, AiPrivacy privacy) {
    this.provider = provider;
    this.privacy = privacy;
    for (AiSkill skill : contributed)
      if (skills.putIfAbsent(skill.id(), skill) != null)
        throw new IllegalStateException("Duplicate business AI skill.");
  }

  public List<SkillView> skills() {
    return skills.values().stream().map(s -> new SkillView(s.id(), s.label(), s.owner())).toList();
  }

  public AiResponse assist(AiRequest request) {
    AiSkill skill = skills.get(request.skill());
    if (skill == null) throw ApiException.badRequest("Unknown AI skill.");
    String safeContext = privacy.context(request.context());
    AiProvider.ProviderResult result = provider.generate(skill.systemPrompt(), safeContext);
    if (result.text() != null && privacy.safeOutput(result.text()))
      return new AiResponse(
          "live", skill.id(), result.text(), result.notice(), true, result.model());
    String notice =
        result.text() == null
            ? result.notice()
            : "The provider response did not pass validation. Showing the offline response.";
    return new AiResponse("mock", skill.id(), skill.mock(safeContext), notice, true, null);
  }

  public record AiRequest(
      @NotBlank @Size(max = 80) String skill, @NotBlank @Size(max = 2000) String context) {}

  public record AiResponse(
      String mode,
      String skill,
      String text,
      String notice,
      boolean reviewRequired,
      String model) {}

  public record SkillView(String id, String label, String owner) {}
}
