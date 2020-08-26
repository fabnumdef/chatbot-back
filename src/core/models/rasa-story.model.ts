export class RasaStoryModel {
  story: string;
  steps: any[];

  constructor(intentId) {
    this.story = intentId;
    this.steps = [];
  }
}
