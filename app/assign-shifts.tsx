import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import api from "@/services/api";
import Header from "@/components/Header";
import { Ionicons } from "@expo/vector-icons";

const SHIFTS = [
  { label: "11:30am — 8:30pm", value: "11:30-20:30" },
  { label: "2:00pm — 11:00pm", value: "14:00-23:00" },
  { label: "4:30pm — 2:30am", value: "16:30-02:30" },
];

const ROWS_PER_PAGE = 10;

export default function AssignShifts() {
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState({});
  const [originalAssignments, setOriginalAssignments] = useState({});
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get("/api/users/");
      const fetched = Array.isArray(res.data)
        ? res.data
        : res.data.users ?? [];

      setUsers(fetched);

      const map = {};

      await Promise.all(
        fetched.map(async (u) => {
          const id = u.id ?? u._id ?? u.email ?? u.username;
          try {
            const r = await api.get(`/api/shifts/user/${id}/`);
            map[id] = r?.data?.shift ?? null;
          } catch {
            map[id] = null;
          }
        })
      );

      setAssignments(map);
      setOriginalAssignments(map);
    } catch {
      showToast("error", "Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  function idOf(u) {
    return u.id ?? u._id ?? u.email ?? u.username;
  }

  function showToast(type, msg) {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  }

  function setShift(userId, shiftValue) {
    setAssignments((prev) => ({ ...prev, [userId]: shiftValue }));
  }

  const filtered = useMemo(() => {
    const term = search.toLowerCase();
    return users.filter((u) => {
      const name = (u.username || u.displayName || u.name || "").toLowerCase();
      const email = (u.email || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const paginated = filtered.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE
  );

  const pendingCount = Object.keys(assignments).filter(
    (id) => assignments[id] !== originalAssignments[id]
  ).length;

  const hasChanges = pendingCount > 0;

  async function saveAll() {
    if (!hasChanges) {
      showToast("info", "No changes to save");
      return;
    }

    setSaving(true);

    const changes = Object.entries(assignments).filter(
      ([id, s]) => originalAssignments[id] !== s
    );

    try {
      await Promise.all(
        changes.map(([userId, shift]) =>
          api.post("/api/assign-shift/", { user: userId, shift })
        )
      );

      setOriginalAssignments(assignments);
      showToast("success", "All changes saved");
    } catch {
      showToast("error", "Failed to save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
   <View className="flex-1 bg-gray-100 px-3 pt-1 pb-5 ">

  {/* 🔷 HEADER */}
  <View className="flex-row justify-between items-center bg-white p-3 rounded-2xl shadow-sm">
    <TouchableOpacity
      onPress={() => router.back()}
      className="flex-row items-center gap-1"
    >
      <Ionicons name="arrow-back" size={18} color="#2563eb" />
      <Text className="text-blue-600 font-medium">Back</Text>
    </TouchableOpacity>

    <View className="flex-row items-center gap-1">
      <Ionicons name="time-outline" size={16} color="#374151" />
      <Text className="font-semibold text-gray-800">
        Assign Shifts
      </Text>
    </View>
  </View>

  {/* 🔍 SEARCH */}
  <View className="flex-row items-center bg-white px-1 py-0 rounded-xl border border-gray-200 ">
    <Ionicons name="search-outline" size={16} color="#9ca3af" />
    <TextInput
      placeholder="Search users..."
      value={search}
      onChangeText={(t) => {
        setSearch(t);
        setPage(1);
      }}
      className="ml-2 flex-1 text-sm"
    />
  </View>

  {/* 📋 LIST */}
  {loading ? (
    <ActivityIndicator />
  ) : (
    <FlatList
      data={paginated}
      keyExtractor={(item) => idOf(item)}
      renderItem={({ item }) => {
        const uid = idOf(item);
        const current = assignments[uid];
        const original = originalAssignments[uid];
        const changed = current !== original;

        return (
          <View className="bg-white p-4 mb-3 rounded-2xl shadow-sm border border-gray-200">

            {/* 👤 USER */}
            <View className="flex-row justify-between items-center">
              <View>
                <Text className="font-semibold text-gray-800">
                  {item.username || item.email}
                </Text>
                <Text className="text-xs text-gray-400">
                  {item.email}
                </Text>
              </View>

              {changed && (
                <View className="bg-yellow-100 px-2 py-1 rounded-full">
                  <Text className="text-[10px] text-yellow-700">
                    Pending
                  </Text>
                </View>
              )}
            </View>

            {/* 🔥 SHIFT OPTIONS */}
            <View className="flex-row flex-wrap gap-2 mt-3">
              {SHIFTS.map((s) => {
                const selected = current === s.value;

                return (
                  <TouchableOpacity
                    key={s.value}
                    onPress={() => setShift(uid, s.value)}
                    className={`flex-row items-center gap-1 px-3 py-1 rounded-full border ${
                      selected
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <Ionicons
                      name="time-outline"
                      size={12}
                      color={selected ? "white" : "#6b7280"}
                    />
                    <Text
                      className={`text-xs ${
                        selected ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {s.label.split(" — ")[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

          </View>
        );
      }}
    />
  )}

  {/* 🔄 PAGINATION */}
  <View className="flex-row justify-between items-center bg-white p-3 rounded-xl border border-gray-200 mt-2">
    <TouchableOpacity
      onPress={() => setPage((p) => Math.max(1, p - 1))}
      className="px-3 py-1 bg-gray-100 rounded-full"
    >
      <Text className="text-xs text-gray-700">Prev</Text>
    </TouchableOpacity>

    <Text className="text-xs text-gray-600">
      Page {page} / {totalPages}
    </Text>

    <TouchableOpacity
      onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
      className="px-3 py-1 bg-gray-100 rounded-full"
    >
      <Text className="text-xs text-gray-700">Next</Text>
    </TouchableOpacity>
  </View>

  {/* 💾 SAVE BUTTON */}
  <TouchableOpacity
    onPress={saveAll}
    disabled={!hasChanges}
    className={`mt-3 p-3 rounded-2xl flex-row justify-center items-center gap-2 ${
      hasChanges ? "bg-indigo-600" : "bg-gray-300"
    }`}
  >
    <Ionicons name="save-outline" size={16} color="white" />
    <Text className="text-white font-semibold">
      {saving ? "Saving..." : "Save Changes"}
    </Text>
  </TouchableOpacity>

  {/* 🔔 TOAST */}
  {toast && (
    <View className="absolute top-12 left-1/2 -translate-x-1/2 bg-black px-4 py-2 rounded-xl">
      <Text className="text-white text-xs">{toast.msg}</Text>
    </View>
  )}

</View>
  );
}