import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import moment from "moment";
import getAuthAxios from "@/services/authaxios";
import { storage } from "@/services/storage";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";

export default function ManagerTimesheets() {
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
 const itemsPerPage = 6;

const filtered = timesheets.filter((ts) =>
  ts.employee_username?.toLowerCase()?.includes(searchTerm.toLowerCase())
);

const totalPages = Math.ceil(filtered.length / itemsPerPage);

const paginated = filtered.slice(
  (page - 1) * itemsPerPage,
  page * itemsPerPage
);

  const [role, setRole] = useState("");

  // 🔥 ROLE CHECK
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

  // 🔥 FETCH (SAME LOGIC)
  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const api = await getAuthAxios();
      const res = await api.get("/manager-timesheets/");

      const data = Array.isArray(res.data) ? res.data : [];

      const normalized = data.reduce((acc: any[], week: any) => {
        (week.rows || []).forEach((row: any) => {
          const id = row.timesheet_id || null;
          if (!id || acc.some((t) => t.id === id)) return;

          acc.push({
            id,
            employee_username: week.employee_name || "Unknown",
            week_start: week.week_start,
            week_end: week.week_end,
            status: row.status || "submitted",
            comment: week.week_comment || row.row_comment || "",
            submitted_at:
              row.submitted_at || week.submitted_at || week.week_end,
            data: week.rows,
          });
        });
        return acc;
      }, []);

      const reviewable = normalized.filter((ts) =>
        ["submitted", "pending", "needs_edit"].includes(ts.status),
      );

      reviewable.sort(
        (a, b) =>
          new Date(b.submitted_at).getTime() -
          new Date(a.submitted_at).getTime(),
      );

      setTimesheets(reviewable);
    } catch (err) {
      console.log("Fetch error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, []);

const handleAction = (id: string, actionType: string) => {
  const title =
    actionType === "approve"
      ? "Approve Timesheet"
      : actionType === "reject"
      ? "Reject Timesheet"
      : "Request Edit";

  const message =
    actionType === "approve"
      ? "Are you sure you want to approve this timesheet?"
      : actionType === "reject"
      ? "Are you sure you want to reject this timesheet?"
      : "Are you sure you want to request changes?";

  Alert.alert(title, message, [
    {
      text: "No",
      style: "cancel",
    },
    {
      text: "Yes",
      onPress: () => {
        const reason =
          actionType === "reject"
            ? "Rejected by manager"
            : actionType === "needs_edit"
            ? "Please update timesheet"
            : "";

        submitAction(id, actionType, reason);
      },
    },
  ]);
};

const submitAction = async (id: string, actionType: string, reason: string) => {
  try {
    const api = await getAuthAxios();

    await api.post(`/timesheets/${id}/${actionType}/`, {
      reason,
    });

    Toast.show({
      type: "success",
      text1:
        actionType === "approve"
          ? "Approved"
          : actionType === "reject"
          ? "Rejected"
          : "Edit Requested",
    });

    fetchTimesheets();
  } catch (err) {
    console.log(err);

    Toast.show({
      type: "error",
      text1: "Action failed",
    });
  }
};
  if (!role) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator />
      </View>
    );
  }
  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        {/* <ActivityIndicator /> */}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50"
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 120,
      }}
      showsVerticalScrollIndicator={false}
    >


<View className="mb-4">

  {/* 🔥 HEADER */}


  {/* 🔥 HEADER */}
  <View className="flex-row justify-between items-center mb-3">
    
    {/* LEFT */}
    <View>
      <Text className="text-[18px] font-bold text-gray-800">
        Timesheet Review
      </Text>
      <Text className="text-[12px] text-gray-400 mt-0.5">
{filtered.length > 0
  ? `Showing ${(page - 1) * itemsPerPage + 1}–${Math.min(
      page * itemsPerPage,
      filtered.length
    )} of ${filtered.length}`
  : "No results"}
      </Text>
    </View>

    {/* RIGHT COUNT BADGE */}
    <View className="bg-blue-100 px-3 py-1 rounded-full">
      <Text className="text-[12px] font-semibold text-blue-600">
        {filtered.length}
      </Text>
    </View>

  </View>

  {/* 🔍 SEARCH */}
  <View className="flex-row items-center bg-white rounded-2xl px-3 py-2 border border-gray-200 shadow-sm">

    {/* ICON */}
    <Ionicons name="search" size={18} color="#9ca3af" />

    {/* INPUT */}
    <TextInput
      placeholder="Search employee, project..."
      placeholderTextColor="#9ca3af"
      value={searchTerm}
      onChangeText={(t) => {
        setSearchTerm(t);
        setPage(1);
      }}
      className="flex-1 ml-2 text-[14px] text-gray-800"
    />

    {/* CLEAR */}
    {searchTerm.length > 0 && (
      <Pressable onPress={() => setSearchTerm("")}>
        <Ionicons name="close-circle" size={18} color="#9ca3af" />
      </Pressable>
    )}
  </View>

