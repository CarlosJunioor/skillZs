import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

const path = "/policies";
const title = "skillZs Policies and Catalog Methodology";
const description =
  "Read the skillZs catalog policy, ranking and data methodology, security policy, correction process, and supported API boundaries.";
const updated = "2026-07-15";

export const metadata: Metadata = buildPageMetadata({ title, description, path });

export default function PoliciesPage() {
  const page = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": absoluteUrl(`${path}#policies`),
    name: title,
    description,
    url: absoluteUrl(path),
    dateModified: updated,
    isPartOf: { "@id": absoluteUrl("/#website") },
    about: { "@id": absoluteUrl("/#organization") },
  };

  return (
    <article className="mx-auto max-w-5xl pt-8">
      <JsonLd data={[
        page,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Policies", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">policies</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">
          public rules / reproducible methods / visible limits
        </div>
        <h1 className="display max-w-5xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          policies<br /><span className="text-[var(--color-grape)]">in public.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          These rules describe what skillZs lists, how rankings and catalog counts are produced, what security information means, and how corrections are handled. They are product commitments, not claims that every upstream record has been independently reviewed.
        </p>
        <p className="type-font mt-4 text-xs text-[var(--color-rust)]">
          Effective and last updated <time dateTime={updated}>July 15, 2026</time>.
        </p>
      </header>

      <nav aria-label="Policy sections" className="my-8 grid gap-3 sm:grid-cols-3">
        {[
          ["#catalog-policy", "Catalog policy"],
          ["#methodology", "Methodology"],
          ["#security-policy", "Security policy"],
        ].map(([href, label]) => (
          <a key={href} href={href} className="tag-pill text-center">{label}</a>
        ))}
      </nav>

      <div className="prose-zine type-font max-w-none leading-relaxed">
        <section id="catalog-policy">
          <h2>Catalog policy</h2>
          <h3>What is eligible for display?</h3>
          <p>
            skillZs displays Agent Skill records returned by the supported public <a href="https://www.skills.sh/docs/api" target="_blank" rel="noreferrer">skills.sh API</a>. A record must remain available through that API and retain enough source identity for a user to inspect its repository or domain. skillZs does not currently accept direct uploads or paid submissions.
          </p>
          <p>
            Upstream availability is not an endorsement. Being listed does not mean approved, safe, or endorsed by skillZs. It means the record is discoverable through the supported upstream catalog contract.
          </p>

          <h3>What can be excluded or de-emphasized?</h3>
          <ul>
            <li>Records removed or hidden by the upstream service stop appearing when its API stops returning them.</li>
            <li>Records explicitly flagged as duplicates are omitted from the public sitemap.</li>
            <li>Unavailable detail records are not replaced with scraped or guessed content.</li>
            <li>Paid placement does not change leaderboard order.</li>
          </ul>

          <h3>How are corrections handled?</h3>
          <p>
            Source ownership, install counts, duplicate flags, and audit results originate upstream. Report those errors through the <a href="https://www.skills.sh/contact" target="_blank" rel="noreferrer">skills.sh correction process</a>. Report a skillZs rendering, copy, categorization, or broken-link error to the <a href="https://github.com/CarlosJunioor" target="_blank" rel="noreferrer">site operator</a>. Include the listing URL, expected result, evidence, and whether the report contains sensitive information. The application does not yet offer a public issue tracker or contact form.
          </p>
        </section>

        <section id="methodology">
          <h2>Methodology</h2>
          <h3>What does the catalog count mean?</h3>
          <p>
            The number displayed by skillZs is the <strong>API-enumerable leaderboard</strong> total returned in <code>pagination.total</code>. It is not a claim about every raw, discovered, duplicated, rejected, private, or otherwise non-enumerable skill that may exist in a wider upstream index. If skills.sh displays a broader all-time counter, skillZs does not relabel that counter as downloadable inventory.
          </p>

          <h3>How are rankings calculated?</h3>
          <p>
            All-time, trending, and hot ordering come from the corresponding upstream API views. skillZs does not add editorial boosts or sell ranking positions. Install telemetry measures reported adoption, not correctness, maintenance, compatibility, or task fit.
          </p>

          <h3>What does skillZs transform?</h3>
          <ul>
            <li>Source identity, install counts, files, duplicate flags, and audit responses come from skills.sh.</li>
            <li>Lightweight topic labels may be inferred from names and descriptions for navigation.</li>
            <li>Guides and research pages add editorial explanation and identify their sources and update dates.</li>
            <li>Browse results are cached briefly for reliability and to respect upstream limits, so short delays are expected.</li>
          </ul>

          <h3>Which API does skillZs use?</h3>
          <p>
            <strong>Yes: skillZs already uses the same documented public API contract that Vercel provides to third parties.</strong> Production calls the <code>/api/v1/</code> endpoints with Vercel OIDC authentication. The listing endpoint provides the pageable leaderboard; search can query the wider corpus but returns at most 200 results for a query and has no cursor for bulk enumeration.
          </p>
          <p>
            <strong>No: the supported API does not currently provide a bulk export of the broader advertised corpus.</strong> The skills.sh website also calls undocumented internal routes such as <code>/api/skills/...</code>. In a July 15, 2026 check, those routes returned the same smaller pageable leaderboard total. They have no published compatibility contract, so skillZs does not depend on them.
          </p>
          <p>
            The supported API permits reasonable cached use subject to its published rate limits and terms. skillZs does not bypass rate limits or scrape around missing API coverage. See the <a href="https://www.skills.sh/terms" target="_blank" rel="noreferrer">skills.sh terms</a> and <a href="https://www.skills.sh/docs/api" target="_blank" rel="noreferrer">API reference</a>.
          </p>
        </section>

        <section id="security-policy">
          <h2>Security policy</h2>
          <h3>What does a listing or audit mean?</h3>
          <p>
            A listing is a discovery record, not a security certification. When skills.sh supplies partner audit results, skillZs displays their provider, verdict, and summary. A pass can reduce known risk for the audited revision; it cannot guarantee future updates, runtime permissions, external inputs, dependencies, or agent behavior.
          </p>

          <h3>What does skillZs promise?</h3>
          <ul>
            <li>Preserve source links so users can inspect provenance.</li>
            <li>Do not describe popularity or an audit pass as proof of safety.</li>
            <li>Do not silently execute third-party skill code on behalf of visitors.</li>
            <li>Honor upstream removals through normal catalog refreshes.</li>
            <li>Tell users to inspect source, instructions, scripts, dependencies, data access, and permissions before installation.</li>
          </ul>

          <h3>How should security issues be reported?</h3>
          <p>
            For a malicious or compromised third-party skill, preserve the exact source URL and revision, stop using it, rotate exposed credentials, and report it to the source host and <a href="https://www.skills.sh/contact" target="_blank" rel="noreferrer">skills.sh</a>. skillZs does not yet have a dedicated private vulnerability-reporting channel. Do not publish secrets, working exploits, or personal data. Contact the <a href="https://github.com/CarlosJunioor" target="_blank" rel="noreferrer">site operator</a> without sensitive details to request a secure reply path.
          </p>
          <p>
            Reports should include impact, affected URL or revision, reproduction steps, and a safe contact path. A dedicated disclosure address should be added when the project opens a public support channel.
          </p>
        </section>
      </div>
    </article>
  );
}
