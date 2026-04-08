import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  Platform,
} from "react-native";
import { PieChart, LineChart, BarChart } from "react-native-gifted-charts";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useMemo, useRef } from "react";
import moment from "moment";
import HRReports from "@/components/HrReports";
import getAuthAxios from "@/services/authaxios";
import { storage } from "@/services/storage";
import { Ionicons } from "@expo/vector-icons";
// import { useColorScheme } from "react-native";

// ─── CONSTANTS ──────────────────────────────────────────────────────────────
const CHART_COLORS = ["#2563eb", "#6A5ACD", "#38bdf8"];
const PAGE_SIZE = 5;

const PERIODS = [
  { key: "this-week", label: "This Week" },
  { key: "last-week", label: "Last Week" },
  { key: "this-month", label: "This Month" },
  { key: "last-month", label: "Last Month" },
  { key: "last-6-months", label: "6 Months" },
];

// ─── SMALL HELPERS ───────────────────────────────────────────────────────────
function isInPeriod(date: string, period: string) {
  const now = moment();
  const d = moment(date);
  switch (period) {
    case "this-week":
      return d.isSame(now, "isoWeek");
    case "last-week":
      return d.isSame(now.clone().subtract(1, "week"), "isoWeek");
    case "this-month":
      return d.isSame(now, "month");
    case "last-month":
      return d.isSame(now.clone().subtract(1, "month"), "month");
    case "last-6-months":
      return d.isAfter(now.clone().subtract(6, "months"));
    default:
      return true;
  }
}

function normalizeWeek(weekStart: string) {
  const s = moment(weekStart);
  const isoStart =
    s.day() === 0 ? s.clone().add(1, "day") : s.clone().startOf("isoWeek");
  return {
    week_start: isoStart.format("YYYY-MM-DD"),
    week_end: isoStart.clone().add(6, "days").format("YYYY-MM-DD"),
  };
}
function groupWeeksByMonth(weeks) {
  const grouped = {};

  weeks.forEach((w) => {
    const month = moment(w.week_start).format("MMM YYYY");

    if (!grouped[month]) {
      grouped[month] = [];
    }

    grouped[month].push(w);
  });

  return grouped;
}

function statusColor(status: string) {
  switch (status) {
    case "approved":
      return { bg: "#d1fae5", text: "#065f46" };
    case "submitted":
    case "pending":
      return { bg: "#fef3c7", text: "#92400e" };
    case "not-submitted":
      return { bg: "#fee2e2", text: "#991b1b" };
    case "needs_edit":
      return { bg: "#ede9fe", text: "#5b21b6" };
    default:
      return { bg: "#f3f4f6", text: "#374151" };
  }
}

// ─── STAT CARD ───────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  accent,
  sub,
}: {
  label: string;
  value: number | string;
  accent: boolean;
  sub?: string;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () =>
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  const release = () =>
    Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Pressable onPressIn={press} onPressOut={release} style={{ flex: 1 }}>
      <Animated.View
        style={{
          transform: [{ scale }],
          flex: 1,
          borderRadius: 20,
          padding: 18,
          backgroundColor: accent ? "#6366f1" : "#ffffff",

          shadowColor: accent ? "#6366f1" : "#000",
          shadowOpacity: accent ? 0.35 : 0.06,
          shadowRadius: accent ? 14 : 8,
          shadowOffset: { width: 0, height: 4 },
          elevation: accent ? 8 : 3,
        }}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: accent ? "rgba(255,255,255,0.75)" : "#9ca3af",
            }}
          >
            {label}
          </Text>
          {sub && (
            <View
              style={{
                backgroundColor: accent ? "rgba(255,255,255,0.2)" : "#f0fdf4",
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  color: accent ? "#fff" : "#16a34a",
                  fontWeight: "600",
                }}
              >
                {sub}
              </Text>
            </View>
          )}
        </View>
        <Text
          style={{
            fontSize: 36,
            fontWeight: "800",
            color: accent ? "#fff" : "#111827",
            marginTop: 8,
            letterSpacing: -1,
          }}
        >
          {value}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

