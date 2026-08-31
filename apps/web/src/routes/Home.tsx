import { About } from "../sections/About.js";
import { Contact } from "../sections/Contact.js";
import { Hero } from "../sections/Hero.js";
import { Work } from "../sections/Work.js";

export function Home() {
  return (
    <>
      <Hero />
      <About />
      <Work />
      <Contact />
    </>
  );
}
