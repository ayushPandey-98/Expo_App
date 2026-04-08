  import React, { useState } from "react";
  import {
    View,
    Text,
    TextInput,
    Pressable,
    Image,
    ActivityIndicator,
  } from "react-native";
  import * as WebBrowser from "expo-web-browser";
  import * as Linking from "expo-linking";
  import { BASE_URL } from "@/constants/config";
  import api from "@/services/api";
  import { storage } from "@/services/storage";
  import { useRouter } from "expo-router";
  import { Ionicons } from "@expo/vector-icons";

  export default function LoginScreen() {
    const router = useRouter();
    const [tab, setTab] = useState<"login" | "signup">("login");

    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [secure, setSecure] = useState(true);

    const [errors, setErrors] = useState<any>({});

    // const handleMicrosoftLogin = async () => {
    //   try {
    //     const redirectUri = "timeflow://azure-callback";
    //     console.log("REDIRECT URI 👉", redirectUri);

    //     const result = await WebBrowser.openAuthSessionAsync(
    //       `${BASE_URL}/api/auth/azure/?redirect_uri=${encodeURIComponent(redirectUri)}`,
    //       redirectUri,
    //     );

    //     console.log("AUTH RESULT 👉", result);

    //     if (result.type === "success") {
    //       const parsed = Linking.parse(result.url);

    //       console.log("PARSED 👉", parsed);

    //       const access = parsed.queryParams?.access;
    //       const refresh = parsed.queryParams?.refresh;

    //       if (!access) throw new Error("No access token");

    //       await storage.set("access_token", access);
    //       await storage.set("refresh_token", refresh);

    //       const res = await api.get("/api/auth/me");

    //       console.log("USER 👉", res.data);

    //       await storage.set("user", JSON.stringify(res.data));

    //       router.replace("/(tabs)");
    //     } else {
    //       console.log("Login cancelled");
    //     }
    //   } catch (err) {
    //     console.log("Microsoft login error 👉", err);
    //   }
    // };

    const handleMicrosoftLogin = async () => {
      try {
        const redirectUri = Linking.createURL("azure-callback");
        // const redirectUri = "timeflow://azure-callback";
        

        console.log(
          "\n================ MICROSOFT LOGIN START ================\n",
        );

        console.log("1️⃣ REDIRECT URI 👉", redirectUri);

        const authUrl = `${BASE_URL}/api/auth/azure/?redirect_uri=${encodeURIComponent(redirectUri)}`;

        console.log("2️⃣ AUTH URL 👉", authUrl);

        const result = await WebBrowser.openAuthSessionAsync(
          authUrl,
          redirectUri,
        );

        console.log("3️⃣ AUTH RESULT TYPE 👉", result);
        console.log("3️⃣ FULL AUTH RESULT 👉", JSON.stringify(result, null, 2));

        // 🔴 CRITICAL CHECK
        if (result.type !== "success") {
          console.log("❌ Login not successful. Type:", result.type);
          return;
        }

        if (!result.url) {
          console.log("❌ No URL returned from auth session");
          console.log("👉 This usually means deep linking failed");
          return;
        }

        console.log("4️⃣ RETURNED URL 👉", result.url);

        // // 🔍 Check if correct scheme
        // if (!result.url.startsWith("timeflow://")) {
        //   console.log("❌ WRONG REDIRECT URL RECEIVED");
        //   console.log("👉 Expected: timeflow://...");
        //   console.log("👉 Got:", result.url);
        //   console.log("👉 Backend is NOT redirecting to app");
        //   return;
        // }

        if (!result.url) {
  console.log("❌ No URL returned");
  return;
}

        const parsed = Linking.parse(result.url);

        console.log("5️⃣ PARSED OBJECT 👉", JSON.stringify(parsed, null, 2));

        const access = parsed.queryParams?.access;
        const refresh = parsed.queryParams?.refresh;

        console.log("6️⃣ ACCESS TOKEN 👉", access ? "✅ PRESENT" : "❌ MISSING");
        console.log("6️⃣ REFRESH TOKEN 👉", refresh ? "✅ PRESENT" : "❌ MISSING");

        if (!access) {
          console.log("❌ No access token found in redirect");
          throw new Error("No access token");
        }

        console.log("7️⃣ STORING TOKENS...");
        await storage.set("access_token", access);
        await storage.set("refresh_token", refresh);

        console.log("8️⃣ FETCHING USER PROFILE...");
        const res = await api.get("/api/auth/me");

        console.log("9️⃣ USER DATA 👉", JSON.stringify(res.data, null, 2));

        await storage.set("user", JSON.stringify(res.data));

        console.log("🔟 NAVIGATING TO DASHBOARD...");

  await storage.set("user", JSON.stringify(res.data));

// 🔍 CHECK
const checkUser = await storage.get("user");
console.log("✅ STORED USER AFTER AZURE 👉", checkUser);

// ❌ REMOVE DELAY
// await new Promise(...)

router.replace("/(tabs)");


        console.log("\n================ LOGIN SUCCESS END ================\n");
      } catch (err) {
        console.log("\n================ LOGIN ERROR ================\n");
        console.log("❌ ERROR MESSAGE 👉", err?.message);
        console.log("❌ FULL ERROR 👉", err);
        console.log("\n============================================\n");
      }
  };

    const clearFields = () => {
      setUsername("");
      setEmail("");
      setPassword("");
      setErrors({});
    };

    /* ---------- VALIDATION ---------- */
    const validate = () => {
      let newErrors: any = {};

      if (!username.trim()) newErrors.username = "Username is required";
      if (tab === "signup" && !email.trim())
        newErrors.email = "Email is required";
      if (!password.trim()) newErrors.password = "Password is required";
      if (password.length > 0 && password.length < 4)
        newErrors.password = "Password too short";

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    /* ---------- LOGIN ---------- */
    const handleLogin = async () => {
      if (!validate()) return;

      setLoading(true);
      setErrors({});

      try {
        const res = await api.post("/api/auth/token/", {
          username,
          password,
        });

        const { access, refresh } = res.data;

        await storage.set("access_token", access);
        await storage.set("refresh_token", refresh);
const userRes = await api.get("/api/auth/me");

// 🔥 THIS LINE WAS MISSING (MAIN BUG)
await storage.set("user", JSON.stringify(userRes.data));

// 🔍 CHECK
const checkUser = await storage.get("user");
console.log("✅ STORED USER AFTER LOGIN 👉", checkUser);

router.replace("/(tabs)");
 
      } catch (err: any) {
        setErrors({
          general: err?.response?.data?.detail || "Invalid username or password",
        });
      } finally {
        setLoading(false);
      }
    };

    /* ---------- SIGNUP ---------- */
    const handleSignup = async () => {
      if (!validate()) return;

      setLoading(true);
      setErrors({});

      try {
        await api.post("/api/auth/register/", {
          username,
          email,
          password,
        });

        setTab("login");
        clearFields();
      } catch (err: any) {
        setErrors({
          general: "Signup failed. Try again.",
        });
      } finally {
        setLoading(false);
      }
    };

    return (
    <View className="flex-1 bg-[#f7f9fc] justify-center px-5">
    <View className="bg-white p-6 rounded-3xl shadow-xl">



      {/* 🔥 LOGO */}
      <View className="items-center mb-6">
        <Image
          source={
          require("../../assets/images/NewLogo.png")
            
          }
          style={{ width: 150, height: 60 }}
          resizeMode="contain"
        />

        <Text className="text-xs text-gray-500 mt-2">
      
            Manage your work efficiently
          
        </Text>
      </View>

      {/* TITLE */}
      <Text className="text-center text-xl font-semibold text-gray-900 mb-4">

            Welcome Back 
         
      </Text>

      {/* ERROR */}
      {errors.general && (
        <Text className="text-red-500 text-sm text-center mb-3">
          {errors.general}
        </Text>
      )}

      {/* USERNAME */}
      <Input
        label="Username"
        value={username}
        onChange={setUsername}
        error={errors.username}
      />

      {/* EMAIL */}
      {tab === "signup" && (
        <Input
          label="Email"
          value={email}
          onChange={setEmail}
          error={errors.email}
        />
      )}

      {/* PASSWORD */}
      <View className="mb-3">
        <Text className="text-xs text-gray-700 mb-1">Password</Text>

        <View
          className={`flex-row items-center border rounded-xl px-3 ${
            errors.password ? "border-red-400" : "border-gray-300"
          }`}
        >
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry={secure}
            className="flex-1 h-11 text-sm"
          />

          <Pressable onPress={() => setSecure(!secure)}>
            <Ionicons
              name={secure ? "eye-off-outline" : "eye-outline"}
              size={20}
              color="gray"
            />
          </Pressable>
        </View>

        {errors.password && (
          <Text className="text-red-500 text-xs mt-1">
            {errors.password}
          </Text>
        )}
      </View>
      {/* ✅ LOGIN BUTTON */}
<Pressable
  disabled={loading}
  onPress={tab === "login" ? handleLogin : handleSignup}
  className={`mt-4 h-12 rounded-xl items-center justify-center ${
    loading ? "bg-gray-400" : "bg-[#215afb]"
  }`}
>
  {loading ? (
    <ActivityIndicator color="white" />
  ) : (
    <Text className="text-white font-semibold text-sm">
      {tab === "login" ? "Sign In" : "Create Account"}
    </Text>
  )}
</Pressable>



      {/* DIVIDER */}
      {tab === "login" && (
        <View className="flex-row items-center my-5">
          <View className="flex-1 h-[1px] bg-gray-200" />
          <Text className="mx-2 text-xs text-gray-400">OR</Text>
          <View className="flex-1 h-[1px] bg-gray-200" />
        </View>
      )}

      {/* MICROSOFT LOGIN */}
      {tab === "login" && (
        <Pressable
          onPress={handleMicrosoftLogin}
          className="h-12 bg-white border border-gray-300 rounded-xl flex-row items-center justify-center px-4 shadow-sm"
        >
          <Image
            source={require("@/assets/images/microsoft.png")}
            className="w-5 h-5 mr-2"
            resizeMode="contain"
          />
          <Text className="text-sm font-medium text-gray-700">
            Continue with Microsoft
          </Text>
        </Pressable>
      )}

      {/* SWITCH LOGIN/SIGNUP */}
      <Text className="text-center text-sm text-gray-600 mt-6">
        {tab === "login" ? (
          <>
            Don’t have an account?{" "}
            <Text
              className="text-[#215afb] font-medium"
              onPress={() => {
                setTab("signup");
                clearFields();
              }}
            >
              Sign up
            </Text>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Text
              className="text-[#215afb] font-medium"
              onPress={() => {
                setTab("login");
                clearFields();
              }}
            >
              Login
            </Text>
          </>
        )}
      </Text>

    </View>
  </View>
    );
  }

  /* ---------- INPUT COMPONENT ---------- */

  function Input({
    label,
    value,
    onChange,
    error,
  }: {
    label: string;
    value: string;
    onChange: (text: string) => void;
    error?: string;
  }) {
    return (
      <View className="mb-3">
        <Text className="text-xs text-gray-700 mb-1">{label}</Text>

        <TextInput
          value={value}
          onChangeText={onChange}
          className={`h-11 rounded-xl px-4 text-sm border ${
            error ? "border-red-400" : "border-gray-300"
          }`}
        />

        {error && <Text className="text-red-500 text-xs mt-1">{error}</Text>}
      </View>
    );
  }
