// src/components/comments/CommentSection.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { MentionsInput, Mention } from 'react-mentions';
import { useAuth } from '@/context/AuthContext';
import { getUsers } from '@/lib/firebase/services/users';
import { onCommentsUpdate, addComment } from '@/lib/firebase/services/comments';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import type { Comment, NewComment } from '@/types/comment';
import type { User } from '@/types/user';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import './mention-styles.css';
import { Timestamp } from 'firebase/firestore';

interface CommentSectionProps {
  docPath: string; // e.g., 'tasks/taskId123' or 'calendarEvents/eventId456'
}

interface MentionUser {
    id: string;
    display: string;
}

export function CommentSection({ docPath }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [mentionUsers, setMentionUsers] = useState<MentionUser[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const { userData } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    getUsers()
      .then((users) => {
        const mappedUsers = users.map((user: User) => ({
          id: user.id,
          display: user.name,
        }));
        setMentionUsers(mappedUsers);
      })
      .catch(() => {
        toast({ variant: 'destructive', title: 'Erro ao carregar utilizadores para menções.' });
      });
  }, [toast]);

  useEffect(() => {
    if (!docPath) return;
    setLoadingComments(true);
    const unsubscribe = onCommentsUpdate(
      docPath,
      (fetchedComments) => {
        setComments(fetchedComments);
        setLoadingComments(false);
      },
      (error) => {
        toast({ variant: 'destructive', title: 'Erro ao carregar comentários.' });
        setLoadingComments(false);
      }
    );
    return () => unsubscribe();
  }, [docPath, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userData) return;
    setSubmitting(true);
    
    const tempId = Date.now().toString(); // ID temporário
    
    const commentData: NewComment = {
      text: newComment,
      authorId: userData.id,
      authorName: userData.name,
    };

    // Adiciona ao estado local para atualização instantânea da UI
    const optimisticComment: Comment = {
      ...commentData,
      id: tempId,
      createdAt: Timestamp.now(), // <-- CORREÇÃO AQUI
    };
    setComments(prevComments => [...prevComments, optimisticComment]);
    setNewComment('');
    
    try {
      // Salva no Firestore em segundo plano
      await addComment(docPath, commentData);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao adicionar comentário', description: error.message });
       // Opcional: remover o comentário otimista se a gravação falhar
      setComments(prevComments => prevComments.filter(c => c.id !== tempId));
    } finally {
      setSubmitting(false);
    }
  };


  const fetchUsersForMention = (query: string, callback: (data: MentionUser[]) => void) => {
      if (!query) return;
      const filteredUsers = mentionUsers.filter(user => 
          user.display.toLowerCase().includes(query.toLowerCase())
      );
      callback(filteredUsers);
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold">Comentários</h4>
      <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
        {loadingComments ? (
          <div className="flex justify-center items-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : comments.length > 0 ? (
          comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-3">
               <Avatar className="h-8 w-8">
                  <AvatarFallback>{comment.authorName.charAt(0)}</AvatarFallback>
               </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm">{comment.authorName}</p>
                    <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: ptBR })}
                    </p>
                </div>
                <p className="text-sm text-foreground whitespace-pre-wrap">{comment.text}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground text-center">Nenhum comentário ainda.</p>
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex items-start gap-2">
        <MentionsInput
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Adicione um comentário... use @ para mencionar"
          className="mentions"
          disabled={submitting}
          markup="@[__display__](__id__)"
          displayTransform={(id, display) => `@${display}`}
        >
          <Mention
            trigger="@"
            data={fetchUsersForMention}
            markup="@[__display__](__id__)"
            displayTransform={(id, display) => `@${display}`}
            className="mentions__mention"
          />
        </MentionsInput>
        <Button type="submit" size="icon" disabled={submitting || !newComment.trim()}>
           {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
