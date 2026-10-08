package com.electrosoft.work;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Firebase notifications for this phone. When the app is in the background Android shows them
 * by itself; this class shows them while the app is open, and keeps the phone's token fresh.
 */
public class PushService extends FirebaseMessagingService {

    static final String PREFS = "electrosoft";
    static final String TOKEN = "fcm_token";

    static void saveToken(Context context, String token) {
        context.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putString(TOKEN, token).apply();
    }

    static String savedToken(Context context) {
        return context.getSharedPreferences(PREFS, MODE_PRIVATE).getString(TOKEN, null);
    }

    @Override
    public void onNewToken(@NonNull String token) {
        // The site picks it up the next time the app opens (LauncherActivity).
        saveToken(this, token);
    }

    @Override
    public void onMessageReceived(@NonNull RemoteMessage message) {
        RemoteMessage.Notification note = message.getNotification();
        if (note == null) return;
        if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }
        Map<String, String> data = message.getData();
        String id = data.containsKey("id") ? data.get("id") : String.valueOf(System.currentTimeMillis());

        Intent open = new Intent(this, LauncherActivity.class)
                .putExtra("link", data.get("link"))
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent tap = PendingIntent.getActivity(this, id.hashCode(), open,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);

        NotificationCompat.Builder builder =
                new NotificationCompat.Builder(this, Application.CHANNEL_ID)
                        .setSmallIcon(R.drawable.ic_notification_icon)
                        .setContentTitle(note.getTitle())
                        .setContentText(note.getBody())
                        .setStyle(new NotificationCompat.BigTextStyle().bigText(note.getBody()))
                        .setPriority(NotificationCompat.PRIORITY_HIGH)
                        .setAutoCancel(true)
                        .setContentIntent(tap);
        NotificationManagerCompat.from(this).notify(id, 0, builder.build());
    }
}
