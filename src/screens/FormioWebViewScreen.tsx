import React, { useRef, useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    ActivityIndicator,
    Platform,
} from 'react-native';
import { WebView, WebViewNavigation } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { Colors, Typography, Spacing, BorderRadius } from '../theme';

const WFM_BASE_URL = 'https://wfm-w4-test.azurewebsites.net/gdi-demo2';
const TOKEN_KEY = 'auth_access_token';

interface Props {
    initialUrl?: string;
    taskId?: number;
}

export default function FormioWebViewScreen({ initialUrl, taskId }: Props) {
    const webViewRef = useRef<WebView>(null);
    const [currentUrl, setCurrentUrl] = useState(initialUrl || WFM_BASE_URL);
    const [canGoBack, setCanGoBack] = useState(false);
    const [canGoForward, setCanGoForward] = useState(false);
    const [loading, setLoading] = useState(true);
    const [pageTitle, setPageTitle] = useState('Forms');

    /**
     * Inject auth token into the WebView via JavaScript.
     * This sets the token in localStorage so that the Form.io app
     * can pick it up (if it uses localStorage-based auth).
     */
    const getInjectedJavaScript = useCallback(async () => {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        if (!token) return '';

        return `
      (function() {
        try {
          // Store token for the web app to use
          localStorage.setItem('formioToken', '${token}');
          localStorage.setItem('access_token', '${token}');
          localStorage.setItem('token', '${token}');

          // Also set as a cookie for APIs that use cookie auth
          document.cookie = 'Authorization=Bearer ${token}; path=/; secure; SameSite=None';
        } catch(e) {
          console.warn('Token injection failed:', e);
        }
      })();
      true;
    `;
    }, []);

    const [injectedJS, setInjectedJS] = useState('');

    React.useEffect(() => {
        getInjectedJavaScript().then(setInjectedJS);
    }, []);

    const handleNavigationStateChange = (navState: WebViewNavigation) => {
        setCanGoBack(navState.canGoBack);
        setCanGoForward(navState.canGoForward);
        setCurrentUrl(navState.url);
        if (navState.title) setPageTitle(navState.title);
    };

    const goBack = () => webViewRef.current?.goBack();
    const goForward = () => webViewRef.current?.goForward();
    const reload = () => webViewRef.current?.reload();

    const targetUrl = taskId
        ? `${WFM_BASE_URL}/#/task/${taskId}`
        : (initialUrl || WFM_BASE_URL);

    return (
        <SafeAreaView style={styles.container}>
            {/* Navigation bar */}
            <View style={styles.navBar}>
                <View style={styles.navLeft}>
                    <TouchableOpacity
                        onPress={goBack}
                        disabled={!canGoBack}
                        style={[styles.navButton, !canGoBack && styles.navButtonDisabled]}
                    >
                        <Ionicons name="chevron-back" size={22} color={canGoBack ? Colors.textPrimary : Colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={goForward}
                        disabled={!canGoForward}
                        style={[styles.navButton, !canGoForward && styles.navButtonDisabled]}
                    >
                        <Ionicons name="chevron-forward" size={22} color={canGoForward ? Colors.textPrimary : Colors.textMuted} />
                    </TouchableOpacity>
                </View>

                <View style={styles.urlBar}>
                    <Ionicons name="globe-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.urlText} numberOfLines={1}>
                        {pageTitle || 'Loading...'}
                    </Text>
                    {loading && <ActivityIndicator size="small" color={Colors.accent} />}
                </View>

                <TouchableOpacity onPress={reload} style={styles.navButton}>
                    <Ionicons name="refresh" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
            </View>

            {/* WebView */}
            <WebView
                ref={webViewRef}
                source={{ uri: targetUrl }}
                style={styles.webview}
                onNavigationStateChange={handleNavigationStateChange}
                onLoadStart={() => setLoading(true)}
                onLoadEnd={() => setLoading(false)}
                injectedJavaScript={injectedJS}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                startInLoadingState={true}
                allowsBackForwardNavigationGestures={true}
                sharedCookiesEnabled={true}
                thirdPartyCookiesEnabled={true}
                cacheEnabled={true}
                renderLoading={() => (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={Colors.accent} />
                        <Text style={styles.loadingText}>Loading Form.io...</Text>
                    </View>
                )}
                renderError={(errorDomain, errorCode, errorDesc) => (
                    <View style={styles.errorContainer}>
                        <Ionicons name="cloud-offline-outline" size={48} color={Colors.error} />
                        <Text style={styles.errorTitle}>Failed to load</Text>
                        <Text style={styles.errorDesc}>{errorDesc}</Text>
                        <TouchableOpacity style={styles.retryButton} onPress={reload}>
                            <Text style={styles.retryText}>Retry</Text>
                        </TouchableOpacity>
                    </View>
                )}
                onMessage={(event) => {
                    // Handle messages from the WebView (e.g. form submission)
                    try {
                        const data = JSON.parse(event.nativeEvent.data);
                        console.log('[WebView Message]', data);
                    } catch { }
                }}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    navBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: Spacing.sm,
        paddingVertical: Spacing.xs,
        borderBottomWidth: 1,
        borderBottomColor: Colors.border,
        backgroundColor: Colors.surface,
    },
    navLeft: {
        flexDirection: 'row',
        gap: 2,
    },
    navButton: {
        padding: Spacing.xs,
    },
    navButtonDisabled: {
        opacity: 0.4,
    },
    urlBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.background,
        borderRadius: BorderRadius.sm,
        paddingHorizontal: Spacing.sm,
        paddingVertical: 4,
        marginHorizontal: Spacing.sm,
        gap: Spacing.xs,
    },
    urlText: {
        ...Typography.bodySmall,
        color: Colors.textSecondary,
        flex: 1,
    },
    webview: {
        flex: 1,
        backgroundColor: Colors.background,
    },
    loadingContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        gap: Spacing.md,
    },
    loadingText: {
        ...Typography.body,
        color: Colors.textSecondary,
    },
    errorContainer: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
        gap: Spacing.md,
        padding: Spacing.xl,
    },
    errorTitle: {
        ...Typography.h3,
        color: Colors.textPrimary,
    },
    errorDesc: {
        ...Typography.bodySmall,
        color: Colors.textSecondary,
        textAlign: 'center',
    },
    retryButton: {
        backgroundColor: Colors.accent,
        paddingHorizontal: Spacing.lg,
        paddingVertical: Spacing.sm,
        borderRadius: BorderRadius.md,
        marginTop: Spacing.sm,
    },
    retryText: {
        ...Typography.button,
        color: '#fff',
    },
});
