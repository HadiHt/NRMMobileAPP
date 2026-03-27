import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Image,
    ScrollView,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../auth/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

const CUSTOM_THEME = {
    primary: '#00658d',
    primaryContainer: '#00aeef',
    surface: '#f5faff',
    surfaceContainerLowest: '#ffffff',
    surfaceContainerHighest: '#dee3e8',
    secondaryContainer: '#b9e2ff',
    secondary: '#3a637c',
    tertiaryFixed: '#ffdcc0',
    tertiary: '#8d4f00',
    primaryFixed: '#c6e7ff',
    outline: '#6e7881',
    onSurface: '#171c20',
    onSurfaceVariant: '#3e4850',
    error: '#ba1a1a',
};

const LOGO_URL = 'https://lh3.googleusercontent.com/aida/ADBb0ugeuv6sRQX7HoVUXYcsabn4BSwnsUztO-auUkaJTBl01Oi7qaOkrjTvJxrJHkR5Ok0Sy_xgSQF57xq37arrjubgFtPcancWhJsWT8tUI8qkZZo__r28RroIIgiWoce0BvKwGIkRbOVvYCBJMdLEqY-a04G2CG6ckO8YJp1ivLib0LvAMtX3bvYzniaNWZUBTm2DfIDiE356GxplVf28vgMmj6tUeHdW3HlD_sDtNsoyqW7avK318oecSe-XvvgCcT6MiXVXZ0-HIQ';

