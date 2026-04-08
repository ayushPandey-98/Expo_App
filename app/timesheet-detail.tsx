import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { useEffect, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import moment from "moment";
import getAuthAxios from "@/services/authaxios";
import { storage } from "@/services/storage";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
export default function TimesheetDetail() {
  const { id, week_start } = useLocalSearchParams();

  const [timesheet, setTimesheet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("");

  // 🔥 LOAD USER ROLE
  useEffect(() => {
    const load = async () => {
      const u = await storage.get("user");
      if (u) {
        const user = JSON.parse(u);
        setRole(user.role?.toLowerCase());
      }
    };
    load();
  }, []);

  // 🔥 FETCH TIMESHEET
  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const api = await getAuthAxios();

        const endpoint =
          role === "manager" || role === "hr"
            ? `/manager-timesheets/${id}/`
            : `/timesheets/${id}/`;

        const res = await api.get(endpoint);

        setTimesheet({
          employee_username: res.data.employee_username,
          manager_username: res.data.manager_username,
          week_start,
          data: res.data.data || res.data.rows || [],
        });
      } catch (err) {
        console.log("Detail error", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, role]);

  // 🔥 WEEK DATES
  const getWeekDates = (start: string) => {
    const monday = moment(start).isoWeekday(1);
    return Array.from({ length: 7 }, (_, i) => monday.clone().add(i, "days"));
  };

  const weekDates = timesheet ? getWeekDates(timesheet.week_start) : [];

  // ================= UI =================

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }

  if (!timesheet) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text>No timesheet found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-100"
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
    >
      {/* 🔥 HERO HEADER (GRADIENT + DEPTH) */}
      <LinearGradient
        colors={["#2563eb", "#4f46e5"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 20,
          padding: 16,
          marginBottom: 16,
          shadowColor: "#000",
          shadowOpacity: 0.25,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <Text className="text-white text-[16px] font-bold mb-3">
          Timesheet Details
        </Text>

       <View
  style={{
    marginTop: 10,
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#f9f9f9", 
   
  }}
>
  {/* EMPLOYEE */}
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    }}
  >
    <Ionicons name="person" size={16} color="#93c5fd" />
    <Text
      style={{
        marginLeft: 8,
        fontSize: 11,
        
        width: 90,
      }}
    >
      Employee
    </Text>
    <Text
      style={{
        fontSize: 13,
        // color: "#fff",
        fontWeight: "600",
      }}
    >
      {timesheet.employee_username}
    </Text>
  </View>

  {/* APPROVER */}
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    }}
  >
    <Ionicons name="briefcase" size={16} color="#86efac" />
    <Text
      style={{
        marginLeft: 8,
        fontSize: 11,
        // color: "#9ca3af",
        width: 90,
      }}
    >
      Approver
    </Text>
    <Text
      style={{
        fontSize: 13,
        // color: "#fff",
        fontWeight: "600",
      }}
    >
      {timesheet.manager_username}
    </Text>
  </View>

  {/* DATE */}
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
    }}
  >
    <Ionicons name="calendar" size={16} color="#fcd34d" />
    <Text
      style={{
        marginLeft: 8,
        fontSize: 11,
        // color: "#9ca3af",
        width: 90,
      }}
    >
      Week
    </Text>
    <Text
      style={{
        fontSize: 13,
        // color: "#fff",
        fontWeight: "600",
      }}
    >
      {moment(timesheet.week_start).format("DD MMM")} →{" "}
      {moment(timesheet.week_start).add(6, "days").format("DD MMM")}
    </Text>
  </View>
</View>
      </LinearGradient>

      {/* 🔥 TABLE CONTAINER (GLASS CARD) */}
      <View
        style={{
          backgroundColor: "#ffffff",
          borderRadius: 20,
          padding: 14,
          shadowColor: "#000",
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        {/* WEEK HEADER */}
        <View className="flex-row items-center mb-3 pb-2 border-b border-gray-200">
          <Text className="w-24 text-[11px] font-bold text-gray-600">
            Project
          </Text>

          {weekDates.map((d, i) => (
            <View key={i} className="flex-1 items-center">
              <Text className="text-[10px] font-semibold text-gray-700">
                {d.format("ddd")}
              </Text>
              <Text className="text-[9px] text-gray-400">{d.format("DD")}</Text>
            </View>
          ))}
        </View>

        {/* DATA */}
        {(Array.isArray(timesheet.data) ? timesheet.data : []).map(
          (entry: any, i: number) => (
            <View
              key={i}
              style={{
                marginBottom: 14,
                borderRadius: 16,
                padding: 12,
                backgroundColor: "#f8fafc",
                borderWidth: 1,
                borderColor: "#eef2ff",
              }}
            >
              {/* PROJECT HEADER */}
              <View className="flex-row items-center justify-between mb-3">
                <Text className="text-[13px] font-bold text-gray-800">
                  {entry.project || "No Project"}
                </Text>

                <View className="bg-indigo-100 px-2 py-1 rounded-full">
                  <Text className="text-[10px] text-indigo-600 font-semibold">
                    Task
                  </Text>
                </View>
              </View>

              {/* HOURS (3D BLOCKS) */}
              <View className="flex-row justify-between mb-3">
                {(Array.isArray(entry.secs) ? entry.secs : []).map(
                  (sec: number, j: number) => (
                    <View
                      key={j}
                      style={{
                        flex: 1,
                        marginHorizontal: 2,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: "#ffffff",
                        alignItems: "center",

                        shadowColor: "#000",
                        shadowOpacity: 0.1,
                        shadowRadius: 6,
                        elevation: 3,
                      }}
                    >
                      <Text className="text-[12px] font-bold text-gray-800">
                        {sec}
                      </Text>
                    </View>
                  ),
                )}
              </View>

              {/* NSA INDICATOR */}
              <View className="flex-row justify-between mb-2">
                {(Array.isArray(entry.nsa) ? entry.nsa : []).map(
                  (flag: boolean, j: number) => (
                    <View key={j} className="flex-1 items-center">
                      <View
                        style={{
                          width: 18,
                          height: 18,
                          borderRadius: 5,
                          backgroundColor: flag ? "#4f46e5" : "#d1d5db",
                        }}
                      />
                    </View>
                  ),
                )}
              </View>

              {/* COMMENT */}
            {entry.comment && (
  <View
    style={{
      marginTop: 10,
      padding: 10,
      borderRadius: 12,
      backgroundColor: "#f9fafb",
      borderWidth: 1,
      borderColor: "#e5e7eb",
    }}
  >
    {/* 🔹 Header */}
    <Text
      style={{
        fontSize: 11,
        fontWeight: "600",
        color: "#6b7280",
        marginBottom: 4,
      }}
    >
      💬 Comment
    </Text>

    {/* 🔹 Content */}
    <Text
      style={{
        fontSize: 12,
        color: "#374151",
        lineHeight: 16,
      }}
    >
      {entry.comment}
    </Text>
  </View>
)}
            </View>
          ),
        )}
      </View>
    </ScrollView>
  );
}
