package com.electrosoft.work;

import android.Manifest;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Log;

import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;

/**
 * Firebase notifications for this phone. When the app is in the background Android shows them
 * by itself; this class shows them while the app is open.
 *
 * Each install has a random id. The site is opened with that id (LauncherActivity) and links it
 * to whoever signs in; this class sends the install's Firebase token to the server whenever
 * Firebase hands out one, so it does not matter which of the two happens first.
 */
public class PushService extends FirebaseMessagingService {

    private static final String TAG = "ElectrosoftPush";
    private static final String PREFS = "electrosoft";
    private static final String INSTALL_ID = "install_id";
    private static final String REGISTER_URL =
            "https://tagqvhhnnwmgjrqkjylj.supabase.co/functions/v1/app-device";

    static synchronized String installId(Context context) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS, MODE_PRIVATE);
        String id = prefs.getString(INSTALL_ID, null);
        if (id == null) {
            id = UUID.randomUUID().toString();
            prefs.edit().putString(INSTALL_ID, id).apply();
        }
        return id;
    }

    /** Gets the current token (Firebase may take a few seconds) and sends it to the server. */
    static void registerToken(Context context) {
        Context app = context.getApplicationContext();
        try {
            FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token -> send(app, token));
        } catch (RuntimeException e) {
            Log.w(TAG, "Firebase is not available", e);
        }
    }

    private static void send(Context context, String token) {
        String install = installId(context);
        Executors.newSingleThreadExecutor().execute(() -> {
            HttpURLConnection connection = null;
            try {
                byte[] body = new JSONObject()
                        .put("install_id", install)
                        .put("token", token)
                        .toString()
                        .getBytes(StandardCharsets.UTF_8);
                connection = (HttpURLConnection) new URL(REGISTER_URL).openConnection();
                connection.setRequestMethod("POST");
                connection.setConnectTimeout(15000);
                connection.setReadTimeout(15000);
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                try (OutputStream out = connection.getOutputStream()) {
                    out.write(body);
                }
                Log.i(TAG, "Token sent: " + connection.getResponseCode());
            } catch (Exception e) {
                Log.w(TAG, "Could not send the token", e);
            } finally {
                if (connection != null) connection.disconnect();
            }
        });
    }

    @Override
    public void onNewToken(@NonNull String token) {
        send(this, token);
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
