import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import { useAuth } from '../auth/AuthContext';
import { getAppSettings, AppSettings } from '../api/settingsService';

export default function SettingsScreen() {
    const { logout } = useAuth();
    const [settings, setSettings] = useState<AppSettings | null>(null);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    useEffect(() => {
        getAppSettings().then(setSettings).catch(() => { });
    }, []);

    const handleLogout = () => {
        Alert.alert('Sign Out', 'Are you sure?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
        ]);
    };

    const items = [
        { icon: 'notifications-outline' as const, label: 'Push Notifications', toggle: true, value: notificationsEnabled, onToggle: setNotificationsEnabled },
        { icon: 'finger-print-outline' as const, label: 'Biometric Auth', info: settings?.IsFingerprintRequired ? 'Required' : 'Optional' },
        { icon: 'server-outline' as const, label: 'API Endpoint', info: 'wfm-w4-test' },
        { icon: 'information-circle-outline' as const, label: 'App Version', info: '1.0.0' },
    ];

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}><Text style={s.h1}>Settings</Text></View>
            <View style={s.section}>
                {items.map((item, i) => (
                    <View key={i} style={[s.row, i < items.length - 1 && s.rowBorder]}>
                        <View style={s.iconW}><Ionicons name={item.icon} size={20} color={Colors.accent} /></View>
                        <Text style={s.label}>{item.label}</Text>
                        {item.toggle ? <Switch value={item.value} onValueChange={item.onToggle} trackColor={{ false: Colors.border, true: Colors.accent + '60' }} thumbColor={item.value ? Colors.accent : Colors.textMuted} /> :
                            <Text style={s.info}>{item.info}</Text>}
                    </View>
                ))}
            </View>
            <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
                <Ionicons name="log-out-outline" size={20} color={Colors.error} />
                <Text style={s.logoutText}>Sign Out</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.md },
    h1: { ...Typography.h1, color: Colors.textPrimary },
    section: { marginHorizontal: Spacing.md, backgroundColor: Colors.card, borderRadius: BorderRadius.lg, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
    row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
    iconW: { width: 36, height: 36, borderRadius: BorderRadius.sm, backgroundColor: Colors.accent + '15', justifyContent: 'center', alignItems: 'center' },
    label: { ...Typography.body, color: Colors.textPrimary, flex: 1 },
    info: { ...Typography.bodySmall, color: Colors.textMuted },
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.xl, paddingVertical: 14, borderRadius: BorderRadius.lg, backgroundColor: Colors.error + '15', borderWidth: 1, borderColor: Colors.error + '30' },
    logoutText: { ...Typography.button, color: Colors.error },
});
