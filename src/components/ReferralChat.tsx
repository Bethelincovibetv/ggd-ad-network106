import React, { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  peerId: string;
  peerName: string;
  onBack: () => void;
}

const ReferralChat = ({ peerId, peerName, onBack }: Props) => {
  const [me, setMe] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setMe(user.id);
      const { data } = await supabase
        .from('referral_messages' as any)
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });
      setMessages(data || []);

      const channel = supabase
        .channel(`ref-chat-${user.id}-${peerId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'referral_messages' }, (payload: any) => {
          const m = payload.new;
          if ((m.sender_id === user.id && m.receiver_id === peerId) || (m.sender_id === peerId && m.receiver_id === user.id)) {
            setMessages((prev) => [...prev, m]);
          }
        })
        .subscribe();
      return () => { supabase.removeChannel(channel); };
    })();
  }, [peerId]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !me) return;
    const msg = text.trim();
    setText('');
    await supabase.from('referral_messages' as any).insert({ sender_id: me, receiver_id: peerId, message: msg });
  };

  return (
    <div className="p-4">
      <Card className="flex flex-col h-[70vh]">
        <CardHeader className="border-b py-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={onBack}><ArrowLeft className="h-4 w-4" /></Button>
            <CardTitle className="text-base">{peerName}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-3 space-y-2">
          {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Say hi 👋</p>}
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.sender_id === me ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${m.sender_id === me ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' : 'bg-muted'}`}>
                {m.message}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </CardContent>
        <div className="flex gap-2 p-3 border-t">
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message..." onKeyDown={(e) => e.key === 'Enter' && send()} />
          <Button onClick={send} className="bg-gradient-to-r from-orange-500 to-red-600 text-white"><Send className="h-4 w-4" /></Button>
        </div>
      </Card>
    </div>
  );
};

export default ReferralChat;
