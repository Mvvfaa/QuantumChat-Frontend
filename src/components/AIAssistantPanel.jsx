import { useRef, useState } from 'react';
import { streamQuantumAI } from '../api/aiClient.js';

export default function AIAssistantPanel({ conversation, messages, onClose, onInsertDraft, onSaveEncryptedNote }) {
  const [prompt, setPrompt] = useState('');
  const [answer, setAnswer] = useState('');
  const [contextMode, setContextMode] = useState('none');
  const [selectedContext, setSelectedContext] = useState('');
  const [busy, setBusy] = useState(false);
  const abortRef = useRef(null);

  const contextCount = contextMode.startsWith('last-') ? Number(contextMode.slice(5)) : 0;
  const context =
    contextMode === 'selection' && selectedContext
      ? [selectedContext]
      : contextCount
        ? messages.filter((message) => message.text).slice(-contextCount).map((message) => message.text)
        : [];

  async function ask(event) {
    event.preventDefault();
    if (!prompt.trim() || busy) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setAnswer('');
    setBusy(true);
    try {
      await streamQuantumAI({
        message: prompt.trim(),
        context,
        ephemeral: true,
        link:
          conversation?.type === 'group'
            ? { groupId: conversation.id }
            : { quantumChatPeerId: conversation?.id },
        signal: controller.signal,
        onChunk: (chunk) => setAnswer((current) => current + chunk),
      });
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  }

  return (
    <aside className="quantum-ai-panel" aria-label="QuantumAI assistant">
      <header>
        <div>
          <strong>QuantumAI</strong>
          <small>Only sees context you approve</small>
        </div>
        <button type="button" onClick={onClose} aria-label="Close QuantumAI">×</button>
      </header>

      <label className="ai-context-control">
        Share context
        <select value={contextMode} onChange={(event) => setContextMode(event.target.value)}>
          <option value="none">Prompt only</option>
          <option value="selection">Selected text</option>
          <option value="last-1">Last message</option>
          <option value="last-5">Last 5 messages</option>
          <option value="last-10">Last 10 messages</option>
        </select>
      </label>
      {contextMode === 'selection' && (
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            setSelectedContext(window.getSelection()?.toString().trim() || '');
          }}
        >
          Capture highlighted chat text
        </button>
      )}
      <p className="ai-privacy-preview">
        Privacy preview:{' '}
        {contextMode === 'selection'
          ? selectedContext
            ? `${selectedContext.length} selected characters`
            : 'no selected text captured'
          : context.length
            ? `${context.length} decrypted message(s)`
            : 'no chat messages'}{' '}
        will be sent.
      </p>

      <div className="ai-panel-answer">
        {answer || 'Ask for an explanation, summary, or draft reply.'}
      </div>

      {answer && (
        <div className="ai-answer-actions">
          <button type="button" className="ai-insert-draft" onClick={() => onInsertDraft(answer)}>
            Insert as draft
          </button>
          <button type="button" onClick={() => onSaveEncryptedNote?.(answer)}>
            Save encrypted note
          </button>
        </div>
      )}

      <form onSubmit={ask}>
        <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask QuantumAI…" />
        <button type="submit" disabled={busy || !prompt.trim()}>{busy ? 'Thinking…' : 'Ask'}</button>
        {busy && <button type="button" onClick={() => abortRef.current?.abort()}>Stop</button>}
      </form>
    </aside>
  );
}
