import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  type Unsubscribe
} from 'firebase/firestore';
import {
  getCommentsFirestore,
  initializeAnonymousAuth,
  isFirebaseConfigured
} from '../../firebase';

export interface Comment {
  // `id` comes from the Firestore document id rather than a field stored in the document body.
  id: string;
  author: string;
  text: string;
  // Firestore stores this as a Timestamp; the service converts it into a JS Date for React.
  createdAt: Date;
  // UI-only flag for comments that are still pending locally or in Firestore's local cache.
  pending?: boolean;
}

export interface CreateCommentInput {
  author: string;
  text: string;
}

export interface PreparedCommentSubmission {
  comment: Comment;
  submit: () => Promise<void>;
}

export interface CommentsService {
  initialize: () => Promise<void>;
  isEnabled: () => boolean;
  prepareCommentSubmission: (
    routeId: string,
    input: CreateCommentInput
  ) => PreparedCommentSubmission;
  subscribeToRouteComments: (
    routeId: string,
    onComments: (comments: Comment[]) => void,
    onError: (error: Error) => void
  ) => Unsubscribe;
}

function createConfigurationError() {
  return new Error(
    'Comments are unavailable because Firebase is not configured for this deployment.'
  );
}

function getRouteCommentsCollection(routeId: string) {
  return collection(getCommentsFirestore(), 'routes', routeId, 'comments');
}

function normalizeAuthor(author: string) {
  const trimmedAuthor = author.trim();
  return trimmedAuthor.length > 0 ? trimmedAuthor : 'Anonymous';
}

function normalizeComment(input: CreateCommentInput) {
  return {
    author: normalizeAuthor(input.author),
    text: input.text.trim()
  };
}

const firebaseCommentsService: CommentsService = {
  async initialize() {
    await initializeAnonymousAuth();
  },

  isEnabled() {
    return isFirebaseConfigured();
  },

  prepareCommentSubmission(routeId, input) {
    if (!isFirebaseConfigured()) {
      throw createConfigurationError();
    }

    const normalizedInput = normalizeComment(input);
    const commentRef = doc(getRouteCommentsCollection(routeId));

    return {
      comment: {
        id: commentRef.id,
        author: normalizedInput.author,
        text: normalizedInput.text,
        createdAt: new Date(),
        pending: true
      },
      submit: async () => {
        // Persisted Firestore document shape:
        // routes/{routeId}/comments/{commentId} => { author, text, createdAt }
        await initializeAnonymousAuth();
        await setDoc(commentRef, {
          author: normalizedInput.author,
          text: normalizedInput.text,
          createdAt: serverTimestamp()
        });
      }
    };
  },

  subscribeToRouteComments(routeId, onComments, onError) {
    if (!isFirebaseConfigured()) {
      onError(createConfigurationError());
      return () => undefined;
    }

    void initializeAnonymousAuth().catch((error) => {
      onError(error instanceof Error ? error : new Error('Unable to authenticate for comments.'));
    });

    const commentsQuery = query(getRouteCommentsCollection(routeId), orderBy('createdAt', 'desc'));

    return onSnapshot(
      commentsQuery,
      (snapshot) => {
        const comments = snapshot.docs.map((commentSnapshot) => {
          const data = commentSnapshot.data() as {
            author?: unknown;
            createdAt?: { toDate?: () => Date } | null;
            text?: unknown;
          };

          return {
            id: commentSnapshot.id,
            author: typeof data.author === 'string' && data.author.trim().length > 0
              ? data.author
              : 'Anonymous',
            text: typeof data.text === 'string' ? data.text : '',
            createdAt:
              typeof data.createdAt?.toDate === 'function'
                ? data.createdAt.toDate()
                : new Date(),
            pending: commentSnapshot.metadata.hasPendingWrites
          } satisfies Comment;
        });

        onComments(comments);
      },
      (error) => {
        onError(error instanceof Error ? error : new Error('Unable to load comments.'));
      }
    );
  }
};

export const commentsService: CommentsService = firebaseCommentsService;
export const initializeComments = firebaseCommentsService.initialize;
