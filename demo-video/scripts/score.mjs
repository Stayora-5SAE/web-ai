import { writeFileSync } from "node:fs";
// An original, restrained ambient score. No downloaded audio or external service.
const sampleRate = 22050,
  seconds = 157,
  samples = sampleRate * seconds;
const wav = Buffer.alloc(44 + samples * 4);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVEfmt ", 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 4, 28);
wav.writeUInt16LE(4, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(samples * 4, 40);
const chords = [
  [130.813, 164.814, 195.998, 246.942],
  [110, 130.813, 164.814, 195.998],
  [87.307, 130.813, 174.614, 220],
  [97.999, 146.832, 195.998, 246.942],
];
for (let i = 0; i < samples; i++) {
  const t = i / sampleRate,
    chord = chords[Math.floor(t / 8) % chords.length],
    phase = (t % 8) / 8;
  const envelope =
    Math.min(t / 3, (seconds - t) / 4, 1) *
    (0.72 + 0.28 * Math.sin(Math.PI * phase));
  let pad = 0;
  for (let j = 0; j < chord.length; j++)
    pad +=
      Math.sin(2 * Math.PI * chord[j] * t + 0.12 * Math.sin(t * 0.8 + j)) *
      (j === 0 ? 0.38 : 0.2);
  const beat = t % 0.75,
    note = chord[Math.floor(t / 0.75) % 4] * 2;
  const pluck = Math.sin(2 * Math.PI * note * t) * Math.exp(-beat * 8) * 0.075;
  const sample = Math.tanh((pad * 0.11 + pluck) * envelope);
  wav.writeInt16LE(Math.round(sample * 32767), 44 + i * 4);
  wav.writeInt16LE(
    Math.round(
      (sample * 0.96 + Math.sin(t * 2 * Math.PI * chord[1]) * 0.002) *
        envelope *
        32767,
    ),
    46 + i * 4,
  );
}
writeFileSync(new URL("../public/score.wav", import.meta.url), wav);
console.log("Original 157-second ambient score generated.");
