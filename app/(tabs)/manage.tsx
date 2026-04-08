import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import api from "@/services/api"; // ✅ your existing api
import ProjectTeamModal from "@/components/ProjectTeamModel";
import ProjectTeamTable from "@/components/ProjectTeamTable";

const Manage = () => {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState("projects");
  const [showModal, setShowModal] = useState(false);
  const [projects, setProjects] = useState([]);
  const [teams, setTeams] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  // ---------------- API CALLS (UNCHANGED) ----------------

  const fetchProjects = async () => {
    try {
      const { data } = await api.get("/api/create-projects/");
      setProjects(data);
    } catch (err) {
      console.log(err?.response?.data);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data } = await api.get("/api/add-team-member/");
      setTeams(data);
    } catch (err) {
      console.log(err?.response?.data);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setCurrentUser(data);
    } catch (err) {
      console.log(err?.response?.data);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchTeams();
    fetchCurrentUser();
  }, []);

  // ------------------------------------------------------

  const data = activeTab === "projects" ? projects : teams;

  const handleSubmitSuccess = () => {
    activeTab === "projects" ? fetchProjects() : fetchTeams();
  };

  // SAME LOGIC
  const projectCounts = {};
  teams.forEach((user) => {
    (user.projects || []).forEach((proj) => {
      const key = proj.toLowerCase().trim();
      projectCounts[key] = (projectCounts[key] || 0) + 1;
    });
  });

  const isHR =
    currentUser?.role === "hr" ||
    currentUser?.profile?.role === "hr" ||
    currentUser?.user_profile?.role === "hr";

  return (
    <View className="flex-1 bg-gray-50 ">
      {/* HEADER */}
      <View className="bg-[#f8fafc] p-4 rounded-3xl shadow-md">
        {/* 🔷 HEADER */}
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          Workspace Management
        </Text>

        {/* 🔥 ADVANCED TABS (3D SEGMENT CONTROL) */}
        <View className="bg-gray-200 rounded-2xl p-1 flex-row relative">
          {/* ACTIVE PILL BACKGROUND */}
          <View
            className={`absolute top-1 bottom-1 w-1/2 bg-white rounded-xl shadow-md ${
              activeTab === "projects" ? "left-1" : "right-1"
            }`}
          />

          {/* PROJECTS */}
          <TouchableOpacity
            onPress={() => setActiveTab("projects")}
            activeOpacity={0.85}
            className="flex-1 flex-row items-center justify-center py-2 z-10"
          >
            <Ionicons
              name="grid-outline"
              size={16}
              color={activeTab === "projects" ? "#215afb" : "#6b7280"}
            />
            <Text
              className={`ml-1 text-xs font-medium ${
                activeTab === "projects" ? "text-[#215afb]" : "text-gray-600"
              }`}
            >
              Projects
            </Text>
          </TouchableOpacity>

          {/* TEAMS */}
          <TouchableOpacity
            onPress={() => setActiveTab("teams")}
            activeOpacity={0.85}
            className="flex-1 flex-row items-center justify-center py-2 z-10"
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={activeTab === "teams" ? "#215afb" : "#6b7280"}
            />
            <Text
              className={`ml-1 text-xs font-medium ${
                activeTab === "teams" ? "text-[#215afb]" : "text-gray-600"
              }`}
            >
              Teams
            </Text>
          </TouchableOpacity>
        </View>

        {/* 🔥 HR ACTION BUTTONS */}
        {isHR && (
          <View className="flex-row gap-3 mt-4">
            {/* ASSIGN SHIFTS */}
            <TouchableOpacity
              onPress={() => router.push("/assign-shifts")}
              activeOpacity={0.85}
              className="flex-1 relative"
            >
              {/* BACK GLOW */}
              <View className="absolute inset-0 bg-blue-300 opacity-20 rounded-2xl translate-y-1 scale-[0.95]" />

              {/* MAIN */}
              <View className="bg-[#215afb] px-4 py-3 rounded-2xl shadow-md flex-row items-center justify-center">
                <Ionicons name="time-outline" size={16} color="white" />

                <Text className="text-white text-xs font-semibold ml-2">
                  Assign Shifts
                </Text>
              </View>
            </TouchableOpacity>

            {/* ASSIGN ROLES */}
            <TouchableOpacity
              onPress={() => router.push("/assign-roles")}
              activeOpacity={0.85}
              className="flex-1 relative"
            >
              {/* BACK SHADOW */}
              <View className="absolute inset-0 bg-gray-400 opacity-20 rounded-2xl translate-y-1 scale-[0.95]" />

              {/* MAIN */}
              <View className="bg-white px-4 py-3 rounded-2xl shadow-md border border-gray-100 flex-row items-center justify-center">
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color="#374151"
                />

                <Text className="text-gray-700 text-xs font-semibold ml-2">
                  Assign Roles
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* TABLE */}
      <View className="flex-1 bg-white dark:bg-gray-900">
        <ProjectTeamTable
          data={data}
          activeTab={activeTab}
          projectCounts={projectCounts}
          onRefresh={activeTab === "projects" ? fetchProjects : fetchTeams}
        />
      </View>

      {/* FLOAT BUTTON */}
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        className="absolute bottom-6 right-6 bg-green-600 p-4 rounded-full shadow-lg mb-20"
      >
        <Ionicons name="add" size={22} color="white" />
      </TouchableOpacity>

      {/* MODAL */}
      {showModal && (
        <ProjectTeamModal
          activeTab={activeTab}
          onClose={() => setShowModal(false)}
          onSubmitSuccess={handleSubmitSuccess}
        />
      )}
    </View>
  );
};

export default Manage;
