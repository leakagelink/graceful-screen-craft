export type NotificationAudience = 'user' | 'all' | 'shippers' | 'drivers';

export function validateNotificationDraft(audience: NotificationAudience, recipientId: string, title: string, body: string) {
  if (audience === 'user' && !recipientId) return 'Choose a recipient.';
  if (!title.trim()) return 'Enter a notification title.';
  if (title.trim().length > 100) return 'Keep the title within 100 characters.';
  if (!body.trim()) return 'Enter a notification message.';
  if (body.trim().length > 500) return 'Keep the message within 500 characters.';
  return null;
}
