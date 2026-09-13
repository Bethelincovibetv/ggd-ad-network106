
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'seen';

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status?: MessageStatus;
  seenAt?: Date;
}

