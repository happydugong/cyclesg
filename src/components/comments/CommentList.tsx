import type { Comment } from '../../services/comments/commentsService';

interface CommentListProps {
  comments: Comment[];
}

function formatCommentTimestamp(createdAt: Date) {
  if (Number.isNaN(createdAt.getTime()) || createdAt.getTime() === 0) {
    return 'Just now';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(createdAt);
}

export function CommentList({ comments }: CommentListProps) {
  return (
    <ul className="space-y-3">
      {comments.map((comment) => (
        <li
          key={comment.id}
          className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900">{comment.author}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatCommentTimestamp(comment.createdAt)}
                {comment.pending ? ' • Sending...' : ''}
              </p>
            </div>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
            {comment.text}
          </p>
        </li>
      ))}
    </ul>
  );
}
