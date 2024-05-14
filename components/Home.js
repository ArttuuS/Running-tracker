import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Modal } from "react-native";
import { Button } from "@rneui/themed";
import MapView, { Marker, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import navigationArrow from "../assets/arrow.png";

import { getDatabase, push, ref, onValue } from "firebase/database";
import firebaseApp from "./FirebaseConfig";
import { getAuth } from "firebase/auth";

export default function HomeScreen() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState([]);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalRef = useRef(null);
  const mapRef = useRef(null);

  const auth = getAuth(firebaseApp);
  const database = getDatabase(firebaseApp);

  const toggleTimer = () => {
    if (isRunning) {
      clearInterval(intervalRef.current);
    } else {
      const startTime = Date.now() - elapsedTime;
      intervalRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
    }
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setElapsedTime(0);
  };

  const formatTime = (time) => {
    const seconds = Math.floor(time / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const formattedHours = String(hours).padStart(2, "0");
    const formattedMinutes = String(minutes % 60).padStart(2, "0");
    const formattedSeconds = String(seconds % 60).padStart(2, "0");

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  };

  function saveRunToFirebase() {
    const user = auth.currentUser;
    if (user) {
      const userID = user.uid;

      const usernameRef = ref(database, `/users/${userID}/username`);
      onValue(usernameRef, (snapshot) => {
        const username = snapshot.val();

        const newRun = {
          username: username,
          userID: userID,
          date: new Date().toISOString(),
          distance: distance.toFixed(2),
          duration: formatTime(elapsedTime),
          averageSpeed: averageSpeed.toFixed(2),
        };

        push(ref(database, `/runs`), newRun)
          .then(() => {
            console.log("Run saved successfully!");
          })
          .catch((error) => {
            console.error("Error saving run: ", error);
          });
      });
    } else {
      console.error("User not authenticated.");
    }
  }

  useEffect(() => {
    getLocation();
  }, []);

  async function getLocation() {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        throw new Error("No permission to get location");
      }

      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      setLocation(location.coords);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function startTracking() {
    if (!isTracking) {
      setIsTracking(true);
      setRouteCoordinates([]);
      setDistance(0);
      setDuration(0);
      setStartTime(Date.now());
      setIsRunning(true);
      const startTime = Date.now();
      intervalRef.current = setInterval(() => {
        setElapsedTime(Date.now() - startTime);
      }, 100);
    } else {
      setModalVisible(true);
    }
  }

  const stopTracking = () => {
    setIsTracking(false);
    setStartTime(null);
    saveRunToFirebase();
    clearInterval(intervalRef.current);
    setIsRunning(false);
    setModalVisible(false);
  };

  //LOCATION TRACKING AND POLYLINE DRAWING DONE WITH CHATGPT

  useEffect(() => {
    let interval;
    if (isTracking) {
      interval = setInterval(() => updateLocation(routeCoordinates), 500); // Pass routeCoordinates as an argument (now the location updates between every 500ms )
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isTracking, routeCoordinates]); // Add routeCoordinates to the dependency array

  async function updateLocation(prevCoordinates) {
    try {
      let location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.BestForNavigation,
      });

      setLocation(location.coords);

      // Use callback form of setRouteCoordinates to ensure it's based on the latest state
      setRouteCoordinates((prevCoordinates) => [
        ...prevCoordinates,
        {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        },
      ]);

      // Pass prevCoordinates as an argument and use it within setDistance callback
      setDistance((prevDistance) => {
        if (prevCoordinates.length > 0) {
          const previousCoordinate =
            prevCoordinates[prevCoordinates.length - 1];
          const newCoordinate = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
          };
          const newDistance = calculateDistance(
            previousCoordinate,
            newCoordinate
          );
          return prevDistance + newDistance;
        } else {
          return prevDistance;
        }
      }, routeCoordinates); // Pass routeCoordinates as the second argument to updateLocation
      setDuration((Date.now() - startTime) / 1000);
    } catch (error) {
      console.error("Error updating location: ", error);
    }
  }

  function calculateDistance(prevCoords, newCoords) {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(newCoords.latitude - prevCoords.latitude);
    const dLon = deg2rad(newCoords.longitude - prevCoords.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(prevCoords.latitude)) *
        Math.cos(deg2rad(newCoords.latitude)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
  }

  function deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // Function to interpolate points between two coordinates
  function interpolatePoints(coord1, coord2, numPoints) {
    const latDelta = (coord2.latitude - coord1.latitude) / (numPoints + 1);
    const lonDelta = (coord2.longitude - coord1.longitude) / (numPoints + 1);
    const interpolatedPoints = [];

    for (let i = 1; i <= numPoints; i++) {
      interpolatedPoints.push({
        latitude: coord1.latitude + latDelta * i,
        longitude: coord1.longitude + lonDelta * i,
      });
    }

    return interpolatedPoints;
  }

  // Interpolating points for smoother polyline
  const interpolatedRouteCoordinates = [];
  for (let i = 0; i < routeCoordinates.length - 1; i++) {
    const interpolatedPoints = interpolatePoints(
      routeCoordinates[i],
      routeCoordinates[i + 1],
      10 // Number of points to interpolate between each pair of coordinates
    );
    interpolatedRouteCoordinates.push(...interpolatedPoints);
  }

  if (error) {
    return <Text>{error}</Text>;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  const averageSpeed = duration !== 0 ? (distance / duration) * 3600 : 0;

  const initialRegion = {
    latitude: location.latitude,
    longitude: location.longitude,
    latitudeDelta: 0.0322,
    longitudeDelta: 0.0221,
  };

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion} ref={mapRef}>
        {location && (
          <Marker
            coordinate={location}
            title="Current location"
            image={navigationArrow}
          />
        )}
        {interpolatedRouteCoordinates.length > 1 && (
          <Polyline
            coordinates={interpolatedRouteCoordinates}
            strokeColor="#0000FF"
            strokeWidth={8}
          />
        )}
      </MapView>
      <View style={styles.infoContainer}>
        <Text style={styles.text}>
          Distance Travelled: {distance.toFixed(2)} km
        </Text>
        <Text style={styles.text}>Duration: {formatTime(elapsedTime)}</Text>
        <Text style={styles.text}>
          Average Speed: {averageSpeed.toFixed(2)} km/h
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button
          title={isTracking ? "Stop Tracking" : "Start Tracking"}
          onPress={startTracking}
        />
      </View>
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(!modalVisible);
        }}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalText}>
              Do you really want to stop tracking?
            </Text>
            <View style={styles.modalButtons}>
              <Button title="Yes" onPress={stopTracking} />
              <Button title="No" onPress={() => setModalVisible(false)} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  map: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    position: "absolute",
    bottom: 30,
    left: 0,
    right: 0,
    alignItems: "center",
    backgroundColor: "rgba(128, 128, 128, 0.5)",
  },
  buttonContainer: {
    position: "absolute",
    left: 80,
    top: 40,
    width: 200,
    height: 100,
  },
  text: {
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  modalText: {
    fontSize: 18,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
});
