import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { sendMessage } from "../api/client";
import { ChatBubble } from "../components/ChatBubble";
import type { AnimalType, ChatMessage } from "../types";

const ANIMALS: { type: AnimalType; label: string; emoji: string }[] = [
  { type: "dog", label: "멍이", emoji: "🐶" },
  { type: "cat", label: "나비", emoji: "🐱" },
];

// 데모용 고정 사용자 ID. 실제 서비스에서는 로그인된 사용자 ID로 교체.
const DEMO_USER_ID = "demo-user";

export default function ChatScreen() {
  const [animal, setAnimal] = useState<AnimalType>("dog");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const currentAnimal = ANIMALS.find((a) => a.type === animal)!;

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setInput("");
    setLoading(true);

    try {
      const reply = await sendMessage(DEMO_USER_ID, animal, text);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "(⚠️ 서버에 연결하지 못했어요)" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-white pt-16"
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View className="flex-row justify-center gap-2 pb-3">
        {ANIMALS.map((a) => (
          <Pressable
            key={a.type}
            onPress={() => {
              setAnimal(a.type);
              setMessages([]);
            }}
            className={`rounded-full px-4 py-2 ${
              animal === a.type ? "bg-blue-500" : "bg-gray-100"
            }`}
          >
            <Text className={animal === a.type ? "text-white" : "text-gray-700"}>
              {a.emoji} {a.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <ScrollView className="flex-1 px-4">
        {messages.map((m, i) => (
          <ChatBubble key={i} message={m} />
        ))}
        {loading && (
          <Text className="self-start px-2 text-gray-400">
            {currentAnimal.label}이(가) 생각 중... 🐾
          </Text>
        )}
      </ScrollView>

      <View className="flex-row items-center gap-2 border-t border-gray-200 p-3">
        <TextInput
          className="flex-1 rounded-full bg-gray-100 px-4 py-2"
          placeholder="메시지를 입력하세요"
          value={input}
          onChangeText={setInput}
          onSubmitEditing={handleSend}
        />
        <Pressable onPress={handleSend} className="rounded-full bg-blue-500 px-4 py-2">
          <Text className="text-white">전송</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
