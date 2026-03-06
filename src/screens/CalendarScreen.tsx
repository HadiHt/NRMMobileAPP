import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';
import LoadingOverlay from '../components/LoadingOverlay';
import { getCurrentUserCalendar, CalendarEntry } from '../api/calendarService';

export default function CalendarScreen() {
    const [entries, setEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const fetchCalendar = async (showLoading = true) => {
        try {
            if (showLoading) setLoading(true);
            const start = new Date(selectedDate); start.setHours(0, 0, 0, 0);
            const end = new Date(start); end.setDate(end.getDate() + 7);
            const data = await getCurrentUserCalendar({ startDate: start.toISOString(), endDate: end.toISOString() });
            setEntries(data);
        } catch {
            const today = new Date();
            setEntries([
                { Date: today.toISOString(), StartTime: '08:00', EndTime: '12:00', TaskId: 1001, TaskDescription: 'Install fiber optic line', Status: 'In Progress', Type: 'task' },
                { Date: today.toISOString(), StartTime: '13:00', EndTime: '15:00', TaskId: 1002, TaskDescription: 'Repair underground cable', Status: 'New', Type: 'task' },
                { Date: today.toISOString(), StartTime: '15:30', EndTime: '17:00', TaskId: 0, TaskDescription: 'Break', Status: 'Planned', Type: 'availability' },
                { Date: new Date(Date.now() + 86400000).toISOString(), StartTime: '09:00', EndTime: '16:00', TaskId: 1003, TaskDescription: 'Network survey', Status: 'Assigned', Type: 'task' },
                { Date: new Date(Date.now() + 172800000).toISOString(), StartTime: '08:00', EndTime: '17:00', TaskId: 0, TaskDescription: 'Day Off', Status: '', Type: 'absence' },
            ]);
        } finally { setLoading(false); setRefreshing(false); }
    };

    useFocusEffect(useCallback(() => { fetchCalendar(); }, [selectedDate]));

    const weekDays = Array.from({ length: 7 }, (_, i) => { const d = new Date(selectedDate); d.setDate(d.getDate() - d.getDay() + i); return d; });
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const isToday = (d: Date) => { const t = new Date(); return d.getDate() === t.getDate() && d.getMonth() === t.getMonth() && d.getFullYear() === t.getFullYear(); };
    const isSel = (d: Date) => d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
    const getColor = (t: string) => t === 'task' ? Colors.accent : t === 'availability' ? Colors.success : Colors.error;
    const getIcon = (t: string): keyof typeof Ionicons.glyphMap => t === 'task' ? 'construct-outline' : t === 'availability' ? 'time-outline' : 'close-circle-outline';

    const dayEntries = entries.filter(e => { const d = new Date(e.Date); return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth(); });

    if (loading && !entries.length) return <LoadingOverlay message="Loading calendar..." />;

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}><Text style={s.h1}>Calendar</Text><Text style={s.sub}>{selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</Text></View>
            <View style={s.week}>{weekDays.map((d, i) => (
                <TouchableOpacity key={i} style={[s.dayCell, isSel(d) && s.daySel, isToday(d) && !isSel(d) && s.dayToday]} onPress={() => setSelectedDate(new Date(d))}>
                    <Text style={[s.dayName, isSel(d) && { color: '#fff' }]}>{dayNames[d.getDay()]}</Text>
                    <Text style={[s.dayNum, isSel(d) && { color: '#fff' }, isToday(d) && !isSel(d) && { color: Colors.accent }]}>{d.getDate()}</Text>
                </TouchableOpacity>
            ))}</View>
            <ScrollView contentContainerStyle={s.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchCalendar(false); }} tintColor={Colors.accent} />}>
                <Text style={s.dateH}>{selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</Text>
                {dayEntries.length === 0 ? <View style={s.empty}><Ionicons name="calendar-outline" size={36} color={Colors.textMuted} /><Text style={s.emptyT}>No entries</Text></View> :
                    dayEntries.map((e, i) => {
                        const c = getColor(e.Type); return (
                            <View key={i} style={s.card}><View style={[s.bar, { backgroundColor: c }]} /><View style={s.cardC}>
                                <View style={s.cardH}><View style={s.iconW}><Ionicons name={getIcon(e.Type)} size={16} color={c} /></View><Text style={s.time}>{e.StartTime} — {e.EndTime}</Text></View>
                                <Text style={s.title}>{e.TaskDescription}</Text>
                                {e.Status ? <View style={[s.badge, { backgroundColor: c + '20' }]}><Text style={[s.badgeT, { color: c }]}>{e.Status}</Text></View> : null}
                            </View></View>
                        )
                    })}
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.background },
    header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, paddingBottom: Spacing.sm },
    h1: { ...Typography.h1, color: Colors.textPrimary }, sub: { ...Typography.bodySmall, color: Colors.textMuted, marginTop: 2 },
    week: { flexDirection: 'row', paddingHorizontal: Spacing.sm, paddingBottom: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: 4 },
    dayCell: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: BorderRadius.md },
    daySel: { backgroundColor: Colors.accent }, dayToday: { backgroundColor: Colors.accent + '15' },
    dayName: { ...Typography.caption, color: Colors.textMuted, fontSize: 10, marginBottom: 4 },
    dayNum: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', fontSize: 16 },
    list: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md, paddingBottom: Spacing.xxl },
    dateH: { ...Typography.h3, color: Colors.textSecondary, marginBottom: Spacing.md },
    card: { flexDirection: 'row', backgroundColor: Colors.card, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border },
    bar: { width: 4 }, cardC: { flex: 1, padding: Spacing.md },
    cardH: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: 4 },
    iconW: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center' },
    time: { ...Typography.bodySmall, color: Colors.textMuted }, title: { ...Typography.body, color: Colors.textPrimary, fontWeight: '600', marginBottom: 4 },
    badge: { alignSelf: 'flex-start', paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full },
    badgeT: { ...Typography.caption, fontSize: 10 },
    empty: { alignItems: 'center', paddingTop: 60, gap: Spacing.sm }, emptyT: { ...Typography.body, color: Colors.textSecondary },
});
