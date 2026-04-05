import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, Users, User, Search, X, Link } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminNotificationSender = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [link, setLink] = useState('');
  const [mode, setMode] = useState<'all' | 'specific'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [sending, setSending] = useState(false);
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchRecentNotifications();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('user_id, email, display_name')
      .or(`email.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
      .limit(10);
    setUsers(data || []);
  };

  const fetchRecentNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    setSentNotifications(data || []);
  };

  const sendNotification = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Title and message are required');
      return;
    }

    setSending(true);
    try {
      const fullMessage = link ? `${message}\n\n🔗 ${link}` : message;

      if (mode === 'specific' && selectedUser) {
        await supabase.from('notifications').insert({
          user_id: selectedUser.user_id,
          title,
          message: fullMessage,
          type: 'admin',
        });
        toast.success(`Notification sent to ${selectedUser.display_name || selectedUser.email}`);
      } else {
        const { data: allProfiles } = await supabase.from('profiles').select('user_id');
        if (allProfiles && allProfiles.length > 0) {
          const notifications = allProfiles.map(p => ({
            user_id: p.user_id,
            title,
            message: fullMessage,
            type: 'admin',
          }));
          // Insert in batches of 100
          for (let i = 0; i < notifications.length; i += 100) {
            await supabase.from('notifications').insert(notifications.slice(i, i + 100));
          }
          toast.success(`Notification sent to ${allProfiles.length} users`);
        }
      }

      setTitle('');
      setMessage('');
      setLink('');
      setSelectedUser(null);
      fetchRecentNotifications();
    } catch (err) {
      toast.error('Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <CardContent className="p-4 text-center">
            <Bell className="h-8 w-8 mx-auto mb-2" />
            <p className="text-2xl font-bold">{sentNotifications.length}</p>
            <p className="text-xs opacity-90">Recent Notifications</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 mx-auto mb-2" />
            <p className="text-2xl font-bold">{sentNotifications.filter(n => n.type === 'admin').length}</p>
            <p className="text-xs opacity-90">Admin Sent</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-4 text-center">
            <Send className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm font-bold">Send New</p>
            <p className="text-xs opacity-90">Broadcast or Direct</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-orange-500" />
            Send Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={mode === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => { setMode('all'); setSelectedUser(null); }}
              className="flex items-center gap-1"
            >
              <Users className="h-3 w-3" /> All Users
            </Button>
            <Button
              variant={mode === 'specific' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('specific')}
              className="flex items-center gap-1"
            >
              <User className="h-3 w-3" /> Specific User
            </Button>
          </div>

          {mode === 'specific' && (
            <div className="space-y-2">
              {selectedUser ? (
                <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200">
                  <User className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{selectedUser.display_name || selectedUser.email}</span>
                  <button onClick={() => setSelectedUser(null)} className="ml-auto">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {users.length > 0 && (
                    <div className="max-h-40 overflow-y-auto border rounded-lg divide-y">
                      {users.map(u => (
                        <button
                          key={u.user_id}
                          onClick={() => { setSelectedUser(u); setSearchQuery(''); setUsers([]); }}
                          className="w-full text-left p-2 hover:bg-secondary/80 text-sm flex items-center gap-2"
                        >
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="font-medium">{u.display_name || 'No name'}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{u.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <Input
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Notification message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <div className="relative">
            <Link className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Optional link (https://...)"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              className="pl-9"
            />
          </div>

          <Button
            onClick={sendNotification}
            disabled={sending || !title.trim() || !message.trim() || (mode === 'specific' && !selectedUser)}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600"
          >
            <Send className="h-4 w-4 mr-2" />
            {sending ? 'Sending...' : mode === 'all' ? 'Send to All Users' : `Send to ${selectedUser?.display_name || 'User'}`}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {sentNotifications.map(n => (
              <div key={n.id} className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold">{n.title}</p>
                  {n.type === 'admin' && <Badge variant="outline" className="text-[10px]">Admin</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{n.message}</p>
                <p className="text-[9px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotificationSender;
