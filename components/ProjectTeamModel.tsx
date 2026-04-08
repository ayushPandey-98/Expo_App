import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Pressable,
} from "react-native";

import api from "@/services/api";
import { Ionicons } from "@expo/vector-icons";

const ProjectTeamModal = ({
  activeTab,
  onClose,
  onSubmitSuccess,
  existingTeamMembers = [],
}) => {
  const [warningOpen, setWarningOpen] = useState(false);
  const [warningMsg, setWarningMsg] = useState("");

  const [projectForm, setProjectForm] = useState({
    projectName: "",
    projectDescription: "",
    pocName: "",
    pocEmail: "",
    pocPhone: "",
  });

  const [teamForm, setTeamForm] = useState({
    selectedUsers: [],
    projects: [],
  });

  const [employees, setEmployees] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [successOpen, setSuccessOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // ---------------- FETCH ----------------
  useEffect(() => {
    if (activeTab === "teams") {
      api
        .get("/api/users/")
        .then((res) => {
          const rawUsers = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data?.users)
              ? res.data.users
              : [];

          const mapped = rawUsers.map((emp) => {
            const label =
              emp.displayName ||
              emp.username ||
              emp.name ||
              emp.givenName ||
              "Unknown User";

            const email = (
              emp.mail ||
              emp.email ||
              emp.userPrincipalName ||
              ""
            ).trim();

            return { label: String(label).trim(), email, raw: emp };
          });

          const unique = [];
          const seen = new Set();

          mapped.forEach((emp) => {
            if (!seen.has(emp.email)) {
              seen.add(emp.email);
              unique.push(emp);
            }
          });

          setEmployees(unique);
        })
        .catch((err) => console.log(err));

      api
        .get("/api/create-projects/")
        .then((res) => {
          if (Array.isArray(res.data)) {
            const mappedProjects = res.data.map((p) => ({
              label:
                p.projectName?.trim() || p.name?.trim() || "Unnamed Project",
              value: p.projectName?.trim() || p.name?.trim(),
            }));

            setProjectsList(mappedProjects);
          }
        })
        .catch((err) => console.log(err));
    }
  }, [activeTab]);

  // ---------------- SUBMIT ----------------
  const handleSubmit = async () => {
    try {
      if (activeTab === "projects") {
        const { projectName, projectDescription, pocName, pocEmail, pocPhone } =
          projectForm;

        if (
          !projectName.trim() ||
          !projectDescription.trim() ||
          !pocName.trim() ||
          !pocEmail.trim() ||
          !pocPhone.trim()
        ) {
          Alert.alert("Warning", "Please fill all fields");
          return;
        }

        const res = await api.get("/api/create-projects/");
        const allProjects = res.data || [];

        const newName = projectName.trim().toLowerCase();

        const exists = allProjects.some(
          (p) =>
            p.projectName?.toLowerCase() === newName ||
            p.name?.toLowerCase() === newName,
        );

        if (exists) {
          Alert.alert("Warning", "Project already exists");
          return;
        }

        await api.post("/api/create-projects/", projectForm);

        setSuccessMsg(`Project "${projectName}" created successfully!`);
        setSuccessOpen(true);
      } else if (activeTab === "teams") {
        const { selectedUsers, projects } = teamForm;

        if (!selectedUsers.length || !projects.length) {
          Alert.alert("Warning", "Select users & projects");
          return;
        }

        const currentUser = await api.get("/api/auth/me");

        const addedBy =
          currentUser.data?.username || currentUser.data?.email || "Unknown";

        const conflictMap = {};

        selectedUsers.forEach((user) => {
          const existing = existingTeamMembers.find(
            (m) => m.email?.toLowerCase() === user.email?.toLowerCase(),
          );

          if (existing) {
            const overlapping = existing.projects?.filter((p) =>
              projects.includes(p),
            );

            overlapping?.forEach((project) => {
              if (!conflictMap[project]) {
                conflictMap[project] = [];
              }
              conflictMap[project].push(user.label);
            });
          }
        });

        if (Object.keys(conflictMap).length > 0) {
          const msg = Object.entries(conflictMap)
            .map(
              ([p, users]) =>
                `${users.length} user(s) already in "${p}": ${users.join(", ")}`,
            )
            .join(" | ");

          Alert.alert("Warning", msg);
          return;
        }

        const payload = selectedUsers.map((u) => ({
          employeeName: u.label,
          email: u.email,
          projects,
          addedBy,
        }));

        await api.post("/api/add-team-member/", payload);

        setSuccessMsg(`${payload.length} users added!`);
        setSuccessOpen(true);
      }

      onSubmitSuccess();

      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (error) {
      const msg = error?.response?.data?.detail || "Failed to add user(s)";

      Alert.alert("Error", msg);
    }
  };
const allSelected =
  employees.length > 0 &&
  teamForm.selectedUsers.length === employees.length;

const toggleSelectAll = () => {
  if (allSelected) {
    // unselect all
    setTeamForm((prev) => ({
      ...prev,
      selectedUsers: [],
    }));
  } else {
    // select all
    setTeamForm((prev) => ({
      ...prev,
      selectedUsers: employees,
    }));
  }
};
  // ---------------- UI ----------------
  return (
    <Modal transparent animationType="fade">
      <View className="flex-1  justify-center px-3">
        <View className="bg-white  rounded-xl p-4">
          {/* HEADER */}
          <View className="flex-row justify-between mb-4">
            <Text className="text-lg font-semibold text-gray-800 dark:text-white">
              Add {activeTab === "projects" ? "Project" : "Team"}
            </Text>

            <TouchableOpacity onPress={onClose}>
              <Text className="text-xl">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView>
            {/* PROJECT FORM */}
            {activeTab === "projects" ? (
              <>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: "#111827",
                    textAlign: "center",
                  }}
                >
                  Add Project
                </Text>
                {Object.keys(projectForm).map((key) => (
                  <View key={key} style={{ marginBottom: 14 }}>
                    {/* 🔹 LABEL */}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: 6,
                        textTransform: "capitalize",
                      }}
                    >
                      {key.replace("_", " ")}
                    </Text>

                    {/* 🔹 INPUT FIELD */}
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        borderWidth: 1,
                        borderColor: "#e5e7eb",
                        borderRadius: 12,
                        paddingHorizontal: 10,
                        backgroundColor: "#fff",
                      }}
                    >
                      {/* ICON (dynamic optional) */}
                      <Ionicons
                        name={
                          key.includes("name")
                            ? "document-text-outline"
                            : key.includes("desc")
                              ? "create-outline"
                              : "information-circle-outline"
                        }
                        size={16}
                        color="#9ca3af"
                        style={{ marginRight: 8 }}
                      />

                      <TextInput
                        placeholder={`Enter ${key.replace("_", " ")}`}
                        placeholderTextColor="#9ca3af"
                        value={projectForm[key]}
                        onChangeText={(text) =>
                          setProjectForm({
                            ...projectForm,
                            [key]: text,
                          })
                        }
                        style={{
                          flex: 1,
                          paddingVertical: 10,
                          fontSize: 13,
                          color: "#111827",
                        }}
                      />
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <>
                {/* ================= EMPLOYEES ================= */}
               <View
  style={{
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  }}
>
  {/* LEFT: TITLE */}
  <Text
    style={{
      fontSize: 14,
      fontWeight: "600",
      color: "#111827",
    }}
  >
    <Ionicons name="people-outline" size={20} color="#6366f1" /> Employees
  </Text>

  {/* RIGHT: SELECT ALL */}
  <Pressable
    onPress={toggleSelectAll}
    style={{
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
    }}
  >
    <Text style={{ fontSize: 12, color: "#6366f1", fontWeight: "600" }}>
      Select All
    </Text>

    <View
      style={{
        width: 18,
        height: 18,
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: allSelected ? "#6366f1" : "#d1d5db",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: allSelected ? "#6366f1" : "transparent",
      }}
    >
      {allSelected && (
        <Ionicons name="checkmark" size={12} color="#fff" />
      )}
    </View>
  </Pressable>
</View>

                <ScrollView
                  style={{
                    maxHeight: 180,
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    padding: 6,
                  }}
                >
                  {employees.map((emp) => {
                    const selected = teamForm.selectedUsers.some(
                      (u) => u.email === emp.email,
                    );

                    return (
                      <Pressable
                        key={emp.email}
                        onPress={() => {
                          if (selected) {
                            setTeamForm((prev) => ({
                              ...prev,
                              selectedUsers: prev.selectedUsers.filter(
                                (u) => u.email !== emp.email,
                              ),
                            }));
                          } else {
                            setTeamForm((prev) => ({
                              ...prev,
                              selectedUsers: [...prev.selectedUsers, emp],
                            }));
                          }
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                          backgroundColor: selected ? "#eef2ff" : "#fff",
                          marginBottom: 4,
                        }}
                      >
                        {/* LEFT SIDE */}
                        <Text
                          style={{
                            fontSize: 13,
                            color: selected ? "#3730a3" : "#111827",
                            fontWeight: selected ? "600" : "400",
                          }}
                        >
                          {emp.label}
                        </Text>

                        {/* RIGHT SIDE CHECKBOX */}
                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 6,
                            borderWidth: 1.5,
                            borderColor: selected ? "#6366f1" : "#d1d5db",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: selected
                              ? "#6366f1"
                              : "transparent",
                          }}
                        >
                          {selected && (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* ================= PROJECTS ================= */}
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: "#111827",
                    marginTop: 16,
                    marginBottom: 8,
                  }}
                >
                  <Ionicons name="folder-outline" size={20} color="#10b981" />
                  Projects
                </Text>

                <ScrollView
                  style={{
                    maxHeight: 180,
                    backgroundColor: "#fff",
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    padding: 6,
                  }}
                >
                  {projectsList.map((proj) => {
                    const selected = teamForm.projects.includes(proj.value);

                    return (
                      <Pressable
                        key={proj.value}
                        onPress={() => {
                          if (selected) {
                            setTeamForm((prev) => ({
                              ...prev,
                              projects: prev.projects.filter(
                                (p) => p !== proj.value,
                              ),
                            }));
                          } else {
                            setTeamForm((prev) => ({
                              ...prev,
                              projects: [...prev.projects, proj.value],
                            }));
                          }
                        }}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingVertical: 10,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                          backgroundColor: selected ? "#ecfdf5" : "#fff",
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            color: selected ? "#065f46" : "#111827",
                            fontWeight: selected ? "600" : "400",
                          }}
                        >
                          {proj.label}
                        </Text>

                        <View
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 6,
                            borderWidth: 1.5,
                            borderColor: selected ? "#10b981" : "#d1d5db",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: selected
                              ? "#10b981"
                              : "transparent",
                          }}
                        >
                          {selected && (
                            <Ionicons name="checkmark" size={12} color="#fff" />
                          )}
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </ScrollView>

          {/* FOOTER */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "flex-end",
              alignItems: "center",
              marginTop: 18,
              gap: 10,
            }}
          >
            {/* CANCEL BUTTON */}
            <Pressable
              onPress={onClose}
              style={{
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 10,
                backgroundColor: "#f3f4f6",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "500",
                  color: "#374151",
                }}
              >
                Cancel
              </Text>
            </Pressable>

            {/* ADD BUTTON */}
            <Pressable
              onPress={handleSubmit}
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#2563eb",
                paddingVertical: 10,
                paddingHorizontal: 16,
                borderRadius: 10,
                shadowColor: "#2563eb",
                shadowOpacity: 0.3,
                shadowRadius: 6,
                elevation: 3,
              }}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color="#fff"
                style={{ marginRight: 4 }}
              />

              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: "#fff",
                }}
              >
                Add
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default ProjectTeamModal;
