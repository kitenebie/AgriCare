import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import WebView, { type WebViewMessageEvent } from 'react-native-webview';
import { Colors } from '@/constants/theme';
import { Icon } from '@/components/ui';

const newSessionId = () => `agricare_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const injectedJavaScript = `
  (function() {
    if (window.__rnFaceCaptureInjected) return true;
    window.__rnFaceCaptureInjected = true;
    const RN = window.ReactNativeWebView;
    let sent = false;
    const post = payload => RN && RN.postMessage(JSON.stringify(payload));
    function normalize(value) {
      if (!value || typeof value !== 'string') return null;
      const image = value.trim();
      if (image.startsWith('data:image') || image.startsWith('http') || image.startsWith('file:')) return image;
      return /^[A-Za-z0-9+\\/]+={0,2}$/.test(image) && image.length > 200 ? 'data:image/jpeg;base64,' + image : null;
    }
    function extract(value) {
      if (typeof value === 'string') return normalize(value);
      if (!value || typeof value !== 'object') return null;
      return normalize(value.img) || normalize(value.image) || normalize(value.previewImage) || normalize(value.base64PreviewImage) || normalize(value.base64) || normalize(value.data);
    }
    function send(value) {
      if (sent) return;
      const uri = extract(value);
      if (!uri) return;
      sent = true;
      post({ type: 'photo-captured', photoUri: uri });
      setTimeout(() => post({ type: 'close-camera' }), 150);
    }
    window.__faceCaptureSuccess = (payload, preview) => send(preview || payload);
    const originalLog = console.log;
    console.log = function() {
      try {
        const args = Array.prototype.slice.call(arguments);
        for (let i = 0; i < args.length; i += 1) {
          const image = extract(args[i]);
          const first = args[0];
          if (image && ((typeof first === 'string' && first.toLowerCase().includes('capture')) || args[i]?.img)) { send(image); break; }
        }
      } catch (_) {}
      return originalLog.apply(console, arguments);
    };
    function scan() {
      if (sent || !document) return;
      const image = document.querySelector('img');
      if (image?.src?.startsWith('data:image')) { send(image.src); return; }
      const canvas = document.querySelector('canvas');
      if (canvas?.toDataURL) { try { send(canvas.toDataURL('image/jpeg', 0.92)); } catch (_) {} }
    }
    function observe() {
      scan();
      if (typeof MutationObserver === 'function' && document.documentElement) new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true, attributes: true });
      const timer = setInterval(() => { if (sent) clearInterval(timer); else scan(); }, 500);
      setTimeout(() => clearInterval(timer), 30000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observe); else observe();
    return true;
  })();
`;

export default function LiveFaceCapture({ onCapture, onClose }: { onCapture: (uri: string) => void; onClose: () => void }) {
  const [sessionId] = useState(newSessionId);
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'photo-captured' && typeof data.photoUri === 'string') onCapture(data.photoUri);
      if (data.type === 'close-camera') onClose();
    } catch (error) {
      console.warn('[Face Capture] Invalid camera message', error);
    }
  }, [onCapture, onClose]);

  return (
    <View style={styles.container}>
      <WebView
        style={StyleSheet.absoluteFill}
        source={{ uri: `https://earms.online/face-detection/${sessionId}` }}
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={['https://earms.online']}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
        injectedJavaScript={injectedJavaScript}
        startInLoadingState
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
      />
      <TouchableOpacity style={styles.closeButton} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close face capture">
        <Icon name="close" size={22} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  closeButton: { position: 'absolute', top: 12, left: 16, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
});
