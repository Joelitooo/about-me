import { About } from "../sections/About.js";
import { Hero } from "../sections/Hero.js";
import { Work } from "../sections/Work.js";

export function Home() {
  return (
    <>
      <Hero />
      <About />
      <Work />
    </>
  );
}
