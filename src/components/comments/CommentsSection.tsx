import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommentForm } from './CommentForm';
import { CommentList } from './CommentList';
import {
  commentsService,
  type Comment,
  type CreateCommentInput
} from '../../services/comments/commentsService';

const COMMENT_CHARACTER_LIMIT = 500;
const AUTHOR_CHARACTER_LIMIT = 50;
const COMMENT_RATE_LIMIT_MS = 15_000;

function getCommentValidationError(input: CreateCommentInput) {
  const text = input.text.trim();
  const author = input.author.trim();

  if (text.length === 0) {
    return 'Comment cannot be empty.';
  }

  if (text.length > COMMENT_CHARACTER_LIMIT) {
    return `Comment must be ${COMMENT_CHARACTER_LIMIT} characters or fewer.`;
  }

  if (author.length > AUTHOR_CHARACTER_LIMIT) {
    return `Name must be ${AUTHOR_CHARACTER_LIMIT} characters or fewer.`;
  }

  return null;
}

function mergeComments(serverComments: Comment[], optimisticComments: Comment[]) {
  // `serverComments` are confirmed Firestore snapshot results.
  // `optimisticComments` are local placeholders shown immediately after submit.
  // Once Firestore returns the saved document with the same id, the optimistic entry is removed.
  const serverCommentIds = new Set(serverComments.map((comment) => comment.id));
  const unresolvedOptimisticComments = optimisticComments.filter(
    (comment) => !serverCommentIds.has(comment.id)
  );

  return [...unresolvedOptimisticComments, ...serverComments].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
}

interface CommentsSectionProps {
  routeId: string;
}

export function CommentsSection({ routeId }: CommentsSectionProps) {
  // Comments confirmed by the Firestore subscription.
  const [serverComments, setServerComments] = useState<Comment[]>([]);
  // Temporary local comments used for optimistic UI while the write is in flight.
  const [optimisticComments, setOptimisticComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSubmittedAt, setLastSubmittedAt] = useState<number | null>(null);
  const hasLoadedSnapshotRef = useRef(false);

  useEffect(() => {
    setServerComments([]);
    setOptimisticComments([]);
    setIsLoading(true);
    setError(null);
    hasLoadedSnapshotRef.current = false;

    const unsubscribe = commentsService.subscribeToRouteComments(
      routeId,
      (comments) => {
        setServerComments(comments);
        setError(null);

        if (!hasLoadedSnapshotRef.current) {
          setIsLoading(false);
          hasLoadedSnapshotRef.current = true;
        }
      },
      (subscriptionError) => {
        setError(subscriptionError.message);
        setIsLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [routeId]);

  const comments = useMemo(
    () => mergeComments(serverComments, optimisticComments),
    [optimisticComments, serverComments]
  );

  const submitComment = useCallback(
    async (input: CreateCommentInput) => {
      const validationError = getCommentValidationError(input);

      if (validationError) {
        setError(validationError);
        return false;
      }

      const now = Date.now();

      if (lastSubmittedAt && now - lastSubmittedAt < COMMENT_RATE_LIMIT_MS) {
        const remainingSeconds = Math.ceil(
          (COMMENT_RATE_LIMIT_MS - (now - lastSubmittedAt)) / 1000
        );
        setError(`Please wait ${remainingSeconds}s before posting another comment.`);
        return false;
      }

      let preparedSubmission;

      try {
        preparedSubmission = commentsService.prepareCommentSubmission(routeId, input);
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Unable to prepare your comment.'
        );
        return false;
      }

      setError(null);
      setIsSubmitting(true);
      setOptimisticComments((current) => [preparedSubmission.comment, ...current]);

      try {
        await preparedSubmission.submit();
        setLastSubmittedAt(now);
        return true;
      } catch (submissionError) {
        setOptimisticComments((current) =>
          current.filter((comment) => comment.id !== preparedSubmission.comment.id)
        );
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Unable to post your comment.'
        );
        return false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [lastSubmittedAt, routeId]
  );

  const isEnabled = commentsService.isEnabled();

  return (
    <section className="mt-5 border-t border-slate-200/80 pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Comments</h3>
          <p className="mt-1 text-xs text-slate-500">Map notes from anonymous riders.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-500">
          {comments.length}
        </span>
      </div>

      {!isEnabled ? (
        <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
          Comments are unavailable until Firebase is configured.
        </p>
      ) : (
        <>
          <div className="mt-4">
            <CommentForm
              authorCharacterLimit={AUTHOR_CHARACTER_LIMIT}
              commentCharacterLimit={COMMENT_CHARACTER_LIMIT}
              error={error}
              isSubmitting={isSubmitting}
              onSubmit={submitComment}
              rateLimitMs={COMMENT_RATE_LIMIT_MS}
            />
          </div>

          <div className="mt-4">
            {isLoading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                Loading comments...
              </div>
            ) : comments.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-sm text-slate-500">
                No comments yet
              </div>
            ) : (
              <CommentList comments={comments} />
            )}
          </div>
        </>
      )}
    </section>
  );
}
