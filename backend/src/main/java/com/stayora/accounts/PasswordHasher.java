package com.stayora.accounts;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.springframework.stereotype.Component;

@Component
public class PasswordHasher {
  private static final int ITERATIONS = 600_000;
  private final SecureRandom random = new SecureRandom();

  public String hash(String password) {
    byte[] salt = new byte[16];
    random.nextBytes(salt);
    return ITERATIONS
        + ":"
        + Base64.getEncoder().encodeToString(salt)
        + ":"
        + Base64.getEncoder().encodeToString(derive(password, salt, ITERATIONS));
  }

  public boolean matches(String password, String encoded) {
    try {
      String[] parts = encoded.split(":");
      int iterations = Integer.parseInt(parts[0]);
      if (iterations < 100_000 || iterations > 1_000_000) return false;
      return MessageDigest.isEqual(
          Base64.getDecoder().decode(parts[2]),
          derive(password, Base64.getDecoder().decode(parts[1]), iterations));
    } catch (IllegalArgumentException | ArrayIndexOutOfBoundsException e) {
      return false;
    }
  }

  private byte[] derive(String password, byte[] salt, int iterations) {
    PBEKeySpec spec = new PBEKeySpec(password.toCharArray(), salt, iterations, 256);
    try {
      return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
    } catch (java.security.GeneralSecurityException e) {
      throw new IllegalStateException("Password hashing is unavailable.");
    } finally {
      spec.clearPassword();
    }
  }
}
