import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { useEffect, useState } from "react";
import moment from "moment";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import getAuthAxios from "@/services/authaxios";
import { storage } from "@/services/storage";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabType = "pending" | "approved" | "rejected" | "needs_edit";
type ViewMode = "self" | "team";

interface TimesheetRow {
  project: string;
  secs: number[];
  nsa: boolean[];
  comment?: string;
}

interface Timesheet {
  id: string;
  employee_username: string;
  manager_username: string;
  week_start: string;
  week_end: string;
  status: string;
  submitted_at: string;
  data: TimesheetRow[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 5;

const TAB_THEME: Record<TabType, { bg: string; active: string; text: string }> = {
  pending:    { bg: "#FEF3C7", active: "#F59E0B", text: "#92400E" },
  approved:   { bg: "#DCFCE7", active: "#16A34A", text: "#166534" },
  rejected:   { bg: "#FEE2E2", active: "#DC2626", text: "#7F1D1D" },
  needs_edit: { bg: "#E0E7FF", active: "#4F46E5", text: "#312E81" },
};

const STATUS_THEME: Record<string, { color: string; bg: string }> = {
  approved:   { color: "#16A34A", bg: "#DCFCE7" },
  rejected:   { color: "#DC2626", bg: "#FEE2E2" },
  pending:    { color: "#F59E0B", bg: "#FEF3C7" },
  submitted:  { color: "#F59E0B", bg: "#FEF3C7" },
  needs_edit: { color: "#4F46E5", bg: "#E0E7FF" },
  modification_required: { color: "#4F46E5", bg: "#E0E7FF" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Normalise a raw row from either endpoint into a consistent TimesheetRow */
function normaliseRow(row: any): TimesheetRow {
  return {
    project: row.project || "N/A",
    secs:    Array.isArray(row.secs) ? row.secs : [0, 0, 0, 0, 0, 0, 0],
    nsa:     Array.isArray(row.nsa)  ? row.nsa  : [false, false, false, false, false, false, false],
    comment: row.comment || "",
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function Timesheets() {
  const router = useRouter();

  const [user,       setUser]       = useState<any>(null);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [tabValue,   setTabValue]   = useState<TabType>("pending");
  const [viewMode,   setViewMode]   = useState<ViewMode>("self");
  const [expanded,   setExpanded]   = useState<Record<string, boolean>>({});
  const [page,       setPage]       = useState(1);

  // ── Load user from storage ─────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const raw = await storage.get("user");
      if (raw) setUser(JSON.parse(raw));
    })();
  }, []);

  // ── Derived role flags ─────────────────────────────────────────────────────
  const role      = (user?.role || "").toLowerCase();
  const isManager = role === "manager";
  const isHR      = role === "hr";
  const canSeeTeam = isManager || isHR;

  // ── Reset page on filter changes ──────────────────────────────────────────
  useEffect(() => { setPage(1); }, [search, tabValue]);

  // ── If employee switches to team mode somehow, push back to self ──────────
  useEffect(() => {
    if (user && !canSeeTeam && viewMode === "team") {
      setViewMode("self");
    }
  }, [user, canSeeTeam]);

  // ── Fetch on user / viewMode change ───────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setPage(1);
    fetchTimesheets();
  }, [viewMode, user]);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchTimesheets = async () => {
    setLoading(true);
    try {
      const api = await getAuthAxios();
      const endpoint = viewMode === "team" ? "/manager-timesheets/" : "/timesheets/";
      const res  = await api.get(endpoint);
      const data = Array.isArray(res.data) ? res.data : [];

      let normalised: Timesheet[] = [];

      if (viewMode === "team") {
        // ── Manager endpoint returns flat rows ────────────────────────────
        normalised = data.map((row: any): Timesheet => ({
          id:                 String(row.timesheet_id || row.id || `${row.week_start}_${row.employee_name}`),
          employee_username:  row.employee_name || row.username || "Unknown",
          manager_username:   row.manager_name  || "N/A",
          week_start:         row.week_start,
          week_end:           row.week_end,
          status:             row.status || "submitted",
          submitted_at:       row.submitted_at || row.week_end,
          data:               Array.isArray(row.rows) ? row.rows.map(normaliseRow) : [],
        }));
      } else {
        // ── Self endpoint returns grouped weeks ───────────────────────────
        data.forEach((week: any) => {
          if (!week.rows || week.rows.length === 0) return;
          const firstRow = week.rows[0];

          normalised.push({
            id: String(
              firstRow?.timesheet_id ||
              week.id ||
              `${week.week_start}_${week.username || firstRow?.employee_name}`
            ),
            employee_username:
              firstRow?.employee_name ||
              week.employee_name ||
              week.username ||
              firstRow?.username ||
              "Unknown",
            manager_username:
              firstRow?.manager_name || week.manager_name || "N/A",
            week_start:   week.week_start,
            week_end:     week.week_end,
            status:       week.status || firstRow?.status || "submitted",
            submitted_at: week.submitted_at || firstRow?.submitted_at || week.week_end,
            data:         week.rows.map(normaliseRow),
          });
        });
      }

      normalised.sort(
        (a, b) => new Date(b.week_start).getTime() - new Date(a.week_start).getTime()
      );

      setTimesheets(normalised);
    } catch (err: any) {
      console.error("❌ Timesheets fetch error:", err?.response || err);
    } finally {
      setLoading(false);
    }
  };

