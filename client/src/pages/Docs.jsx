import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Book, Loader2, Copy, Check, Sparkles } from 'lucide-react';
import api from '../api';

export default function Docs() {
  const [markdown, setMarkdown] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);

  useEffect(() => {
    api.get('/docs', { transformResponse: [(d) => d] })
      .then(({ data }) => setMarkdown(data))
      .catch(() => setMarkdown('# Failed to load documentation'))
      .finally(() => setLoading(false));
  }, []);

  const copyCode = (code, idx) => {
    navigator.clipboard.writeText(code);
    setCopied(idx);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={24} className="animate-spin text-accent-violet" />
      </div>
    );
  }

  let codeIdx = 0;

  return (
    <div className="max-w-[820px] mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl gradient-accent flex items-center justify-center shrink-0">
          <Book size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2">
            API Documentation
            <Sparkles size={18} className="text-accent-violet" />
          </h1>
          <p className="text-sm text-ink-faint">Everything you need to integrate with ArtVerse</p>
        </div>
      </div>

      {/* Markdown content */}
      <article className="prose-artverse">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl font-extrabold mb-6 pb-3 border-b-2 border-surface-3">{children}</h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-xl font-bold mt-10 mb-4 pb-2 border-b border-surface-3 text-ink">{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base font-bold mt-6 mb-2 text-ink flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-violet inline-block" />
                {children}
              </h3>
            ),
            p: ({ children }) => <p className="text-sm text-ink-light leading-relaxed mb-3">{children}</p>,
            a: ({ href, children }) => (
              <a href={href} className="text-accent-violet hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
            ),
            strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
            table: ({ children }) => (
              <div className="overflow-x-auto mb-4 rounded-xl border border-surface-3">
                <table className="w-full text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }) => <thead className="bg-surface-2">{children}</thead>,
            th: ({ children }) => <th className="text-left px-4 py-2.5 text-xs font-bold text-ink-muted uppercase tracking-wider">{children}</th>,
            td: ({ children }) => <td className="px-4 py-2.5 text-sm text-ink-light border-t border-surface-3">{children}</td>,
            ul: ({ children }) => <ul className="list-disc list-inside text-sm text-ink-light mb-3 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal list-inside text-sm text-ink-light mb-3 space-y-1">{children}</ol>,
            li: ({ children }) => <li className="text-sm">{children}</li>,
            hr: () => <hr className="my-8 border-surface-3" />,
            code: ({ inline, className, children }) => {
              const text = String(children).replace(/\n$/, '');
              if (inline) {
                return <code className="bg-surface-2 text-accent-violet px-1.5 py-0.5 rounded text-[13px] font-mono">{text}</code>;
              }
              const thisIdx = codeIdx++;
              return (
                <div className="relative group mb-4">
                  <div className="absolute right-2 top-2 z-10">
                    <button onClick={() => copyCode(text, thisIdx)}
                      className="flex items-center gap-1 text-[11px] bg-surface-0/90 backdrop-blur-sm border border-surface-3 rounded-md px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity text-ink-faint hover:text-ink">
                      {copied === thisIdx ? <><Check size={11} className="text-green-500" /> Copied</> : <><Copy size={11} /> Copy</>}
                    </button>
                  </div>
                  <pre className="bg-[#1e1e2e] text-[#cdd6f4] rounded-xl p-4 overflow-x-auto text-[13px] leading-relaxed font-mono">
                    <code>{text}</code>
                  </pre>
                </div>
              );
            },
            pre: ({ children }) => <>{children}</>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-accent-violet/30 bg-violet-50/30 rounded-r-lg pl-4 pr-3 py-2 my-3 text-sm text-ink-light">{children}</blockquote>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>

      <div className="mt-12 pt-6 border-t border-surface-3 text-center text-xs text-ink-faint">
        ArtVerse API &bull; Built with Express.js &bull; Powered by Replicate & Stripe
      </div>
    </div>
  );
}