// ─── PERIOD SELECTOR ─────────────────────────────────────────────────────────
function PeriodSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (p: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = PERIODS.find((p) => p.key === value)?.label ?? value;

  return (
    <View
      style={{
        position: "relative",
        zIndex: 9999, // 🔥 increase
        elevation: 9999,
      }}
    >
      <Pressable
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          backgroundColor: "#fff",
          borderWidth: 1,
          borderColor: "#e5e7eb",
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 14,
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 4,
          elevation: 2,
        }}
      >
        <Text style={{ fontSize: 13, color: "#374151", fontWeight: "600" }}>
          {label}
        </Text>
        <Text style={{ fontSize: 10, color: "#9ca3af" }}>
          {open ? "▲" : "▼"}
        </Text>
      </Pressable>

      {open && (
        <View
          style={{
            position: "absolute",
            top: 44,
            right: 0,
            backgroundColor: "#fff",
            borderRadius: 16,
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 16,
            elevation: 12,
            width: 160,
            overflow: "hidden",
            borderWidth: 1,
            borderColor: "#f3f4f6",
          }}
        >
          {PERIODS.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => {
                onChange(p.key);
                setOpen(false);
              }}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 12,
                backgroundColor: value === p.key ? "#eef2ff" : "#fff",
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: value === p.key ? "700" : "500",
                  color: value === p.key ? "#6366f1" : "#374151",
                }}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── SECTION CARD ────────────────────────────────────────────────────────────
function SectionCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) {
  // ✅ ADD THIS (REQUIRED)

  return (
    <View
      style={[
        {
          backgroundColor: "#fff", // ✅ now works
          borderRadius: 20,
          padding: 18,
          marginBottom: 16,

          // optional theme improvement
          shadowColor: "#000",
          shadowOpacity: 0.05,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 2 },
          elevation: 2,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── LEGEND DOT ──────────────────────────────────────────────────────────────
function LegendItem({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        flex: 1,
      }}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          backgroundColor: color,
          marginRight: 8,
        }}
      />
      <Text
        style={{ fontSize: 11, color: "#6b7280", flex: 1 }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: 11,
          fontWeight: "700",
          color: "#111827",
          marginLeft: 4,
        }}
      >
        {value}h
      </Text>
    </View>
  );
}

// ─── STATUS BADGE ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  // const colors = statusColor(status);
  const label =
    status === "not-submitted"
      ? "Not Submitted"
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <View
      style={{
        backgroundColor: "#fff",
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 20,
        alignSelf: "flex-start",
        marginTop: 4,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "600", color: "black" }}>
        {label}
      </Text>
    </View>
  );
}

// ─── FILTER CHIP ─────────────────────────────────────────────────────────────
function FilterChip({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: active ? "#6366f1" : "#f3f4f6",
        marginRight: 8,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: active ? "#fff" : "#374151",
        }}
      >
        {label === "not-submitted"
          ? "Not Submitted"
          : label.charAt(0).toUpperCase() + label.slice(1)}
      </Text>
      <View
        style={{
          marginLeft: 6,
          backgroundColor: active ? "rgba(255,255,255,0.25)" : "#e5e7eb",
          paddingHorizontal: 6,
          paddingVertical: 1,
          borderRadius: 10,
        }}
      >
        <Text
          style={{
            fontSize: 10,
            fontWeight: "700",
            color: active ? "#fff" : "#6b7280",
          }}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

