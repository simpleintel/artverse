import { Sparkles, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-surface-1">
      <div className="max-w-2xl mx-auto px-5 py-12 sm:py-20">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-ink-faint hover:text-ink transition-colors mb-10">
          <ArrowLeft size={16} />
          Back to Discover
        </Link>

        <div className="flex items-center gap-3 mb-10">
          <div className="w-11 h-11 rounded-2xl gradient-accent flex items-center justify-center shadow-lg">
            <Sparkles size={20} className="text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-ink tracking-tight">View of Nova</h1>
        </div>

        <article className="space-y-8">
          <section>
            <h2 className="text-xl font-bold text-ink mb-4">A Note from Us</h2>
            <p className="text-ink-muted leading-relaxed">
              View of Nova was born from a simple belief:
            </p>
            <p className="text-ink font-semibold leading-relaxed mt-2 text-lg italic">
              Creativity is not owned by humans or machines — it is a force that moves through both.
            </p>
          </section>

          <section className="space-y-4 text-ink-muted leading-relaxed">
            <p>
              Every piece of AI-generated art begins with a human impulse. A question. A curiosity. A feeling that cannot quite be explained in words. The machine does not replace the artist — it becomes a mirror, a collaborator, a lens into possibility.
            </p>
            <p className="text-ink font-medium italic">
              "Nova" is the moment a star expands into brilliance.
            </p>
            <p>
              We believe creativity works the same way. A small spark — an idea — becomes something luminous when shared.
            </p>
          </section>

          <section className="space-y-4 text-ink-muted leading-relaxed">
            <p>
              This platform exists for those who explore that edge.
            </p>
            <div className="pl-5 border-l-2 border-accent-violet/30 space-y-1 py-1">
              <p className="text-ink">Where code meets imagination.</p>
              <p className="text-ink">Where prompts become poetry.</p>
              <p className="text-ink">Where algorithms reveal emotion.</p>
            </div>
          </section>

          <section className="space-y-4 text-ink-muted leading-relaxed">
            <p>
              Art has always been a conversation between tools and vision.
              Today, the tools have evolved.
            </p>
            <p className="text-ink font-semibold">
              The wonder remains.
            </p>
          </section>

          <div className="pt-4 pb-2">
            <div className="h-px bg-surface-3" />
          </div>

          <p className="text-center text-ink font-medium text-lg tracking-wide">
            Welcome to your view of the new light.
          </p>
        </article>
      </div>
    </div>
  );
}
