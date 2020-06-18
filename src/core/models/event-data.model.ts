export class EventDataModel {
  event: 'bot' | 'action' | 'user' | 'session_started';
  timestamp: number;

  // On bot & user event
  text?: string;

  // On bot event
  data: any;

  // On action event
  name?: string;
  confidence?: number;
  policy?: string;

  // On user event
  message_id: string;
  input_channel: string;

  parse_data: {
    intent: {
      name: string;
      confidence: number;
    };
    intent_ranking: {
      name: string;
      confidence: number;
    }[]
  }
}
