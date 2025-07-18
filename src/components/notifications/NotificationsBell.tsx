// src/components/notifications/NotificationsBell.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { collection, query, onSnapshot, doc, updateDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Archive, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Notification } from '@/types/notification';

export function NotificationsBell() {
  const { userData } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userData) return;

    setLoading(true);
    const notificationsRef = collection(db, `users/${userData.id}/notifications`);
    const q = query(notificationsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Notification[];
      setNotifications(fetchedNotifications);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userData]);

  const updateNotificationStatus = async (id: string, status: 'read' | 'archived') => {
    if (!userData) return;
    const notificationRef = doc(db, `users/${userData.id}/notifications`, id);
    await updateDoc(notificationRef, { status });
  };

  const handleNotificationClick = (notification: Notification) => {
    updateNotificationStatus(notification.id, 'read');
    router.push(notification.link);
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const renderNotificationList = (status: 'unread' | 'read' | 'archived') => {
    const filtered = notifications.filter(n => n.status === status);
    if (loading) {
        return <div className="flex justify-center items-center p-4"><Loader2 className="animate-spin h-5 w-5" /></div>;
    }
    if (filtered.length === 0) {
      return <p className="text-center text-sm text-muted-foreground p-4">Nenhuma notificação aqui.</p>;
    }

    return (
      <div className="max-h-80 overflow-y-auto">
        {filtered.map(n => (
          <React.Fragment key={n.id}>
             <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="flex flex-col items-start gap-2 p-3 cursor-default">
                <div className="w-full" onClick={() => handleNotificationClick(n)}>
                    <p className="text-sm font-medium">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true, locale: ptBR })}
                    </p>
                </div>
                <div className="flex gap-2 self-end">
                    {status !== 'read' && (
                        <Button variant="ghost" size="sm" onClick={() => updateNotificationStatus(n.id, 'read')}>
                            <Eye className="mr-2 h-4 w-4" /> Marcar como lida
                        </Button>
                    )}
                    {status !== 'archived' && (
                        <Button variant="ghost" size="sm" onClick={() => updateNotificationStatus(n.id, 'archived')}>
                            <Archive className="mr-2 h-4 w-4" /> Arquivar
                        </Button>
                    )}
                </div>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 md:w-96 p-0" align="end">
        <div className="p-2">
            <h4 className="font-semibold text-lg">Notificações</h4>
        </div>
        <DropdownMenuSeparator />
         <Tabs defaultValue="unread" className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-none bg-transparent p-0 border-b">
            <TabsTrigger value="unread" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Não lidas</TabsTrigger>
            <TabsTrigger value="read" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Lidas</TabsTrigger>
            <TabsTrigger value="archived" className="rounded-none data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary">Arquivadas</TabsTrigger>
          </TabsList>
          <TabsContent value="unread">
            {renderNotificationList('unread')}
          </TabsContent>
          <TabsContent value="read">
            {renderNotificationList('read')}
          </TabsContent>
           <TabsContent value="archived">
            {renderNotificationList('archived')}
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
