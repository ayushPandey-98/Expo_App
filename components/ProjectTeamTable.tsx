import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  Alert,
  ScrollView,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import getAuthAxios from "@/services/authaxios";
import Toast from "react-native-toast-message";
import { Ionicons } from "@expo/vector-icons";

const ITEMS_PER_PAGE = 20;

const ProjectTeamTable = ({ data, activeTab, projectCounts, onRefresh }) => {
  const router = useRouter();

  const [confirmData, setConfirmData] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [editingProject, setEditingProject] = useState(null);

  useEffect(() => setPage(1), [activeTab]);

  // ---------------- MERGE DATA ----------------
  let mergedData = [];

  if (activeTab === "teams") {
    const userMap = {};

    data?.forEach((item) => {
      if (!item.email) return;

      const key = item.email.toLowerCase();

      if (!userMap[key]) {
        userMap[key] = {
          ...item,
          projects: new Set(item.projects || []),
        };
      } else {
        (item.projects || []).forEach((proj) =>
          userMap[key].projects.add(proj),
        );
      }
    });

    mergedData = Object.values(userMap).map((u) => ({
      ...u,
      projects: Array.from(u.projects),
    }));
  } else {
    mergedData = data || [];
  }

  // ---------------- SEARCH ----------------
  const filteredData = mergedData?.filter((item) => {
    const q = search.toLowerCase();

    if (activeTab === "projects") {
      return (
        (item.name || "").toLowerCase().includes(q) ||
        (item.projectName || "").toLowerCase().includes(q) ||
        String(item.id || "").includes(q) ||
        (item.pocEmail || "").toLowerCase().includes(q)
      );
    }

    if (activeTab === "teams") {
      return (
        (item.employeeName || "").toLowerCase().includes(q) ||
        (item.email || "").toLowerCase().includes(q) ||
        String(item.id || "").includes(q)
      );
    }

    return true;
  });

  // ---------------- PAGINATION ----------------
  const totalPages = Math.ceil((filteredData?.length || 0) / ITEMS_PER_PAGE);

  const paginatedData = filteredData?.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE,
  );

  const handlePrev = () => setPage((p) => Math.max(p - 1, 1));
  const handleNext = () => setPage((p) => Math.min(p + 1, totalPages));

  // ---------------- DELETE ----------------
  const handleDelete = async () => {
    if (!confirmData) return;

    setLoading(true);

    try {
      const axios = await getAuthAxios();

      if (confirmData.type === "project") {
        await axios.delete(`/create-projects/${confirmData.id}/`);
      } else {
        if (!selectedProject) {
          Alert.alert("Warning", "Select project first");
          return;
        }

        await axios.delete(
          `/remove-user-from-project/${confirmData.id}/?project=${selectedProject}`,
        );
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Action completed",
      });

      if (onRefresh) await onRefresh();

      setSelectedProject("");
      setConfirmData(null);
    } catch {
      Alert.alert("Error", "Failed");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- EDIT MODAL ----------------
  const EditProjectModal = () => {
    const [form, setForm] = useState(editingProject || {});

    useEffect(() => {
      setForm(editingProject || {});
    }, [editingProject]);

    const handleSave = async () => {
      try {
        const axios = await getAuthAxios();
        await axios.put(`/create-projects/${form.id}/`, form);

        Alert.alert("Success", "Project updated");

        setShowEditProjectModal(false);
        setEditingProject(null);

        if (onRefresh) onRefresh();
      } catch {
        Alert.alert("Error", "Update failed");
      }
    };

    return (
      <Modal transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/40 px-4">
          {/* 🔥 MODAL CARD */}
          <View className="bg-white rounded-3xl p-5 shadow-lg">
            {/* 🔷 HEADER */}
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center gap-2">
                <Ionicons name="create-outline" size={18} color="#2563eb" />
                <Text className="text-lg font-semibold text-gray-800">
                  Edit Project
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setShowEditProjectModal(false);
                  setEditingProject(null);
                }}
              >
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* 🔥 FORM */}
            {[
              { key: "name", label: "Project Name", icon: "briefcase-outline" },
              {
                key: "description",
                label: "Description",
                icon: "document-text-outline",
              },
              { key: "pocName", label: "POC Name", icon: "person-outline" },
              { key: "pocEmail", label: "POC Email", icon: "mail-outline" },
              { key: "pocPhone", label: "POC Phone", icon: "call-outline" },
            ].map(({ key, label, icon }) => (
              <View key={key} className="mb-3">
                {/* LABEL */}
                <Text className="text-xs text-gray-500 mb-1">{label}</Text>

                {/* INPUT WITH ICON */}
                <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                  <Ionicons name={icon as any} size={16} color="#9ca3af" />
                  <TextInput
                    placeholder={label}
                    value={form[key] || ""}
                    onChangeText={(text) => setForm({ ...form, [key]: text })}
                    className="ml-2 flex-1 text-sm text-gray-800"
                    placeholderTextColor="#9ca3af"
                  />
                </View>
              </View>
            ))}

            {/* 🔥 ACTION BUTTONS */}
            <View className="flex-row justify-end gap-3 mt-4">
              {/* CANCEL */}
              <TouchableOpacity
                onPress={() => {
                  setShowEditProjectModal(false);
                  setEditingProject(null);
                }}
                className="px-4 py-2 rounded-xl bg-gray-100"
              >
                <Text className="text-gray-700 text-sm font-medium">
                  Cancel
                </Text>
              </TouchableOpacity>

              {/* SAVE */}
              <TouchableOpacity
                onPress={handleSave}
                className="px-5 py-2 rounded-xl bg-blue-600 flex-row items-center gap-1"
              >
                <Ionicons name="save-outline" size={16} color="white" />
                <Text className="text-white text-sm font-semibold">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  // ---------------- ADD PROJECT MODAL ----------------
  const AddProjectModal = () => {
    const [projects, setProjects] = useState([]);
    const [project, setProject] = useState("");

    useEffect(() => {
      (async () => {
        const axios = await getAuthAxios();
        const res = await axios.get("/create-projects/");
        const existing = selectedUser?.projects || [];

        setProjects(res.data.filter((p) => !existing.includes(p.name)));
      })();
    }, []);

    const handleAdd = async () => {
      try {
        const axios = await getAuthAxios();
        await axios.post("/assign-user-to-project/", {
          user_id: selectedUser.id,
          project,
        });

        Alert.alert("Success", "Project added");
        setShowAddProjectModal(false);
        onRefresh();
      } catch {
        Alert.alert("Error", "Failed");
      }
    };

    return (
      <Modal transparent animationType="fade">
        <View className="flex-1 justify-center bg-black/40 px-4">
          {/* 🔥 MODAL CARD */}
          <View className="bg-white rounded-3xl p-3 shadow-lg max-h-[80%]">
            {/* 🔷 HEADER */}
            <View className="flex-row justify-between items-center mb-2">
              <View className="flex-row items-center gap-2">
                <Ionicons name="add-circle-outline" size={18} color="#2563eb" />
                <Text className="text-lg font-semibold text-gray-800">
                  Add Project
                </Text>
              </View>

              <TouchableOpacity onPress={() => setShowAddProjectModal(false)}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {/* 🔥 PROJECT LIST */}
            <ScrollView showsVerticalScrollIndicator={false}>
              {projects.map((p) => {
                const selected = project === p.name;

                return (
                  <TouchableOpacity
                    key={p.id}
                    onPress={() => setProject(p.name)}
                    className={`flex-row items-center justify-between px-3 py-3 mb-2 rounded-xl border ${
                      selected
                        ? "bg-blue-50 border-blue-400"
                        : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    {/* 📂 PROJECT NAME */}
                    <View className="flex-row items-center gap-2">
                      <Ionicons
                        name="briefcase-outline"
                        size={16}
                        color={selected ? "#2563eb" : "#6b7280"}
                      />
                      <Text
                        className={`text-sm ${
                          selected
                            ? "text-blue-700 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        {p.name}
                      </Text>
                    </View>

                    {/* ✅ SELECT ICON */}
                    {selected && (
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#2563eb"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* 🔥 ACTION BUTTONS */}
            <View className="flex-row justify-end gap-3 mt-2">
              {/* CANCEL */}
              <TouchableOpacity
                onPress={() => setShowAddProjectModal(false)}
                className="px-4 py-2 rounded-xl bg-gray-100"
              >
                <Text className="text-gray-700 text-sm font-medium">
                  Cancel
                </Text>
              </TouchableOpacity>

              {/* ADD */}
              <TouchableOpacity
                onPress={handleAdd}
                disabled={!project}
                className={`px-5 py-2 rounded-xl flex-row items-center gap-1 ${
                  project ? "bg-blue-600" : "bg-gray-300"
                }`}
              >
                <Ionicons name="add" size={16} color="white" />
                <Text className="text-white text-sm font-semibold">Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };
  // ---------------- RENDER ----------------
  return (
    <View className="flex-1 bg-gray-100 px-3 pt-1">
      {/* 🔍 SEARCH */}
      <View className="flex-row items-center bg-white px-2 py-0 rounded-xl border border-gray-200 mb-0 shadow-sm">
        <Ionicons name="search-outline" size={16} color="#9ca3af" />
        <TextInput
          placeholder="Search..."
          value={search}
          onChangeText={setSearch}
          className="ml-2 flex-1 text-sm text-gray-800"
          placeholderTextColor="#9ca3af"
        />
      </View>

      {/* 📋 LIST */}
      <FlatList
        data={paginatedData}
        keyExtractor={(item, i) => i.toString()}
        numColumns={2}
        showsVerticalScrollIndicator={false}
        columnWrapperStyle={{
          justifyContent: "space-around",
          marginBottom: 12,
        }}
        contentContainerStyle={{
          paddingBottom: 120,
          paddingTop: 4,
        }}
        renderItem={({ item }) => (
          <View className="w-[48%]">
            <CardItem
              item={item}
              activeTab={activeTab}
              projectCounts={projectCounts}
              router={router}
              openConfirm={(item, type) => {
                if (type === "add-project") {
                  setSelectedUser(item);
                  setShowAddProjectModal(true);
                } else if (type === "edit-project") {
                  setEditingProject(item);
                  setShowEditProjectModal(true);
                } else {
                  setConfirmData({
                    id: item.id,
                    type,
                    projects: item.projects,
                  });
                }
              }}
            />
          </View>
        )}
      />

      {/* 🔄 PAGINATION */}
      <View className="flex-row justify-between items-center bg-white p-3 rounded-xl border border-gray-200 mt-2 shadow-sm">
        <TouchableOpacity
          onPress={handlePrev}
          className="px-3 py-1 bg-gray-100 rounded-full flex-row items-center gap-1"
        >
          <Ionicons name="chevron-back" size={14} color="#374151" />
          <Text className="text-xs text-gray-700">Prev</Text>
        </TouchableOpacity>

        <Text className="text-xs text-gray-600">
          Page {page} / {totalPages}
        </Text>

        <TouchableOpacity
          onPress={handleNext}
          className="px-3 py-1 bg-gray-100 rounded-full flex-row items-center gap-1"
        >
          <Text className="text-xs text-gray-700">Next</Text>
          <Ionicons name="chevron-forward" size={14} color="#374151" />
        </TouchableOpacity>
      </View>

      {/* 🔥 DELETE MODAL */}
      {confirmData && (
        <Modal transparent animationType="fade">
          <View className="flex-1 justify-center bg-black/40 px-4">
            <View className="bg-white rounded-3xl p-5 shadow-lg">
              {/* 🔷 TITLE */}
              <View className="flex-row items-center gap-2 mb-3">
                <Ionicons
                  name="alert-circle-outline"
                  size={18}
                  color="#ef4444"
                />
                <Text className="text-lg font-semibold text-gray-800">
                  {confirmData.type === "project"
                    ? "Delete Project"
                    : "Remove User"}
                </Text>
              </View>

              <Text className="text-sm text-gray-600 mb-3">
                {confirmData.type === "project"
                  ? "Are you sure you want to delete this project?"
                  : "Remove this user from selected project"}
              </Text>

              {/* 🔽 PROJECT SELECT (FOR TEAM REMOVE) */}
              {confirmData.type === "team member" && (
                <View className="mb-3">
                  <Text className="text-xs text-gray-500 mb-2">
                    Select Project
                  </Text>

                  {confirmData.projects?.map((p) => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setSelectedProject(p)}
                      className={`flex-row justify-between items-center px-3 py-2 mb-2 rounded-xl border ${
                        selectedProject === p
                          ? "bg-blue-50 border-blue-400"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <Text className="text-sm text-gray-700">{p}</Text>

                      {selectedProject === p && (
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color="#2563eb"
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* 🔥 ACTIONS */}
              <View className="flex-row justify-end gap-3 mt-4">
                <TouchableOpacity
                  onPress={() => setConfirmData(null)}
                  className="px-4 py-2 rounded-xl bg-gray-100"
                >
                  <Text className="text-gray-700 text-sm font-medium">
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={
                    loading ||
                    (confirmData.type === "team member" && !selectedProject)
                  }
                  className={`px-5 py-2 rounded-xl flex-row items-center gap-1 ${
                    loading ? "bg-gray-300" : "bg-red-600"
                  }`}
                >
                  <Ionicons name="trash-outline" size={16} color="white" />
                  <Text className="text-white text-sm font-semibold">
                    {loading ? "Processing..." : "Confirm"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* MODALS */}
      {showEditProjectModal && <EditProjectModal />}
      {showAddProjectModal && <AddProjectModal />}
    </View>
  );
};

// ---------------- CARD ITEM ----------------
const CardItem = ({ item, activeTab, openConfirm, projectCounts, router }) => {
  return (
    <View
      style={{
         width: "100%",
        flex: 1,
        margin: 8,
        padding: 14,
        borderRadius: 16,
        backgroundColor: "#ffffff",
        borderWidth: 1,
        borderColor: "#f1f5f9",
        shadowColor: "#000",
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
      }}
    >
      {/* 🔥 HEADER */}
      <Text
        style={{
          fontSize: 15,
          fontWeight: "700",
          color: "#111827",
          marginBottom: 6,
        }}
      >
        {activeTab === "projects"
          ? item.name || item.projectName
          : item.employeeName}
      </Text>

      {/* 🔥 PROJECT MODE */}
      {activeTab === "projects" ? (
        <>
          {/* DESCRIPTION */}
          <Text
            style={{
              fontSize: 12,
              color: "#6b7280",
              marginBottom: 6,
            }}
          >
            {item.description || "No description"}
          </Text>

          {/* EMAIL */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            {/* <Ionicons name="hero" size={14} color="#9ca3af" /> */}
            <Text style={{ fontSize: 12, color: "#374151", marginLeft: 0 }}>
             Name:{item.pocName}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 4,
            }}
          >
            <Ionicons name="mail-outline" size={14} color="#9ca3af" />
            <Text style={{ fontSize: 12, color: "#374151", marginLeft: 6 }}>
              {item.pocEmail}
            </Text>
          </View>

          {/* USERS COUNT */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons name="people-outline" size={14} color="#9ca3af" />
            <Text style={{ fontSize: 12, color: "#374151", marginLeft: 6 }}>
              Users: {projectCounts?.[item.name?.toLowerCase()?.trim()] || 0}
            </Text>
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <Ionicons name="call" size={14} color="#9ca3af" />
            <Text style={{ fontSize: 12, color: "#374151", marginLeft: 1 }}>
              {item.pocPhone}
            </Text>
          </View>

          {/* ACTION LINK */}
          <Pressable
            onPress={() => router.push(`/projects/${item.id}/holidays`)}
            style={{
              backgroundColor: "#eef2ff",
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
              alignSelf: "flex-start",
              marginBottom: 10,
            }}
          >
            <Text style={{ fontSize: 11, color: "#4f46e5", fontWeight: "600" }}>
              Declare Holidays
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          {/* EMAIL */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <Ionicons name="mail-outline" size={14} color="#9ca3af" />
            <Text style={{ fontSize: 12, color: "#374151", marginLeft: 6 }}>
              {item.email}
            </Text>
          </View>

          {/* PROJECT TAGS */}
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {item.projects?.map((p: string) => (
              <View
                key={p}
                style={{
                  backgroundColor: "#f1f5f9",
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  marginRight: 6,
                  marginBottom: 6,
                }}
              >
                <Text style={{ fontSize: 10, color: "#334155" }}>{p}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {/* 🔥 ACTIONS */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          marginTop: 10,
          gap: 10,
        }}
      >
        {activeTab === "teams" && (
          <Pressable
            onPress={() => openConfirm(item, "add-project")}
            style={{
              backgroundColor: "#ecfdf5",
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
            }}
          >
            <Text style={{ fontSize: 11, color: "#059669", fontWeight: "600" }}>
              + Add
            </Text>
          </Pressable>
        )}

        {activeTab === "projects" && (
          <Pressable
            onPress={() => openConfirm(item, "edit-project")}
            style={{
              backgroundColor: "#f1f5f9",
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
            }}
          >
            <Text style={{ fontSize: 11, color: "#374151", fontWeight: "600" }}>
              Edit
            </Text>
          </Pressable>
        )}

        {activeTab === "teams" && (
          <Pressable
            onPress={() => openConfirm(item, "team member")}
            style={{
              backgroundColor: "#fef2f2",
              paddingVertical: 6,
              paddingHorizontal: 10,
              borderRadius: 999,
            }}
          >
            <Text style={{ fontSize: 11, color: "#dc2626", fontWeight: "600" }}>
              Remove
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default ProjectTeamTable;
