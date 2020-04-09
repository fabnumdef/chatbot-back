import { ResponseType } from "@core/enums/response-type.enum";

export interface TemplateFileDto {
  id: string;
  category: string;
  main_question: string;
  response_type: ResponseType;
  response: string;
  questions: string [];
}
