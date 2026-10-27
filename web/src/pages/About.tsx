import { Icons } from "../components/Art";
import { PageHero, REPO_URL, STREAMLIT_URL } from "../components/Shell";
import { useT } from "../components/ui";
import { href } from "../lib/router";
import { PHOTO_CREDITS } from "../lib/photos";

const SOURCES = [
  { name: "Kaggle — NBA/ABA/BAA stats", url: "https://www.kaggle.com/datasets/sumitrodatta/nba-aba-baa-stats" },
  { name: "Kaggle — NBA players' first-two-year averages", url: "https://www.kaggle.com/datasets/yhsarawang/nba-players-first-two-year-average-data" },
  { name: "Basketball-Reference / Sports-Reference (draft & college)", url: "https://www.basketball-reference.com/" },
];

export default function About() {
  const tr = useT();
  return (
    <>
      <PageHero kicker={tr("nav_about")} title={tr("page_about_t")} desc={tr("page_about_d")}>
        <div className="hero-ctas">
          <a className="btn btn-accent" href={REPO_URL} target="_blank" rel="noreferrer"><Icons.github size={18} /> GitHub</a>
        </div>
      </PageHero>
      <div className="container page-body narrow">
        <div className="about-grid">
          <section className="card">
            <h2 className="h3">{tr("about_comp_t")}</h2>
            <p>{tr("about_comp_body")}</p>
          </section>
          <section className="card">
            <h2 className="h3">{tr("about_open_t")}</h2>
            <p>{tr("about_open_body")}</p>
            <a className="link-arrow" href={REPO_URL} target="_blank" rel="noreferrer">GitHub <Icons.arrow size={16} /></a>
          </section>
          <section className="card">
            <h2 className="h3">{tr("about_stack_t")}</h2>
            <p>{tr("about_stack_body")}</p>
          </section>
          <section className="card">
            <h2 className="h3">{tr("about_live_t")}</h2>
            <p>{tr("about_live_body")}</p>
            <a className="link-arrow" href={STREAMLIT_URL} target="_blank" rel="noreferrer">Streamlit <Icons.arrow size={16} /></a>
          </section>
        </div>

        <section className="chapter">
          <h2 className="h3">{tr("about_data_t")}</h2>
          <a className="link-arrow" style={{ marginTop: 0 }} href={href("references")}>{tr("refs_link")} <Icons.arrow size={16} /></a>
          <ul className="caveats">
            {SOURCES.map((s) => <li key={s.url}><a href={s.url} target="_blank" rel="noreferrer">{s.name}</a></li>)}
          </ul>
        </section>

        {PHOTO_CREDITS.length > 0 && (
          <section className="chapter">
            <h2 className="h3">{tr("about_photos_t")}</h2>
            <ul className="caveats">
              {PHOTO_CREDITS.map((c) => (
                <li key={c.file}><a href={c.url} target="_blank" rel="noreferrer">{c.author}</a> · {c.source} · {c.license}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="chapter">
          <h2 className="h3">{tr("about_limits_t")}</h2>
          <ul className="caveats">
            {[4, 1, 2, 3].map((i) => <li key={i}>{tr(`about_limit_${i}`)}</li>)}
          </ul>
        </section>
      </div>
    </>
  );
}
