import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Modal,
} from "react-native";
import { Alert } from "react-native";
import { Dropdown } from "react-native-element-dropdown";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import DateTimePicker from "@react-native-community/datetimepicker";

import { useRouter } from "expo-router";
// import { useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import getAuthAxios from "../../services/authaxios";
import Toast from "react-native-toast-message";

const VIEW_KEY = "timesheetViewType";

const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const secToHms = (sec: number) => {
  if (!sec || isNaN(sec) || sec <= 0) return "";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${h}:${m.toString().padStart(2, "0")}:${s
    .toString()
    .padStart(2, "0")}`;
};

const parseTimeInput = (val: string) => {
  val = val.trim().toLowerCase();
  if (!val) return 0;

  if (val.includes(":")) {
    const parts = val.split(":").map(Number);
    if (parts.length === 2) return parts[0] * 3600 + parts[1] * 60;
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }

  if (!isNaN(Number(val))) return parseFloat(val) * 3600;

  const match = val.match(/(\d+(?:\.\d+)?)(h|m|s)/g);
  if (match) {
    return match.reduce((sum, part) => {
      const [, num, unit] = part.match(/(\d+(?:\.\d+)?)([hms])/)!;
      if (unit === "h") return sum + Number(num) * 3600;
      if (unit === "m") return sum + Number(num) * 60;
      if (unit === "s") return sum + Number(num);
      return sum;
    }, 0);
  }

  return 0;
};

const blankRow = (project = "", task = "") => ({
  project,
  task,
  secs: Array(7).fill(0),
  nsa: Array(7).fill(false),
  comment: "",
});

function mondayOf(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const formatDate = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export default function Timesheets({ user }: any) {
  const paramId = null;
  const router = useRouter();
  const [projects, setProjects] = useState<string[]>([]);
  const [rows, setRows] = useState([blankRow()]);
  const [weekStart, setWeekStart] = useState(mondayOf(new Date()));
  const [editingCell, setEditingCell] = useState<any>(null);
  const [projectHolidayMap, setProjectHolidayMap] = useState<any>({});
  const [managerList, setManagerList] = useState<any[]>([]);
  const [selectedManager, setSelectedManager] = useState("");
  const [weekEnd, setWeekEnd] = useState(new Date());
  const [timerTask, setTimerTask] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [managerSearch, setManagerSearch] = useState("");
  const [submittedManager, setSubmittedManager] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const intervalRef = useRef<any>(null);
  const inputRefs = useRef<any[][]>([]);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rowToDelete, setRowToDelete] = useState<number | null>(null);
  const [IsSubmitDisabled, setIsSubmitDisabled] = useState(false);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ================= TIMER =================
  useEffect(() => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    setWeekEnd(end);
  }, [rows, weekStart]);

  // ================= TIMER STORAGE =================
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((prev) => {
          const todayIdx = getDayIndexFromWeekStart(new Date(), weekStart);

          if (todayIdx < 0 || todayIdx > 6) return prev;

          const todayTotal = rows.reduce(
            (sum, r) => sum + (r.secs?.[todayIdx] || 0),
            0,
          );

          const combined = todayTotal + prev;

          if (combined >= 28800) {
            Alert.alert("Limit reached", "Max 8 hours per day");
            setRunning(false);
            clearInterval(intervalRef.current);
            return prev;
          }

          return prev + 1;
        });
      }, 1000);
    }

    return () => clearInterval(intervalRef.current);
  }, [running, rows]);

  const isWeekFilled = (rows: any[]) => {
    for (let day = 0; day < 5; day++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + day);

      const isHolidayForAll = rows.every(
        (row) => row.project && isHoliday(row.project, date),
      );

      if (isHolidayForAll) continue;

      const totalSecs = rows.reduce(
        (sum, row) => sum + (row.secs?.[day] || 0),
        0,
      );

      if (totalSecs <= 0) return false;
    }

    return true;
  };
  useEffect(() => {
    const fetchManagers = async () => {
      const api = await getAuthAxios();
      const res = await api.get("/managers/");
      // console.log("🔥 MANAGER LIST:", res.data);
      setManagerList(res.data);
    };

    fetchManagers();
  }, []);
  const filteredManagers = managerList.filter((m) =>
    (m.username || m.email).toLowerCase().includes(managerSearch.toLowerCase()),
  );
  useEffect(() => {
    if (!selectedManager || managerList.length === 0) return;

    const manager = managerList.find(
      (m) => String(m.id) === String(selectedManager),
    );

    if (manager) {
      setSubmittedManager(manager);
    }
  }, [selectedManager, managerList]);

  const submitForApproval = async () => {
    // 🚫 Already submitted → block
    if (IsSubmitDisabled) {
      Toast.show({
        type: "error",
        text1: "Timesheet already submitted",
      });
      return;
    }

    // 🚫 Manager required
    if (!selectedManager) {
      Toast.show({
        type: "error",
        text1: "Please select a manager",
      });
      return;
    }

    // 🚫 No time entered
    if (!isValidTimesheet(rows)) {
      Toast.show({
        type: "error",
        text1: "Select project and enter time",
      });
      return;
    }

    // 🚫 Week validation (same as web)
    if (!isWeekFilled(rows)) {
      Toast.show({
        type: "error",
        text1: "Fill all weekdays (Mon–Fri)",
      });
      return;
    }

    try {
      setSubmitting(true);

      Toast.show({
        type: "info",
        text1: "Submitting...",
      });

      const api = await getAuthAxios();

      await api.post("/timesheets/", {
        manager: selectedManager,
        week_start: formatDate(weekStart),
        week_end: formatDate(weekEnd),
        data: rows
          .filter((r) => r.project && r.secs.some((sec: number) => sec > 0))
          .map((r) => ({
            project: r.project,
            task: r.task || "",
            secs: r.secs.map((s) => s / 3600),
            nsa: r.nsa,
            comment: r.comment,
          })),
      });

      // ❗ DO NOT trust local state — fetch from backend
      await fetchTimesheetForWeek();

      // ✅ Set submitted manager for UI

      Toast.show({
        type: "success",
        text1: "Submitted Successfully",
      });
    } catch (err) {
      console.error("Submit error:", err);

      Toast.show({
        type: "error",
        text1: "Submit failed",
      });
    } finally {
      setSubmitting(false);
    }
  };
  useEffect(() => {
    const load = async () => {
      const saved = JSON.parse(
        (await AsyncStorage.getItem("timerState")) || "{}",
      );

      if (saved.running && saved.startTime) {
        const elapsed = Math.floor((Date.now() - saved.startTime) / 1000);

        setSeconds(elapsed + (saved.pausedSeconds || 0));
        setTimerTask(saved.timerTask || "");
        setRunning(true);
      } else if (saved.pausedSeconds) {
        setSeconds(saved.pausedSeconds);
      }
    };
    load();
  }, []);

  // ================= PROJECT FETCH =================
  const fetchProjects = async () => {
    const api = await getAuthAxios();

    if (user?.role === "employee") {
      const res = await api.get("/my-projects/");
      setProjects(res.data.map((p: any) => p.name));
    } else {
      const res = await api.get("/create-projects/");
      setProjects(res.data.map((p: any) => p.name));
    }
  };
  useEffect(() => {
    fetchProjects();
  }, []);

  // project holiday
  const isHoliday = (project: string, dateObj: Date) => {
    if (!project || !dateObj) return false;

    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, "0");
    const d = String(dateObj.getDate()).padStart(2, "0");

    const dateStr = `${y}-${m}-${d}`;

    const holidays = projectHolidayMap?.[project];
    if (!Array.isArray(holidays)) return false;

    return holidays.includes(dateStr);
  };
  // project fetch
  const fetchHolidaysForRows = async (rows: any[]) => {
    const uniqueProjects = [
      ...new Set(rows.map((r) => r.project).filter(Boolean)),
    ];

    if (uniqueProjects.length === 0) return;

    try {
      const api = await getAuthAxios();
      const res = await api.post("/projects/projects/holidays-by-projects", {
        projects: uniqueProjects,
      });

      setProjectHolidayMap((prev: any) => ({
        ...prev,
        ...(res.data || {}),
      }));
    } catch (err) {
      console.log("Holiday fetch failed");
    }
  };
  useEffect(() => {
    const projectsList = rows.map((r) => r.project).filter(Boolean);

    if (projectsList.length) {
      fetchHolidaysForRows(rows);
    }
  }, [weekStart]);
  // ================= SAVE =================
  const saveWeek = async () => {
    try {
      const api = await getAuthAxios();

      await api.post("/timesheet/save/", {
        week_start: formatDate(weekStart),
        week_end: formatDate(weekEnd),
        manager: selectedManager || null,
        data: rows
          .filter((r) => r.project && r.secs.some((sec: number) => sec > 0))
          .map((r) => ({
            project: r.project,
            task: r.task || "",
            secs: r.secs.map((s) => s / 3600),
            nsa: r.nsa,
            comment: r.comment,
          })),
      });

      Toast.show({
        type: "success",
        text1: "Timesheet Saved",
      });
    } catch (err) {
      Toast.show({
        type: "error",
        text1: "Save failed",
      });
    }
  };

  const getDayIndexFromWeekStart = (date: Date, weekStart: Date) => {
    const d1 = new Date(date);
    const d2 = new Date(weekStart);

    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);

    return Math.floor((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
  };
  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);

    const monday = mondayOf(d);
    setWeekStart(monday);

    const end = new Date(monday);
    end.setDate(end.getDate() + 6);
    setWeekEnd(end);
  };

  const onDateChange = (event: any, selectedDate: Date | undefined) => {
    setShowCalendar(false);

    if (!selectedDate) return;

    const newMonday = mondayOf(selectedDate);
    setWeekStart(newMonday);

    const end = new Date(newMonday);
    end.setDate(end.getDate() + 6);
    setWeekEnd(end);
  };
  useEffect(() => {
    if (!paramId) return;

    const load = async () => {
      try {
        const api = await getAuthAxios();
        const res = await api.get(`/timesheets/${paramId}/`);
        const data = res.data;

        setWeekStart(mondayOf(new Date(data.week_start)));

        const loadedRows = data.data.map((row: any) => ({
          ...row,
          secs: row.secs.map((s: number) => s * 3600),
        }));

        setRows(loadedRows.length ? loadedRows : [blankRow()]);
        const timesheet = data;

        setSelectedManager(data.manager_id || data.manager || "");
      } catch (e) {
        console.log("Edit load failed");
      }
    };

    load();
  }, [paramId]);
  const fetchTimesheetForWeek = async () => {
    try {
      const api = await getAuthAxios();

      // ✅ RESET FIRST (VERY IMPORTANT)
      setIsSubmitDisabled(false);
      setSelectedManager("");
      setSubmittedManager(null);
      setRows([blankRow()]);

      const res = await api.get(
        `/timesheets/?week_start=${formatDate(weekStart)}`,
      );

      const data = res.data;

      // ✅ STRICT CHECK (same as web)
      if (
        data.length > 0 &&
        (data[0].rows?.length > 0 || data[0].data?.length > 0)
      ) {
        const timesheet = data[0];
        const backendRows = timesheet.rows || timesheet.data || [];

        const loadedRows = backendRows.map((row: any) => ({
          project: row.project || "",
          task: row.task || "",
          secs: (row.secs || []).map((h: number) => h * 3600),
          nsa: row.nsa || Array(7).fill(false),
          comment: row.comment || "",
        }));

        setRows(loadedRows);

        let managerId = timesheet.manager_id || timesheet.manager || "";

        // ✅ FALLBACK USING NAME
        if (!managerId && timesheet.manager_name) {
          const managerObj = managerList.find(
            (m) => m.username === timesheet.manager_name,
          );

          if (managerObj) {
            managerId = managerObj.id;
          }
        }

        setSelectedManager(managerId);

        const submitted =
          timesheet.status &&
          timesheet.status !== "draft" &&
          timesheet.status !== "saved";

        setIsSubmitDisabled(submitted);
      } else {
        // ✅ EMPTY WEEK = ALWAYS RESET
        setRows([blankRow()]);
        setSelectedManager("");
        setIsSubmitDisabled(false);
        setSubmittedManager(null);
      }
    } catch (err) {
      console.log("Fetch error:", err);

      // ✅ SAFE RESET
      setRows([blankRow()]);
      setSelectedManager("");
      setIsSubmitDisabled(false);
      setSubmittedManager(null);
    }
  };
  useEffect(() => {
    fetchTimesheetForWeek();
  }, [weekStart]);
  const stopTimer = () => {
    setRunning(false);

    if (!seconds) return;

    const todayIdx = getDayIndexFromWeekStart(new Date(), weekStart);
    if (todayIdx < 0 || todayIdx > 6) return;

    const updated = [...rows];

    let existing = updated.find(
      (r) => r.project?.toLowerCase() === timerTask?.toLowerCase(),
    );

    if (!existing) {
      existing = updated.find((r) => !r.project);

      if (existing) {
        existing.project = timerTask;
      }
    }

    if (!existing) {
      const newRow = blankRow(timerTask);
      newRow.secs[todayIdx] = seconds;
      updated.push(newRow);
    } else {
      existing.secs[todayIdx] += seconds;
    }

    setRows(updated);
    setSeconds(0);

    AsyncStorage.removeItem("timerState");
  };
  const isAnyTimeEntered = (rows: any[]) => {
    return rows.some((row) => row.secs.some((sec: number) => sec > 0));
  };
  const rowTotal = (row: any) =>
    row.secs.reduce((a: number, b: number) => a + b, 0);

  const colTotals = rows.reduce((tot: number[], row: any) => {
    row.secs.forEach((s: number, i: number) => {
      tot[i] += s;
    });
    return tot;
  }, Array(7).fill(0));
  const isValidTimesheet = (rows: any[]) => {
    return rows.some(
      (row) =>
        row.project && // ✅ project required
        row.secs.some((sec: number) => sec > 0), // ✅ time required
    );
  };

  // ================= UI =================
  return (
    <ScrollView
      className="flex-1 bg-white p-3"
      contentContainerStyle={{ paddingBottom: 120 }}
    >
      {/* Select Week🗯️ */}
      <View className="flex-row items-center justify-between mb-4 bg-white p-3 rounded-2xl shadow-md border border-gray-200">
        {/* ⬅️ PREV */}
        <Pressable
          onPress={() => shiftWeek(-1)}
          className="p-2 rounded-full bg-gray-100 active:bg-gray-200"
        >
          <Ionicons name="chevron-back" size={20} color="#374151" />
        </Pressable>

        {/* 📅 WEEK DISPLAY (CLICKABLE) */}
        <Pressable
          onPress={() => setShowCalendar(true)}
          className="flex-1 mx-3 bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 items-center"
        >
          <View className="flex-row items-center gap-1 mb-1">
            <Ionicons name="calendar-outline" size={14} color="#3b82f6" />
            <Text className="text-[11px] text-blue-500 font-medium">
              Select Week
            </Text>
          </View>

          <Text className="text-sm font-semibold text-gray-800 text-center">
            {formatDate(weekStart)} → {formatDate(weekEnd)}
          </Text>
        </Pressable>

        {/* ➡️ NEXT */}
        <Pressable
          onPress={() => shiftWeek(1)}
          className="p-2 rounded-full bg-gray-100 active:bg-gray-200"
        >
          <Ionicons name="chevron-forward" size={20} color="#374151" />
        </Pressable>
      </View>
      {/* TIMER 🗯️ */}
      <View className="mt-0 bg-white rounded-2xl px-4 py-4 shadow-md border border-gray-200">
        <View className="flex-row items-center justify-between">
          {/* 🔥 PROJECT SELECT (BETTER UI) */}
          <View className="flex-1 mr-3 bg-gray-100 rounded-xl px-2">
            {/* <Picker
        selectedValue={timerTask}
        onValueChange={(v) => setTimerTask(v)}
        style={{ height: 45, width: "100%" }}
         itemStyle={{ fontSize: 14 }}
        dropdownIconColor="#374151"
      >
        <Picker.Item label="Select Project" value="" />
        {projects.map((p, i) => (
          <Picker.Item key={i} label={p} value={p} />
        ))}
      </Picker> */}
            <Dropdown
              data={projects.map((p) => ({ label: p, value: p }))}
              labelField="label"
              valueField="value"
              value={timerTask}
              onChange={(item) => setTimerTask(item.value)}
              placeholder="Select Project"
              style={{
                height: 45,
                borderRadius: 10,
                paddingHorizontal: 10,
                backgroundColor: "#f3f4f6",
              }}
              selectedTextStyle={{
                fontSize: 14,
              }}
            />
          </View>

          {/* ⏱ TIMER */}
          <View className="bg-gray-900 px-4 py-2 rounded-xl mr-3">
            <Text className="text-white font-bold text-base tracking-wider">
              {secToHms(seconds) || "00:00"}
            </Text>
          </View>

          {/* 🎮 BUTTONS */}
          {(() => {
            const currentWeekStart = mondayOf(new Date());
            const isCurrentWeek =
              weekStart.getTime() === currentWeekStart.getTime();

            const disabled = !isCurrentWeek || !timerTask;

            return !running ? (
              <Pressable
                disabled={disabled}
                className={`flex-row items-center px-4 py-2 rounded-xl ${
                  disabled ? "bg-gray-300" : "bg-green-600"
                }`}
                onPress={() => {
                  if (!isCurrentWeek) {
                    Toast.show({
                      type: "error",
                      text1: "Invalid Week",
                    });
                    return;
                  }

                  if (!timerTask) {
                    Toast.show({
                      type: "error",
                      text1: "Select Project",
                    });
                    return;
                  }

                  if (isHoliday(timerTask, new Date())) {
                    Toast.show({
                      type: "error",
                      text1: "Holiday",
                    });
                    return;
                  }

                  const todayIdx = getDayIndexFromWeekStart(
                    new Date(),
                    weekStart,
                  );

                  if (todayIdx >= 5) {
                    Toast.show({
                      type: "error",
                      text1: "Weekend not allowed",
                    });
                    return;
                  }

                  setRunning(true);
                }}
              >
                <Ionicons name="play" size={18} color="white" />
              </Pressable>
            ) : (
              <View className="flex-row gap-2">
                {/* STOP */}
                <Pressable
                  className="bg-red-500 px-3 py-2 rounded-xl"
                  onPress={stopTimer}
                >
                  <Ionicons name="stop" size={18} color="white" />
                </Pressable>

                {/* RESET */}
                <Pressable
                  className="bg-gray-200 px-3 py-2 rounded-xl"
                  onPress={() => {
                    setRunning(false);
                    setSeconds(0);
                  }}
                >
                  <Ionicons name="refresh" size={18} color="#374151" />
                </Pressable>
              </View>
            );
          })()}
        </View>

        {/* 🔥 MESSAGE */}
        {(() => {
          const currentWeekStart = mondayOf(new Date());
          const isCurrentWeek =
            weekStart.getTime() === currentWeekStart.getTime();

          if (!isCurrentWeek) {
            return (
              <Text className="text-xs text-red-500 mt-3 text-center">
                Timer disabled for past/future weeks
              </Text>
            );
          }
          return null;
        })()}
      </View>

      {/* ROWS */}
      {rows.map((row, rIdx) => (
        <View
          key={rIdx}
          className="bg-white p-4 mb-4 rounded-2xl border border-gray-200 shadow-sm"
        >
          {/* 🔷 HEADER */}
          <View className="flex-row justify-between items-center mb-3">
            <View className="flex-row items-center gap-2">
              <Ionicons name="folder-outline" size={18} color="#2563eb" />
              <Text className="font-semibold text-gray-800">Project</Text>
            </View>

            <Pressable
              disabled={IsSubmitDisabled}
              onPress={() => {
                setRowToDelete(rIdx);
                setConfirmOpen(true);
              }}
            >
              <Ionicons name="trash-outline" size={18} color="#ef4444" />
            </Pressable>
          </View>

          {/* 🔽 PROJECT SELECT */}
          <View className="bg-gray-100 rounded-xl px-2 mb-3">
            <Dropdown
              data={projects.map((p) => ({ label: p, value: p }))}
              labelField="label"
              valueField="value"
              value={row.project}
              onChange={(item) => {
                if (IsSubmitDisabled) return;

                if (
                  rows.some((r, i) => i !== rIdx && r.project === item.value)
                ) {
                  Alert.alert("Project already used");
                  return;
                }

                const updated = [...rows];
                updated[rIdx].project = item.value;
                setRows(updated);
                fetchHolidaysForRows(updated);
              }}
              placeholder="Select Project"
              style={{ height: 45 }}
            />
          </View>

          {/* 🔥 DAYS GRID (2 ROWS) */}
          <View className="flex-row flex-wrap justify-between">
            {row.secs.map((s, cIdx) => {
              const cellDate = new Date(weekStart);
              cellDate.setDate(cellDate.getDate() + cIdx);

              const isWeekend = cIdx >= 5;
              const isFuture = cellDate > today;
              const holiday = isHoliday(row.project, cellDate);

              const disabled =
                isWeekend || isFuture || holiday || IsSubmitDisabled;

              return (
                <View
                  key={cIdx}
                  className="w-[30%] mb-3 bg-gray-50 border border-gray-200 rounded-xl p-2"
                >
                  {/* DAY + DATE */}
                  <Text className="text-[11px] text-gray-500 text-center">
                    {dayLabels[cIdx]}
                  </Text>

                  <Text className="text-xs font-semibold text-center mb-1">
                    {cellDate.toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </Text>

                  {/* TIME INPUT */}
                  <TextInput
                    ref={(ref) => {
                      if (!inputRefs.current[rIdx])
                        inputRefs.current[rIdx] = [];
                      inputRefs.current[rIdx][cIdx] = ref;
                    }}
                    keyboardType="numeric"
                    maxLength={2} // 👈 important for auto move
                    className={`text-center text-sm font-bold border rounded-md py-1 ${
                      disabled ? "bg-gray-200" : "bg-white"
                    }`}
                    value={secToHms(s)}
                    editable={!disabled}
                    onChangeText={(text) => {
                      const parsed = parseTimeInput(text);

                      const currentTotal = rows.reduce(
                        (sum, r, idx) =>
                          sum + (idx === rIdx ? 0 : r.secs[cIdx]),
                        0,
                      );

                      if (currentTotal + parsed > 28800) {
                        Alert.alert("Max 8 hours exceeded");
                        return;
                      }

                      const updated = [...rows];
                      updated[rIdx].secs[cIdx] = parsed;
                      setRows(updated);

                      // 🚀 AUTO MOVE TO NEXT
                      if (text.length >= 1) {
                        const nextInput = inputRefs.current[rIdx]?.[cIdx + 1];
                        nextInput?.focus();
                      }
                    }}
                  />

                  {/* NSA BUTTON */}
                  <Pressable
                    disabled={disabled}
                    onPress={() => {
                      const updated = [...rows];
                      updated[rIdx].nsa[cIdx] = !updated[rIdx].nsa[cIdx];
                      setRows(updated);

                      // 🚀 AUTO MOVE TO NEXT INPUT
                      const nextInput = inputRefs.current[rIdx]?.[cIdx + 1];
                      nextInput?.focus();
                    }}
                    className={`mt-2 items-center justify-center rounded-md py-1 ${
                      row.nsa[cIdx] ? "bg-blue-500" : "bg-gray-200"
                    } ${disabled ? "opacity-40" : ""}`}
                  >
                    <Text className="text-black text-[10px] font-semibold">
                      NSA 
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>

          {/* 💬 COMMENT */}
          <View className="mt-2">
            <Text className="text-xs text-gray-500 mb-1">Comment</Text>
            <TextInput
              className="border rounded-lg px-3 py-2 text-sm"
              placeholder="Add comment..."
              value={row.comment}
              editable={!IsSubmitDisabled}
              onChangeText={(text) => {
                const updated = [...rows];
                updated[rIdx].comment = text;
                setRows(updated);
              }}
            />
          </View>
        </View>
      ))}
      {/* Total Hours */}
      <View className="mt-0 bg-white px-4 py-3 rounded-2xl border border-gray-200 shadow-sm">
        {/* HEADER + WEEK TOTAL */}
        <View className="flex-row justify-between items-center mb-2">
          <View className="flex-row items-center">
            <Ionicons name="analytics-outline" size={16} color="#2563eb" />
            <Text className="ml-2 text-sm font-semibold text-gray-700">
              Weekly Totals
            </Text>
          </View>

          <Text className="text-sm font-bold text-green-600">
            {secToHms(colTotals.reduce((a, b) => a + b, 0))}
          </Text>
        </View>

        {/* 🔥 HORIZONTAL STRIP */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2">
            {colTotals.map((s, i) => {
              const cellDate = new Date(weekStart);
              cellDate.setDate(cellDate.getDate() + i);

              return (
                <View
                  key={i}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 items-center min-w-[60px]"
                >
                  {/* DAY */}
                  <Text className="text-[10px] text-gray-400">
                    {dayLabels[i]}
                  </Text>

                  {/* VALUE */}
                  <Text className="text-sm font-bold text-blue-600 mt-1">
                    {secToHms(s) || "0"}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
      {/* Save and Add button 🗯️ */}
      <View className="flex-row items-center justify-between mt-4">
        {/* 💾 SAVE BUTTON (LEFT) */}
        <Pressable
          onPress={async () => {
            if (!isValidTimesheet(rows) || IsSubmitDisabled) return;

            await saveWeek();

            Toast.show({
              type: "success",
              text1: "Timesheet Saved",
              text2: "Your data has been saved successfully",
            });
          }}
          disabled={!isValidTimesheet(rows) || IsSubmitDisabled}
          className={`flex-1 mt-10 mr-2 py-3 rounded-xl flex-row items-center justify-center ${
            !isValidTimesheet(rows) || IsSubmitDisabled
              ? "bg-gray-300"
              : "bg-green-600"
          }`}
        >
          <Ionicons name="save-outline" size={18} color="white" />
          <Text className="text-white ml-2 font-semibold">Save</Text>
        </Pressable>

        {/* ➕ ADD ROW BUTTON (RIGHT) */}
        <Pressable
          disabled={IsSubmitDisabled}
          onPress={() => {
            if (IsSubmitDisabled) {
              Toast.show({
                type: "error",
                text1: "Cannot add after submit",
              });
              return;
            }

            setRows((prev) => [...prev, blankRow()]);
          }}
          className={`w-14 h-14 rounded-xl items-center justify-center ${
            IsSubmitDisabled ? "bg-gray-300" : "bg-blue-600"
          }`}
        >
          <Ionicons name="add" size={24} color="white" />
        </Pressable>
      </View>
      <View className="mt-5 bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
        {/* 🔷 HEADER */}
        <Text className="text-sm font-semibold text-gray-800 mb-3">
          Approval Manager
        </Text>

        {/* ✅ AFTER SUBMIT VIEW */}
        {IsSubmitDisabled ? (
          <>
            <View className="bg-green-50 border border-green-200 rounded-xl p-3 mb-3">
              <Text className="text-sm font-semibold text-green-700">
                Submitted to:{" "}
                {submittedManager?.username ||
                  managerList.find(
                    (m) => String(m.id) === String(selectedManager),
                  )?.username ||
                  "Manager"}
              </Text>
            </View>

            <Text className="text-xs text-gray-500">
              Timesheet submitted for approval.
            </Text>
          </>
        ) : (
          <>
            {/* 🔍 SEARCH INPUT */}
            <TextInput
              placeholder="Search manager..."
              value={managerSearch}
              onChangeText={setManagerSearch}
              className="bg-gray-100 px-3 py-2 rounded-xl mb-3"
            />

            {/* 🔥 MANAGER LIST */}
            <ScrollView className="max-h-40 mb-3">
              {filteredManagers.length === 0 ? (
                <Text className="text-center text-gray-400 text-sm py-4">
                  No managers found
                </Text>
              ) : (
                filteredManagers.map((m, i) => {
                  const active = selectedManager === m.id;

                  return (
                    <Pressable
                      key={i}
                      onPress={() => setSelectedManager(m.id)}
                      className={`p-3 rounded-xl mb-2 ${
                        active ? "bg-blue-100" : "bg-gray-50"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          active
                            ? "text-blue-700 font-semibold"
                            : "text-gray-700"
                        }`}
                      >
                        {m.username || m.email}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </ScrollView>

            {/* 🚀 SUBMIT BUTTON */}
            <Pressable
              // disabled={!selectedManager || submitting}
              disabled={!selectedManager || submitting || IsSubmitDisabled}
              onPress={submitForApproval}
              className={`py-3 rounded-xl items-center ${
                !selectedManager || submitting ? "bg-gray-300" : "bg-blue-600"
              }`}
            >
              <Text className="text-white font-semibold">
                {submitting ? "Submitting..." : "Submit for Approval"}
              </Text>
            </Pressable>
          </>
        )}
      </View>
      {/* DELETE MODAL */}
      <Modal visible={confirmOpen} transparent>
        <View className="flex-1 justify-center items-center bg-black/40">
          <View className="bg-white p-5 rounded">
            <Text>Delete row?</Text>

            <Pressable
              onPress={() => {
                const updated = rows.filter((_, i) => i !== rowToDelete);
                setRows(updated.length ? updated : [blankRow()]);
                setConfirmOpen(false);
              }}
            >
              <Text className="text-red-500 mt-2">Confirm</Text>
            </Pressable>

            <Pressable onPress={() => setConfirmOpen(false)}>
              <Text className="mt-2">Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      {showCalendar && (
        <DateTimePicker
          value={weekStart || new Date()}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}
    </ScrollView>
  );
}
