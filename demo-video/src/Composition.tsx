import { Composition } from "remotion";
import { Demo, FeatureScene, TitleScene, ChapterScene } from "./Demo";

export const MyComposition = () => (
  <>
    <Composition
      id="StayoraDemo"
      component={Demo}
      durationInFrames={4710}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="FeatureScene"
      component={FeatureScene}
      durationInFrames={330}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{
        title: "A little inspiration.",
        file: "01-ai-description.webm",
        resultAt: 4,
        mobile: false,
      }}
    />
    <Composition
      id="ChapterScene"
      component={ChapterScene}
      durationInFrames={120}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ title: "Visitors" }}
    />
    <Composition
      id="TitleScene"
      component={TitleScene}
      durationInFrames={120}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={{ closing: false }}
    />
  </>
);
