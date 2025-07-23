// src/components/comments/CommentSection.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2, Send } from 'lucide-react';
import { MentionsInput, Mention } from 'react-mentions';
import { getUsers } from '@/lib/firebase/services/users';
import { onCommentsUpdate, addComment } from '@/lib/firebase/services/comments';
import type { User } from '@/types/user';
import type { Comment } from '@/types/comment';
import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import './mention-styles.css';


interface CommentSectionProps {
  docPath: string;
}

interface MentionUser {
    id: string;
    display: string;
}

export function CommentSection({ docPath }: CommentSectionProps) {
  const { userData } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [usersForMentions, setUsersForMentions] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

   useEffect(() => {
    getUsers()
      .then((users) => {
        const mappedUsers = users.map((user: User) => ({
          id: user.id,
          display: user.name,
        }));
        setUsersForMentions(mappedUsers);
      })
      .catch(() => {
        toast({ variant: 'destructive', title: 'Erro ao carregar utilizadores para menções.' });
      });
  }, [toast]);


  useEffect(() => {
    if (!docPath) return;
    setLoading(true);
    const unsubscribe = onCommentsUpdate(
      docPath,
      (fetchedComments) => {
        setComments(fetchedComments);
        setLoading(false);
      },
      (error) => {
        toast({ variant: 'destructive', title: 'Erro ao carregar comentários.' });
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [docPath, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !userData) return;
    
    setIsSubmitting(true);

    const commentData = {
      text: newComment,
      authorId: userData.id,
      authorName: userData.name || "Utilizador Desconhecido",
    };
    
    const tempId = Date.now().toString(); // ID temporário
    const optimisticComment: Comment = {
      ...commentData,
      id: tempId,
      createdAt: Timestamp.now(), // <-- CORREÇÃO AQUI
    };
    setComments(prevComments => [...prevComments, optimisticComment]);
    setNewComment('');


    try {
       await addComment(docPath, commentData);
    } catch (error) {
        console.error("Erro ao adicionar comentário:", error);
        toast({ variant: 'destructive', title: 'Erro ao adicionar comentário.' });
        // Reverter a atualização otimista em caso de erro
        setComments(prevComments => prevComments.filter(c => c.id !== optimisticComment.id));
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const fetchUsersForMention = (query: string, callback: (data: MentionUser[]) => void) => {
      if (!query) return;
      const filteredUsers = usersForMentions.filter(user => 
          user.display.toLowerCase().includes(query.toLowerCase())
      );
      callback(filteredUsers);
  };


  return (
    <div className="space-y-4 pt-4">
      <h4 className="font-semibold">Comentários</h4>
      <div className="space-y-4 max-h-48 overflow-y-auto pr-2">
        {loading ? (
            <div className="flex justify-center items-center py-4"><Loader2 className="h-5 w-5 animate-spin" /></div>
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
                        {comment.createdAt ? formatDistanceToNow(comment.createdAt.toDate(), { addSuffix: true, locale: ptBR }) : 'agora mesmo'}
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
            placeholder="Adicione um comentário... Use @ para mencionar alguém."
            className="mentions"
            disabled={isSubmitting}
            markup="@[__display__](__id__)"
         >
            <Mention
                trigger="@"
                data={fetchUsersForMention}
                markup="@[__display__](__id__)"
                displayTransform={(id, display) => `@${display}`}
                className="mentions__mention"
            />
        </MentionsInput>
        <Button type="submit" size="icon" disabled={isSubmitting || !newComment.trim()}>
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
