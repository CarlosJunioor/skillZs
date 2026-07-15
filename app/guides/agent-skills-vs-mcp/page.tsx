import type { Metadata } from "next";
import { JsonLd } from "@/components/json-ld";
import { MotionLink } from "@/components/motion/motion-link";
import { absoluteUrl, breadcrumbJsonLd, buildPageMetadata, siteConfig } from "@/lib/seo";

const path = "/guides/agent-skills-vs-mcp";
const title = "Agent Skills vs MCP: What Is the Difference?";
const description =
  "Compare Agent Skills and Model Context Protocol by purpose, architecture, portability, security, and use case. Learn when to use either or both.";
const published = "2026-07-15";

const faqs = [
  { question: "Do Agent Skills replace MCP servers?", answer: "No. Skills package reusable instructions and supporting resources, while MCP standardizes how an AI application connects to external tools, data, and prompt templates. They solve different layers of the system." },
  { question: "Can an agent skill use MCP tools?", answer: "Yes. A skill can define the procedure for selecting and combining tools exposed through one or more MCP servers, including validation, approval, and finish conditions." },
  { question: "Is MCP only for tools?", answer: "No. MCP servers can expose tools, resources, and prompts. Tools perform actions, resources provide context, and prompts provide reusable interaction templates." },
  { question: "Which is easier to share?", answer: "A file-only skill is usually simpler to inspect and copy. An MCP integration may require a running local or remote server, authentication, network access, and client configuration." },
  { question: "Which option is safer?", answer: "Neither is safe by category. Risk depends on instructions, code, permissions, data access, network boundaries, authentication, and user approval. Apply least privilege to both." },
];

export const metadata: Metadata = buildPageMetadata({ title, description, path, type: "article" });

