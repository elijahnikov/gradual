import { Stack } from "expo-router";
import { SafeAreaView, Text, View } from "react-native";

export default function Post() {
  // const { id } = useGlobalSearchParams<{ id: string }>();
  // const { data } = useQuery(trpc.post.byId.queryOptions({ id }));

  // if (!data) {
  //   return null;
  // }

  return (
    <SafeAreaView className="bg-background">
      <Stack.Screen options={{ title: "Post" }} />
      <View className="h-full w-full p-4">
        <Text className="py-2 font-bold text-3xl text-primary">Post</Text>
        <Text className="py-4 text-foreground">Content</Text>
      </View>
    </SafeAreaView>
  );
}