</View>

      {/* LIST */}

      {paginated.length === 0 && (
        <View className="items-center mt-16">
          <View className="w-14 h-14 rounded-full bg-gray-100 items-center justify-center mb-3">
            <Ionicons name="document-text-outline" size={26} color="#9ca3af" />
          </View>
          <Text className="text-gray-700 font-semibold text-[14px]">
            No Timesheets
          </Text>
          <Text className="text-gray-400 text-[11px] mt-1">
            Nothing pending for review
          </Text>
        </View>
      )}

      {paginated.map((ts) => {
        const disable = ts.status !== "submitted";

        const statusConfig: any = {
          approved: { color: "#16A34A", bg: "#DCFCE7" },
          rejected: { color: "#DC2626", bg: "#FEE2E2" },
          submitted: { color: "#F59E0B", bg: "#FEF3C7" },
        };

        const theme = statusConfig[ts.status] || statusConfig.submitted;

        return (
          <View
            key={ts.id}
            className="bg-white rounded-2xl p-4 mb-4 border border-gray-100 shadow-sm"
          >
            {/* 🔥 TOP */}
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center gap-2">
                <View className="w-9 h-9 rounded-full bg-blue-100 items-center justify-center">
                  <Ionicons name="person" size={16} color="#2563eb" />
                </View>

                <View>
                  <Text className="text-[13px] font-semibold text-gray-800">
                    {ts.employee_username}
                  </Text>
                  <Text className="text-[10px] text-gray-400">
                    Submitted {moment(ts.submitted_at).format("DD MMM")}
                  </Text>
                </View>
              </View>

              {/* STATUS */}
              <View
                style={{ backgroundColor: theme.bg }}
                className="px-3 py-1 rounded-full"
              >
                <Text
                  style={{ color: theme.color }}
                  className="text-[10px] font-semibold capitalize"
                >
                  {ts.status}
                </Text>
              </View>
            </View>

            {/* 📅 WEEK */}
            <View className="mt-3 flex-row items-center gap-2">
              <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
              <Text className="text-[11px] text-gray-500">
                {moment(ts.week_start).format("DD MMM")} →{" "}
                {moment(ts.week_start).add(6, "days").format("DD MMM")}
              </Text>
            </View>

            {/* 🔘 ACTIONS */}
            <View className="flex-row justify-between mt-4">
              {/* VIEW */}
              <Pressable
                onPress={() =>
                  router.push({
                    pathname: "/timesheet-detail",
                    params: {
                      id: ts.id,
                      week_start: ts.week_start,
                    },
                  })
                }
                className="flex-1 mr-1 py-2 rounded-xl bg-gray-100 flex-row items-center justify-center gap-1"
              >
                <Ionicons name="eye-outline" size={14} color="#374151" />
                <Text className="text-[11px] font-medium text-gray-700">
                  View
                </Text>
              </Pressable>

              {/* APPROVE */}
              <Pressable
                onPress={() => handleAction(ts.id, "approve")}
                disabled={disable}
                className={`flex-1 mx-1 py-2 rounded-xl flex-row items-center justify-center gap-1 ${
                  disable ? "bg-gray-200" : "bg-green-600"
                }`}
              >
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={disable ? "#9ca3af" : "#fff"}
                />
                <Text
                  className={`text-[11px] font-medium ${
                    disable ? "text-gray-400" : "text-white"
                  }`}
                >
                  Approve
                </Text>
              </Pressable>

              {/* REJECT */}
              <Pressable
                onPress={() => handleAction(ts.id, "reject")}
                disabled={disable}
                className={`flex-1 ml-1 py-2 rounded-xl flex-row items-center justify-center gap-1 ${
                  disable ? "bg-gray-200" : "bg-red-600"
                }`}
              >
                <Ionicons
                  name="close"
                  size={14}
                  color={disable ? "#9ca3af" : "#fff"}
                />
                <Text
                  className={`text-[11px] font-medium ${
                    disable ? "text-gray-400" : "text-white"
                  }`}
                >
                  Reject
                </Text>
              </Pressable>
              {/* REQUEST EDIT */}
<Pressable
  onPress={() => handleAction(ts.id, "needs_edit")}
  disabled={disable}
  className={`flex-1 ml-1 py-2 rounded-xl flex-row items-center justify-center gap-1 ${
    disable ? "bg-gray-200" : "border border-yellow-500"
  }`}
>
  <Ionicons
    name="create-outline"
    size={14}
    color={disable ? "#9ca3af" : "#ca8a04"}
  />
  <Text
    className={`text-[11px] font-medium ${
      disable ? "text-gray-400" : "text-yellow-700"
    }`}
  >
    Edit
  </Text>
</Pressable>
            </View>
          </View>
        );
      })}
<View className="flex-row items-center justify-between mt-6 px-2">

  {/* ⬅️ PREV */}
  <Pressable
    onPress={() => setPage((p) => Math.max(1, p - 1))}
    disabled={page === 1}
    className="flex-row items-center gap-1"
  >
    <Ionicons
      name="chevron-back"
      size={18}
      color={page === 1 ? "#d1d5db" : "#2563eb"}
    />
    <Text
      className={`text-[13px] font-medium ${
        page === 1 ? "text-gray-300" : "text-blue-600"
      }`}
    >
      Prev
    </Text>
  </Pressable>

  {/* 📊 CENTER INFO */}
  <Text className="text-[12px] text-gray-500 font-medium">
    {filtered.length === 0
      ? "No results"
      : `${(page - 1) * itemsPerPage + 1}-${Math.min(
          page * itemsPerPage,
          filtered.length
        )} of ${filtered.length}`}
  </Text>

  {/* ➡️ NEXT */}
  <Pressable
    onPress={() =>
      setPage((p) => Math.min(totalPages, p + 1))
    }
    disabled={page === totalPages || totalPages === 0}
    className="flex-row items-center gap-1"
  >
    <Text
      className={`text-[13px] font-medium ${
        page === totalPages || totalPages === 0
          ? "text-gray-300"
          : "text-blue-600"
      }`}
    >
      Next
    </Text>
    <Ionicons
      name="chevron-forward"
      size={18}
      color={
        page === totalPages || totalPages === 0
          ? "#d1d5db"
          : "#2563eb"
      }
    />
  </Pressable>

</View>
    </ScrollView>
  );
}
