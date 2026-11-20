import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, Check, Code2, Copy, Download, Eye, Globe, Terminal } from 'lucide-react';
import { buildUniversalBotBundles } from '../ml/botScriptGenerator';
import { SerializedBrain } from '../ml/neuralNet';

type ExportTab = 'bookmarklet' | 'console' | 'userscript' | 'embed';

interface WebsiteBotExporterProps {
  activeBrain: SerializedBrain;
  brainSourceLabel: string;
  visionOverlayEnabled: boolean;
  onToggleVisionTest: () => void;
  labels: {
    sectionTitle: string;
    sectionSubtitle: string;
    brainSource: string;
    testVisionBtn: string;
    testVisionActiveBtn: string;
    tabs: {
      bookmarklet: string;
      console: string;
      userscript: string;
      embed: string;
    };
    bookmarkletTitle: string;
    bookmarkletDesc: string;
    bookmarkletDragLabel: string;
    copyBookmarklet: string;
    consoleTitle: string;
    consoleDesc: string;
    userscriptTitle: string;
    userscriptDesc: string;
    downloadUserscript: string;
    embedTitle: string;
    embedDesc: string;
    copyCode: string;
    copied: string;
    howItWorksTitle: string;
    features: readonly { readonly title: string; readonly desc: string }[];
  };
}

export const WebsiteBotExporter: React.FC<WebsiteBotExporterProps> = ({
  activeBrain,
  brainSourceLabel,
  visionOverlayEnabled,
  onToggleVisionTest,
  labels,
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>('bookmarklet');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const bookmarkLinkRef = useRef<HTMLAnchorElement | null>(null);

  const bundles = useMemo(() => buildUniversalBotBundles(activeBrain), [activeBrain]);

  // Attach javascript: URI via DOM attribute so React does not strip/warn on href
  useEffect(() => {
    const el = bookmarkLinkRef.current;
    if (el) {
      el.setAttribute('href', bundles.bookmarkletUri);
    }
  }, [bundles.bookmarkletUri, activeTab]);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    } catch {
      // Fallback copy via temporary textarea
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 1800);
    }
  };

  const handleDownloadUserscript = () => {
    const blob = new Blob([bundles.userscript], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flappyml-autobot.user.js';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <section id="website-bot" className="bg-white border border-slate-200 rounded-xl p-6 lg:p-8">
      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mb-1.5">
            <span>{labels.brainSource}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-emerald-700 font-semibold">{brainSourceLabel}</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-slate-900 tracking-tight">
            {labels.sectionTitle}
          </h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">{labels.sectionSubtitle}</p>
        </div>

        <button
          type="button"
          onClick={onToggleVisionTest}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            visionOverlayEnabled
              ? 'bg-sky-600 text-white hover:bg-sky-700'
              : 'bg-slate-900 text-white hover:bg-slate-800'
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>{visionOverlayEnabled ? labels.testVisionActiveBtn : labels.testVisionBtn}</span>
        </button>
      </div>

      {/* Method Selector Tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('bookmarklet')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'bookmarklet'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>{labels.tabs.bookmarklet}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('console')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'console'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>{labels.tabs.console}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('userscript')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'userscript'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{labels.tabs.userscript}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('embed')}
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            activeTab === 'embed'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>{labels.tabs.embed}</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-7">
          {activeTab === 'bookmarklet' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-display text-lg font-semibold text-slate-900">
                  {labels.bookmarkletTitle}
                </h3>
                <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                  {labels.bookmarkletDesc}
                </p>
              </div>

              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <a
                  ref={bookmarkLinkRef}
                  onClick={(e) => e.preventDefault()}
                  draggable
                  className="inline-flex items-center gap-2.5 px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold shadow-sm cursor-grab active:cursor-grabbing whitespace-nowrap shrink-0"
                  title="Drag this button to your browser Bookmarks Bar"
                >
                  <Bookmark className="w-4 h-4" />
                  <span>{labels.bookmarkletDragLabel}</span>
                </a>

                <button
                  type="button"
                  onClick={() => handleCopy(bundles.bookmarkletUri, 'bookmarklet')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedKey === 'bookmarklet' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{labels.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{labels.copyBookmarklet}</span>
                    </>
                  )}
                </button>
              </div>

              <div className="rounded-lg bg-slate-950 text-slate-300 p-3.5 font-mono text-xs overflow-x-auto max-h-32">
                <code className="break-all">{bundles.bookmarkletUri.slice(0, 340)}...</code>
              </div>
            </div>
          )}

          {activeTab === 'console' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {labels.consoleTitle}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">{labels.consoleDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(bundles.consoleScript, 'console')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedKey === 'console' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{labels.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{labels.copyCode}</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="rounded-xl bg-slate-950 text-slate-200 p-4 font-mono text-xs overflow-auto max-h-72 leading-relaxed">
                <code>{bundles.consoleScript}</code>
              </pre>
            </div>
          )}

          {activeTab === 'userscript' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {labels.userscriptTitle}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">{labels.userscriptDesc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadUserscript}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{labels.downloadUserscript}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(bundles.userscript, 'userscript')}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'userscript' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{labels.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>{labels.copyCode}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <pre className="rounded-xl bg-slate-950 text-slate-200 p-4 font-mono text-xs overflow-auto max-h-72 leading-relaxed">
                <code>{bundles.userscript}</code>
              </pre>
            </div>
          )}

          {activeTab === 'embed' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-slate-900">
                    {labels.embedTitle}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">{labels.embedDesc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(bundles.htmlEmbedSnippet, 'embed')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {copiedKey === 'embed' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{labels.copied}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>{labels.copyCode}</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="rounded-xl bg-slate-950 text-slate-200 p-4 font-mono text-xs overflow-auto max-h-72 leading-relaxed">
                <code>{bundles.htmlEmbedSnippet}</code>
              </pre>
            </div>
          )}
        </div>

        {/* Right Column: How the Universal Bot Works */}
        <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4">
          <h3 className="font-display text-base font-semibold text-slate-900">
            {labels.howItWorksTitle}
          </h3>
          <div className="divide-y divide-slate-200">
            {labels.features.map((feat, idx) => (
              <div key={idx} className="py-3 first:pt-0 last:pb-0">
                <div className="text-sm font-semibold text-slate-900">
                  0{idx + 1}. {feat.title}
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
