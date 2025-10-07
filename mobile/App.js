// Minimal Expo WebView wrapper for WENDROPS
import React, { useRef, useEffect, useState } from 'react';
import { BackHandler, SafeAreaView, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import Constants from 'expo-constants';

export default function App() {
  const webViewRef = useRef(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const baseUrl = (Constants?.expoConfig?.extra?.baseUrl) || 'https://wendrops-airdrop.vercel.app/';

  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
        }
      return false;
    };
    BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress);
  }, [canGoBack]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0b1020' }}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'light-content' : 'light-content'} />
      <WebView
        ref={webViewRef}
        source={{ uri: baseUrl }}
        onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        originWhitelist={["*"]}
        setSupportMultipleWindows={false}
        startInLoadingState
        applicationNameForUserAgent={"WENDROPS-Mobile"}
      />
    </SafeAreaView>
  );
}
