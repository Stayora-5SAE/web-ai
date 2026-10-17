import { Audio, Video } from "@remotion/media";
import {
  AbsoluteFill,
  Easing,
  Interactive,
  Track,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const green = "#003e38",
  cream = "#faf7ef",
  gold = "#d9b77b";
type FeatureProps = {
  title: string;
  file: string;
  resultAt?: number;
  mobile?: boolean;
  speed?: number;
  ai?: boolean;
};

const FeatureInner = ({
  title,
  file,
  resultAt = 0,
  mobile = false,
  speed = 1,
  ai = false,
}: FeatureProps) => {
  const captureSrc = staticFile(
    file.startsWith("edits/") ? file : `captures/${file}`,
  );
  const f = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const fade = interpolate(
    f,
    [0, 10, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: green,
        color: cream,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 48,
          fontFamily: "Georgia, serif",
          fontSize: 44,
        }}
      >
        Stayora<span style={{ color: gold }}>.</span>
      </div>
      <div
        style={{
          position: "absolute",
          left: 64,
          top: 170,
          width: 290,
          opacity: fade,
          translate: `0 ${interpolate(f, [0, 18], [14, 0], { extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) })}px`,
        }}
      >
        <div
          style={{
            fontSize: 53,
            lineHeight: 1.12,
            fontFamily: "Georgia, serif",
            letterSpacing: -1.5,
          }}
        >
          {title}
        </div>
        <div
          style={{ height: 2, width: 62, background: gold, margin: "32px 0" }}
        />
      </div>
      <div
        style={{
          position: "absolute",
          left: mobile ? 850 : 400,
          top: 96,
          width: mobile ? 426 : 1472,
          height: 920,
          borderRadius: 20,
          overflow: "hidden",
          background: cream,
          boxShadow: "0 25px 80px #001b1880",
          opacity: fade,
          border: "1px solid #ffffff35",
        }}
      >
        {resultAt > 0 ? (
          <Track name="Recorded action and response">
            <Video
              name="Generate request"
              src={captureSrc}
              durationInFrames={Math.round(2.5 * fps)}
              muted
              objectFit="contain"
              style={{ width: "100%", height: "100%" }}
            />
            <Video
              name="Actual model response"
              src={captureSrc}
              from={Math.round(2.5 * fps)}
              trimBefore={Math.round(resultAt * fps)}
              muted
              objectFit="contain"
              style={{ width: "100%", height: "100%" }}
            />
          </Track>
        ) : (
          <Video
            name="Recorded app interaction"
            playbackRate={speed}
            src={captureSrc}
            muted
            objectFit="contain"
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>
      {(ai || resultAt > 0) && (
        <div
          style={{
            position: "absolute",
            left: 50,
            bottom: 108,
            width: 300,
            height: 88,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 999,
            background: cream,
            color: green,
            border: `2px solid ${gold}`,
            fontSize: 48,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: 1,
            opacity: fade,
          }}
        >
          Ai
        </div>
      )}
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 48,
          bottom: 40,
          height: 3,
          background: "#ffffff20",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(100, (f / durationInFrames) * 100)}%`,
            background: gold,
          }}
        />
      </div>
    </div>
  );
};
export const FeatureScene = Interactive.create({
  Component: FeatureInner,
  layout: "absolute-fill",
  schema: {
    title: { type: "string", default: "", description: "Feature title" },
    file: { type: "string", default: "", description: "Recording filename" },
    resultAt: {
      type: "number",
      default: 0,
      hiddenFromList: false,
      description: "Response start in source seconds",
    },
    speed: {
      type: "number",
      default: 1,
      hiddenFromList: false,
      description: "Recording playback speed",
    },
    ai: {
      type: "boolean",
      default: false,
      description: "Show the Ai pill for an AI demonstration",
    },
    mobile: { type: "boolean", default: false, description: "Phone recording" },
  },
});

const TitleInner = ({
  closing = false,
  text = "",
}: {
  closing?: boolean;
  text?: string;
}) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        background: green,
        color: cream,
        fontFamily: "Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: text ? "center" : undefined,
        textAlign: text ? "center" : "left",
        padding: "80px 130px",
      }}
    >
      <svg
        width="850"
        height="850"
        viewBox="0 0 850 850"
        style={{ position: "absolute", right: -120, top: -150, opacity: 0.13 }}
      >
        <circle
          cx="425"
          cy="425"
          r="410"
          fill="none"
          stroke={gold}
          strokeWidth="2"
        />
        <circle
          cx="425"
          cy="425"
          r="310"
          fill="none"
          stroke={gold}
          strokeWidth="2"
        />
        <circle
          cx="425"
          cy="425"
          r="210"
          fill="none"
          stroke={gold}
          strokeWidth="2"
        />
      </svg>
      <div
        style={{
          fontSize: text ? 260 : closing ? 125 : 190,
          fontFamily: "Georgia, serif",
          lineHeight: 1.08,
          letterSpacing: -6,
          maxWidth: 1550,
          opacity: interpolate(f, [0, 16], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      >
        {text || (closing ? "Thoughtful stays. Smarter hosting." : "Stayora.")}
      </div>
    </div>
  );
};
export const TitleScene = Interactive.create({
  Component: TitleInner,
  layout: "absolute-fill",
  schema: {
    closing: { type: "boolean", default: false, description: "Closing card" },
    text: {
      type: "string",
      default: "",
      description: "Full-screen chapter title",
    },
  },
});

const ChapterInner = ({ title }: { title: string }) => (
  <TitleInner text={title} />
);
export const ChapterScene = Interactive.create({
  Component: ChapterInner,
  layout: "absolute-fill",
  schema: {
    title: {
      type: "string",
      default: "Visitors",
      description: "Chapter title",
    },
  },
});

export const Demo = () => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: green }}>
      <Audio
        name="Original ambient score"
        src={staticFile("score.wav")}
        volume={0.3}
      />
      <Track name="Visitor and host journeys - 2 minutes 37 seconds">
        <TitleScene name="Opening" from={0 * fps} durationInFrames={2 * fps} />
        <ChapterScene
          key="visitors-chapter"
          name="Chapter 1 - Visitors"
          from={2 * fps}
          durationInFrames={4 * fps}
          title="Visitors"
        />
        <FeatureScene
          name="Visitors - Discover and save"
          from={6 * fps}
          durationInFrames={12 * fps}
          title="Find your stay."
          file="07-discovery.webm"
          speed={0.77333}
        />
        <FeatureScene
          name="Visitors - Book and view receipt"
          from={18 * fps}
          durationInFrames={13 * fps}
          title="Book with confidence."
          file="09-booking.webm"
          speed={0.53846}
        />
        <FeatureScene
          name="Visitors - AI itinerary after booking"
          from={31 * fps}
          durationInFrames={9 * fps}
          title="Plan your days with AI."
          file="02-ai-itinerary.webm"
          resultAt={10.5}
        />
        <FeatureScene
          name="Visitors - Shared AI assistant"
          from={40 * fps}
          durationInFrames={7 * fps}
          title="A little extra AI help."
          file="06-ai-assistant.webm"
          resultAt={8}
        />
        <FeatureScene
          name="Visitors - Contact your host"
          from={47 * fps}
          durationInFrames={8 * fps}
          title="Talk to your host."
          file="14-messages.webm"
          speed={0.89}
        />
        <FeatureScene
          name="Visitors - AI message suggestion"
          from={55 * fps}
          durationInFrames={7 * fps}
          title="Draft it with AI."
          file="05-ai-message-draft.webm"
          resultAt={3}
        />
        <FeatureScene
          name="Visitors - Review your stay"
          from={62 * fps}
          durationInFrames={5 * fps}
          title="Share your experience."
          file="edits/13-guest-review.mp4"
          speed={0.304}
        />
        <FeatureScene
          name="Visitors - AI rating snapshot"
          from={67 * fps}
          durationInFrames={7 * fps}
          title="See the pattern with AI."
          file="04-ai-review-summary.webm"
          resultAt={3}
        />
        <FeatureScene
          name="Visitors - Cancellation and refund"
          from={74 * fps}
          durationInFrames={6 * fps}
          title="When plans change."
          file="11-refund.webm"
          speed={1.16}
        />
        <FeatureScene
          name="Visitors - Mobile"
          from={80 * fps}
          durationInFrames={3 * fps}
          title="Take your trip with you."
          file="edits/16-visitor-mobile.mp4"
          speed={1.07333}
          mobile
        />
        <ChapterScene
          key="hosts-chapter"
          name="Chapter 2 - Hosts"
          from={83 * fps}
          durationInFrames={4 * fps}
          title="Hosts"
        />
        <FeatureScene
          name="Hosts - Create and manage listings"
          from={87 * fps}
          durationInFrames={11 * fps}
          title="Make your place stand out."
          file="08-listings.webm"
          speed={0.67636}
        />
        <FeatureScene
          name="Hosts - AI listing draft"
          from={98 * fps}
          durationInFrames={9 * fps}
          title="Find the words with AI."
          file="01-ai-description.webm"
          resultAt={4}
        />
        <FeatureScene
          name="Hosts - Confirm a request"
          from={107 * fps}
          durationInFrames={7 * fps}
          title="Welcome your next guest."
          file="10-host-decision.webm"
          speed={1.27429}
        />
        <FeatureScene
          name="Hosts - Calendar and nightly prices"
          from={114 * fps}
          durationInFrames={11 * fps}
          title="Set your availability."
          file="12-calendar.webm"
          speed={0.82182}
        />
        <FeatureScene
          name="Hosts - Performance dashboard"
          from={125 * fps}
          durationInFrames={5 * fps}
          title="Know how you are doing."
          file="17-host-workspace.webm"
          speed={1.6}
        />
        <FeatureScene
          name="Hosts - AI performance insights"
          from={130 * fps}
          durationInFrames={9 * fps}
          title="Go deeper with AI."
          file="03-ai-host-summary.webm"
          resultAt={7}
        />
        <FeatureScene
          name="Hosts - Review your visitors"
          from={139 * fps}
          durationInFrames={5 * fps}
          title="Review your visitors."
          file="edits/13-host-review.mp4"
          speed={0.344}
        />
        <FeatureScene
          name="Hosts - Reputation and counted tags"
          from={144 * fps}
          durationInFrames={6 * fps}
          title="Build your reputation."
          file="edits/13-reputation.mp4"
          speed={0.52}
        />
        <FeatureScene
          name="Hosts - Mobile workspace"
          from={150 * fps}
          durationInFrames={4 * fps}
          title="Host from anywhere."
          file="edits/16-host-mobile.mp4"
          ai
          speed={1.205}
          mobile
        />
        <TitleScene
          name="Closing"
          from={154 * fps}
          durationInFrames={3 * fps}
          closing
        />
      </Track>
    </AbsoluteFill>
  );
};
