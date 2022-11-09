import { RasaNluModel } from "@core/models/rasa-nlu.model";
import { RasaStoryModel } from "@core/models/rasa-story.model";
import { RasaRuleModel } from "@core/models/rasa-rule.model";

export class RasaDomainModel {
  version: string;
  intents: string[];
  actions: string[];
  slots: any;
  responses: { [key: string]: RasaUtterResponseModel[] };
  session_config: {
    session_expiration_time: number;
    carry_over_slots_to_new_session: boolean
  };
  // nlu: RasaNluModel[];
  // stories: RasaStoryModel[];
  // rules: RasaRuleModel[];

  constructor() {
    this.version = "3.1";
    this.intents = [];
    this.responses = {};
    // this.nlu = [];
    // this.stories = [];
    // this.rules = [];
    this.actions = ['action_fallback'];
    this.slots = {
      return_suggestions: {
        type: 'bool',
        mappings: [
          {type: 'custom'}
        ]
      }
    };
    this.session_config = {
      session_expiration_time: 60,
      carry_over_slots_to_new_session: true
    };
  }
}

export interface RasaUtterResponseModel {
  text?: string;
  image?: string;
  buttons?: RasaButtonModel[];
}

export class RasaButtonModel {
  title: string;
  payload: string;

  constructor(title: string, payload?: string) {
    if (!!payload) {
      this.title = title;
      this.payload = payload;
    } else {
      this.title = title.substring(0, title.indexOf('<')).trim();
      this.payload = title.substring(title.indexOf('<') + 1, title.indexOf('>')).trim();
    }
  }
}
