import SmoothScroll from "@/components/SmoothScroll";
import Preloader from "@/components/Preloader";
import Cursor from "@/components/Cursor";
import Nav from "@/components/Nav";
import ScrollIndex from "@/components/ScrollIndex";
import ChapterTracker from "@/components/ChapterTracker";

import Hero from "@/sections/Hero";
import Between from "@/sections/Between";
import Curtain from "@/sections/Curtain";
import Reel from "@/sections/Reel";
import Matter from "@/sections/Matter";
import Archive from "@/sections/Archive";
import Composition from "@/sections/Composition";
import Weight from "@/sections/Weight";
import Motion from "@/sections/Motion";
import Passage from "@/sections/Passage";
import Notes from "@/sections/Notes";
import Still from "@/sections/Still";

// Eleven movements in one take. The order matters more than any single
// section: white, black, white, with the ground colour cut across the
// frame at every join rather than just changing between them.
export default function Page() {
  return (
    <>
      <SmoothScroll />
      <Preloader />
      <Cursor />
      <Nav />
      <ScrollIndex />
      <ChapterTracker />

      <main className="relative">
        <Hero />
        <Between />

        <Curtain
          word="TIGHT"
          from="paper"
          to="ink"
          plate="flat"
          note="Tracking as distance"
          dir="right"
          spread={1.1}
        />

        <Reel />

        <Curtain
          word="TURN"
          from="ink"
          to="paper"
          plate="dial"
          dir="left"
          spread={0.95}
        />

        <Matter />

        <Curtain
          word="HELD"
          from="paper"
          to="paper"
          plate="carry"
          note="Interval"
          dir="left"
          spread={0.85}
        />

        <Archive />

        <Curtain
          word="RELEASE"
          from="paper"
          to="ink"
          plate="salve"
          dir="right"
          spread={0.8}
        />

        <Composition />
        <Weight />
        <Motion />
        <Passage />
        <Notes />

        <Curtain
          word="SILENCE"
          from="ink"
          to="paper"
          plate="relief"
          dir="left"
          spread={0.9}
        />

        <Still />
      </main>
    </>
  );
}