  // ── Grouping & filtering ──────────────────────────────────────────────────
  const grouped: Record<TabType, Timesheet[]> = {
    pending:    timesheets.filter(t => t.status === "pending"    || t.status === "submitted"),
    approved:   timesheets.filter(t => t.status === "approved"),
    rejected:   timesheets.filter(t => t.status === "rejected"),
    needs_edit: timesheets.filter(t => t.status === "needs_edit" || t.status === "modification_required"),
  };

  const filtered = grouped[tabValue].filter(ts => {
    const q = search.toLowerCase();
    return (
      ts.employee_username.toLowerCase().includes(q) ||
      ts.status.toLowerCase().includes(q) ||
      ts.week_start.includes(q) ||
      ts.data.some(d => d.project.toLowerCase().includes(q))
    );
  });

  const totalPages   = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated    = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const toggleExpand = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10, fontSize: 13, color: "#9ca3af" }}>Loading timesheets…</Text>
      </View>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────────────────
  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>

        {/* ── View-mode toggle (managers & HR only) ── */}
        {canSeeTeam && (
          <View style={{ marginBottom: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1f2937" }}>
              {viewMode === "self" ? "My Timesheets" : "Team Timesheets"}
            </Text>
            <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2, marginBottom: 12 }}>
              {viewMode === "self"
                ? "View and manage your submissions"
                : "Review and monitor your team"}
            </Text>

            <View style={{
              flexDirection: "row",
              backgroundColor: "#f3f4f6",
              borderRadius: 999,
              padding: 4,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}>
              {(["self", "team"] as ViewMode[]).map(mode => {
                const active = viewMode === mode;
                const icon   = mode === "self" ? "person-outline" : "people-outline";
                const label  = mode === "self" ? "My Actions"     : "Team Actions";

                return (
                  <Pressable
                    key={mode}
                    onPress={() => setViewMode(mode)}
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      paddingVertical: 9,
                      borderRadius: 999,
                      backgroundColor: active ? "#2563eb" : "transparent",
                    }}
                  >
                    <Ionicons name={icon} size={14} color={active ? "#fff" : "#6b7280"} />
                    <Text style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: active ? "#fff" : "#6b7280",
                    }}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* ── Page title for employees ── */}
        {!canSeeTeam && (
          <View style={{ marginBottom: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1f2937" }}>My Timesheets</Text>
            <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 1 }}>
              View and manage your submissions
            </Text>
          </View>
        )}

        {/* ── Search bar ── */}
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: "#fff",
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 1,
          marginBottom: 5,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2,
        }}>
          <Ionicons name="search" size={17} color="#9ca3af" />
          <TextInput
            placeholder="Search timesheets, projects…"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
            style={{ flex: 1, marginLeft: 8, fontSize: 14, color: "#1f2937" }}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#9ca3af" />
            </Pressable>
          )}
        </View>

        {/* ── Status tabs ── */}
        <View style={{
          flexDirection: "row",
          backgroundColor: "#fff",
          borderRadius: 18,
          padding: 4,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "#e5e7eb",
          shadowColor: "#000",
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        }}>
          {(["pending", "approved", "rejected", "needs_edit"] as TabType[]).map(t => {
            const count    = grouped[t].length;
            const isActive = tabValue === t;
            const theme    = TAB_THEME[t];
            const label    = t === "needs_edit" ? "Edit" : t.charAt(0).toUpperCase() + t.slice(1);

            return (
              <Pressable
                key={t}
                onPress={() => { setTabValue(t); setPage(1); }}
                style={{
                  flex: 1,
                  marginHorizontal: 2,
                  borderRadius: 14,
                  paddingVertical: 10,
                  alignItems: "center",
                  backgroundColor: isActive ? theme.active : "transparent",
                  shadowColor:   isActive ? theme.active : "#000",
                  shadowOpacity: isActive ? 0.22 : 0,
                  shadowRadius:  8,
                  elevation:     isActive ? 4 : 0,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: "600", color: isActive ? "#fff" : theme.text }}>
                  {label}
                </Text>
                <View style={{
                  marginTop: 5,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: isActive ? "rgba(255,255,255,0.22)" : theme.bg,
                }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: isActive ? "#fff" : theme.text }}>
                    {count}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* ── Empty state ── */}
        {paginated.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 24 }}>
            <View style={{
              width: 64, height: 64, borderRadius: 32,
              backgroundColor: "#f3f4f6",
              alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}>
              <Ionicons name="document-text-outline" size={28} color="#9ca3af" />
            </View>
            <Text style={{ fontSize: 15, fontWeight: "700", color: "#1f2937", textAlign: "center" }}>
              No Timesheets Found
            </Text>
            <Text style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 4 }}>
              Try adjusting your search or filter
            </Text>
            {search.length > 0 && (
              <Pressable
                onPress={() => setSearch("")}
                style={{
                  marginTop: 14,
                  paddingHorizontal: 18,
                  paddingVertical: 9,
                  borderRadius: 999,
                  backgroundColor: "#2563eb",
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Ionicons name="refresh" size={14} color="#fff" />
                <Text style={{ color: "#fff", fontSize: 12, fontWeight: "600" }}>Clear Search</Text>
              </Pressable>
            )}
          </View>
        ) : (
          paginated.map(ts => {
            const statusKey = ts.status?.toLowerCase();
            const theme     = STATUS_THEME[statusKey] || STATUS_THEME.pending;
            const isOpen    = !!expanded[ts.id];

            return (
              <View
                key={ts.id}
                style={{
                  backgroundColor: "#fff",
                  borderRadius: 18,
                  padding: 14,
                  marginBottom: 14,
                  borderWidth: 1,
                  borderColor: "#f1f5f9",
                  shadowColor: "#000",
                  shadowOpacity: 0.05,
                  shadowRadius: 10,
                  elevation: 3,
                }}
              >
                {/* Top row */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#111827" }}>
                      {ts.employee_username}
                    </Text>
                    <Text style={{ fontSize: 11, color: "#6b7280", marginTop: 3 }}>
                      {moment(ts.week_start).format("DD MMM")} → {moment(ts.week_start).add(6, "days").format("DD MMM YYYY")}
                    </Text>
                  </View>

                  <View style={{
                    backgroundColor: theme.bg,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 999,
                    marginLeft: 8,
                  }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: theme.color, textTransform: "capitalize" }}>
                      {statusKey === "submitted" ? "Pending" : statusKey?.replace("_", " ")}
                    </Text>
                  </View>
                </View>

                {/* Sub info */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 10 }}>
                  <Text style={{ fontSize: 10, color: "#9ca3af" }}>
                    Submitted: {ts.submitted_at ? moment(ts.submitted_at).format("DD MMM YYYY") : "—"}
                  </Text>
                  <Text style={{ fontSize: 10, color: "#9ca3af" }}>
                    Manager: {ts.manager_username || "—"}
                  </Text>
                </View>

                {/* Action buttons row */}
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {/* Edit & Resubmit */}
                  {viewMode === "self" &&
                    ts.status === "needs_edit" &&
                    user?.username?.toLowerCase() === ts.employee_username?.toLowerCase() && (
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: "/timesheet/[id]/edit", params: { id: ts.id } })
                      }
                      style={{
                        backgroundColor: "#FEF3C7",
                        paddingVertical: 7,
                        paddingHorizontal: 14,
                        borderRadius: 999,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 5,
                      }}
                    >
                      <Ionicons name="create-outline" size={13} color="#92400E" />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#92400E" }}>
                        Edit & Resubmit
                      </Text>
                    </Pressable>
                  )}

                  {/* View / Hide Details */}
                  <Pressable
                    onPress={() => toggleExpand(ts.id)}
                    style={{
                      backgroundColor: "#f1f5f9",
                      paddingVertical: 7,
                      paddingHorizontal: 14,
                      borderRadius: 999,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <Ionicons
                      name={isOpen ? "chevron-up-outline" : "chevron-down-outline"}
                      size={13}
                      color="#374151"
                    />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: "#374151" }}>
                      {isOpen ? "Hide Details" : "View Details"}
                    </Text>
                  </Pressable>
                </View>

                {/* Expanded details */}
                {isOpen && (
                  <View style={{
                    marginTop: 14,
                    backgroundColor: "#f8fafc",
                    borderRadius: 14,
                    padding: 12,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                  }}>
                    {/* Week strip */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 12 }}>
                      {Array.from({ length: 7 }).map((_, i) => {
                        const date = moment(ts.week_start).startOf("isoWeek").add(i, "days");
                        return (
                          <View key={i} style={{ alignItems: "center", flex: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: "600", color: "#4b5563" }}>
                              {date.format("ddd")}
                            </Text>
                            <Text style={{ fontSize: 9, color: "#9ca3af", marginTop: 1 }}>
                              {date.format("DD")}
                            </Text>
                          </View>
                        );
                      })}
                    </View>

                    {/* Project rows */}
                    {ts.data.length === 0 ? (
                      <Text style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", paddingVertical: 8 }}>
                        No project data available
                      </Text>
                    ) : (
                      ts.data.map((entry, i) => (
                        <View
                          key={i}
                          style={{
                            marginBottom: 10,
                            backgroundColor: "#fff",
                            borderRadius: 12,
                            padding: 10,
                            borderWidth: 1,
                            borderColor: "#e5e7eb",
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#111827", marginBottom: 8 }}>
                            {entry.project}
                          </Text>

                          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                            {entry.secs.map((sec, d) => (
                              <View
                                key={d}
                                style={{
                                  flex: 1,
                                  alignItems: "center",
                                  marginHorizontal: 1,
                                  paddingVertical: 6,
                                  borderRadius: 8,
                                  backgroundColor: sec > 0 ? "#eff6ff" : "#f9fafb",
                                }}
                              >
                                <Text style={{ fontSize: 10, fontWeight: "600", color: sec > 0 ? "#1d4ed8" : "#9ca3af" }}>
                                  {sec}
                                </Text>
                                <View style={{
                                  width: 6, height: 6,
                                  marginTop: 4,
                                  borderRadius: 999,
                                  backgroundColor: entry.nsa?.[d] ? "#2563eb" : "#e5e7eb",
                                }} />
                              </View>
                            ))}
                          </View>

                          {entry.comment ? (
                            <Text style={{ fontSize: 10, fontStyle: "italic", color: "#6b7280", marginTop: 8 }}>
                              💬 {entry.comment}
                            </Text>
                          ) : null}
                        </View>
                      ))
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* ── Pagination ── */}
        {filtered.length > ITEMS_PER_PAGE && (
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            marginVertical: 20,
            gap: 14,
          }}>
            <Pressable
              onPress={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{
                width: 42, height: 42, borderRadius: 999,
                alignItems: "center", justifyContent: "center",
                backgroundColor: page === 1 ? "#e5e7eb" : "#2563eb",
                elevation: page === 1 ? 0 : 4,
              }}
            >
              <Ionicons name="chevron-back" size={20} color={page === 1 ? "#9ca3af" : "#fff"} />
            </Pressable>

            <View style={{
              paddingHorizontal: 18, paddingVertical: 8,
              borderRadius: 999, backgroundColor: "#fff",
              borderWidth: 1, borderColor: "#e5e7eb",
            }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#374151" }}>
                {page} / {totalPages}
              </Text>
            </View>

            <Pressable
              onPress={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{
                width: 42, height: 42, borderRadius: 999,
                alignItems: "center", justifyContent: "center",
                backgroundColor: page >= totalPages ? "#e5e7eb" : "#2563eb",
                elevation: page >= totalPages ? 0 : 4,
              }}
            >
              <Ionicons name="chevron-forward" size={20} color={page >= totalPages ? "#9ca3af" : "#fff"} />
            </Pressable>
          </View>
        )}

      </ScrollView>
    </View>
  );
}