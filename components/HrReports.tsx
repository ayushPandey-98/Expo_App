import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Dimensions,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import moment from "moment";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { LineChart } from "react-native-chart-kit";
import api from "@/services/api"; // ✅ uses your api.ts with interceptors

// ─── Constants ────────────────────────────────────────────────────────────────

const ROWS_PER_PAGE = 4;

const AVATAR_COLORS = [
  "#6366f1", "#22c55e", "#f97316", "#ef4444",
  "#3b82f6", "#a855f7", "#ec4899", "#14b8a6",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

function getWeekRange(dateStr: string) {
  const d = new Date(dateStr);
  const monday = new Date(d);
  monday.setDate(d.getDate() - d.getDay() + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: toISODate(monday),
    end: toISODate(sunday),
  };
}

function shiftWeekDate(dateStr: string, direction: number) {
  const { start } = getWeekRange(dateStr);
  const next = new Date(start);
  next.setDate(next.getDate() + direction * 7);
  return toISODate(next);
}

function getInitials(name: string) {
  return (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

const NSAReportMobile = ({ user }: { user: any }) => {
  if (user?.role !== "hr") return null;

  const screenWidth = Dimensions.get("window").width - 32;

  // ── State (mirrors web exactly) ─────────────────────────────────────────────
  const [data, setData]                 = useState<any[]>([]);
  const [visibleRows, setVisibleRows]   = useState(ROWS_PER_PAGE);   // ✅ Load More pattern
  const [loading, setLoading]           = useState(false);
  const [exporting, setExporting]       = useState(false);

  const [range, setRange]               = useState("30");             // default: last 30 days
  const [selectedDate, setSelectedDate] = useState("");               // week mode date
  const [startDate, setStartDate]       = useState("");
  const [endDate, setEndDate]           = useState("");

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker]     = useState(false);
  const [showRangeModal, setShowRangeModal]   = useState(false);

  // ── Fetch (same priority order as web) ────────────────────────────────────
  const fetchReport = async () => {
    const params: Record<string, string> = {};

    if (startDate && endDate) {
      params.start = startDate;
      params.end   = endDate;
    } else if (range) {
      params.range = range;
    } else if (selectedDate) {
      params.date = selectedDate;
    }

    try {
      setLoading(true);
      const res = await api.get("/api/hr/report", { params });

      const sorted = [...res.data].sort((a, b) => {
        const da = new Date(a.week_start || a.date).getTime();
        const db = new Date(b.week_start || b.date).getTime();
        return db - da;
      });

      setData(sorted);
      setVisibleRows(ROWS_PER_PAGE); // reset on new fetch
    } catch (err) {
      console.error("❌ NSA fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedDate, range, startDate, endDate]);

  // ── Export ────────────────────────────────────────────────────────────────
  const exportData = async () => {
    try {
      setExporting(true);
      const params: Record<string, string> = {};

      if (startDate && endDate)   { params.start = startDate; params.end = endDate; }
      else if (range)              { params.range = range; }
      else if (selectedDate)       { params.date  = selectedDate; }

      const res = await api.get("/api/hr/report/export", {
        params,
        responseType: "text",
      });

      const fileUri = FileSystem.cacheDirectory + "nsa_report.csv";
      await FileSystem.writeAsStringAsync(fileUri, res.data, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      await Sharing.shareAsync(fileUri, { mimeType: "text/csv" });
    } catch (err) {
      console.error("❌ Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  // ── Week navigation ───────────────────────────────────────────────────────
  const shiftWeek = (direction: number) => {
    if (!selectedDate) return;
    setSelectedDate(shiftWeekDate(selectedDate, direction));
  };

  const weekLabel = useMemo(() => {
    if (!selectedDate) return "Select Week";
    const { start, end } = getWeekRange(selectedDate);
    return `${moment(start).format("DD MMM")}  →  ${moment(end).format("DD MMM YYYY")}`;
  }, [selectedDate]);

  // ── Chart data (mirrors web monthChartData + displayChartData) ────────────
  const chartData = useMemo(() => {
    const map: Record<string, number> = {};

    data.forEach((item) => {
      const raw = item.week_start || item.date;
      if (!raw) return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      map[key] = (map[key] || 0) + 1;
    });

    const sorted = Object.keys(map)
      .sort()
      .map((key) => {
        const [y, m] = key.split("-");
        return {
          month: moment(new Date(Number(y), Number(m))).format("MMM YY"),
          users: map[key],
        };
      });

    // Mirror web: pad single-point data so line renders
    return sorted.length === 1
      ? [{ month: "Start", users: 0 }, sorted[0]]
      : sorted;
  }, [data]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const paginated = data.slice(0, visibleRows);
  const hasMore   = visibleRows < data.length;

  const activeMode =
    startDate && endDate ? "Custom Range"
    : range === "15"     ? "Last 15 Days"
    : range === "30"     ? "Last 30 Days"
    : "Week Mode";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={{ backgroundColor: "#f1f5f9", flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >

        {/* ════════════════════════════════════════════════════
            HEADER CARD
        ════════════════════════════════════════════════════ */}
 <View style={S.card}>
  {/* HEADER */}
  <View style={S.headerRow}>
    <View style={S.leftHeader}>
      <View style={S.iconBadge}>
        <Ionicons name="bar-chart-outline" size={18} color="#16a34a" />
      </View>

      <View>
        <Text style={S.title}>NSA Report</Text>
        <Text style={S.subtitle}>{activeMode}</Text>
      </View>
    </View>

    <Pressable
      style={({ pressed }) => [
        S.exportBtn,
        pressed && { opacity: 0.85 },
      ]}
      onPress={exportData}
      disabled={exporting}
    >
      {exporting ? (
        <ActivityIndicator size={14} color="#fff" />
      ) : (
        <Ionicons name="download-outline" size={14} color="#fff" />
      )}
      <Text style={S.exportBtnText}>
        {exporting ? "Exporting…" : "Export"}
      </Text>
    </Pressable>
  </View>

  {/* FILTER SECTION */}
  <View style={S.filterContainer}>
    <Text style={S.sectionLabel}>Filters</Text>

    <View style={S.filterRow}>
      {/* Start Date */}
      <Pressable
        style={[S.pill, startDate && S.pillActive]}
        onPress={() => setShowStartPicker(true)}
      >
        <Ionicons
          name="calendar-outline"
          size={12}
          color={startDate ? "#fff" : "#6b7280"}
        />
        <Text style={[S.pillText, startDate && S.pillTextActive]}>
          {startDate
            ? moment(startDate).format("DD MMM")
            : "Start"}
        </Text>
      </Pressable>

      <Ionicons name="arrow-forward" size={12} color="#9ca3af" />

      {/* End Date */}
      <Pressable
        style={[S.pill, endDate && S.pillActive]}
        onPress={() => setShowEndPicker(true)}
      >
        <Ionicons
          name="calendar-outline"
          size={12}
          color={endDate ? "#fff" : "#6b7280"}
        />
        <Text style={[S.pillText, endDate && S.pillTextActive]}>
          {endDate
            ? moment(endDate).format("DD MMM")
            : "End"}
        </Text>
      </Pressable>

      {/* Range */}
      <Pressable
        style={S.pillRange}
        onPress={() => setShowRangeModal(true)}
      >
        <Ionicons name="funnel-outline" size={12} color="#4f46e5" />
        <Text style={S.pillRangeText}>
          {range === "" ? "Week" : range === "15" ? "15D" : "30D"}
        </Text>
        <Ionicons name="chevron-down" size={11} color="#4f46e5" />
      </Pressable>
    </View>

    {(startDate || endDate) && (
      <Pressable
        style={S.clearRow}
        onPress={() => {
          setStartDate("");
          setEndDate("");
          setRange("30");
        }}
      >
        <Ionicons name="close-circle-outline" size={13} color="#ef4444" />
        <Text style={S.clearText}>Clear range</Text>
      </Pressable>
    )}
  </View>
</View>

        {/* ════════════════════════════════════════════════════
            FILTER CARD
        ════════════════════════════════════════════════════ */}
      

        {/* ════════════════════════════════════════════════════
            WEEK NAVIGATOR  (only when range = "" = week mode)
        ════════════════════════════════════════════════════ */}
        {!range && !startDate && !endDate && (
          <View style={[S.card, S.weekNav]}>
            <Pressable
              style={S.weekArrow}
              onPress={() => shiftWeek(-1)}
              disabled={!selectedDate}
            >
              <Ionicons name="chevron-back" size={20} color="#4f46e5" />
            </Pressable>

            <View style={{ alignItems: "center", flex: 1 }}>
              <Text style={S.weekLabel}>{weekLabel}</Text>
              <Text style={S.weekSub}>Week Range</Text>
            </View>

            <Pressable
              style={S.weekArrow}
              onPress={() => shiftWeek(1)}
              disabled={!selectedDate}
            >
              <Ionicons name="chevron-forward" size={20} color="#4f46e5" />
            </Pressable>
          </View>
        )}

        {/* ════════════════════════════════════════════════════
            STATS ROW
        ════════════════════════════════════════════════════ */}
        <View style={S.statsRow}>
          <StatCard
            label="Total Users"
            value={data.length}
            color="#3b82f6"
            bg="#eff6ff"
            icon="people-outline"
          />
          <StatCard
            label="Peak Month"
            value={
              chartData.length > 0
                ? Math.max(...chartData.map((d) => d.users))
                : 0
            }
            color="#9333ea"
            bg="#faf5ff"
            icon="trending-up-outline"
          />
          <StatCard
            label="Loaded"
            value={`${paginated.length}/${data.length}`}
            color="#16a34a"
            bg="#f0fdf4"
            icon="list-outline"
            small
          />
        </View>

        {/* ════════════════════════════════════════════════════
            CHART CARD
        ════════════════════════════════════════════════════ */}
        <View style={S.card}>
          <View style={S.chartHeader}>
            <View>
              <Text style={S.chartTitle}>Month-wise User Trend</Text>
              <Text style={S.chartSub}>Total Users: {data.length}</Text>
            </View>
            <View style={S.totalBadge}>
              <Text style={S.totalBadgeText}>{data.length} records</Text>
            </View>
          </View>

          {loading ? (
            <View style={S.emptyBox}>
              <ActivityIndicator color="#4f46e5" />
              <Text style={S.emptyText}>Loading chart…</Text>
            </View>
          ) : chartData.length === 0 ? (
            <View style={S.emptyBox}>
              <Ionicons name="bar-chart-outline" size={36} color="#d1d5db" />
              <Text style={S.emptyText}>No data available</Text>
            </View>
          ) : (
            <LineChart
              data={{
                labels: chartData.map((i) => i.month),
                datasets: [{ data: chartData.map((i) => i.users) }],
              }}
              width={screenWidth - 24}
              height={160}
              yAxisInterval={1}
              chartConfig={{
                decimalPlaces: 0,
                backgroundGradientFrom: "#ffffff",
                backgroundGradientTo: "#ffffff",
                color: (opacity = 1) => `rgba(79,70,229,${opacity})`,
                labelColor: () => "#9ca3af",
                propsForDots: {
                  r: "5",
                  strokeWidth: "2",
                  stroke: "#4f46e5",
                  fill: "#fff",
                },
                propsForBackgroundLines: {
                  stroke: "#f3f4f6",
                  strokeDasharray: "4 4",
                },
              }}
              bezier
              style={{ borderRadius: 12, marginLeft: -8 }}
            />
          )}
        </View>

        {/* ════════════════════════════════════════════════════
            TABLE CARD
        ════════════════════════════════════════════════════ */}
        <View style={[S.card, { padding: 0, overflow: "hidden" }]}>
          {/* Header row */}
          <View style={S.tableHead}>
            <Text style={[S.tableHeadCell, { flex: 2.5 }]}>Name</Text>
            <Text style={[S.tableHeadCell, { flex: 2, textAlign: "center" }]}>
              Week Start
            </Text>
            <Text style={[S.tableHeadCell, { flex: 2, textAlign: "center" }]}>
              Week End
            </Text>
          </View>

          {/* Body rows */}
          {loading && paginated.length === 0 ? (
            <View style={S.emptyBox}>
              <ActivityIndicator color="#4f46e5" />
              <Text style={S.emptyText}>Loading records…</Text>
            </View>
          ) : paginated.length === 0 ? (
            <View style={S.emptyBox}>
              <Ionicons name="people-outline" size={36} color="#d1d5db" />
              <Text style={S.emptyText}>No records found</Text>
            </View>
          ) : (
            paginated.map((row, i) => {
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
              const isEven = i % 2 === 0;
              return (
                <View
                  key={i}
                  style={[
                    S.tableRow,
                    isEven && { backgroundColor: "#fafafa" },
                  ]}
                >
                  {/* Name + Avatar */}
                  <View style={[S.nameCell, { flex: 2.5 }]}>
                    <View
                      style={[
                        S.avatar,
                        { backgroundColor: color + "22" },
                      ]}
                    >
                      <Text style={[S.avatarText, { color }]}>
                        {getInitials(row.name)}
                      </Text>
                    </View>
                    <Text style={S.nameText} numberOfLines={1}>
                      {row.name}
                    </Text>
                  </View>

                  {/* Week Start */}
                  <Text
                    style={[S.cellText, { flex: 2, textAlign: "center" }]}
                  >
                    {row.week_start
                      ? moment(row.week_start).format("DD MMM YY")
                      : "—"}
                  </Text>

                  {/* Week End */}
                  <Text
                    style={[S.cellText, { flex: 2, textAlign: "center" }]}
                  >
                    {row.week_end
                      ? moment(row.week_end).format("DD MMM YY")
                      : "—"}
                  </Text>
                </View>
              );
            })
          )}

          {/* Load More  (mirrors web "Load More" button) */}
          {hasMore && !loading && (
            <Pressable
              style={({ pressed }) => [
                S.loadMoreBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={() =>
                setVisibleRows((prev) => prev + ROWS_PER_PAGE)
              }
            >
              <Ionicons
                name="chevron-down-circle-outline"
                size={16}
                color="#4f46e5"
              />
              <Text style={S.loadMoreText}>
                Load More ({data.length - visibleRows} remaining)
              </Text>
            </Pressable>
          )}
        </View>
      </ScrollView>

      {/* ══════════════════════════════════════════════════════
          DATE PICKERS
      ══════════════════════════════════════════════════════ */}
      {showStartPicker && (
        <DateTimePicker
          value={startDate ? new Date(startDate) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, d) => {
            setShowStartPicker(false);
            if (d) {
              setStartDate(toISODate(d));
              setRange("");
              setSelectedDate("");
            }
          }}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate ? new Date(endDate) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, d) => {
            setShowEndPicker(false);
            if (d) {
              setEndDate(toISODate(d));
              setRange("");
              setSelectedDate("");
            }
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════
          RANGE MODAL
      ══════════════════════════════════════════════════════ */}
      <Modal
        visible={showRangeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRangeModal(false)}
      >
        <TouchableOpacity
          style={S.overlay}
          activeOpacity={1}
          onPress={() => setShowRangeModal(false)}
        >
          <View style={S.modalCard}>
            <View style={S.modalHeader}>
              <Text style={S.modalTitle}>Select Range</Text>
              <Pressable onPress={() => setShowRangeModal(false)}>
                <Ionicons name="close" size={20} color="#9ca3af" />
              </Pressable>
            </View>

            {[
              { label: "Week Mode",    value: "",   desc: "Navigate week by week",   icon: "calendar-outline"  },
              { label: "Last 15 Days", value: "15", desc: "Rolling 15-day window",   icon: "time-outline"      },
              { label: "Last 30 Days", value: "30", desc: "Rolling 30-day window",   icon: "time-outline"      },
            ].map((item) => {
              const isActive = range === item.value;
              return (
                <Pressable
                  key={item.value}
                  style={[S.modalOption, isActive && S.modalOptionActive]}
                  onPress={() => {
                    if (item.value === "") {
                      // ✅ Week mode — mirrors web select onChange exactly
                      setStartDate("");
                      setEndDate("");
                      setSelectedDate(toISODate(new Date()));
                      setRange("");
                    } else {
                      // ✅ Preset range — mirrors web
                      setStartDate("");
                      setEndDate("");
                      setSelectedDate("");
                      setRange(item.value);
                    }
                    setShowRangeModal(false);
                  }}
                >
                  <View style={S.modalOptionLeft}>
                    <View
                      style={[
                        S.modalIcon,
                        { backgroundColor: isActive ? "#ffffff33" : "#f3f4f6" },
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={16}
                        color={isActive ? "#fff" : "#4f46e5"}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          S.modalOptionTitle,
                          isActive && { color: "#fff" },
                        ]}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[
                          S.modalOptionDesc,
                          isActive && { color: "#ffffffaa" },
                        ]}
                      >
                        {item.desc}
                      </Text>
                    </View>
                  </View>

                  {isActive && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color="#fff"
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// ─── StatCard helper ──────────────────────────────────────────────────────────

const StatCard = ({
  label,
  value,
  color,
  bg,
  icon,
  small = false,
}: {
  label: string;
  value: number | string;
  color: string;
  bg: string;
  icon: string;
  small?: boolean;
}) => (
  <View style={[S.statCard, { backgroundColor: bg }]}>
    <View style={[S.statIconBox, { backgroundColor: color + "22" }]}>
      <Ionicons name={icon as any} size={16} color={color} />
    </View>
    <Text style={[S.statValue, { color, fontSize: small ? 15 : 22 }]}>
      {value}
    </Text>
    <Text style={S.statLabel}>{label}</Text>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, any> = {
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  card: {
  backgroundColor: "#fff",
  borderRadius: 16,
  padding: 14,
  borderWidth: 1,
  borderColor: "#e5e7eb",
},

headerRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
},

leftHeader: {
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
},

iconBadge: {
  width: 34,
  height: 34,
  borderRadius: 10,
  backgroundColor: "#ecfdf5",
  justifyContent: "center",
  alignItems: "center",
},

title: {
  fontSize: 14,
  fontWeight: "600",
  color: "#111827",
},

subtitle: {
  fontSize: 11,
  color: "#6b7280",
},

/* FILTER */
filterContainer: {
  borderTopWidth: 1,
  borderColor: "#f1f5f9",
  paddingTop: 10,
},

sectionLabel: {
  fontSize: 11,
  color: "#9ca3af",
  marginBottom: 6,
},

filterRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  flexWrap: "wrap",
},

pill: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 8,
  paddingVertical: 5,
  borderRadius: 8,
  backgroundColor: "#f3f4f6",
},

pillActive: {
  backgroundColor: "#111827",
},

pillText: {
  fontSize: 11,
  color: "#6b7280",
},

pillTextActive: {
  color: "#fff",
},

pillRange: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  paddingHorizontal: 8,
  paddingVertical: 5,
  borderRadius: 8,
  backgroundColor: "#eef2ff",
},

pillRangeText: {
  fontSize: 11,
  color: "#4f46e5",
  fontWeight: "500",
},

clearRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 4,
  marginTop: 6,
},

clearText: {
  fontSize: 11,
  color: "#ef4444",
},

/* EXPORT */
exportBtn: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
  backgroundColor: "#111827",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
},

exportBtnText: {
  color: "#fff",
  fontSize: 11,
  fontWeight: "500",
},
 
  // Week nav
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: "#e0e7ff",
  },
  weekArrow: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#eef2ff",
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1e293b",
    textAlign: "center",
  },
  weekSub: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 3,
    textAlign: "center",
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  statIconBox: {
    width: 32,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statValue: {
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 10,
    color: "#6b7280",
    marginTop: 3,
    fontWeight: "500",
    textAlign: "center",
  },

  // Chart
  chartHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  chartSub: {
    fontSize: 11,
    color: "#6b7280",
    marginTop: 2,
  },
  totalBadge: {
    backgroundColor: "#eef2ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  totalBadgeText: {
    fontSize: 11,
    color: "#4f46e5",
    fontWeight: "600",
  },

  // Table
  tableHead: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  tableHeadCell: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  nameCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 11,
    fontWeight: "800",
  },
  nameText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#111827",
    flexShrink: 1,
  },
  cellText: {
    fontSize: 11,
    color: "#6b7280",
  },

  // Load More
  loadMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    backgroundColor: "#fafafa",
  },
  loadMoreText: {
    fontSize: 13,
    color: "#4f46e5",
    fontWeight: "600",
  },

  // Empty / Loader
  emptyBox: {
    paddingVertical: 36,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 13,
    color: "#9ca3af",
  },

  // Modal
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  modalOptionActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  modalOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOptionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  modalOptionDesc: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 2,
  },
};

export default NSAReportMobile;