export default function LoginScreen() {
    const { login, isLoading } = useAuth();

    return (
        <SafeAreaView style={styles.container}>
            {/* TopAppBar */}
            <View style={styles.appBar}>
                <View style={styles.appBarLeft}>
                    <Image source={{ uri: LOGO_URL }} style={styles.appBarLogo} resizeMode="contain" />
                    <Text style={styles.appBarBrand}>WorkForce</Text>
                </View>
                <TouchableOpacity style={styles.appBarIcon}>
                    <Ionicons name="help-circle-outline" size={24} color={CUSTOM_THEME.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView 
                style={styles.scrollArea} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <View style={styles.heroLogoWrap}>
                        <Image source={{ uri: LOGO_URL }} style={styles.heroImage} resizeMode="contain" />
                    </View>
                    <Text style={styles.heroHeadline}>Experience the future of</Text>
                    <Text style={styles.heroTitle}>Work Management</Text>
                    <Text style={styles.heroSubtitle}>
                        All your scheduling, tasks, and communications in one secure place.
                    </Text>

                    {/* Main Login CTA */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={login}
                        disabled={isLoading}
                        style={styles.heroCtaWrap}
                    >
                        <LinearGradient
                            colors={[CUSTOM_THEME.primary, CUSTOM_THEME.primaryContainer]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroCtaInner}
                        >
                            <View style={styles.heroCtaLeft}>
                                <View style={styles.heroCtaIconWrap}>
                                    <Ionicons name="log-in-outline" size={20} color="#fff" />
                                </View>
                                <View>
                                    <Text style={styles.heroCtaText}>Sign in to Get Started</Text>
                                    <Text style={styles.heroCtaSub}>EMPLOYEE PORTAL ACCESS</Text>
                                </View>
                            </View>
                            <Ionicons name="arrow-forward" size={20} color="#fff" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Feature Discovery Grid */}
                <View style={styles.featuresSection}>
                    <Text style={styles.featuresHeader}>PLATFORM FEATURES</Text>
                    <View style={styles.featureGrid}>
                        {/* Task Tracking (Full Width) */}
                        <View style={styles.featureCardFull}>
                            <View style={styles.featureIconWrapPrimaryContainer}>
                                <Ionicons name="clipboard-outline" size={28} color={CUSTOM_THEME.primaryContainer} />
                            </View>
                            <View style={styles.featureTextWrap}>
                                <Text style={styles.featureCardTitle}>Task Tracking</Text>
                                <Text style={styles.featureCardSub}>Real-time workflow updates</Text>
                            </View>
                        </View>

                        {/* Smart Schedule */}
                        <View style={styles.featureCardHalf}>
                            <View style={styles.featureIconWrapSecondary}>
                                <Ionicons name="calendar-outline" size={24} color={CUSTOM_THEME.secondary} />
                            </View>
                            <Text style={styles.featureCardTitleCenter}>Smart Schedule</Text>
                        </View>

                        {/* Team Comms */}
                        <View style={styles.featureCardHalf}>
                            <View style={styles.featureIconWrapTertiary}>
                                <Ionicons name="people-outline" size={24} color={CUSTOM_THEME.tertiary} />
                            </View>
                            <Text style={styles.featureCardTitleCenter}>Team Comms</Text>
                        </View>

                        {/* Directory */}
                        <View style={styles.featureCardHalf}>
                            <View style={styles.featureIconWrapPrimaryFixed}>
                                <Ionicons name="id-card-outline" size={24} color={CUSTOM_THEME.primary} />
                            </View>
                            <Text style={styles.featureCardTitleCenter}>Directory</Text>
                        </View>

                        {/* Resources */}
                        <View style={styles.featureCardHalf}>
                            <View style={styles.featureIconWrapSurfaceHighest}>
                                <Ionicons name="folder-open-outline" size={24} color={CUSTOM_THEME.outline} />
                            </View>
                            <Text style={styles.featureCardTitleCenter}>Resources</Text>
                        </View>
                    </View>
                </View>

                {/* Bottom Secondary CTA */}
                <TouchableOpacity style={styles.secondaryCta} activeOpacity={0.7}>
                    <Ionicons name="business-outline" size={20} color={CUSTOM_THEME.primary} />
                    <Text style={styles.secondaryCtaText}>COMPANY CODE SETUP</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Fixed Bottom Action Bar */}
            <View style={styles.bottomNavContainer}>
                <View style={[styles.bottomNav, Platform.OS === 'ios' && styles.bottomNavBlur]}>
                    <TouchableOpacity style={styles.navLearnMore} activeOpacity={0.7}>
                        <Text style={styles.navLearnMoreText}>Learn More</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={styles.navSignInWrap} 
                        activeOpacity={0.8}
                        onPress={login}
                        disabled={isLoading}
                    >
                        <LinearGradient
                            colors={[CUSTOM_THEME.primary, CUSTOM_THEME.primaryContainer]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.navSignInInner}
                        >
                            <Text style={styles.navSignInText}>
                                {isLoading ? 'Wait...' : 'Sign In'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: CUSTOM_THEME.surface,
    },
    appBar: {
        height: 64,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        backgroundColor: CUSTOM_THEME.surface,
        zIndex: 40,
    },
    appBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    appBarLogo: {
        width: 32,
        height: 32,
    },
    appBarBrand: {
        fontSize: 24,
        fontWeight: '900',
        color: CUSTOM_THEME.primary,
        letterSpacing: -0.5,
    },
    appBarIcon: {
        padding: 8,
        borderRadius: 20,
    },
    scrollArea: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 130, // Space for fixed bottom nav
    },
    heroSection: {
        marginTop: 32,
        marginBottom: 40,
        alignItems: 'center',
    },
    heroLogoWrap: {
        marginBottom: 24,
        padding: 16,
        backgroundColor: `${CUSTOM_THEME.primary}0D`, // ~5% opacity
        borderRadius: 100,
    },
    heroImage: {
        width: 96,
        height: 96,
    },
    heroHeadline: {
        fontSize: 28,
        fontWeight: '800',
        color: CUSTOM_THEME.onSurface,
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    heroTitle: {
        fontSize: 36,
        fontWeight: '900',
        color: CUSTOM_THEME.primary,
        textAlign: 'center',
        marginTop: 4,
    },
    heroSubtitle: {
        marginTop: 16,
        fontSize: 15,
        fontWeight: '500',
        color: CUSTOM_THEME.onSurfaceVariant,
        textAlign: 'center',
        maxWidth: 280,
    },
    heroCtaWrap: {
        marginTop: 40,
        width: '100%',
        borderRadius: 50,
        shadowColor: CUSTOM_THEME.primaryContainer,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    heroCtaInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        paddingHorizontal: 24,
        borderRadius: 50,
    },
    heroCtaLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    heroCtaIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroCtaText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    heroCtaSub: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
    featuresSection: {
        marginBottom: 32,
    },
    featuresHeader: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1.5,
        color: CUSTOM_THEME.outline,
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    featureGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    featureCardFull: {
        width: '100%',
        backgroundColor: CUSTOM_THEME.surfaceContainerLowest,
        borderRadius: 30, // Extremely rounded based on full
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    featureIconWrapPrimaryContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: `${CUSTOM_THEME.primaryContainer}1A`, // 10%
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    featureTextWrap: {
        flex: 1,
    },
    featureCardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: CUSTOM_THEME.onSurface,
    },
    featureCardSub: {
        fontSize: 14,
        fontWeight: '500',
        color: CUSTOM_THEME.onSurfaceVariant,
        marginTop: 2,
    },
    featureCardHalf: {
        width: '48%',
        aspectRatio: 1,
        backgroundColor: CUSTOM_THEME.surfaceContainerLowest,
        borderRadius: 32,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    featureCardTitleCenter: {
        fontSize: 15,
        fontWeight: 'bold',
        color: CUSTOM_THEME.onSurface,
        textAlign: 'center',
        marginTop: 16,
    },
    featureIconWrapSecondary: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${CUSTOM_THEME.secondaryContainer}4D`, // 30%
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureIconWrapTertiary: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${CUSTOM_THEME.tertiaryFixed}66`, // 40%
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureIconWrapPrimaryFixed: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${CUSTOM_THEME.primaryFixed}66`, // 40%
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureIconWrapSurfaceHighest: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: CUSTOM_THEME.surfaceContainerHighest,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryCta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 50,
        borderWidth: 2,
        borderColor: `${CUSTOM_THEME.primary}33`, // 20%
        gap: 12,
        marginBottom: 16,
    },
    secondaryCtaText: {
        color: CUSTOM_THEME.primary,
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1.5,
    },
    bottomNavContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        paddingTop: 16,
        borderTopLeftRadius: 40,
        borderTopRightRadius: 40,
        backgroundColor: Platform.OS === 'ios' ? 'rgba(245, 250, 255, 0.7)' : CUSTOM_THEME.surface,
        borderTopWidth: 1,
        borderTopColor: `${CUSTOM_THEME.outline}1A`, // 10%
    },
    bottomNavBlur: {
        // Only applicable if using blur views, but fallback to transparent bg
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    navLearnMore: {
        flex: 1,
        backgroundColor: CUSTOM_THEME.surfaceContainerHighest,
        paddingVertical: 16,
        borderRadius: 50,
        alignItems: 'center',
        marginRight: 8,
    },
    navLearnMoreText: {
        color: CUSTOM_THEME.onSurface,
        fontSize: 16,
        fontWeight: 'bold',
    },
    navSignInWrap: {
        flex: 1,
        marginLeft: 8,
        shadowColor: CUSTOM_THEME.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    navSignInInner: {
        paddingVertical: 16,
        borderRadius: 50,
        alignItems: 'center',
    },
    navSignInText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
