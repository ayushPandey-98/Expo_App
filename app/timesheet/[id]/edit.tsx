import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import getAuthAxios from "@/services/authaxios";
import Toast from "react-native-toast-message";
import { Picker } from "@react-native-picker/picker";
import { Dropdown } from "react-native-element-dropdown";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function EditTimesheet() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [timesheet, setTimesheet] = useState<any>(null);
  const [errors, setErrors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [dropdownData, setDropdownData] = useState<any[]>([]);

  useEffect(() => {
    if (id) fetchTimesheet();
  }, [id]);

  const fetchTimesheet = async () => {
    try {
      const api = await getAuthAxios();
      const res = await api.get(`/timesheets/${id}/`);

      const ts = res.data;

      setTimesheet({
        ...ts,
        data: ts.data?.length
          ? ts.data
          : [
              {
                project: "",
                secs: [0, 0, 0, 0, 0, 0, 0],
                nsa: [false, false, false, false, false, false, false],
              },
            ],
      });
    } catch (err) {
      console.log("ERROR", err);
    }
  };

  // ✅ HANDLE HOURS (UNCHANGED)
  const handleChange = (taskIndex: number, dayIndex: number, value: any) => {
    let val = parseFloat(value) || 0;
    if (val > 8) val = 8;

    const updated = { ...timesheet };
    updated.data[taskIndex].secs[dayIndex] = val;

    const total = updated.data[taskIndex].secs
      .slice(0, 5)
      .reduce((a: number, b: number) => a + b, 0);

    const newErrors = [...errors];
    newErrors[taskIndex] = total > 40 ? `Weekday > 40 hrs (${total})` : null;

    setErrors(newErrors);
    setTimesheet(updated);
  };

  // ✅ NSA TOGGLE (UNCHANGED)
  const toggleNSA = (taskIndex: number, dayIndex: number) => {
    const updated = { ...timesheet };
    updated.data[taskIndex].nsa[dayIndex] =
      !updated.data[taskIndex].nsa[dayIndex];
    setTimesheet(updated);
  };
useEffect(() => {
  fetchProjects();
}, []);

const fetchProjects = async () => {
  try {
    const api = await getAuthAxios();
    const res = await api.get("/my-projects/");

    setProjects(res.data);

    const formatted = res.data.map((p: any) => ({
      label: p.name,
      value: p.name,
    }));

    setDropdownData(formatted);
  } catch (err) {
    console.log(err);
  }
};
  const addRow = () => {
    const updated = { ...timesheet };
    updated.data.push({
      project: "",
      secs: [0, 0, 0, 0, 0, 0, 0],
      nsa: [false, false, false, false, false, false, false],
    });
    setTimesheet(updated);
    setErrors([...errors, null]);
  };

  const deleteRow = (index: number) => {
    const updated = { ...timesheet };
    updated.data.splice(index, 1);
    setTimesheet(updated);
  };

  // ✅ SUBMIT WITH TOAST
  const handleSubmit = async () => {
    try {
      setLoading(true);
      const api = await getAuthAxios();

      await api.put(`/timesheets/${id}/resubmit/`, {
        data: timesheet.data,
        comment: timesheet.comment,
      });

      Toast.show({
        type: "success",
        text1: "Timesheet Submitted",
        text2: "Your changes were saved successfully",
      });

      router.replace("/(tabs)/timesheets");
    } catch (err) {
      console.log(err);

      Toast.show({
        type: "error",
        text1: "Submission Failed",
        text2: "Something went wrong",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!timesheet)
    return (
      <View style={{ marginTop: 80, alignItems: "center" }}>
        <ActivityIndicator />
        <Text>Loading...</Text>
      </View>
    );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f5f7fb" }}>
      <View style={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: "700", marginBottom: 10 }}>
          Edit Timesheet
        </Text>

        {/* HEADER */}
        {/* <View style={{ flexDirection: "row", marginBottom: 6 }}>
          {days.map((d) => (
            <Text
              key={d}
              style={{
                flex: 1,
                textAlign: "center",
                fontSize: 12,
                fontWeight: "600",
              }}
            >
              {d}
            </Text>
          ))}
        </View> */}

        {/* ROWS */}
        {timesheet.data.map((entry: any, i: number) => (
          <View
            key={i}
            style={{
              backgroundColor: "#fff",
              padding: 12,
              borderRadius: 12,
              marginBottom: 12,
              elevation: 2,
            }}
          >
        
{/* PROJECT DROPDOWN */}
<View style={{ marginBottom: 10 }}>
  <Text style={{ fontSize: 12, marginBottom: 4 }}>Project</Text>

  <Dropdown
    data={dropdownData}
    labelField="label"
    valueField="value"
    placeholder="Select Project"
    value={entry.project}
    onChange={(item) => {
      const updated = { ...timesheet };
      updated.data[i].project = item.value;
      setTimesheet(updated);
    }}
    style={{
      borderWidth: 1,
      borderColor: "#ddd",
      borderRadius: 8,
      paddingHorizontal: 10,
      height: 45,
      backgroundColor: "#fff",
    }}
    placeholderStyle={{ color: "#999", fontSize: 12 }}
    selectedTextStyle={{ fontSize: 13 }}
    itemTextStyle={{ fontSize: 13 }}
  />
</View>

            {/* HOURS GRID → 3 PER ROW */}
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {entry.secs.map((sec: number, d: number) => (
                <View
                  key={d}
                  style={{
                    width: "30%",
                    margin: "1.5%",
                  }}
                >
                  <Text style={{ fontSize: 10, marginBottom: 2 }}>
                    {days[d]}
                  </Text>
                  <TextInput
                    value={String(sec)}
                    keyboardType="numeric"
                    onChangeText={(val) => handleChange(i, d, val)}
                    style={{
                      borderWidth: 1,
                      borderColor: "#ddd",
                      borderRadius: 8,
                      padding: 8,
                      textAlign: "center",
                      backgroundColor: d >= 5 ? "#eee" : "#fff",
                    }}
                    editable={d < 5}
                  />
                </View>
              ))}
            </View>

            {/* NSA */}
           {/* NSA SECTION */}
<View style={{ marginTop: 10 }}>
  {/* TITLE */}
  <Text style={{ fontSize: 12, fontWeight: "600", marginBottom: 6 }}>
    NSA (Non-Standard Hours)
  </Text>

  {/* DAYS GRID */}
  <View
    style={{
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
    }}
  >
    {entry.nsa.map((val: boolean, d: number) => {
      const isWeekend = d >= 5;

      return (
        <Pressable
          key={d}
          onPress={() => toggleNSA(i, d)}
          disabled={isWeekend}
          style={{
            width: "30%",
            marginBottom: 8,
            paddingVertical: 8,
            borderRadius: 8,
            borderWidth: 1,

            borderColor: val ? "#16a34a" : "#d1d5db",
            backgroundColor: val ? "#dcfce7" : "#f3f4f6",

            opacity: isWeekend ? 0.5 : 1,
            alignItems: "center",
          }}
        >
          {/* DAY */}
          <Text style={{ fontSize: 11, fontWeight: "600" }}>
            {days[d]}
          </Text>

          {/* STATUS */}
          <Text
            style={{
              fontSize: 10,
              marginTop: 2,
              color: val ? "#15803d" : "#6b7280",
            }}
          >
            {isWeekend
              ? "Disabled"
              : val
              ? "Marked"
              : "Not Marked"}
          </Text>
        </Pressable>
      );
    })}
  </View>
</View>

            {/* ERROR */}
            {errors[i] && (
              <Text style={{ color: "red", fontSize: 11, marginTop: 6 }}>
                {errors[i]}
              </Text>
            )}

            {/* DELETE */}
            <Pressable
              onPress={() => deleteRow(i)}
              style={{
                marginTop: 10,
                backgroundColor: "#ef4444",
                padding: 6,
                borderRadius: 6,
                alignSelf: "flex-end",
              }}
            >
              <Text style={{ color: "#fff", fontSize: 12 }}>Delete</Text>
            </Pressable>
          </View>
        ))}

        {/* ADD ROW */}
        <Pressable
          onPress={addRow}
          style={{
            backgroundColor: "#16a34a",
            padding: 12,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>+ Add Row</Text>
        </Pressable>

        {/* COMMENT */}
        <Text style={{ marginBottom: 4 }}>Comment</Text>
        <TextInput
          value={timesheet.comment || ""}
          onChangeText={(val) => setTimesheet({ ...timesheet, comment: val })}
          style={{
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 10,
            padding: 10,
            marginBottom: 20,
          }}
          multiline
        />

        {/* SUBMIT */}
        <Pressable
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: "#2563eb",
            padding: 14,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center" }}>
            {loading ? "Submitting..." : "Resubmit"}
          </Text>
        </Pressable>
      </View>

      {/* TOAST ROOT */}
      <Toast />
    </ScrollView>
  );
}
