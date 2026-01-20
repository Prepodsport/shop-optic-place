import "./About.css";
import CmsPage from "./CmsPage.jsx";

export default function About() {
  return (
    <CmsPage
      slug="about"
      className="about"
      containerClass="about__container"
      titleClass="about__title"
      sectionClass="about__section"
      listClass="about__list"
    />
  );
}
