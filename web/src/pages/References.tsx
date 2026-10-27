import { PageHero } from "../components/Shell";
import { Section, useT } from "../components/ui";
import { REPORT_REFERENCES, SITE_SOURCES, type Ref } from "../lib/references";

function RefList({ items }: { items: Ref[] }) {
  return (
    <ol className="refs">
      {items.map((r) => (
        <li key={r.text}>
          {r.text}{" "}
          {r.url && <a href={r.url} target="_blank" rel="noreferrer">{r.url}</a>}
        </li>
      ))}
    </ol>
  );
}

export default function References() {
  const tr = useT();
  return (
    <>
      <PageHero kicker={tr("nav_refs")} title={tr("page_refs_t")} desc={tr("page_refs_d")} />
      <div className="container page-body narrow">
        <Section title={tr("refs_report_t")} caption={tr("refs_report_d")}>
          <RefList items={REPORT_REFERENCES} />
        </Section>
        <Section title={tr("refs_site_t")} caption={tr("refs_site_d")}>
          <RefList items={SITE_SOURCES} />
        </Section>
      </div>
    </>
  );
}
