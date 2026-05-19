import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommentsSection } from './CommentsSection';

const testState = vi.hoisted(() => {
  const submit = vi.fn(() => Promise.resolve());
  const prepareCommentSubmission = vi.fn(() => ({
    comment: {
      id: 'pending-1',
      author: 'Anonymous',
      text: 'Heads up for the narrow turn.',
      createdAt: new Date('2026-05-18T12:00:00.000Z'),
      pending: true
    },
    submit
  }));
  const subscribeToRouteComments = vi.fn(
    (
      _routeId: string,
      onComments: (comments: Array<{ id: string; author: string; text: string; createdAt: Date }>) => void
    ) => {
      onComments([]);
      return vi.fn();
    }
  );

  return {
    prepareCommentSubmission,
    submit,
    subscribeToRouteComments
  };
});

vi.mock('../../services/comments/commentsService', () => ({
  commentsService: {
    initialize: vi.fn(),
    isEnabled: vi.fn(() => true),
    prepareCommentSubmission: testState.prepareCommentSubmission,
    subscribeToRouteComments: testState.subscribeToRouteComments
  }
}));

describe('CommentsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('subscribes to route comments and exposes optimistic comments while posting', async () => {
    render(<CommentsSection routeId="route-1" />);

    expect(testState.subscribeToRouteComments).toHaveBeenCalledWith(
      'route-1',
      expect.any(Function),
      expect.any(Function)
    );
    expect(screen.getByText('No comments yet')).toBeInTheDocument();

    await act(async () => {
      const textarea = screen.getByLabelText('Comment');
      const button = screen.getByRole('button', { name: 'Post comment' });
      fireEvent.change(textarea, { target: { value: 'Heads up for the narrow turn.' } });
      button.click();
    });

    await waitFor(() => {
      expect(screen.getByText('Heads up for the narrow turn.')).toBeInTheDocument();
    });
    expect(testState.prepareCommentSubmission).toHaveBeenCalled();
    expect(testState.submit).toHaveBeenCalled();
  });

  it('prevents empty comments and enforces the client-side rate limit', async () => {
    vi.spyOn(Date, 'now')
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000);

    render(<CommentsSection routeId="route-1" />);

    expect(screen.getByRole('button', { name: 'Post comment' })).toBeDisabled();

    await act(async () => {
      const textarea = screen.getByLabelText('Comment');
      fireEvent.change(textarea, { target: { value: 'Heads up for the narrow turn.' } });
      screen.getByRole('button', { name: 'Post comment' }).click();
    });

    await waitFor(() => {
      expect(testState.submit).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      const textarea = screen.getByLabelText('Comment');
      fireEvent.change(textarea, { target: { value: 'Another quick note.' } });
      screen.getByRole('button', { name: 'Post comment' }).click();
    });

    expect(
      screen.getByText('Please wait 14s before posting another comment.')
    ).toBeInTheDocument();
  });
});
