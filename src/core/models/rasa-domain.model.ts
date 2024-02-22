import { RasaNluModel } from '@core/models/rasa-nlu.model';
import { RasaStoryModel } from '@core/models/rasa-story.model';
import { RasaRuleModel } from '@core/models/rasa-rule.model';
import * as yaml from 'js-yaml';
import { Intent } from '@core/entities/intent.entity';
import { Response } from '@core/entities/response.entity';
import { ResponseType } from '@core/enums/response-type.enum';
import { ChatbotConfig } from '@core/entities/chatbot-config.entity';

export class RasaDomainModel {
  version: string;

  recipe: string;

  language: string;

  intents: string[];

  actions: string[];

  slots: any;

  pipeline: { name: string; [key: string]: any }[];

  policies: { name: string; [key: string]: any }[];

  responses: { [key: string]: RasaUtterResponseModel[] };

  session_config: {
    session_expiration_time: number;
    carry_over_slots_to_new_session: boolean;
  };

  entities: [];

  forms: any;

  e2e_actions: [];

  nlu: RasaNluModel[];

  stories: RasaStoryModel[];

  rules: RasaRuleModel[];

  constructor() {
    this.version = '3.1';
    this.recipe = 'default.v1';
    this.language = 'fr';
    this.intents = [];
    this.entities = [];
    this.e2e_actions = [];
    this.forms = {};
    this.responses = {};
    this.nlu = [];
    this.stories = [];
    this.rules = [];
    this.pipeline = [
      {
        name: 'WhitespaceTokenizer',
      },
      {
        name: 'RegexFeaturizer',
        case_sensitive: false,
      },
      {
        name: 'LexicalSyntacticFeaturizer',
      },
      {
        name: 'CountVectorsFeaturizer',
      },
      {
        name: 'CountVectorsFeaturizer',
        analyzer: 'char_wb',
        min_ngram: 1,
        max_ngram: 4,
      },
      {
        name: 'DIETClassifier',
        entity_recognition: false,
        epochs: 100,
      },
      {
        name: 'FallbackClassifier',
        threshold: 0.6,
        ambiguity_threshold: 0.1,
      },
    ];
    this.policies = [
      {
        name: 'MemoizationPolicy',
        max_history: 1,
      },
      {
        name: 'RulePolicy',
        core_fallback_threshold: 0.5,
        core_fallback_action_name: 'utter_nlu_fallback_0',
      },
    ];
    this.actions = ['action_fallback'];
    this.slots = {
      return_suggestions: {
        type: 'bool',
        mappings: [{ type: 'custom' }],
      },
    };
    this.session_config = {
      session_expiration_time: 60,
      carry_over_slots_to_new_session: true,
    };
  }

  public serialize() {
    return {
      version: this.version,
      recipe: this.recipe,
      language: this.version,

      pipeline: this.pipeline,
      policies: this.policies,
      intents: this.intents,
      actions: this.actions,
      entities: this.entities,
      slots: this.slots,
      forms: this.forms,
      e2e_actions: this.e2e_actions,
      responses: this.responses,
      session_config: this.session_config,
      nlu: this.nlu,
      rules: this.rules,
      stories: this.stories,
    };
  }

  public dump() {
    return yaml.dump(this.serialize());
  }

  /**
   * Converti des connaissances au format de rasa
   * @param intents
   * @private
   */
  static fromIntents(intents: Intent[], config: ChatbotConfig) {
    const domain = new RasaDomainModel();

    intents = intents.map((i) => {
      i.id = i.id === 'phrase_hors_sujet' ? 'nlu_fallback' : i.id;
      return i;
    });

    for (const intent of intents) {
      if (intent.knowledges?.length < 2) continue;

      domain.intents.push(intent.id);
      // Remplissage des NLU (questions similaires)
      domain.nlu.push(new RasaNluModel(intent.id));
      let examples = '';
      if (intent.main_question) {
        examples += cleanStringForYaml(intent.main_question);
      }
      intent.knowledges.forEach((knowledge) => {
        examples += cleanStringForYaml(knowledge.question);
      });
      domain.nlu[domain.nlu.length - 1].examples = examples;

      // Remplissage DOMAIN
      const responses = generateDomainUtter(intent);

      // Remplissage STORIES
      // stories.push(new RasaStoryModel(intent.id));
      // const steps = stories[stories.length - 1].steps;
      // steps.push({intent: intent.id});
      // Object.keys(responses).forEach(utter => {
      //   steps.push({action: utter});
      // });

      // Remplissage RULES
      const {id} = intent;
      domain.rules.push(new RasaRuleModel(id));
      const {steps} = domain.rules[domain.rules.length - 1];
      steps.push({ intent: id });
      Object.keys(responses).forEach((utter) => {
        steps.push({ action: utter });
      });
      if (intent.id === 'nlu_fallback') {
        domain.slots.return_suggestions.initial_value =
          config.show_fallback_suggestions;
        steps.push({ action: 'action_fallback' });
      }

      domain.responses = Object.assign(responses, domain.responses);
    }

    return domain;
  }
}

/**
 * Génération des réponses (utter) pour un intent donné
 * @param intent
 */
function generateDomainUtter(intent: Intent): {
  [key: string]: RasaUtterResponseModel[];
} {
  const responses: { [key: string]: RasaUtterResponseModel[] } = {};
  // On itère sur chaque réponse pour la mettre au bon format
  intent.responses.forEach((response: Response, index: number) => {
    switch (response.response_type) {
      case ResponseType.text:
        responses[`utter_${intent.id}_${index}`] = [
          { text: cleanStringForYaml(response.response, false) },
        ];
        break;
      case ResponseType.image:
        responses[`utter_${intent.id}_${index - 1}`]
          ? (responses[`utter_${intent.id}_${index - 1}`][0].image =
              response.response)
          : null;
        break;
      case ResponseType.button:
      case ResponseType.quick_reply:
        // Pour le cas des réponses bouton ou réponse rapide, on les rattache à la réponse précédente.
        if (!responses[`utter_${intent.id}_${index - 1}`]) {
          break;
        }
        const buttons: string[] = response.response.split(';');
        responses[`utter_${intent.id}_${index - 1}`][0].buttons = [];
        const utter_buttons =
          responses[`utter_${intent.id}_${index - 1}`][0].buttons;
        buttons.forEach((button) => {
          utter_buttons.push(new RasaButtonModel(button));
        });
        break;
    }
  });
  return responses;
}

/**
 * Nettoyage d'une chaîne de caractère d'emojis et d'espaces en début et fin
 * @param s
 * @private
 */
function cleanStringForYaml(s: string, forKnowledge = true): string {
  let stringToReturn = s?.trim();
  if (forKnowledge) {
    stringToReturn = stringToReturn
      .replace(
        /([\uE000-\uF8FF]|\uD83C[\uDF00-\uDFFF]|\uD83D[\uDC00-\uDDFF])/g,
        '',
      )
      .replace(/\r?\n|\r|\s/g, ' ')
      .replace(/[\/\\"'`]/g, '');
  } else {
    stringToReturn = stringToReturn.replace(/(\r\n|\r|\n){2,}/g, '\n');
  }
  if (!stringToReturn) {
    return '';
  }
  return forKnowledge ? `- ${stringToReturn}\n` : `${stringToReturn}`;
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
    if (payload) {
      this.title = title;
      this.payload = payload;
    } else {
      this.title = title.substring(0, title.indexOf('<')).trim();
      this.payload = title
        .substring(title.indexOf('<') + 1, title.indexOf('>'))
        .trim();
    }
  }
}
