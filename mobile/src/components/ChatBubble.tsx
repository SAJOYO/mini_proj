import { Text, View } from "react-native";
import type { ChatMessage } from "../types";

export function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <View
      className={`my-1 max-w-[80%] rounded-2xl px-4 py-2 ${
        isUser ? "self-end bg-blue-500" : "self-start bg-gray-200"
      }`}
    >
      <Text className={isUser ? "text-white" : "text-gray-900"}>
        {message.content}
      </Text>
    </View>
  );
}
