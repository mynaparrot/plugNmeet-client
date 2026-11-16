export interface IInsightsAITextChatMessage {
  id: string;
  role: 'user' | 'model';
  createdAt: string;
  parts: string[];
}
