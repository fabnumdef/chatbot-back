export class RasaRuleModel {
  rule: string;
  steps: any[];

  constructor(intentId) {
    this.rule = intentId;
    this.steps = [];
  }
}
