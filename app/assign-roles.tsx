import React, { useEffect, useState, useMemo, useCallback } from "react";
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

const ROLE_OPTIONS = [
  { value: "employee", label: "Employee" },
  { value: "manager", label: "Manager" },
  { value: "hr", label: "HR" },
];

const ROWS_PER_PAGE = 10;

export default function AssignRoles() {
  const router = useRouter();

  const [users, setUsers] = useState([]);
  const [pendingChanges, setPendingChanges] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const [toast, setToast] = useState(null);

  // ---------------- HELPERS ----------------
  const idOf = useCallback((u) => u.id ?? u._id ?? u.email ?? u.username, []);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 2800);
  }, []);

  // ---------------- FETCH USERS ----------------
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/users/");
      setUsers(
        Array.isArray(res.data)
          ? res.data
          : res.data?.users
            ? res.data.users
            : [],
      );
    } catch {
      showToast("error", "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // ---------------- SYNC ----------------
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post("/api/users/sync");
      if (res.data?.users) setUsers(res.data.users);
      else await fetchUsers();

      setPage(1);
      showToast("success", "Users synced");
    } catch {
      showToast("error", "Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  // ---------------- ROLE CHANGE ----------------
  const handleRoleChange = (userId, newRole) => {
    setUsers((prev) =>
      prev.map((u) => (idOf(u) === userId ? { ...u, role: newRole } : u)),
    );

    setPendingChanges((p) => ({ ...p, [userId]: newRole }));
  };

  // ---------------- SAVE ALL ----------------
  const handleSaveChanges = async () => {
    const entries = Object.entries(pendingChanges);

    if (!entries.length) {
      showToast("info", "No changes pending");
      return;
    }

    setSaving(true);

    try {
      for (const [id, role] of entries) {
        await api.post("/api/assign-role/", {
          user: id,
          role,
        });
      }

      setPendingChanges({});
      showToast("success", "All changes saved");
    } catch {
      showToast("error", "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // ---------------- FILTER ----------------
  const filtered = useMemo(() => {
    const t = searchTerm.toLowerCase();

    return users.filter((u) => {
      const n = (u.username || u.displayName || u.name || "").toLowerCase();
      const e = (u.email || "").toLowerCase();
      return n.includes(t) || e.includes(t);
    });
  }, [users, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const currentPage = Math.min(page, totalPages);

  const paginated = filtered.slice(
    (currentPage - 1) * ROWS_PER_PAGE,
    currentPage * ROWS_PER_PAGE,
  );

  const hasPending = Object.keys(pendingChanges).length > 0;

  // ---------------- UI ----------------
  return (
<View className="flex-1 bg-gray-100 px-3 pt-1 pb-5">

  {/* 🔷 HEADER */}
  <View className="flex-row justify-between items-center mb-1 bg-white p-3 rounded-2xl shadow-sm ">
    <TouchableOpacity onPress={() => router.back()} className="flex-row items-center gap-1">
      <Ionicons name="arrow-back" size={18} color="#2563eb" />
      <Text className="text-blue-600 font-medium">Back</Text>
    </TouchableOpacity>

    <TouchableOpacity
      onPress={handleSync}
      disabled={syncing}
      className="flex-row items-center gap-1 bg-gray-100 px-3 py-1 rounded-full"
    >
      <Ionicons name="sync-outline" size={16} color="#374151" />
      <Text className="text-gray-700 text-xs">
        {syncing ? "Syncing..." : "Sync"}
      </Text>
    </TouchableOpacity>
  </View>

  {/* 🔥 TITLE */}
  <Text className="text-lg font-bold text-gray-800 mb-0">
    Assign Roles
  </Text>

  {/* 🔍 SEARCH */}
  <View className="flex-row items-center bg-white px-1 py-0 rounded-xl border border-gray-200 ">
    <Ionicons name="search-outline" size={16} color="#9ca3af" />
    <TextInput
      placeholder="Search users..."
      value={searchTerm}
      onChangeText={(t) => {
        setSearchTerm(t);
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
        const changed = pendingChanges.hasOwnProperty(uid);
        const role = item.role || "";

        return (
          <View className="bg-white p-4 mb-3 rounded-2xl shadow-sm border border-gray-200">

            {/* 👤 USER */}
            <View className="flex-row items-center justify-between">
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
                  <Text className="text-[10px] text-yellow-700">Pending</Text>
                </View>
              )}
            </View>

            {/* 🎭 ROLE SELECT */}
            <View className="flex-row flex-wrap gap-2 mt-3">
              {ROLE_OPTIONS.map((r) => {
                const selected = role === r.value;

                return (
                  <TouchableOpacity
                    key={r.value}
                    onPress={() => handleRoleChange(uid, r.value)}
                    className={`px-3 py-1 rounded-full border ${
                      selected
                        ? "bg-indigo-600 border-indigo-600"
                        : "bg-gray-100 border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-xs ${
                        selected ? "text-white" : "text-gray-600"
                      }`}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 💾 SAVE BUTTON */}
            <TouchableOpacity
              disabled={!changed || saving}
              onPress={async () => {
                if (!changed) return;

                setSaving(true);

                try {
                  await api.post("/api/assign-role/", {
                    user: uid,
                    role: pendingChanges[uid],
                  });

                  setPendingChanges((p) => {
                    const x = { ...p };
                    delete x[uid];
                    return x;
                  });

                  showToast("success", "Saved");
                } catch {
                  showToast("error", "Failed");
                } finally {
                  setSaving(false);
                }
              }}
              className={`mt-3 py-2 rounded-xl ${
                changed ? "bg-indigo-600" : "bg-gray-200"
              }`}
            >
              <Text className="text-white text-center text-sm font-medium">
                {changed ? "Save Changes" : "Saved"}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  )}

  {/* 🔄 PAGINATION */}
  <View className="flex-row justify-between items-center bg-white p-3 rounded-xl mt-2 border border-gray-200">
    <TouchableOpacity
      onPress={() => setPage((p) => Math.max(1, p - 1))}
      className="px-3 py-1 bg-gray-100 rounded-full"
    >
      <Text className="text-xs">Prev</Text>
    </TouchableOpacity>

    <Text className="text-xs text-gray-600">
      Page {page} / {totalPages}
    </Text>

    <TouchableOpacity
      onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
      className="px-3 py-1 bg-gray-100 rounded-full"
    >
      <Text className="text-xs">Next</Text>
    </TouchableOpacity>
  </View>

  {/* 💾 SAVE ALL */}
  <TouchableOpacity
    disabled={!hasPending || saving}
    onPress={handleSaveChanges}
    className={`mt-3 p-3 rounded-2xl ${
      hasPending ? "bg-indigo-600" : "bg-gray-300"
    }`}
  >
    <Text className="text-white text-center font-semibold">
      {saving ? "Saving..." : "Save All Changes"}
    </Text>
  </TouchableOpacity>

  {/* 🔔 TOAST */}
  {toast && (
    <View className="absolute top-10 left-1/2 -translate-x-1/2 bg-black px-4 py-2 rounded-xl">
      <Text className="text-white text-xs">{toast.msg}</Text>
    </View>
  )}

</View>
  );
}
