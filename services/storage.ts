import AsyncStorage from "@react-native-async-storage/async-storage";

export const storage = {
  async get(key: string) {
    return await AsyncStorage.getItem(key);
  },
  async set(key: string, value: string) {
    return await AsyncStorage.setItem(key, value);
  },
  async remove(key: string) {
    return await AsyncStorage.removeItem(key);
  },
};
