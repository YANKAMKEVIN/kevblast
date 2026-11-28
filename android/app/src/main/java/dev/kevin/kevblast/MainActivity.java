package dev.kevin.kevblast;

import android.os.Bundle;
import android.view.KeyEvent;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

/**
 * Le jeu en plein écran : barres système masquées (un glissement depuis le bord les
 * fait réapparaître un instant), écran toujours allumé pendant qu'on joue.
 * Le bouton retour et la mise en arrière-plan sont gérés côté jeu (src/natif.js).
 */
public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        immersive();
    }

    @Override
    public void onResume() {
        super.onResume();
        immersive();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) immersive();
    }

    /**
     * Touche retour (boutons de navigation, manette, adb) : la WebView la garde pour elle si on
     * la laisse passer. On l'envoie directement au gestionnaire de retour, que le plugin App
     * relaie au jeu (src/natif.js). Le geste de retour, lui, y arrive déjà sans passer par ici.
     */
    @Override
    public boolean dispatchKeyEvent(KeyEvent event) {
        if (event.getKeyCode() == KeyEvent.KEYCODE_BACK) {
            if (event.getAction() == KeyEvent.ACTION_UP && !event.isCanceled()) getOnBackPressedDispatcher().onBackPressed();
            return true;
        }
        return super.dispatchKeyEvent(event);
    }

    private void immersive() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
        c.hide(WindowInsetsCompat.Type.systemBars());
    }
}
