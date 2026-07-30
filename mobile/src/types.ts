export type AnimalType = "dog" | "cat";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
