import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import getAuthAxios from "@/services/authaxios";

const formatDate = (date) => {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

export default function ProjectHolidays() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [project, setProject] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const scaleAnim = useRef(new Animated.Value(1)).current;

  const scaleIn = () =>
    Animated.timing(scaleAnim, {
      toValue: 0.95,
      duration: 120,
      easing: Easing.out(Easing.circle),
      useNativeDriver: true,
    }).start();

  const scaleOut = () =>
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.circle),
      useNativeDriver: true,
    }).start();

  const loadData = async () => {
    try {
      const axios = await getAuthAxios();
      const p = await axios.get(`/projects/${id}`);
      setProject(p.data);

      const h = await axios.get(`/projects/${id}/holidays/`);
      setHolidays(h.data || []);
    } catch (err) {
      console.log("LOAD ERROR:", err?.response?.data || err.message);
      Alert.alert("Error", "Failed to load data");
    }
  };

  useEffect(() => {
    if (id) loadData();
  }, [id]);

  const addHoliday = async () => {
    if (!selectedDate) {
      Alert.alert("Warning", "Please select a date");
      return;
    }

    setLoading(true);
    try {
      const axios = await getAuthAxios();
      await axios.post(`/projects/${id}/holidays/`, { date: selectedDate });
      setHolidays((prev) => [...prev, selectedDate]);
      setSelectedDate("");
      Toast.show({
        type: "success",
        text1: "Holiday added 🎉",
        text2: "The holiday was successfully added.",
      });
    } catch (err) {
      console.log("ADD ERROR:", err?.response?.data || err.message);
      Toast.show({
        type: "error",
        text1: "Failed to Add Holiday",
        text2: "Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  const removeHoliday = async (date) => {
    setLoading(true);
    try {
      const axios = await getAuthAxios();
      await axios.delete(`/projects/${id}/holidays/?date=${date}`);
      setHolidays((prev) => prev.filter((d) => d !== date));
      Toast.show({
        type: "info",
        text1: "Holiday removed",
        text2: "Holiday deleted successfully.",
      });
    } catch (err) {
      console.log("DELETE ERROR:", err?.response?.data || err.message);
      Alert.alert("Error", "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const onDateChange = (event, selected) => {
    setShowPicker(false);
    if (selected) {
      const iso = selected.toISOString().split("T")[0];
      setSelectedDate(iso);
    }
  };

  return (
    <LinearGradient
      colors={["#f0f9ff", "#e0f2fe", "#eef2ff"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      className="flex-1 p-4"
    >
      {/* HEADER */}
      <View className="flex-row items-center mb-6">
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-white rounded-full p-2 shadow-md shadow-blue-200"
        >
          <Ionicons name="arrow-back" size={22} color="#2563eb" />
        </TouchableOpacity>
        <Text className="ml-3 text-2xl font-bold text-gray-900 flex-shrink">
          {project?.name || "Project"} Holidays
        </Text>
      </View>

      {/* ADD HOLIDAY CARD */}
      <Animated.View
        style={{
          transform: [
            { scale: scaleAnim },
            { perspective: 800 },
            { rotateX: "3deg" },
            { rotateY: "-3deg" },
          ],
        }}
        className="bg-white/95 rounded-3xl mb-5 p-5 shadow-xl shadow-blue-100"
      >
        <Text className="text-lg font-semibold text-gray-800 mb-3">
          Add New Holiday
        </Text>

        <View className="flex-row items-center bg-gray-50 border border-gray-300 rounded-xl mb-3">
          <TextInput
            placeholder="YYYY-MM-DD"
            placeholderTextColor="#9ca3af"
            value={selectedDate}
            onChangeText={setSelectedDate}
            className="flex-1 p-3 text-gray-800 text-base"
          />
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            className="p-3 bg-blue-50 border-l border-gray-200 rounded-r-xl"
          >
            <Ionicons name="calendar" size={22} color="#2563eb" />
          </TouchableOpacity>
        </View>

        {showPicker && (
          <DateTimePicker
            value={new Date()}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            onChange={onDateChange}
          />
        )}

        <TouchableOpacity
          onPressIn={scaleIn}
          onPressOut={scaleOut}
          onPress={addHoliday}
          disabled={!selectedDate || loading}
          activeOpacity={0.9}
          className={`py-3 rounded-xl shadow-md ${
            !selectedDate || loading ? "bg-blue-300" : "bg-blue-600"
          }`}
        >
          <Text className="text-white font-semibold text-base text-center">
            {loading ? "Adding..." : "➕ Add Holiday"}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* HOLIDAY LIST */}
      {holidays.length === 0 ? (
        <View className="flex-1 justify-center items-center">
          <Ionicons name="sunny-outline" size={48} color="#93c5fd" />
          <Text className="text-gray-500 text-base mt-2">
            No holidays added yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={holidays}
          keyExtractor={(item, index) => index.toString()}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between" }}
          renderItem={({ item }) => (
            <Animated.View
              style={{
                transform: [
                  { perspective: 600 },
                  { rotateX: "2deg" },
                  { rotateY: "-2deg" },
                ],
              }}
              className="flex-1 bg-white m-1.5 p-4 rounded-3xl shadow-lg shadow-blue-200"
            >
              <Text className="font-bold text-gray-900 mb-1">
                {project?.name} Holiday
              </Text>
              <Text className="text-gray-600 mb-3">{formatDate(item)}</Text>

              <TouchableOpacity
                onPress={() => removeHoliday(item)}
                className="border border-red-300 bg-red-100 py-2 rounded-lg active:bg-red-200"
              >
                <Text className="text-red-600 text-center font-semibold">
                  Remove
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        />
      )}

      <Toast />
    </LinearGradient>
  );
}
