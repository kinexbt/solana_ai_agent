import { useCallback, useEffect } from 'react';

import { Conversation } from '@prisma/client';

import { useConversationsStore } from '@/hooks/store/conversations';
import { renameConversation } from '@/server/actions/ai-solana';

async function fetchConversations(userId: string): Promise<Conversation[]> {
  const response = await fetch(`/api/conversations?userId=${userId}`);
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
}

export function useConversations(userId?: string) {
  const {
    conversations,
    isLoading,
    activeId,
    setConversations,
    removeConversation,
    setActiveId,
    setLoading,
    markAsRead,
  } = useConversationsStore();

  const refreshConversations = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await fetchConversations(userId);
      setConversations(data);
    } catch (error) {
      console.error('Failed to refresh conversations:', error);
    }
  }, [userId, setConversations]);

  // Initial fetch
  useEffect(() => {
    if (!userId) return;

    let mounted = true;
    setLoading(true);

    fetchConversations(userId)
      .then((data) => {
        if (mounted) {
          setConversations(data);
        }
      })
      .catch((error) => {
        console.error('Failed to load conversations:', error);
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [userId, setConversations, setLoading]);

  const deleteConversation = useCallback(
    async (id: string): Promise<void> => {
      try {
        // Perform actual deletion first
        const response = await fetch('/api/chat', {
          method: 'DELETE',
          body: JSON.stringify({ id }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete conversation');
        }

        // Only remove from store after successful deletion
        removeConversation(id);

        // Force refresh to ensure consistency
        await refreshConversations();
      } catch (error) {
        console.error('Error deleting conversation:', error);
        // Reload conversations on error
        await refreshConversations();
        throw error; // Re-throw to handle in the component
      }
    },
    [removeConversation, refreshConversations],
  );

  const handleRename = async (id: string, newTitle: string) => {
    try {
      const renameResponse = await renameConversation({ id, title: newTitle });
      await refreshConversations();
    } catch (error) {
      console.error('Error renaming conversation:', error);
      throw error;
    }
  };

  return {
    conversations,
    isLoading,
    activeId,
    deleteConversation,
    setActiveId,
    refreshConversations,
    renameConversation: handleRename,
    markAsRead,
  };
}
