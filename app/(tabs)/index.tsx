import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import TaskListScreen from '../../src/screens/TaskListScreen';

type DashboardCard = {
  key: string;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  topBackground: string;
  bottomBackground: string;
  textColor: string;
  iconColor: string;
};

type DashboardSection = {
  key: string;
  cards: DashboardCard[];
};

const DASHBOARD_SECTIONS: DashboardSection[] = [
  {
    key: 'workers',
    cards: [
      {
        key: 'workers',
        title: 'Workers',
        subtitle: 'Edit workers',
        icon: 'person-outline',
        topBackground: '#272c42',
        bottomBackground: '#22273b',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
      {
        key: 'field-work',
        title: 'Field Work',
        subtitle: 'Edit field work',
        icon: 'bicycle-outline',
        topBackground: '#272c42',
        bottomBackground: '#22273b',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
      {
        key: 'workorders',
        title: 'Workorders',
        subtitle: 'Workorders',
        icon: 'archive-outline',
        topBackground: '#050505',
        bottomBackground: '#000000',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
    ],
  },
  {
    key: 'departments',
    cards: [
      {
        key: 'departments',
        title: 'Departments',
        subtitle: 'Edit departments',
        icon: 'people-outline',
        topBackground: '#707b84',
        bottomBackground: '#616b74',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
      {
        key: 'field-material',
        title: 'Field Material',
        subtitle: 'Edit field material',
        icon: 'cube-outline',
        topBackground: '#707b84',
        bottomBackground: '#616b74',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
      {
        key: 'web-hooks',
        title: 'Web Hooks',
        subtitle: 'Web hooks configuration',
        icon: 'swap-horizontal-outline',
        topBackground: '#707b84',
        bottomBackground: '#616b74',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
    ],
  },
  {
    key: 'skills',
    cards: [
      {
        key: 'skills',
        title: 'Skills',
        subtitle: 'Edit skills',
        icon: 'ribbon-outline',
        topBackground: '#115ea8',
        bottomBackground: '#0f569b',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
      {
        key: 'web-parts',
        title: 'Web Parts',
        subtitle: 'Web part create and edit',
        icon: 'apps-outline',
        topBackground: '#115ea8',
        bottomBackground: '#0f569b',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
      {
        key: 'web-hook-request-logs',
        title: 'Web Hook Request Logs',
        subtitle: 'Web Hook Request Logs Management',
        icon: 'swap-horizontal-outline',
        topBackground: '#115ea8',
        bottomBackground: '#0f569b',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
      {
        key: 'application-settings',
        title: 'Application Settings',
        subtitle: 'Configure application settings',
        icon: 'settings-outline',
        topBackground: '#115ea8',
        bottomBackground: '#0f569b',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
    ],
  },
  {
    key: 'job-types',
    cards: [
      {
        key: 'job-types',
        title: 'Job Types',
        subtitle: 'Edit job types',
        icon: 'briefcase-outline',
        topBackground: '#eeb636',
        bottomBackground: '#d8a42f',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
      {
        key: 'tasks',
        title: 'Tasks',
        subtitle: 'Tasks',
        icon: 'list-outline',
        topBackground: '#eeb636',
        bottomBackground: '#d8a42f',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
      {
        key: 'completed-tasks',
        title: 'Completed tasks',
        subtitle: 'View completed tasks',
        icon: 'checkmark-outline',
        topBackground: '#eeb636',
        bottomBackground: '#d8a42f',
        textColor: '#ffffff',
        iconColor: '#ffffff',
      },
    ],
  },
];

export default function TasksTab() {
  const router = useRouter();
  const navigation = useNavigation();
  const { width } = useWindowDimensions();
  const [showTaskList, setShowTaskList] = useState(false);
  const [taskListMode, setTaskListMode] = useState<'active' | 'completed'>('active');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', () => {
      setIsMenuOpen(false);
      setShowTaskList(false);
      setTaskListMode('active');
    });
    return unsubscribe;
  }, [navigation]);

  const sectionColumns = useMemo(() => {
    if (width >= 1500) return 4;
    if (width >= 1000) return 3;
    if (width >= 700) return 2;
    return 1;
  }, [width]);

  const sectionWidth = `${100 / sectionColumns}%` as `${number}%`;
  const allMenuCards = useMemo(() => DASHBOARD_SECTIONS.flatMap((section) => section.cards), []);
  const navigableCardKeys = useMemo(() => new Set(['tasks', 'completed-tasks', 'application-settings']), []);

  const openCard = (cardKey: string) => {
    if (cardKey === 'tasks') {
      setTaskListMode('active');
      setShowTaskList(true);
      return;
    }
    if (cardKey === 'completed-tasks') {
      setTaskListMode('completed');
      setShowTaskList(true);
      return;
    }
    if (cardKey === 'application-settings') {
      router.push('/application-settings');
    }
  };

  if (showTaskList) {
    return (
      <View style={{ flex: 1 }}>
        <TaskListScreen
          mode={taskListMode}
          onTaskPress={(taskId) =>
            router.push({ pathname: '/task-detail', params: { id: taskId } })
          }
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {isMenuOpen && (
        <View style={s.menuOverlay}>
          <View style={s.sideMenu}>
            <View style={s.sideMenuHeader}>
              <Text style={s.sideMenuTitle}>Dashboard Menu</Text>
              <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                <Ionicons name="close-outline" size={22} color="#1f2937" />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={s.sideMenuContent}>
              {allMenuCards.map((card) => (
                <TouchableOpacity
                  key={card.key}
                  style={[s.menuItem, !navigableCardKeys.has(card.key) ? s.menuItemDisabled : null]}
                  disabled={!navigableCardKeys.has(card.key)}
                  onPress={() => {
                    setIsMenuOpen(false);
                    openCard(card.key);
                  }}
                  activeOpacity={navigableCardKeys.has(card.key) ? 0.75 : 1}
                >
                  <View style={s.menuItemLeft}>
                    <Ionicons name={card.icon} size={18} color={navigableCardKeys.has(card.key) ? '#0a84c8' : '#6b7280'} />
                    <Text style={[s.menuItemTitle, !navigableCardKeys.has(card.key) ? s.menuItemTitleDisabled : null]}>{card.title}</Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={navigableCardKeys.has(card.key) ? '#0a84c8' : '#9ca3af'}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          <TouchableOpacity style={s.menuBackdrop} activeOpacity={1} onPress={() => setIsMenuOpen(false)} />
        </View>
      )}

      <View style={s.topHeader}>
        <View style={s.topLeft}>
          <View style={s.logoCircle}>
            <Text style={s.logoCircleText}>GDi</Text>
          </View>
          <Text style={s.headerTitle}>GDi Demo</Text>
        </View>

        <View style={s.topRight}>
          <Ionicons name="globe-outline" size={18} color="#6b7280" />
          <Ionicons name="settings-outline" size={18} color="#6b7280" />
          <View style={s.bellWrap}>
            <Ionicons name="notifications-outline" size={18} color="#6b7280" />
            <View style={s.badge}>
              <Text style={s.badgeText}>10</Text>
            </View>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>aa</Text>
          </View>
        </View>
      </View>

      <View style={s.breadcrumbBar}>
        <TouchableOpacity onPress={() => setIsMenuOpen(true)} style={s.menuToggleBtn}>
          <Ionicons name="menu-outline" size={16} color="#ffffff" />
        </TouchableOpacity>
        <View style={s.breadcrumbRight}>
          <Text style={s.breadcrumbText}>/</Text>
          <Ionicons name="globe-outline" size={12} color="#ffffff" />
          <Text style={s.breadcrumbText}>/</Text>
          <Ionicons name="settings-outline" size={12} color="#ffffff" />
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator>
        <View style={s.sectionRow}>
          {DASHBOARD_SECTIONS.map((section) => (
            <View key={section.key} style={[s.sectionColumn, { width: sectionWidth }]}>
              {section.cards.map((card, cardIndex) => (
                <TouchableOpacity
                  key={card.key}
                  disabled={!navigableCardKeys.has(card.key)}
                  style={[
                    s.card,
                    !navigableCardKeys.has(card.key) ? s.cardDisabled : null,
                    cardIndex > 0 ? s.cardStackGap : null,
                  ]}
                  onPress={() => openCard(card.key)}
                  activeOpacity={navigableCardKeys.has(card.key) ? 0.9 : 1}
                >
                  <View style={[s.cardTop, { backgroundColor: card.topBackground }]}>
                    <View style={s.iconShell}>
                      <Ionicons name={card.icon} size={30} color={card.iconColor} />
                    </View>
                    <Text style={[s.cardTitle, { color: card.textColor }]} numberOfLines={2}>
                      {card.title}
                    </Text>
                  </View>

                  <View style={[s.cardBottom, { backgroundColor: card.bottomBackground }]}>
                    <Text style={[s.cardSubtitle, { color: card.textColor }]}>{card.subtitle}</Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={navigableCardKeys.has(card.key) ? card.iconColor : 'rgba(255,255,255,0.55)'}
                    />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        <View style={s.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e9edf2',
  },
  menuOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 120,
    flexDirection: 'row',
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 16, 30, 0.42)',
  },
  sideMenu: {
    width: 300,
    maxWidth: '86%',
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    shadowColor: '#0f172a',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sideMenuHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sideMenuTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1f2937',
  },
  sideMenuContent: {
    paddingVertical: 8,
  },
  menuItem: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemDisabled: {
    backgroundColor: '#f8fafc',
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
  },
  menuItemTitleDisabled: {
    color: '#6b7280',
  },
  topHeader: {
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#dfe4eb',
    paddingHorizontal: 18,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#081426',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  topLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#08a5ea',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircleText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#1f2937',
    fontSize: 15,
    fontWeight: '700',
  },
  topRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellWrap: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#ef4444',
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    lineHeight: 10,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  breadcrumbBar: {
    backgroundColor: '#00aeef',
    paddingHorizontal: 18,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuToggleBtn: {
    paddingVertical: 3,
    paddingHorizontal: 2,
  },
  breadcrumbRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  breadcrumbText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '500',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 8,
  },
  sectionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
    maxWidth: 1680,
    alignSelf: 'center',
  },
  sectionColumn: {
    paddingHorizontal: 10,
    marginBottom: 16,
  },
  card: {
    height: 146,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: '#0d1728',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 5,
  },
  cardStackGap: {
    marginTop: 18,
  },
  cardDisabled: {
    opacity: 0.96,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 15,
    paddingBottom: 10,
    flex: 1,
  },
  iconShell: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '300',
    flex: 1,
    textAlign: 'right',
    lineHeight: 36,
  },
  cardBottom: {
    paddingHorizontal: 14,
    paddingVertical: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSubtitle: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 80,
  },
});
