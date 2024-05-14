import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useState, useEffect } from "react";
import HomeScreen from "./components/Home";
import LoginScreen from "./components/Login";
import AnalyticsScreen from "./components/Analytics";
import LeaderboardScreen from "./components/Leaderboard";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Header } from "@rneui/themed";
import RegisterScreen from "./components/Register";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const LoginStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="LoginStack"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <NavigationContainer>
      <Header
        centerComponent={{ text: "Running App", style: { color: "#fff" } }}
      />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Home") {
              iconName = "home";
            } else if (route.name === "Analytics") {
              iconName = "analytics";
            } else if (route.name === "Leaderboard") {
              iconName = "podium";
            } else if (route.name === "Login") {
              iconName = "log-in";
            }
            return <Ionicons name={iconName} size={size} color={color} />;
          },
          headerShown: false,
        })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Analytics" component={AnalyticsScreen} />
        <Tab.Screen name="Leaderboard" component={LeaderboardScreen} />
        <Tab.Screen name="Login" component={LoginStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
