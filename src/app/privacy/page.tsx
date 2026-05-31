import Link from "next/link";

export const metadata = {
  title: "Privacy — sobrandsteady",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card px-6 py-3">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight"
        >
          sobrandsteady
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Privacy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Plain English. Last updated when you read this commit. (Version of
          May 30, 2026.)
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
          <Section title="What we store">
            <p>
              When you use sobrandsteady, we store the account details you give us
              (name, email, username, hashed password), your sobriety status
              and optional sobriety date, your framework preference, hobbies
              and substance disclosures, your daily check-ins (mood, energy,
              cravings, and any journal entry you write), and the full text
              of your chat conversations with the AI companion.
            </p>
            <p>
              We also store automated crisis-risk flags. An automated
              classifier scores the risk in your messages, and when it reads
              a message as high risk we record a short-lived flag (described
              under Crisis disclosures below).
            </p>
          </Section>

          <Section title="The waitlist">
            <p>
              If you join our waitlist before you have an account, we store only
              what you give us on that page: your email address, your first name
              if you share it, and an optional note. We use it to reach out when
              a spot opens up. It is not linked to an app account, we do not send
              it to Anthropic, and we do not use it for advertising.
            </p>
            <p>
              Want off the list? Email us at{" "}
              <a
                href="mailto:hello@sobrandsteady.com"
                className="underline underline-offset-2 hover:text-foreground"
              >
                hello@sobrandsteady.com
              </a>{" "}
              and we will remove you.
            </p>
          </Section>

          <Section title="Where it lives">
            <p>
              All of the above is stored in a managed Postgres database hosted
              in the United States. The database provider encrypts data at
              rest by default. Your conversations and journal entries are
              stored as plain text in the database — they are not separately
              encrypted by the app.
            </p>
            <p>
              That means if someone got read access to the database, they
              could read your conversations. We work to prevent that, but you
              should know it&apos;s where the trust boundary is.
            </p>
          </Section>

          <Section title="Who can read your data">
            <p>
              sobrandsteady is operated by Tim Long. Right now, the database is
              accessible to me as the operator for maintenance and debugging.
              I do not actively read your conversations, but I have technical
              access to them.
            </p>
            <p>
              As the team grows, we&apos;ll publish our internal access
              policies. If you want a version of sobrandsteady where even the operator
              cannot read your messages, that&apos;s not what V1 is — but
              it&apos;s on the roadmap.
            </p>
          </Section>

          <Section title="What gets sent to Anthropic">
            <p>
              The chat feature is powered by Anthropic&apos;s Claude. When
              you send a message, the following gets transmitted to
              Anthropic&apos;s servers for inference:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Your message</li>
              <li>Recent conversation history</li>
              <li>
                Context from your profile (preferred name, sobriety status
                and date, framework, substances, hobbies) and your last few
                check-ins
              </li>
            </ul>
            <p>
              Anthropic does not train their models on this data. They retain
              inputs and outputs for up to 30 days for trust and safety
              review, after which they delete it. Anthropic processes this
              data on US-based infrastructure. Anthropic&apos;s terms govern
              their handling.
            </p>
          </Section>

          <Section title="What we do NOT do">
            <ul className="list-disc space-y-1 pl-5">
              <li>We do not sell your data.</li>
              <li>We do not use analytics or behavioral tracking.</li>
              <li>
                We do not run third-party error monitoring on your
                conversations.
              </li>
              <li>We do not share your data with advertisers.</li>
            </ul>
          </Section>

          <Section title="Crisis disclosures">
            <p>
              sobrandsteady is not a crisis service. If you&apos;re in immediate
              danger, please contact 988 (Suicide & Crisis Lifeline), text
              HOME to 741741, or call 911.
            </p>
            <p>
              If you disclose a crisis to sobrandsteady, that disclosure is stored in
              the same database as the rest of your conversations. We are
              not a HIPAA-covered healthcare provider, and your conversations
              here do not have the same legal protections as a session with
              a licensed therapist or doctor. Your records could be subject
              to legal process. We are obligated to comply with valid legal
              requests and will notify you when we are permitted to do so.
            </p>
            <p>
              To help the companion respond well, an automated classifier
              reviews each message, along with recent context from the same
              conversation, to gauge risk. The same recent context is already
              sent to Anthropic for the main reply. When the classifier reads a
              message as high risk, we store a small flag: the risk level and
              category, the classifier&apos;s confidence and model version, and
              a link to the message. The flag does not copy your message text.
              These flags are deleted automatically after 14 days, and they are
              removed immediately if you delete your account.
            </p>
          </Section>

          <Section title="Your data, your control">
            <p>
              You can delete your account at any time from the Settings page.
              When you delete your account, your profile, check-ins, and chat
              history are removed from our database immediately. Backups
              managed by our hosting provider may retain copies temporarily
              under their standard retention policy before being overwritten.
            </p>
          </Section>

          <Section title="When this changes">
            <p>
              If we change how we handle your data, we&apos;ll update this
              page and notify you the next time you log in. For meaningful
              changes — new data we collect, new third parties we share with
              — we&apos;ll give you the chance to delete your account before
              the change takes effect.
            </p>
          </Section>

          <Section title="Questions">
            <p>
              If you have questions about how we handle your data, email{" "}
              <a
                href="mailto:privacy@sobrandsteady.com"
                className="underline underline-offset-2 hover:text-foreground"
              >
                privacy@sobrandsteady.com
              </a>
              . We try to respond within 2 business days.
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t pt-6 text-sm">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to sobrandsteady
          </Link>
        </div>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="font-heading text-lg font-medium">{title}</h2>
      <div className="space-y-3 text-foreground/80">{children}</div>
    </section>
  );
}
