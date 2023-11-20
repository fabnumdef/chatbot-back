export class RasaNluModel {
  intent: string;

  examples: string;

  constructor(intentId) {
    this.intent = intentId;
    this.examples = '';
  }
}
