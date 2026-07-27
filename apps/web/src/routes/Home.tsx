import { About } from "../sections/About.js";
import { Contact } from "../sections/Contact.js";
import { Hero } from "../sections/Hero.js";
import { Projects } from "../sections/Projects.js";
import { Resume } from "../sections/Resume.js";
import { Skills } from "../sections/Skills.js";

export function Home() {
  return (
    <>
      <Hero />
      <About />
      <Skills />
      <Projects />
      <Resume />
      <Contact />
    </>
  );
}