// ─── MAIN DASHBOARD ──────────────────────────────────────────────────────────
export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [period, setPeriod] = useState("last-week");
  const [activeChart, setActiveChart] = useState<"pie" | "bar">("pie");
  const [approvalRows, setApprovalRows] = useState<any[]>([]);
  const [statusRows, setStatusRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [tsPeriod, setTsPeriod] = useState("this-week");
  const [statusFilter, setStatusFilter] = useState<string[]>(["all"]);
  const [page, setPage] = useState(1);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [calendarEmployee, setCalendarEmployee] = useState("");
  const [calendarWeeks, setCalendarWeeks] = useState<any[]>([]);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  // const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState("all");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // ── LOAD USER ──
  useEffect(() => {
    storage.get("user").then((u) => {
      if (u) setUser(JSON.parse(u));
    });
  }, []);

  const role =
    user?.role || user?.profile?.role || user?.user_profile?.role || "employee";

  // ── FETCH ENTRIES ──
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const api = await getAuthAxios();
        const res = await api.get("/entries/", {
          params: { view: "team", range: period },
        });
        setEntries(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.log("Entries error", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  const fetchEmployees = async (query = "") => {
    try {
      const api = await getAuthAxios();
      const res = await api.get("/users/");

      const mapped = (res.data || []).map((emp: any) => ({
        id: emp.id || emp._id || emp.email,
        name: emp.username || emp.email,
        email: emp.email,
      }));

      const filtered = mapped.filter(
        (e: any) =>
          e.name.toLowerCase().includes(query.toLowerCase()) ||
          e.email.toLowerCase().includes(query.toLowerCase()),
      );

      setEmployeeList(filtered);
    } catch (err) {
      console.log("Employee fetch error", err);
    }
  };
  // ── FETCH TIMESHEETS ──
  const fetchAllTimesheetData = async () => {
    try {
      const api = await getAuthAxios();
      const [approvedRes, missingRes] = await Promise.all([
        api.get("/manager-timesheets/"),
        api.get("/manager-timesheet-status/", { params: { period: tsPeriod } }),
      ]);

      const approved = (approvedRes.data || []).map((item: any) => ({
        user_id: item.user_id,
        employee: item.employee_name,
        ...normalizeWeek(item.week_start),
        status: item.status?.toLowerCase(),
      }));

      const notSubmitted = (missingRes.data || []).map((item: any) => ({
        user_id: item.user_id,
        employee: item.employee_name,
        week_start: item.week_start,
        week_end: item.week_end,
        status: "not-submitted",
      }));

      setApprovalRows(approved);
      setStatusRows(notSubmitted);
    } catch (err) {
      console.log("Timesheet fetch failed", err);
    }
  };

  useEffect(() => {
    if (role === "manager" || role === "hr") fetchAllTimesheetData();
  }, [role, tsPeriod]);

  // ── FILTERED ENTRIES ──
  const filteredEntries = useMemo(() => {
    if (role === "employee") {
      return entries.filter((e: any) => e.user_id === user?.id);
    }

    if (selectedEmployee === "all") {
      return entries;
    }

    if (selectedEmployee) {
      return entries.filter((e: any) => e.user_id === selectedEmployee);
    }

    return entries;
  }, [entries, selectedEmployee, role]);

  const periodFilteredEntries = useMemo(() => {
    const now = moment();
    let start: moment.Moment, end: moment.Moment;
    switch (period) {
      case "this-week":
        start = now.clone().startOf("isoWeek");
        end = now.clone().endOf("isoWeek");
        break;
      case "last-week":
        start = now.clone().subtract(1, "week").startOf("isoWeek");
        end = now.clone().subtract(1, "week").endOf("isoWeek");
        break;
      case "this-month":
        start = now.clone().startOf("month");
        end = now.clone().endOf("month");
        break;
      case "last-month":
        start = now.clone().subtract(1, "month").startOf("month");
        end = now.clone().subtract(1, "month").endOf("month");
        break;
      default:
        return filteredEntries;
    }
    return filteredEntries.filter((e: any) =>
      moment(e.date).isBetween(start, end, "day", "[]"),
    );
  }, [filteredEntries, period]);

  const displayEntries = useMemo(() => {
    if (role === "employee") return periodFilteredEntries;
    if (selectedUser)
      return periodFilteredEntries.filter(
        (e: any) => e.user_id === selectedUser,
      );
    return periodFilteredEntries;
  }, [periodFilteredEntries, selectedUser, role]);
  const employeeFilteredApprovalRows = useMemo(() => {
    if (selectedEmployee === "all" || !selectedEmployee) {
      return approvalRows;
    }

    return approvalRows.filter(
      (r) => String(r.user_id) === String(selectedEmployee),
    );
  }, [approvalRows, selectedEmployee]);

  function isInPeriod(date, period) {
    const d = moment(date);
    const now = moment();

    switch (period) {
      case "this-week":
        return d.isSame(now, "isoWeek");

      case "last-week":
        return d.isSame(now.clone().subtract(1, "week"), "isoWeek");

      case "this-month":
        return d.isSame(now, "month");

      case "last-month":
        return d.isSame(now.clone().subtract(1, "month"), "month");

      case "last-6-months":
        return d.isAfter(now.clone().subtract(6, "months"), "day");

      default:
        return true;
    }
  }
  // ── COUNTS ──
  const pendingCount = useMemo(() => {
    const source =
      role === "manager" || role === "hr"
        ? employeeFilteredApprovalRows // ✅ FIXED
        : filteredEntries;

    return source.filter((r) => {
      const date = r.week_start || r.date;

      return (
        isInPeriod(date, period) &&
        ["submitted", "pending", "needs_edit"].includes(r.status)
      );
    }).length;
  }, [employeeFilteredApprovalRows, filteredEntries, period]);

  const approvedCount = useMemo(() => {
    const source =
      role === "manager" || role === "hr"
        ? employeeFilteredApprovalRows // ✅ FIXED
        : filteredEntries;

    return source.filter((r) => {
      const date = r.week_start || r.date;

      return isInPeriod(date, period) && r.status === "approved";
    }).length;
  }, [employeeFilteredApprovalRows, filteredEntries, period]);
  // ── CHART DATA ──
  const projectHours = useMemo(
    () =>
      periodFilteredEntries.reduce((acc: any, e: any) => {
        const p = e.project_name || "Other";
        acc[p] = (acc[p] || 0) + (Number(e.hours) || 0);
        return acc;
      }, {}),
    [periodFilteredEntries],
  );

  const pieData = useMemo(
    () =>
      Object.entries(projectHours).map(([name, value], i) => ({
        value: value as number,
        text: name,
        color: CHART_COLORS[i % CHART_COLORS.length],
        label: name,
      })),
    [projectHours],
  );

  const barData = useMemo(
    () =>
      Object.entries(projectHours).map(([project, hours], i) => ({
        value: Number(hours) || 0,
        label: project.length > 7 ? project.slice(0, 7) + "…" : project,
        frontColor: CHART_COLORS[i % CHART_COLORS.length],
        topLabelComponent: () => (
          <Text style={{ fontSize: 9, color: "#6b7280", marginBottom: 2 }}>
            {hours as number}h
          </Text>
        ),
      })),
    [projectHours],
  );

  const lineData = useMemo(
    () =>
      Object.entries(projectHours).map(([project, hours], i) => ({
        value: Number(hours) || 0,
        label: `P${i + 1}`,
        dataPointText: `${hours}h`,
      })),
    [projectHours],
  );

  const totalHours = useMemo(
    () =>
      periodFilteredEntries.reduce(
        (s: number, e: any) => s + (Number(e.hours) || 0),
        0,
      ),
    [periodFilteredEntries],
  );

  // ── TIMESHEET STATUS COUNTS ──
  const statusCounts = useMemo(() => {
    const base =
      role === "manager" || role === "hr"
        ? [...approvalRows, ...statusRows]
        : displayEntries;
    const counts: Record<string, number> = {
      all: base.length,
      approved: 0,
      submitted: 0,
      "not-submitted": 0,
    };
    base.forEach((item: any) => {
      if (item.status === "approved") counts.approved++;
      else if (item.status === "submitted" || item.status === "pending")
        counts.submitted++;
      else if (item.status === "not-submitted") counts["not-submitted"]++;
    });
    return counts;
  }, [approvalRows, statusRows, displayEntries, role]);

  // ── TIMESHEET LIST (paginated) ──
  const timesheetRows = useMemo(() => {
    const base =
      role === "manager" || role === "hr"
        ? [...approvalRows, ...statusRows]
        : displayEntries;

    const filtered = base
      .filter((item: any) => {
        const date = moment(item.week_start || item.date);
        const now = moment();
        switch (tsPeriod) {
          case "this-week":
            return date.isSame(now, "week");
          case "last-week":
            return date.isSame(now.clone().subtract(1, "week"), "week");
          case "this-month":
            return date.isSame(now, "month");
          case "last-month":
            return date.isSame(now.clone().subtract(1, "month"), "month");
          case "last-6-months":
            return date.isAfter(now.clone().subtract(6, "months"));
          default:
            return true;
        }
      })
      .filter((item: any) =>
        (item.employee || item.user_name || "")
          .toLowerCase()
          .includes(search.toLowerCase()),
      )
      .filter((item: any) => {
        if (statusFilter.includes("all")) return true;
        return statusFilter.some((f) => f === item.status);
      });

    return filtered;
  }, [
    approvalRows,
    statusRows,
    displayEntries,
    role,
    tsPeriod,
    search,
    statusFilter,
  ]);
  const groupedTimesheets = useMemo(() => {
    const grouped = {};

    timesheetRows.forEach((item) => {
      const key = item.employee || item.user_name || "Unknown";

      if (!grouped[key]) {
        grouped[key] = {
          employee: key,
          weeks: [],
        };
      }

      grouped[key].weeks.push(item);
    });

    return Object.values(grouped);
  }, [timesheetRows]);
  const totalPages = Math.max(
    1,
    Math.ceil(groupedTimesheets.length / PAGE_SIZE),
  );

  const paginatedRows = groupedTimesheets.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE,
  );
  const [selectedSlice, setSelectedSlice] = useState<any>(null);

  const COLORS = ["#2563eb", "#6A5ACD", "#38bdf8"];

  const enhancedPieData = pieData.map((item: any, i: number) => ({
    ...item,
    value: Number(item.value) || 0,
    color: COLORS[i % COLORS.length],
    gradientCenterColor: COLORS[i % COLORS.length], // 🔥 depth
  }));
  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 12,
          paddingTop: 0,
          paddingBottom: 120,
        }}
      >
  <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 5,
          }}
        >
          <View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "800",
                color: "rgb(77, 156, 255)",
                letterSpacing: -0.5,
              }}
            >
              Dashboard
            </Text>

            <Text style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>
              {moment().format("dddd, D MMMM YYYY")}
            </Text>
          </View>
          <PeriodSelector
            value={period}
            onChange={(p) => {
              setPeriod(p);
              setPage(1);
            }}
          />
        </View>
        {role === "hr" && (
          <View style={{ marginBottom: 6, position: "relative", zIndex: 100 }}>
            {/* 🔍 SEARCH INPUT */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",

                backgroundColor: "#fff",
                borderRadius: 14,

                paddingHorizontal: 10,
                height: 44,

               

                // 🔥 3D SHADOW (iOS)
                shadowColor: "gray",
                shadowOpacity: 0.2,
                shadowRadius: 80,
                shadowOffset: { width: 0, height: 2 },

                // 🔥 ANDROID
                elevation: 6,
              }}
            >
              <Ionicons name="search-outline" size={20} color={"black"} />

              <TextInput
                placeholder="Search employee..."
                placeholderTextColor={"gray"}
                value={employeeSearch}
                onFocus={() => {
                  setDropdownOpen(true);
                  fetchEmployees("");
                }}
                onChangeText={(text) => {
                  setEmployeeSearch(text);
                  setDropdownOpen(true);
                  fetchEmployees(text);
                }}
                style={{
                  flex: 1,
                  marginLeft: 8,
                  color: "#000",
                }}
              />

              {employeeSearch.length > 0 && (
                <Pressable
                  onPress={() => {
                    setEmployeeSearch("");
                    setSelectedEmployee(null);
                    fetchEmployees("");
                  }}
                >
                  <Ionicons name="close" size={18} color={"black"} />
                </Pressable>
              )}
            </View>

            {/* 🔽 DROPDOWN */}
            {dropdownOpen && (
              <View
                style={{
                  position: "absolute",
                  top: 52,
                  left: 0,
                  right: 0,

                  backgroundColor: "#fff",
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: "gray",

                  maxHeight: 250,

                  zIndex: 9999,
                  elevation: 20,

                  // 🔥 SHADOW (premium)
                  shadowColor: "#000",
                  shadowOpacity: 0.15,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 6 },
                }}
              >
                {/* 🔝 HEADER WITH CLOSE */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: 10,
                    borderBottomWidth: 1,
                    borderColor: "gray",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: "#000",
                    }}
                  >
                    Select Employee
                  </Text>

                  <Pressable onPress={() => setDropdownOpen(false)}>
                    <Ionicons name="close" size={22} color={"#000"} />
                  </Pressable>
                </View>

                {/* 🧾 LIST */}
                <ScrollView showsVerticalScrollIndicator={false}>
                  {Object.entries(groupWeeksByMonth(calendarWeeks)).map(
                    ([month, weeks]: any, idx: number) => (
                      <View key={idx} style={{ marginBottom: 12 }}>
                        {/* MONTH */}
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: "#6b7280",
                            marginBottom: 6,
                          }}
                        >
                          {month}
                        </Text>

                        {/* WEEKS */}
                        {weeks.map((w: any, i: number) => (
                          <View
                            key={i}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingVertical: 8,
                            }}
                          >
                            <View
                              style={{
                                marginRight: 8,
                                width: 22,
                                height: 22,
                                borderRadius: 6,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor:
                                  w.status === "approved"
                                    ? "#dcfce7" // green bg
                                    : w.status === "not-submitted"
                                      ? "#fee2e2" // red bg
                                      : "#fef3c7", // yellow bg
                              }}
                            >
                              <Ionicons
                                name={
                                  w.status === "approved"
                                    ? "checkmark"
                                    : w.status === "not-submitted"
                                      ? "close"
                                      : "time-outline"
                                }
                                size={12}
                                color={
                                  w.status === "approved"
                                    ? "#16a34a"
                                    : w.status === "not-submitted"
                                      ? "#dc2626"
                                      : "#d97706"
                                }
                              />
                            </View>

                            <Text
                              style={{
                                fontSize: 13,
                                color: "#111827",
                              }}
                            >
                              {moment(w.week_start).format("DD MMM")} →{" "}
                              {moment(w.week_end).format("DD MMM")}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ),
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* ── STAT CARDS ── */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
          <StatCard
            label="Pending"
            value={pendingCount}
            accent={true}
            sub="Active"
          />
          <StatCard
            label="Approved"
            value={approvedCount}
            accent={false}
            sub="Done ✓"
          />
        </View>

        {/* ── TOTAL HOURS BANNER ── */}
        <Pressable className="mb-1 active:scale-[0.97]">
          <View
            style={{
              backgroundColor: "#4da6ff",
              // backgroundColor: "skyblue",
              borderRadius: 22,
              padding: 18,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              overflow: "hidden",
            }}
          >
            {/* 🔥 SOFT GLOW (3D feel) */}
            <View
              style={{
                position: "absolute",
                top: -20,
                right: -20,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: "rgba(99,102,241,0.25)",
              }}
            />

            {/* LEFT CONTENT */}
            <View>
              <Text
                style={{
                  // color: "rgba(255,255,255,0.6)",
                  color: "#e5e7eb",

                  fontSize: 12,
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}
              >
                Total Hours Logged
              </Text>

              <Text
                style={{
                  color: "#f1f5f9",
                  fontSize: 36,
                  fontWeight: "900",
                  letterSpacing: -1,
                  marginTop: 4,
                }}
              >
                {totalHours}
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    // color: "rgba(255,255,255,0.6)",
                    color: "#e5e7eb",
                  }}
                >
                  {" "}
                  hrs
                </Text>
              </Text>

              {/* 🔥 SUB INFO */}
              <Text
                style={{
                  // color: "rgba(255,255,255,0.4)",
                  color: "#e5e7eb",
                  fontSize: 10,
                  marginTop: 2,
                }}
              >
                Updated this period
              </Text>
            </View>

            {/* RIGHT ICON */}

            <View
              style={{
                backgroundColor: "rgba(99,102,241,0.15)",
                borderRadius: 18,
                width: 60,
                height: 60,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: "#6366f1",
                shadowOpacity: 0.4,
                shadowRadius: 10,
                elevation: 6,
              }}
            >
              <Ionicons name="time-outline" size={38} color="#d1d5db" />
            </View>
          </View>
        </Pressable>

        {/* ── ACTIVITY DISTRIBUTION ── */}
        <SectionCard>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <View>
              <Text
                style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}
              >
                Activity Distribution
              </Text>
              <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                By project
              </Text>
            </View>

            {/* Toggle */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#f3f4f6",
                borderRadius: 20,
                padding: 4,
              }}
            >
              {(["pie", "bar"] as const).map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setActiveChart(c)}
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                    borderRadius: 16,
                    backgroundColor: activeChart === c ? "#fff" : "transparent",
                    shadowColor: activeChart === c ? "#000" : "transparent",
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: activeChart === c ? 2 : 0,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "700",
                      color: activeChart === c ? "#6366f1" : "#9ca3af",
                    }}
                  >
                    {c === "pie" ? "Donut" : "Bar"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {pieData.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 32 }}>
              <Text style={{ fontSize: 32 }}>📊</Text>
              <Text style={{ color: "#9ca3af", marginTop: 8, fontSize: 13 }}>
                No data for this period
              </Text>
            </View>
          ) : activeChart === "pie" ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 16 }}
            >
              {/* Chart */}
              {/* Chart */}
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                {/* 🔥 3D SHADOW BASE */}
                <View style={{ position: "absolute", top: 6, opacity: 0.25 }}>
                  <PieChart
                    data={enhancedPieData.map((d) => ({
                      ...d,
                      color: "#00000015",
                    }))}
                    donut
                    radius={80}
                    innerRadius={52}
                  />
                </View>

                {/* 🔥 MAIN PIE */}
                <PieChart
                  data={enhancedPieData}
                  donut
                  radius={80}
                  innerRadius={52}
                  innerCircleColor="#fff"
                  focusOnPress
                  sectionAutoFocus
                  onPress={(item) => setSelectedSlice(item)} // 🔥 CLICK
                  showText={false}
                  strokeWidth={2}
                  strokeColor="#f3f4f6"
                  centerLabelComponent={() => (
                    <View
                      style={{ alignItems: "center", paddingHorizontal: 6 }}
                    >
                      <Text
                        style={{
                          fontSize: 20,
                          fontWeight: "800",
                          color: "#111827",
                        }}
                      >
                        {selectedSlice ? selectedSlice.value : pieData.length}
                      </Text>

                      <Text
                        numberOfLines={2}
                        style={{
                          fontSize: 10,
                          color: "#6b7280",
                          fontWeight: "600",
                          textAlign: "center",
                        }}
                      >
                        {selectedSlice
                          ? selectedSlice.text // 🔥 FULL NAME
                          : "PROJECTS"}
                      </Text>
                    </View>
                  )}
                />
              </View>

              {/* Legend */}
              <View style={{ flex: 1, marginTop: 10 }}>
                {enhancedPieData.map((d, i) => {
                  const active = selectedSlice?.text === d.text;

                  return (
                    <Pressable
                      key={i}
                      onPress={() => setSelectedSlice(d)} // 🔥 SYNC WITH PIE
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                        paddingVertical: 6,
                        paddingHorizontal: 8,
                        borderRadius: 8,
                        backgroundColor: active ? "#eef2ff" : "transparent",
                      }}
                    >
                      {/* LEFT */}
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          flex: 1,
                        }}
                      >
                        <View
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            backgroundColor: d.color,
                            marginRight: 8,
                          }}
                        />

                        <Text
                          numberOfLines={1}
                          style={{
                            fontSize: 12,
                            color: active ? "#1d4ed8" : "#374151",
                            fontWeight: active ? "700" : "500",
                            flex: 1,
                          }}
                        >
                          {d.text}
                        </Text>
                      </View>

                      {/* VALUE */}
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: "#111827",
                        }}
                      >
                        {d.value}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <BarChart
                data={barData}
                barWidth={28}
                spacing={16}
                roundedTop
                roundedBottom
                barBorderRadius={6}
                noOfSections={4}
                yAxisTextStyle={{ color: "#9ca3af", fontSize: 10 }}
                xAxisLabelTextStyle={{ color: "#6b7280", fontSize: 10 }}
                rulesColor="#f3f4f6"
                hideRules={false}
                showLine={false}
                isAnimated
                animationDuration={600}
              />
            </ScrollView>
          )}
        </SectionCard>

        {/* ── HOURS TREND ── */}
        <SectionCard>
          <View style={{ marginBottom: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
              Hours Trend
            </Text>
            <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
              Per project over period
            </Text>
          </View>
          {lineData.length === 0 ? (
            <View style={{ alignItems: "center", paddingVertical: 24 }}>
              <Text style={{ color: "#9ca3af", fontSize: 13 }}>
                No data available
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <LineChart
                data={lineData}
                thickness={3}
                color="#6366f1"
                areaChart
                startFillColor="rgba(99,102,241,0.18)"
                endFillColor="rgba(99,102,241,0.01)"
                startOpacity={0.9}
                endOpacity={0.1}
                hideDataPoints={false}
                dataPointsColor="#4da6ff"
                dataPointsRadius={5}
                yAxisTextStyle={{ color: "#9ca3af", fontSize: 10 }}
                xAxisLabelTextStyle={{ color: "#6b7280", fontSize: 10 }}
                rulesColor="#f3f4f6"
                isAnimated
                animationDuration={800}
              />
            </ScrollView>
          )}
        </SectionCard>

        {/* ── TIMESHEETS (HR / MANAGER) ── */}
        {role === "hr" && (
          <SectionCard>
            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <View>
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}
                >
                  Timesheets
                </Text>
                <Text style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>
                  {timesheetRows.length} records
                </Text>
              </View>
              <PeriodSelector
                value={tsPeriod}
                onChange={(p) => {
                  setTsPeriod(p);
                  setPage(1);
                }}
              />
            </View>

            {/* Search */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                backgroundColor: "#f9fafb",
                borderRadius: 14,
                borderWidth: 1,
                borderColor: "#e5e7eb",
                paddingHorizontal: 12,
                paddingVertical: 1,
                marginBottom: 5,
                gap: 8,
              }}
            >
              <Ionicons name="search-outline" size={16} color="#9ca3af" />
              <TextInput
                placeholder="Search employee…"
                placeholderTextColor="#9ca3af"
                value={search}
                onChangeText={(t) => {
                  setSearch(t);
                  setPage(1);
                }}
                style={{ flex: 1, fontSize: 14, color: "#111827" }}
              />
              {search.length > 0 && (
                <Pressable
                  onPress={() => {
                    setSearch("");
                    setPage(1);
                  }}
                >
                  <Text style={{ color: "#9ca3af", fontSize: 16 }}>✕</Text>
                </Pressable>
              )}
            </View>

            {/* Filter chips */}
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                marginBottom: 4,
              }}
            >
              {(["all", "approved", "submitted", "not-submitted"] as const).map(
                (s) => (
                  <FilterChip
                    key={s}
                    label={s}
                    count={statusCounts[s] || 0}
                    active={statusFilter.includes(s)}
                    onPress={() => {
                      setStatusFilter([s]);
                      setPage(1);
                    }}
                  />
                ),
              )}
            </View>

            {/* List */}
            {paginatedRows.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: 32 }}>
                <Text style={{ fontSize: 28 }}>🗂</Text>
                <Text style={{ color: "#9ca3af", marginTop: 8, fontSize: 13 }}>
                  No entries found
                </Text>
              </View>
            ) : (
              <>
                {paginatedRows.map((row: any, index: number) => {
                  return (
                    <View
                      key={index}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        paddingVertical: 12,
                        borderBottomWidth:
                          index < paginatedRows.length - 1 ? 1 : 0,
                        borderBottomColor: "#f3f4f6",
                      }}
                    >
                      {/* Employee */}
                      <View style={{ flex: 1 }}>
                        <Text
                          style={{
                            fontWeight: "700",
                            fontSize: 14,
                            color: "#111827",
                          }}
                        >
                          {row.employee}
                        </Text>

                        <Text
                          style={{
                            fontSize: 12,
                            color: "#9ca3af",
                            marginTop: 2,
                          }}
                        >
                          {row.weeks.length} weeks
                        </Text>
                      </View>

                      {/* Calendar Button */}
                      <Pressable
                        onPress={() => {
                          setCalendarEmployee(row.employee);
                          setCalendarWeeks(row.weeks); // 🔥 IMPORTANT
                          setCalendarOpen(true);
                        }}
                        style={{
                          backgroundColor: "#eef2ff",
                          borderRadius: 12,
                          padding: 10,
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Ionicons
                          name="calendar-outline"
                          size={20}
                          color="#6366f1"
                        />
                      </Pressable>
                    </View>
                  );
                })}

                {/* Pagination */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: 16,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: "#f3f4f6",
                  }}
                >
                  <Pressable
                    disabled={page === 1}
                    onPress={() => setPage((p) => p - 1)}
                    style={{
                      backgroundColor: page === 1 ? "#f3f4f6" : "#eef2ff",
                      paddingHorizontal: 18,
                      paddingVertical: 9,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: page === 1 ? "#d1d5db" : "#6366f1",
                      }}
                    >
                      ← Prev
                    </Text>
                  </Pressable>

                  <Text
                    style={{
                      fontSize: 13,
                      color: "#6b7280",
                      fontWeight: "600",
                    }}
                  >
                    {page} / {totalPages}
                  </Text>

                  <Pressable
                    disabled={page === totalPages}
                    onPress={() => setPage((p) => p + 1)}
                    style={{
                      backgroundColor:
                        page === totalPages ? "#f3f4f6" : "#eef2ff",
                      paddingHorizontal: 18,
                      paddingVertical: 9,
                      borderRadius: 12,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "600",
                        color: page === totalPages ? "#d1d5db" : "#6366f1",
                      }}
                    >
                      Next →
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
          </SectionCard>
        )}

        <HRReports user={user} />
      </ScrollView>

      {/* ── CALENDAR MODAL ── */}
      <Modal
        visible={calendarOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCalendarOpen(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.45)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
              padding: 24,
              maxHeight: "60%",
            }}
          >
            {/* Handle */}
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#e5e7eb",
                alignSelf: "center",
                marginBottom: 18,
              }}
            />

            {/* Header */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <Text
                style={{ fontSize: 17, fontWeight: "700", color: "#111827" }}
              >
                <Ionicons name="calendar-outline" size={20} color="#000" />{" "}
                {calendarEmployee}
              </Text>
              <Pressable
                onPress={() => setCalendarOpen(false)}
                style={{
                  backgroundColor: "#f3f4f6",
                  borderRadius: 10,
                  width: 32,
                  height: 32,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{ fontSize: 14, color: "#6b7280", fontWeight: "700" }}
                >
                  ✕
                </Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {Object.entries(groupWeeksByMonth(calendarWeeks)).map(
                ([month, weeks]: any, idx: number) => (
                  <View key={idx} style={{ marginBottom: 12 }}>
                    {/* 🔥 MONTH TITLE */}
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: "#6b7280",
                        marginBottom: 6,
                      }}
                    >
                      {month}
                    </Text>

                    {/* 🔥 WEEKS LIST */}
                    {weeks.map((w: any, i: number) => (
                      <View
                        key={i}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingVertical: 8,
                        }}
                      >
                        {/* ICON */}
                        <View
                          style={{
                            marginRight: 8,
                            width: 20,
                            height: 20,
                            borderRadius: 10,
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor:
                              w.status === "approved"
                                ? "#dcfce7"
                                : w.status === "not-submitted"
                                  ? "#fee2e2"
                                  : "#fef3c7",
                          }}
                        >
                          <Ionicons
                            name={
                              w.status === "approved"
                                ? "checkmark"
                                : w.status === "not-submitted"
                                  ? "close"
                                  : "time-outline"
                            }
                            size={12}
                            color={
                              w.status === "approved"
                                ? "#16a34a"
                                : w.status === "not-submitted"
                                  ? "#dc2626"
                                  : "#d97706"
                            }
                          />
                        </View>

                        {/* DATE */}
                        <Text
                          style={{
                            fontSize: 13,
                            color: "#111827",
                            fontWeight: "500",
                          }}
                        >
                          {moment(w.week_start).format("DD MMM")} →{" "}
                          {moment(w.week_end).format("DD MMM")}
                        </Text>
                      </View>
                    ))}
                  </View>
                ),
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
