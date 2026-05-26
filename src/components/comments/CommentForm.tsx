import { useState, type FormEvent } from 'react';

interface CommentFormProps {
  authorCharacterLimit: number;
  commentCharacterLimit: number;
  error: string | null;
  isSubmitting: boolean;
  onSubmit: (input: { author: string; text: string }) => Promise<boolean>;
  rateLimitMs: number;
}

export function CommentForm({
  authorCharacterLimit,
  commentCharacterLimit,
  error,
  isSubmitting,
  onSubmit,
  rateLimitMs
}: CommentFormProps) {
  const [author, setAuthor] = useState('');
  const [text, setText] = useState('');

  const trimmedText = text.trim();
  const remainingCharacters = commentCharacterLimit - text.length;
  const isSubmitDisabled =
    isSubmitting ||
    trimmedText.length === 0 ||
    text.length > commentCharacterLimit ||
    author.length > authorCharacterLimit;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const didSubmit = await onSubmit({
      author,
      text
    });

    if (!didSubmit) {
      return;
    }

    setText('');
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <div className="space-y-1.5">
        <label htmlFor="route-comment-author" className="text-xs font-medium text-slate-600">
          Name <span className="text-slate-400">(optional)</span>
        </label>
        <input
          id="route-comment-author"
          type="text"
          value={author}
          maxLength={authorCharacterLimit}
          onChange={(event) => setAuthor(event.target.value)}
          placeholder="Anonymous"
          className="block w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="route-comment-text" className="text-xs font-medium text-slate-600">
          Comment
        </label>
        <textarea
          id="route-comment-text"
          value={text}
          maxLength={commentCharacterLimit}
          onChange={(event) => setText(event.target.value)}
          placeholder="Share a tip, condition update, or caution for this spot."
          rows={4}
          className="block w-full resize-y rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        <div className="flex items-center justify-between gap-3 text-[11px] text-slate-500">
          <span>Max 1 comment every {rateLimitMs / 1000}s.</span>
          <span>{remainingCharacters} left</span>
        </div>
      </div>

      {error ? (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          {error}
        </p>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="inline-flex min-w-[6.5rem] items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isSubmitting ? 'Posting...' : 'Post comment'}
        </button>
      </div>
    </form>
  );
}
