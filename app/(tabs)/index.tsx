import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/auth/AuthContext';
import TaskListScreen from '../../src/screens/TaskListScreen';

export default function TasksTab() {
  const router = useRouter();
  const [showTaskList, setShowTaskList] = useState(false);

  if (showTaskList) {
    return (
      <View style={{ flex: 1 }}>
        <TaskListScreen
          onTaskPress={(taskId) =>
            router.push({ pathname: '/task-detail', params: { id: taskId } })
          }
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.logo}>GDI Demo</Text>
        <Text style={s.subtitle}>NRM Mobile</Text>
      </View>

      <View style={s.content}>
        <TouchableOpacity
          style={s.menuButton}
          onPress={() => setShowTaskList(true)}
          activeOpacity={0.7}
        >
          <View style={s.iconCircle}>
            <Ionicons name="clipboard-outline" size={28} color="#fff" />
          </View>
          <View style={s.menuTextWrapper}>
            <Text style={s.menuTitle}>Tasks List</Text>
            <Text style={s.menuDesc}>View and manage your assigned tasks</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color="#00AEEF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  header: {
    backgroundColor: '#00AEEF',
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  logo: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: 13,
    color: '#fff',
    opacity: 0.85,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 20,
    gap: 12,
  },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    gap: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#00AEEF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuTextWrapper: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuDesc: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
});
