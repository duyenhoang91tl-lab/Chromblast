# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ─────────────────────────────────────────────────────────────
# Keep-rules chuẩn bị sẵn cho lúc bật minifyEnabled true.
# Hiện tại minifyEnabled=false nên các rule dưới đây chưa có tác dụng,
# nhưng cần có sẵn để tránh crash do bị obfuscate/xoá nhầm class
# dùng qua reflection (Firebase, cầu nối JS của Capacitor, social-login).
# ─────────────────────────────────────────────────────────────

# Capacitor — bridge gọi qua JavascriptInterface + các plugin core
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep class com.getcapacitor.plugin.** { *; }
-keepclassmembers class * {
    @com.getcapacitor.annotation.PluginMethod <methods>;
}

# Plugin bên thứ ba đang dùng: AdMob, Social Login (Google), App, Screen Orientation
-keep class com.capacitorjs.plugins.** { *; }
-keep class com.getcapacitor.community.admob.** { *; }
-keep class ee.forgr.capacitor.social.login.** { *; }

# Firebase — SDK dùng reflection/annotation nhiều, dễ vỡ khi obfuscate
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Model truyền qua JSON (Firestore/Functions) — giữ nguyên tên field
-keepclassmembers class * {
    @com.google.firebase.firestore.PropertyName <fields>;
}

-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
