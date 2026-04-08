  import { View, Text, Pressable, Modal, Image } from "react-native";
  import { useEffect, useState } from "react";
  import { storage } from "@/services/storage";
  import { useRouter } from "expo-router";
  import Toast from "react-native-toast-message";





  import { Ionicons } from "@expo/vector-icons";
  import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
  
  } from "react-native-reanimated";
  import api from "@/services/api";
import { SafeAreaView } from "react-native-safe-area-context";

  // export default function Header() {
    export default function Header({ user }: { user: any }) {
    const router = useRouter();

    // const [user, setUser] = useState<any>(null);
    const [open, setOpen] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);


    // Shared values
    const scale = useSharedValue(1);
    const rotateX = useSharedValue(0);
    const rotateY = useSharedValue(0);

    const modalAnim = useSharedValue(0);

    // useEffect(() => {
    
  // const loadUser = async () => {
  //   try {
  //     const res = await api.get("/api/auth/me");

  //     console.log("USER API 👉", res.data);

  //     setUser(res.data);

  //     await storage.set("user", JSON.stringify(res.data));
  //   } catch (err) {
  //     console.log("User fetch failed", err);
  //   }
  // };
    //   loadUser();
    // }, []);

    useEffect(() => {
      modalAnim.value = withTiming(open ? 1 : 0, { duration: 250 });
    }, [open]);


    const username = user?.username || user?.name || "No Name";
    const email = user?.email || "No Email";
    const role = user?.role || "employee";
  const shift = user?.shift || user?.user_profile?.shift || "Not Assigned";
    const getInitials = (name: string, email: string) => {
      if (name && name !== "No Name") {
        const parts = name.split(" ");
        return (
          (parts[0]?.[0] || "") + (parts[1]?.[0] || parts[0]?.[1] || "")
        ).toUpperCase();
      }
      return email.slice(0, 2).toUpperCase();
    };

    const initials = getInitials(username, email);

    // 3D Tilt style
    const tiltStyle = useAnimatedStyle(() => ({
      transform: [
        { scale: scale.value },
        { rotateX: `${rotateX.value}deg` },
        { rotateY: `${rotateY.value}deg` },
      ],
    }));

    // Modal animation
    const modalStyle = useAnimatedStyle(() => ({
      opacity: modalAnim.value,
      transform: [
        { translateY: withSpring(modalAnim.value ? 0 : -20) },
        { scale: withSpring(modalAnim.value ? 1 : 0.95) },
      ],
    }));

    const handleLogout = async () => {
      setConfirmLogout(false);
      setOpen(false);

      await storage.remove("access_token");
      await storage.remove("refresh_token");
      await storage.remove("user");

      Toast.show({
        type: "success",
        text1: "Logged out successfully",
      });

      setTimeout(() => {
        router.replace("/(auth)/login");
      }, 400);
    };

    // 3D PRESS interaction
    const handlePressIn = () => {
      scale.value = withSpring(0.9);
      rotateX.value = withSpring(8);
      rotateY.value = withSpring(-8);
    };

    const handlePressOut = () => {
      scale.value = withSpring(1);
      rotateX.value = withSpring(0);
      rotateY.value = withSpring(0);
    };
  if (!user) {
  return (
    <SafeAreaView edges={["top"]} style={{ backgroundColor: "#fff" }}>
      <View style={{ height: 60 }} />
    </SafeAreaView>
  );
}

    return (
<SafeAreaView
  edges={["top"]}
  style={{
    backgroundColor: "#fff",
    zIndex: 1000,
  }}
>
  {/* HEADER */}
<View
  style={{
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    paddingHorizontal: 16,
    paddingVertical: 12,

    borderBottomWidth: 1,
    borderColor: "#e5e7eb", // ✅ soft neutral gray
  }}
>
    {/* LOGO */}
    <Pressable
      onPress={() => router.push("/")}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View style={tiltStyle}>
        <Image
          source={require("../assets/images/NewLogo.png")}
          style={{ width: 110, height: 34 }}
          resizeMode="contain"
        />
      </Animated.View>
    </Pressable>

    {/* RIGHT SIDE */}
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      
  

      {/* PROFILE */}
      <Pressable
        onPress={() => setOpen(true)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View
          style={[
            tiltStyle,
            {
              backgroundColor: "#3B82F6",
              width: 42,
              height: 42,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#3B82F6",
              shadowOpacity: 0.6,
              shadowRadius: 10,
              elevation: 6,
            },
          ]}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>
            {initials}
          </Text>
        </Animated.View>
      </Pressable>
    </View>
  </View>

  {/* 🔥 PROFILE MODAL (UPGRADED) */}
  <Modal transparent visible={open} animationType="fade">
    <View
      style={{
        flex: 1,
        backgroundColor: "rgba(0,0,0,0.4)",
        justifyContent: "flex-start",
        alignItems: "flex-end",
      }}
    >
      <Animated.View
        style={[
          modalStyle,
          {
            backgroundColor: "#fff",
            marginTop: 60,
            marginRight: 12,
            borderRadius: 20,
            width: 250,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.2,
            shadowRadius: 12,
            elevation: 10,
          },
        ]}
      >
        {/* HEADER */}
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>
            Profile
          </Text>

          <Pressable onPress={() => setOpen(false)}>
            <Ionicons name="close" size={25} color={"#000"} />
          </Pressable>
        </View>

        {/* AVATAR */}
        <View style={{ alignItems: "center", marginBottom: 12 }}>
          <View
            style={{
              width: 70,
              height: 70,
              borderRadius: 35,
              backgroundColor: "#3B82F6",
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#3B82F6",
              shadowOpacity: 0.5,
              shadowRadius: 10,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 22, fontWeight: "800" }}>
              {initials}
            </Text>
          </View>
        </View>

        {/* USER INFO */}
        <Text
          style={{
            textAlign: "center",
            fontSize: 16,
            fontWeight: "700",
            color: "#000",
          }}
        >
          {username}
        </Text>

        <Text
          style={{
            textAlign: "center",
            fontSize: 12,
            color: "#000",
            marginBottom: 12,
          }}
        >
          {email}
        </Text>

        {/* DETAILS CARD */}
        <View
          style={{
            backgroundColor:"#fff",
            padding: 10,
            borderRadius: 12,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 12, color: "#000" }}>
            Role: <Text style={{ fontWeight: "700" }}>{role}</Text>
          </Text>

          <Text style={{ fontSize: 12, color:"#000" }}>
            Shift: <Text style={{ fontWeight: "700" }}>{shift}</Text>
          </Text>
        </View>
<Pressable
  onPress={() => {
    setOpen(false);
    router.push("/pms");
  }}
  style={{
    backgroundColor: "#6366f1",
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 8,
  }}
>
  <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
    PMS
  </Text>
</Pressable>
        {/* ACTIONS */}
        <Pressable
          onPress={() => setConfirmLogout(true)}
          style={{
            backgroundColor: "#ef4444",
            paddingVertical: 10,
            borderRadius: 12,
          }}
        >
          <Text style={{ color: "#fff", textAlign: "center", fontWeight: "700" }}>
            Logout
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  </Modal>

  {/* 🔥 CONFIRM MODAL */}
<Modal transparent visible={confirmLogout} animationType="fade">
  <View
    style={{
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <View
      style={{
        backgroundColor: "#fff",
        width: 300,
        padding: 20,
        borderRadius: 22,

        shadowColor: "#000",
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 10,
      }}
    >
      {/* 🔥 TITLE */}
      <Text
        style={{
          fontSize: 18,
          fontWeight: "800",
          color: "#111827",
          textAlign: "center",
        }}
      >
        Confirm Logout
      </Text>

      {/* 🧾 MESSAGE */}
      <Text
        style={{
          fontSize: 13,
          color: "#6b7280",
          marginVertical: 14,
          textAlign: "center",
          lineHeight: 18,
        }}
      >
        Are you sure you want to logout from your account?
      </Text>

      {/* ⚡ ACTIONS */}
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        {/* CANCEL */}
        <Pressable
          onPress={() => setConfirmLogout(false)}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: "#f3f4f6",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#374151", fontWeight: "600" }}>
            Cancel
          </Text>
        </Pressable>

        {/* LOGOUT */}
        <Pressable
          onPress={handleLogout}
          style={{
            flex: 1,
            paddingVertical: 12,
            borderRadius: 12,
            backgroundColor: "#ef4444",
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "700" }}>
            Logout
          </Text>
        </Pressable>
      </View>
    </View>
  </View>
</Modal>
</SafeAreaView>
    );
  }
