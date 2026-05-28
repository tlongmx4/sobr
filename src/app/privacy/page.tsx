import Link from "next/link";

export const metadata = {
  title: "Privacy — sobr",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b bg-card px-6 py-3">
        <Link
          href="/"
          className="font-heading text-lg font-semibold tracking-tight"
        >
          sobr
        </Link>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Privacy
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Plain English. Last updated when you read this commit.
        </p>

        <div className="mt-10 space-y-8 text-[15px] leading-relaxed">
          <Section title="What we store">
            <p>
              When you use sobr, we store the account details you give us
              (name, email, username, hashed password), your sobriety status
              and optional sobriety date, your framework preference, hobbies
              and substance disclosures, your daily check-ins (mood, energy,
              cravings, and any journal entry you write), and the full text
              of your chat conversations with the AI companion.
            </p>
          </Section>

          <Section title="Where it lives">
            <p>
              All of the above is stored in a managed Postgres database. The
              database provider encrypts data at rest by default. Your
              conversations and journal entries are stored as plain text in
              the database — they are not separately encrypted by the app.
            </p>
            <p>
              That means if someone got read access to the database, they
              could read your conversations. We work to prevent that, but you
              should know it&apos;s where the trust boundary is.
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
              review, after which they delete it. Anthropic&apos;s terms
              govern their handling.
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
              sobr is not a crisis service. If you&apos;re in immediate
              danger, please contact 988 (Suicide & Crisis Lifeline), text
              HOME to 741741, or call 911.
            </p>
            <p>
              If you disclose a crisis to sobr, that disclosure is stored in
              the same database as the rest of your conversations. We are
              not legally protected as a healthcare provider, and your
              records could be subject to legal process. We are obligated to
              comply with valid legal requests and will notify you when we
              are permitted to do so.
            </p>
          </Section>

          <Section title="Your data, your control">
            <p>
              You can delete your account at any time from the Settings page.
              When you delete your account, your profile, check-ins, and chat
              history are removed from our database immediately. Backups may
              retain copies for up to 30 days before being overwritten.
            </p>
          </Section>

          <Section title="Questions">
            <p>
              Reach out to the person who invited you to sobr if you have
              questions or want to know more about how we handle your data.
            </p>
          </Section>
        </div>

        <div className="mt-12 border-t pt-6 text-sm">
          <Link
            href="/"
            className="text-muted-foreground hover:text-foreground"
          >
            ← Back to sobr
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