export default function AgentSkillsVsMcpGuide() {
  const article = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "@id": absoluteUrl(`${path}#article`),
    headline: title,
    description,
    url: absoluteUrl(path),
    datePublished: published,
    dateModified: published,
    author: { "@id": absoluteUrl("/#organization") },
    publisher: { "@id": absoluteUrl("/#organization") },
    mainEntityOfPage: absoluteUrl(path),
    proficiencyLevel: "Beginner",
  };
  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <article className="mx-auto max-w-5xl pt-8">
      <JsonLd data={[
        article,
        faq,
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Guides", path: "/guides" },
          { name: "Agent Skills vs MCP", path },
        ]),
      ]} />

      <nav aria-label="Breadcrumb" className="type-font mb-6 text-xs text-[var(--color-rust)]">
        <ol className="flex flex-wrap gap-2">
          <li><MotionLink href="/" className="hover:text-[var(--color-grape)]">skillZs</MotionLink></li>
          <li aria-hidden>/</li>
          <li><MotionLink href="/guides" className="hover:text-[var(--color-grape)]">guides</MotionLink></li>
          <li aria-hidden>/</li>
          <li aria-current="page">Agent Skills vs MCP</li>
        </ol>
      </nav>

      <header className="border-b border-[#29313a] pb-10">
        <div className="tag-font mb-5 text-xs uppercase tracking-[0.16em] text-[var(--color-grape)]">field guide / architecture choice</div>
        <h1 className="display max-w-5xl text-5xl leading-[0.9] sm:text-7xl md:text-8xl">
          agent skills<br /><span className="text-[var(--color-grape)]">vs MCP.</span>
        </h1>
        <p className="type-font mt-8 max-w-3xl text-base leading-7 text-[var(--color-ink-soft)]">
          Agent Skills package reusable procedural knowledge in a portable folder; MCP standardizes a live connection between an AI application and external tools, data, or prompt templates. Use a skill to teach an agent how to perform a workflow, use MCP to expose capabilities and context, and combine them when a repeatable procedure depends on connected systems.
        </p>
        <p className="type-font mt-4 text-xs text-[var(--color-rust)]">Written and checked by <MotionLink href="/about">{siteConfig.name}</MotionLink>. <time dateTime={published}>Updated July 15, 2026.</time></p>
      </header>

      <div className="prose-zine type-font mt-10 max-w-none leading-relaxed">
        <section id="difference">
          <h2>What is the difference between Agent Skills and MCP?</h2>
          <p>
            An Agent Skill is a directory with a required <code>SKILL.md</code> and optional scripts, references, and assets. Its metadata helps a compatible client decide when to load the full instructions. It is primarily a distribution format for repeatable expertise and workflows.
          </p>
          <p>
            Model Context Protocol is an open client-server protocol. An MCP host creates a client connection to each MCP server, negotiates capabilities, and exchanges structured messages. Servers can expose executable tools, contextual resources, and reusable prompt templates. They may run locally over standard input/output or remotely over HTTP.
          </p>
        </section>

        <section id="comparison">
          <h2>How do Agent Skills and MCP compare?</h2>
          <div className="overflow-x-auto">
            <table>
              <thead><tr><th>Question</th><th>Agent Skills</th><th>MCP</th></tr></thead>
              <tbody>
                <tr><td>Primary job</td><td>Teach a repeatable procedure or domain method</td><td>Connect an AI application to external capabilities and context</td></tr>
                <tr><td>Main unit</td><td>Folder with <code>SKILL.md</code> and optional files</td><td>Host, client, server, and protocol messages</td></tr>
                <tr><td>Discovery</td><td>Client reads skill metadata and loads matching instructions</td><td>Client lists server tools, resources, and prompts dynamically</td></tr>
                <tr><td>Runtime</td><td>Usually file-based; scripts run through client tools</td><td>Requires a connected local or remote server</td></tr>
                <tr><td>State and data</td><td>Bundled references or data available through client tools</td><td>Can provide live data and actions from external systems</td></tr>
                <tr><td>Distribution</td><td>Copy, install, or version a folder</td><td>Configure and authenticate a server connection</td></tr>
                <tr><td>Typical risk</td><td>Malicious instructions, scripts, dependencies, or updates</td><td>Overpowered tools, data exposure, server trust, auth, and network risk</td></tr>
                <tr><td>Best example</td><td>A tested pull-request review method</td><td>Reading issues and updating pull requests through an API</td></tr>
              </tbody>
            </table>
          </div>
          <p>
            The shorthand &quot;skills are instructions, MCP is tools&quot; is useful but incomplete. Skills can include scripts and assets. MCP can expose prompts and resources as well as tools. The durable distinction is package versus protocol: one distributes a workflow; the other establishes a structured connection.
          </p>
        </section>

        <section id="choose-skills">
          <h2>When should you use an Agent Skill?</h2>
          <ul>
            <li>The agent already has the necessary tools, but needs a reliable method for using them.</li>
            <li>The workflow has ordered steps, quality checks, examples, or an output contract.</li>
            <li>You want a readable artifact that can be versioned, reviewed, and shared across compatible clients.</li>
            <li>The supporting knowledge is small enough to bundle as references, templates, or deterministic scripts.</li>
          </ul>
          <p>
            Examples include a brand editing guide, incident triage checklist, release process, spreadsheet analysis method, or document template. The <MotionLink href="/guides/how-to-create-agent-skills">creation guide</MotionLink> shows how to turn one focused job into a valid portable folder.
          </p>
        </section>

        <section id="choose-mcp">
          <h2>When should you use MCP?</h2>
          <ul>
            <li>The agent needs live records from a database, SaaS product, filesystem, or internal service.</li>
            <li>The capability should expose typed arguments and results instead of relying on shell or prose conventions.</li>
            <li>Authentication, capability discovery, connection lifecycle, or remote execution belongs at the integration layer.</li>
            <li>Several AI applications should connect to the same server through a standard protocol.</li>
          </ul>
          <p>
            Examples include querying Sentry, reading a design from Figma, searching an enterprise knowledge system, or updating a calendar. An MCP server should expose focused capabilities; it does not need to encode every business workflow that uses them.
          </p>
        </section>

        <section id="combine">
          <h2>How can an Agent Skill and MCP work together?</h2>
          <p>
            Use MCP to provide the nouns and verbs, then use a skill to define the method. A release skill might query issues, inspect deployments, and update a changelog through MCP tools. The skill decides the order, required evidence, approval points, failure behavior, and finish condition; the servers provide current data and authorized actions.
          </p>
          <pre><code>{`User request
  -> skill selected from its description
  -> skill defines the release checklist
  -> MCP resource supplies current deployment state
  -> MCP tools query issues and create the release
  -> skill verifies results and stops`}</code></pre>
          <p>
            Keep the boundary explicit. Name required servers and capabilities in the skill, handle missing tools, require approval for consequential writes, and never assume that a successful tool call proves the workflow outcome.
          </p>
        </section>

        <section id="security">
          <h2>Which security model should you use for both?</h2>
          <p>
            Apply least functionality, least permission, and least autonomy. Review a skill&apos;s instructions and code; review an MCP server&apos;s operator, source, authentication, scopes, transport, and data boundary. Require human confirmation for destructive or external actions, isolate untrusted content, log sensitive operations, and test with non-production credentials first.
          </p>
          <p>
            Use the <MotionLink href="/guides/agent-skill-security">security review checklist</MotionLink> before installing third-party content, the <MotionLink href="/guides/how-to-install-agent-skills">installation guide</MotionLink> for client paths, or <MotionLink href="/browse">browse agent skills</MotionLink> by source and use case. The <MotionLink href="/loops">loop library</MotionLink> also shows why explicit stop conditions matter in tool-using workflows.
          </p>
        </section>

        <section id="faq">
          <h2>What do developers ask about Agent Skills and MCP?</h2>
          {faqs.map((item) => <div key={item.question}><h3>{item.question}</h3><p>{item.answer}</p></div>)}
        </section>

        <section id="sources">
          <h2>Which specifications define Agent Skills and MCP?</h2>
          <p>
            This comparison uses the <a href="https://agentskills.io/specification" target="_blank" rel="noreferrer">Agent Skills specification</a>, the official <a href="https://modelcontextprotocol.io/docs/getting-started/intro" target="_blank" rel="noreferrer">MCP introduction</a>, and the <a href="https://modelcontextprotocol.io/docs/learn/architecture" target="_blank" rel="noreferrer">MCP architecture documentation</a>. Check product-specific documentation for the capabilities, transports, and skill fields supported by your current client.
          </p>
        </section>
      </div>
    </article>
  );
}
